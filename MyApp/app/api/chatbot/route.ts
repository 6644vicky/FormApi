import { NextRequest, NextResponse } from "next/server";
import { isRateLimited, getClientIp } from "@/lib/rateLimit";

// Two providers, both OpenAI-compatible: NVIDIA's own endpoint when an
// NVIDIA_API_KEY is present, otherwise the original OpenRouter relay. Model
// slugs are overridable so a deprecated one can be swapped without a deploy.
// Google exposes an OpenAI-compatible surface, so the request shape below
// works unchanged across all three providers.
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const GEMINI_MODEL = process.env.GEMINI_CHAT_MODEL || "gemini-3.8-flash";

const NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const NVIDIA_MODEL = process.env.NVIDIA_CHAT_MODEL || "deepseek-ai/deepseek-v4.1-flash";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL = process.env.CHATBOT_MODEL || "nvidia/nemotron-3-nano-30b-a3b:free";

// Retry a busy model twice before giving up, then fall back to the next slug.
const RETRY_DELAYS_MS = [400, 1200];
const TRANSIENT_STATUSES = new Set([429, 500, 502, 503, 504]);

function chatProvider() {
  if (process.env.GEMINI_API_KEY) {
    return {
      name: "Gemini",
      url: GEMINI_BASE_URL,
      models: [GEMINI_MODEL, "gemini-flash-latest"],
      key: process.env.GEMINI_API_KEY,
    };
  }
  if (process.env.NVIDIA_API_KEY) {
    return { name: "NVIDIA", url: NVIDIA_BASE_URL, models: [NVIDIA_MODEL], key: process.env.NVIDIA_API_KEY };
  }
  if (process.env.CHATBOT_API_KEY) {
    return {
      name: "OpenRouter",
      url: OPENROUTER_BASE_URL,
      models: [OPENROUTER_MODEL],
      key: process.env.CHATBOT_API_KEY,
    };
  }
  return null;
}

const TONE_INSTRUCTIONS: Record<string, string> = {
  Professional: "Respond in a professional, polished tone.",
  Friendly: "Respond in a warm, friendly, approachable tone.",
  Casual: "Respond in a relaxed, casual, conversational tone.",
  Formal: "Respond in a formal, precise tone.",
};

const LENGTH_INSTRUCTIONS: Record<string, string> = {
  Concise: "Keep responses short — a sentence or two.",
  Standard: "Keep responses to a short paragraph.",
  Detailed: "Give thorough, detailed responses when helpful.",
};

// The embed widget runs on whatever third-party site installs it, so this
// endpoint is deliberately open to any origin — there's no auth/cookie
// state to protect, just an anonymous per-visitor chat relay.
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function jsonWithCors(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: CORS_HEADERS });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: NextRequest) {
  // Anonymous, open-CORS endpoint proxying to a paid, shared OpenRouter key
  // — rate-limit per visitor IP so one abusive client can't run up the bill.
  if (isRateLimited(`chatbot:${getClientIp(request)}`, 20, 60_000)) {
    return jsonWithCors({ error: "Too many requests. Please slow down." }, 429);
  }

  const provider = chatProvider();
  if (!provider) {
    return jsonWithCors(
      { error: "Chatbot is not configured — add GEMINI_API_KEY (or NVIDIA_API_KEY / CHATBOT_API_KEY) to .env.local." },
      500
    );
  }

  const body = await request.json();
  const { messages, tone, responseLength, businessContext } = body as {
    messages: Array<{ role: "user" | "assistant"; content: string }>;
    tone?: string;
    responseLength?: string;
    businessContext?: string;
  };

  if (!Array.isArray(messages) || messages.length === 0) {
    return jsonWithCors({ error: "No messages provided." }, 400);
  }

  const systemLines = [
    "You are a helpful customer support chat assistant embedded on a business's website.",
    TONE_INSTRUCTIONS[tone ?? "Professional"] ?? TONE_INSTRUCTIONS.Professional,
    LENGTH_INSTRUCTIONS[responseLength ?? "Standard"] ?? LENGTH_INSTRUCTIONS.Standard,
  ];
  if (businessContext && businessContext.trim() !== "") {
    systemLines.push(`Business context:\n${businessContext.trim()}`);
  }

  const payloadMessages = [{ role: "system", content: systemLines.join("\n\n") }, ...messages];

  const ask = (model: string) =>
    fetch(provider.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${provider.key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, messages: payloadMessages }),
    });

  try {
    let response: Response | null = null;
    let lastStatus = 0;
    let lastBody = "";

    // Hosted models return 429/503 when they're busy; that's worth retrying
    // before bothering the visitor, and worth trying the backup slug for.
    outer: for (const model of provider.models) {
      for (let attempt = 0; attempt < RETRY_DELAYS_MS.length + 1; attempt += 1) {
        const candidate = await ask(model);
        if (candidate.ok) {
          response = candidate;
          break outer;
        }

        lastStatus = candidate.status;
        lastBody = await candidate.text();
        console.error(`${provider.name} error (${model}):`, lastStatus, lastBody);

        // A bad key or an unknown model won't fix itself — stop retrying.
        if (!TRANSIENT_STATUSES.has(lastStatus)) break;
        const delay = RETRY_DELAYS_MS[attempt];
        if (delay === undefined) break;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    if (!response) {
      const busy = TRANSIENT_STATUSES.has(lastStatus);
      return jsonWithCors(
        {
          error: busy
            ? "The assistant is busy right now. Please try again in a moment."
            : `The chatbot failed to respond (${provider.name} ${lastStatus}). Please try again.`,
        },
        502
      );
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content?.trim();
    if (!reply) {
      return jsonWithCors({ error: "The chatbot returned an empty response." }, 502);
    }

    return jsonWithCors({ reply });
  } catch (error) {
    console.error("Chatbot request failed:", error);
    return jsonWithCors({ error: "The chatbot failed to respond. Please try again." }, 500);
  }
}
