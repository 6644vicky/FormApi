"use client";

import { useParams } from "next/navigation";
import { PublicBookingView } from "@/app/components/PublicBookingView";

export default function VanityBookingPage() {
  const params = useParams();
  const username = params?.username as string;
  const slug = params?.slug as string;

  return (
    <PublicBookingView
      fetchUrl={`/api/public-event/by-slug?username=${encodeURIComponent(username)}&slug=${encodeURIComponent(slug)}`}
    />
  );
}
