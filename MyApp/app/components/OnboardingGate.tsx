"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import OnboardingModal from "@/app/components/OnboardingModal";

type OnboardingState = "checking" | "none" | "full" | "username-only";

// Mounted once on each authenticated page (/builder, /inbox) — self-contained,
// no props, no interaction with the host page's own auth-check effect. Decides
// independently whether this user still needs the mandatory first-login flow.
//
// Detection needs no separate "onboarded" flag: profiles.username is NOT NULL,
// so a profile row simply not existing yet IS the "hasn't onboarded" signal.
export default function OnboardingGate() {
  const [state, setState] = useState<OnboardingState>("checking");

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user || !session.user.email_confirmed_at) {
        if (!cancelled) setState("none");
        return;
      }

      const [{ data: profile }, { data: workspace }] = await Promise.all([
        supabase.from("profiles").select("username").eq("id", session.user.id).maybeSingle(),
        supabase.from("workspace_agents").select("name").eq("user_id", session.user.id).limit(1).maybeSingle(),
      ]);

      if (cancelled) return;

      if (profile?.username) {
        setState("none");
      } else if (workspace) {
        setState("username-only");
      } else {
        setState("full");
      }
    };

    check();
    return () => { cancelled = true; };
  }, []);

  if (state === "checking" || state === "none") return null;
  return <OnboardingModal mode={state} />;
}
