import { NextRequest, NextResponse } from "next/server";
import { getPublicEventById } from "@/lib/publicEvent";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const event = await getPublicEventById(params.id);

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  return NextResponse.json(event);
}
