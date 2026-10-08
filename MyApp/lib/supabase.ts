import { createClient, type Session } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Keep the session created by the browser Supabase client available to Server
 * Actions as well.  The app's Server Actions intentionally verify the user
 * from an httpOnly cookie, while supabase-js normally keeps a client session
 * in browser storage.  Syncing the tokens at the boundary prevents actions
 * such as workspace creation from appearing to succeed only until refresh.
 */
// The tokens already written to the cookie during this page load. Every page
// used to POST them again on mount, which put a round-trip in front of its
// first query on every client-side navigation. A module-level cache is reset
// by a full reload, so a cleared cookie is never missed for long.
let syncedAccessToken: string | null = null;

export async function syncServerSession(session: Session | null): Promise<boolean> {
  if (!session?.access_token || !session.refresh_token) return false;
  if (syncedAccessToken === session.access_token) return true;

  try {
    const response = await fetch("/api/auth/set-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      }),
    });

    if (response.ok) syncedAccessToken = session.access_token;
    return response.ok;
  } catch (error) {
    console.error("Unable to sync the Supabase session with the server:", error);
    return false;
  }
}
