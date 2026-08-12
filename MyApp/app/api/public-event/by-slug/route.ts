import { NextRequest, NextResponse } from "next/server";
import { getPublicEventBySlug } from "@/lib/publicEvent";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username");
  const slug = searchParams.get("slug");

  if (!username || !slug) {
    return NextResponse.json({ error: "Missing username or slug" }, { status: 400 });
  }

  const event = await getPublicEventBySlug(username, slug);

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  return NextResponse.json(event);
}
