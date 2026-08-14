"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { PublicBookingView } from "@/app/components/PublicBookingView";

export default function PublicBookingPage() {
  const params = useParams();
  const eventId = params?.id as string;

  return (
    <Suspense>
      <PublicBookingView fetchUrl={`/api/public-event/${eventId}`} />
    </Suspense>
  );
}
