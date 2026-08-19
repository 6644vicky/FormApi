import { NextRequest, NextResponse } from "next/server";

// Only the public booking pages (/book/[id] and /[username]/[slug]) are meant
// to be embedded as a widget on a third-party site — everything else,
// including the authenticated app itself, has no reason to be framed and
// allowing it site-wide (the previous config did, via X-Frame-Options:
// ALLOWALL + frame-ancestors *) opens every page up to clickjacking.
function isEmbeddableBookingPage(pathname: string): boolean {
  if (pathname.startsWith("/book/")) return true;
  const segments = pathname.split("/").filter(Boolean);
  return segments.length === 2 && !pathname.startsWith("/api/");
}

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Simply forward the request - Supabase SDK handles session persistence
  // via cookies automatically in the browser
  if (isEmbeddableBookingPage(request.nextUrl.pathname)) {
    response.headers.set("Content-Security-Policy", "frame-ancestors *");
  } else {
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("Content-Security-Policy", "frame-ancestors 'self'");
  }

  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
