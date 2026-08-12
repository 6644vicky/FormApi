import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/publicEvent";
import { validateUsernameFormat } from "@/lib/username";

// RLS on `profiles` only lets a signed-in user see their own row, so there's
// no way for the client to check whether another user already has a given
// username. This route uses the service role key to answer just that one
// yes/no question, without exposing anything else about other profiles.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const username = (searchParams.get("username") || "").toLowerCase().trim();
  const excludeUserId = searchParams.get("excludeUserId") || undefined;

  const formatError = validateUsernameFormat(username);
  if (formatError) {
    return NextResponse.json({ available: false, reason: formatError });
  }

  let query = supabaseAdmin.from("profiles").select("id").ilike("username", username);
  if (excludeUserId) {
    query = query.neq("id", excludeUserId);
  }
  const { data, error } = await query.maybeSingle();

  if (error) {
    return NextResponse.json({ available: false, reason: "Couldn't check availability right now." }, { status: 500 });
  }

  if (data) {
    return NextResponse.json({ available: false, reason: "This username has already been taken." });
  }

  return NextResponse.json({ available: true });
}
