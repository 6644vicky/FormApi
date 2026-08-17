import { NextRequest, NextResponse } from "next/server";
import { getPublicEventById } from "@/lib/publicEvent";

// Next.js otherwise caches this route handler's underlying fetch calls, so an
// owner's edit (e.g. toggling hide_form_page) would keep serving a stale
// response to guests until an unrelated redeploy or revalidation happened.
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const event = await getPublicEventById(params.id);

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  // Belt-and-suspenders alongside `dynamic = "force-dynamic"` above — makes
  // sure the browser itself never caches this response either.
  return NextResponse.json(event, { headers: { "Cache-Control": "no-store" } });
}
