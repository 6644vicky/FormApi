"use client";

import { useEffect, useRef, useState } from "react";
import { Input, Text } from "@chakra-ui/react";
import { supabase } from "@/lib/supabase";
import { validateUsernameFormat } from "@/lib/username";

interface UsernameFieldProps {
  value: string;
  onValueChange: (value: string) => void;
  currentUsername: string;
  onValidationChange: (state: { isValid: boolean; isChecking: boolean }) => void;
  placeholder?: string;
  // Surfaced by the parent when saving hits a race-condition duplicate
  // (someone else claimed the name between the live check and the save) —
  // distinct from this field's own real-time validation error.
  externalError?: string;
}

// The input + debounced availability check + error text shared by
// UsernameModal (Settings -> edit username) and OnboardingModal (mandatory
// first-login flow) — both just embed this and read validity via
// onValidationChange rather than duplicating the check logic.
export default function UsernameField({
  value,
  onValueChange,
  currentUsername,
  onValidationChange,
  placeholder = "your-username",
  externalError = "",
}: UsernameFieldProps) {
  const [error, setError] = useState("");
  const displayError = error || externalError;
  const [isChecking, setIsChecking] = useState(false);
  const checkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    onValidationChange({ isValid: value.trim() !== "" && !error, isChecking });
  }, [value, error, isChecking, onValidationChange]);

  const handleChange = (raw: string) => {
    const next = raw.toLowerCase().trim();
    onValueChange(next);
    setError("");

    if (checkTimer.current) clearTimeout(checkTimer.current);
    if (next === "" || next === currentUsername) return;

    const formatError = validateUsernameFormat(next);
    if (formatError) {
      setError(formatError);
      return;
    }

    checkTimer.current = setTimeout(async () => {
      setIsChecking(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(
          `/api/username/availability?username=${encodeURIComponent(next)}&excludeUserId=${session?.user?.id || ""}`
        );
        const result = await res.json();
        if (!result.available) setError(result.reason || "This username has already been taken.");
      } finally {
        setIsChecking(false);
      }
    }, 400);
  };

  return (
    <>
      <Input
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        bg="customGray.50"
        border="1px solid"
        borderColor={displayError ? "red.500" : "customGray.300"}
        color="customGray.800"
        _focus={{ borderColor: displayError ? "red.500" : "customGray.500", boxShadow: displayError ? "0 0 0 3px rgba(239, 68, 68, 0.1)" : "0 0 0 3px rgba(39, 39, 42, 0.1)" }}
      />
      {displayError && (
        <Text fontSize="xs" color="red.500" fontWeight="500" mt="8px">
          {displayError}
        </Text>
      )}
    </>
  );
}
