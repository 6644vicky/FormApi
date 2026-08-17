import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/publicEvent";

// Field names third-party form builders commonly use for the same thing —
// tried in order before giving up and treating a value as a custom field.
const NAME_KEYS = ["name", "Name", "full_name", "fullName", "Full Name"];
const EMAIL_KEYS = ["email", "Email"];
const PHONE_KEYS = ["phone", "Phone", "phone_number", "phoneNumber", "Phone Number"];

function pickString(body: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = body[key];
    if (typeof value === "string" && value.trim() !== "") return value.trim();
  }
  return null;
}

// Lets any third-party form (a Framer Webhook action, Zapier, a raw curl)
// attach a lead straight to this event, keyed by the api_key in the URL —
// no session, no calendar step, no separate secret to configure.
export async function POST(request: NextRequest, { params }: { params: { apiKey: string } }) {
  const { data: event, error: eventError } = await supabaseAdmin
    .from("calendar_events")
    .select("id")
    .eq("api_key", params.apiKey)
    .single();

  if (eventError || !event) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body must be JSON" }, { status: 400 });
  }

  const name = pickString(body, NAME_KEYS);
  const email = pickString(body, EMAIL_KEYS);
  const phone = pickString(body, PHONE_KEYS);

  const known = new Set([...NAME_KEYS, ...EMAIL_KEYS, ...PHONE_KEYS]);
  const extraFields: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (!known.has(key)) extraFields[key] = value;
  }

  const now = new Date();
  const { error: insertError } = await supabaseAdmin.from("bookings").insert({
    event_id: event.id,
    guest_name: name || "",
    guest_email: email || "",
    guest_phone: phone,
    booking_date: now.toISOString().slice(0, 10),
    booking_time: now.toISOString().slice(11, 16),
    extra_fields: Object.keys(extraFields).length > 0 ? extraFields : null,
    source: "webhook",
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
