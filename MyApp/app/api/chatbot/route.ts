import { NextRequest, NextResponse } from "next/server";
import { isRateLimited, getClientIp } from "@/lib/rateLimit";

// Free-tier OpenRouter model. Swap this if it gets deprecated or you'd
// rather point at a paid model. Verified against the account's live
// model list — several other :free slugs are currently 404ing on OpenRouter.
// nemotron-nano-9b-v2 worked but ran ~4s/reply (mostly hidden reasoning
// tokens); this one answers in ~1-1.5s at comparable quality.
const CHATBOT_MODEL = "nvidia/nemotron-3-nano-30b-a3b:free";

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

  const apiKey = process.env.CHATBOT_API_KEY;
  if (!apiKey) {
    return jsonWithCors({ error: "Chatbot is not configured." }, 500);
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

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: CHATBOT_MODEL,
        messages: [{ role: "system", content: systemLines.join("\n\n") }, ...messages],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenRouter error:", response.status, errorText);
      return jsonWithCors({ error: "The chatbot failed to respond. Please try again." }, 502);
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
