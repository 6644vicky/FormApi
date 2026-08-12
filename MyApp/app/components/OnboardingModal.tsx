"use client";

import { useCallback, useState } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Heading,
  Text,
  Input,
  Button,
  VStack,
} from "@chakra-ui/react";
import { supabase } from "@/lib/supabase";
import { validateUsernameFormat } from "@/lib/username";
import { createAgent } from "@/app/actions/agentActions";
import UsernameField from "@/app/components/UsernameField";
import ServiceSelector from "@/app/components/ServiceSelector";

const WEBSITE_PATTERN = /^(https?:\/\/)?([\w-]+\.)+[a-z]{2,}(\/\S*)?$/i;

interface OnboardingModalProps {
  // "full": brand-new user, no username and no workspace yet — collect all of it.
  // "username-only": pre-existing user who already has a workspace, just
  // needs a username to unblock the rest of the app.
  mode: "full" | "username-only";
}

// Shown by OnboardingGate on first login. Deliberately has no onClose/Cancel
// path — closeOnOverlayClick/closeOnEsc are off and there's no close button,
// so the only way out is completing the form.
export default function OnboardingModal({ mode }: OnboardingModalProps) {
  const [username, setUsername] = useState("");
  const [isUsernameValid, setIsUsernameValid] = useState(false);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const [website, setWebsite] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleUsernameValidationChange = useCallback((state: { isValid: boolean; isChecking: boolean }) => {
    setIsUsernameValid(state.isValid);
    setIsCheckingUsername(state.isChecking);
  }, []);

  const handleSubmit = async () => {
    setError("");

    const usernameFormatError = validateUsernameFormat(username);
    if (usernameFormatError) {
      setError(usernameFormatError);
      return;
    }

    if (mode === "full") {
      if (!workspaceName.trim()) {
        setError("Please enter a workspace name");
        return;
      }
      if (!WEBSITE_PATTERN.test(website.trim())) {
        setError("Please enter a valid website link");
        return;
      }
      if (selectedServices.length === 0) {
        setError("Please select at least one service");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { error: upsertError } = await supabase
        .from("profiles")
        .upsert({ id: session.user.id, username, updated_at: new Date().toISOString() });

      if (upsertError) {
        // 23505 = unique_violation — someone else claimed it between the
        // availability check and this save.
        setError(upsertError.code === "23505" ? "This username has already been taken." : upsertError.message);
        return;
      }

      if (mode === "full") {
        const created = await createAgent(session.user.id, {
          name: workspaceName.trim(),
          services: selectedServices,
          website: website.trim(),
        });
        if (!created) {
          setError("Couldn't create your workspace. Please try again.");
          return;
        }
      }

      // Neither the gate nor either host page (/builder, /inbox) shares
      // state with this modal, so a full reload is the simplest way for
      // them to pick up the new profile/workspace.
      window.location.reload();
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit =
    isUsernameValid &&
    !isCheckingUsername &&
    (mode === "username-only" || (workspaceName.trim() !== "" && website.trim() !== "" && selectedServices.length > 0));

  return (
    <Modal isOpen onClose={() => {}} closeOnOverlayClick={false} closeOnEsc={false} isCentered>
      <ModalOverlay bg="rgba(0, 0, 0, 0.5)" />
      <ModalContent bg="white" borderRadius="lg" boxShadow="0 10px 40px rgba(0, 0, 0, 0.1)">
        <ModalHeader pb={0} pt="lg">
          <Heading size="sm" color="customGray.800">
            {mode === "full" ? "Welcome — let's set up your workspace" : "Choose your username"}
          </Heading>
          <Text fontSize="sm" fontWeight="normal" color="customGray.500" mt="4px">
            {mode === "full"
              ? "This only takes a minute, and unlocks the rest of the app."
              : "One quick step before you continue."}
          </Text>
        </ModalHeader>
        <ModalBody pt="lg">
          <VStack align="stretch" spacing="16px">
            <VStack align="stretch" spacing="4px">
              <Text fontSize="sm" fontWeight="medium" color="customGray.800">Username</Text>
              <UsernameField
                value={username}
                onValueChange={setUsername}
                currentUsername=""
                onValidationChange={handleUsernameValidationChange}
              />
            </VStack>

            {mode === "full" && (
              <>
                <VStack align="stretch" spacing="4px">
                  <Text fontSize="sm" fontWeight="medium" color="customGray.800">Workspace name</Text>
                  <Input
                    placeholder="Enter name"
                    value={workspaceName}
                    onChange={(e) => {
                      const value = e.target.value;
                      setWorkspaceName(value.charAt(0).toUpperCase() + value.slice(1));
                    }}
                    fontSize="sm"
                    border="1px solid"
                    borderColor="customGray.300"
                    color="customGray.800"
                    _placeholder={{ color: "customGray.500" }}
                    _focus={{ borderColor: "customGray.500", boxShadow: "0 0 0 3px rgba(39, 39, 42, 0.1)" }}
                    borderRadius="base"
                  />
                </VStack>

                <VStack align="stretch" spacing="4px">
                  <Text fontSize="sm" fontWeight="medium" color="customGray.800">Website link</Text>
                  <Input
                    placeholder="https://yourcompany.com"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    fontSize="sm"
                    border="1px solid"
                    borderColor="customGray.300"
                    color="customGray.800"
                    _placeholder={{ color: "customGray.500" }}
                    _focus={{ borderColor: "customGray.500", boxShadow: "0 0 0 3px rgba(39, 39, 42, 0.1)" }}
                    borderRadius="base"
                  />
                </VStack>

                <VStack align="stretch" spacing="8px">
                  <Text fontSize="sm" fontWeight="medium" color="customGray.800">Select service</Text>
                  <ServiceSelector
                    selected={selectedServices}
                    onToggle={(service) => {
                      setSelectedServices(
                        selectedServices.includes(service)
                          ? selectedServices.filter((s) => s !== service)
                          : [...selectedServices, service]
                      );
                    }}
                  />
                </VStack>
              </>
            )}

            {error && (
              <Text fontSize="xs" color="red.500" fontWeight="500">
                {error}
              </Text>
            )}
          </VStack>
        </ModalBody>
        <ModalFooter pt="lg">
          <Button
            w="100%"
            bg="customGray.800"
            color="white"
            _hover={{ bg: "customGray.700" }}
            _disabled={{ bg: "customGray.400", cursor: "not-allowed" }}
            isLoading={isSubmitting}
            isDisabled={!canSubmit}
            onClick={handleSubmit}
          >
            {mode === "full" ? "Create workspace" : "Continue"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
