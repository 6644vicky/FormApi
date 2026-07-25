"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "./supabase";

export function useAuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        const hash = window.location.hash;
        const params = new URLSearchParams(window.location.search);
        const error = params.get("error");

        console.log("Checking for OAuth response...");
        console.log("Hash present:", !!hash);
        console.log("Error param:", error);

        // Check if this is an OAuth callback response
        if (hash.includes("access_token") || error === "no_code") {
          console.log("OAuth response detected!");

          // Parse the hash to extract tokens
          const hashParams = new URLSearchParams(hash.substring(1)); // Remove '#'
          const accessToken = hashParams.get("access_token");
          const refreshToken = hashParams.get("refresh_token");
          const expiresIn = hashParams.get("expires_in");

          console.log("Extracted tokens:", {
            hasAccessToken: !!accessToken,
            hasRefreshToken: !!refreshToken,
            expiresIn,
          });

          if (accessToken) {
            // Use the Supabase client to set the session with the access token
            const { data, error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || "",
            });

            console.log("setSession result:", { success: !!data, error: sessionError });

            if (sessionError) {
              console.error("Error setting session:", sessionError);
              window.history.replaceState({}, document.title, window.location.pathname);
              return;
            }

            if (data?.session) {
              console.log("✓ Session established for:", data.session.user.email);
              // Clear the hash and error from the URL
              window.history.replaceState({}, document.title, window.location.pathname);
              // Redirect to builder
              setTimeout(() => {
                router.push("/builder");
              }, 500);
            }
          } else {
            console.warn("No access token found in hash");
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        }
      } catch (error) {
        console.error("OAuth callback error:", error);
      }
    };

    handleOAuthCallback();
  }, [router]);
}
