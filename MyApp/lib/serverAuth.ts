import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

// Server Actions receive whatever the client sends as plain arguments —
// including a claimed userId — so they can't trust it for authorization.
// This independently re-derives who's actually logged in from the
// "sb-access-token" cookie set in app/api/auth/callback/route.ts, by
// asking Supabase to verify that token rather than decoding it ourselves.
export async function getVerifiedUserId(): Promise<string | null> {
  const token = cookies().get("sb-access-token")?.value;
  if (!token) return null;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
  );
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}
