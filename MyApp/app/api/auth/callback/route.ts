import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") || "/inbox";

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Missing Supabase environment variables");
    return NextResponse.redirect(new URL("/?error=config", request.url));
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    // Handle authorization code flow
    if (code) {
      console.log("Exchanging code for session...");
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error("Auth exchange error:", error);
        return NextResponse.redirect(new URL("/?error=auth", request.url));
      }

      if (!data?.session) {
        console.error("No session created from code exchange");
        return NextResponse.redirect(new URL("/?error=no_session", request.url));
      }

      // Create response with redirect
      const response = NextResponse.redirect(new URL(next, request.url));

      // Set auth cookies to persist session
      const { access_token, refresh_token } = data.session;
      if (access_token) {
        response.cookies.set("sb-access-token", access_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 365,
          path: "/",
        });
      }
      if (refresh_token) {
        response.cookies.set("sb-refresh-token", refresh_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 365,
          path: "/",
        });
      }

      return response;
    }

    // If no code, redirect back to login
    console.warn("No auth code provided to callback");
    return NextResponse.redirect(new URL("/?error=no_code", request.url));
  } catch (error) {
    console.error("Auth callback error:", error);
    return NextResponse.redirect(new URL("/?error=auth", request.url));
  }
}
