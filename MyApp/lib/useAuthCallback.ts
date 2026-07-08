"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "./supabase";

export function useAuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        // Get the hash from the URL
        const hash = window.location.hash;

        // Check if this is an OAuth callback (has access_token in hash)
        if (hash && hash.includes("access_token")) {
          console.log("OAuth callback detected, waiting for session...");

          // Wait for Supabase to process the OAuth response
          await new Promise((resolve) => setTimeout(resolve, 500));

          // Get the current session
          const { data: { session }, error } = await supabase.auth.getSession();

          if (error) {
            console.error("Session error:", error);
            router.push("/?error=session");
            return;
          }

          if (session) {
            console.log("Session established:", session.user.email);
            // Clear the hash from the URL
            window.history.replaceState({}, document.title, window.location.pathname);
            // Redirect to inbox
            router.push("/inbox");
          }
        }
      } catch (error) {
        console.error("OAuth callback error:", error);
      }
    };

    handleOAuthCallback();
  }, [router]);
}
