"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Heading,
  Text,
  Button,
  HStack,
} from "@chakra-ui/react";
import { supabase } from "@/lib/supabase";
import { validateUsernameFormat } from "@/lib/username";
import UsernameField from "@/app/components/UsernameField";

interface UsernameModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUsername: string;
  onSaved: (username: string) => void;
}

export default function UsernameModal({ isOpen, onClose, currentUsername, onSaved }: UsernameModalProps) {
  const [value, setValue] = useState(currentUsername);
  const [isValid, setIsValid] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setValue(currentUsername);
      setSaveError("");
    }
  }, [isOpen, currentUsername]);

  const handleValidationChange = useCallback((state: { isValid: boolean; isChecking: boolean }) => {
    setIsValid(state.isValid);
    setIsChecking(state.isChecking);
  }, []);

  const handleSave = async () => {
    const formatError = validateUsernameFormat(value);
    if (formatError) {
      setSaveError(formatError);
      return;
    }

    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { error: upsertError } = await supabase
        .from("profiles")
        .upsert({ id: session.user.id, username: value, updated_at: new Date().toISOString() });

      if (upsertError) {
        // 23505 = unique_violation — someone else claimed it between the
        // availability check above and this save.
        setSaveError(
          upsertError.code === "23505"
            ? "This username has already been taken."
            : upsertError.message
        );
        return;
      }

      onSaved(value);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay bg="rgba(0, 0, 0, 0.5)" />
      <ModalContent bg="white" borderRadius="lg" boxShadow="0 10px 40px rgba(0, 0, 0, 0.1)">
        <ModalHeader pb={0} pt="lg">
          <Heading size="sm" color="customGray.800">
            Your username
          </Heading>
        </ModalHeader>
        <ModalBody pt="md">
          <Text fontSize="sm" color="customGray.600" mb="12px">
            This is the public link people use to book time with you: formsparrow.com/{value || "username"}/...
          </Text>
          <UsernameField
            value={value}
            onValueChange={(v) => { setValue(v); setSaveError(""); }}
            currentUsername={currentUsername}
            onValidationChange={handleValidationChange}
            externalError={saveError}
          />
        </ModalBody>
        <ModalFooter pt="lg">
          <HStack spacing="md">
            <Button variant="outline" borderColor="customGray.300" color="customGray.800" onClick={onClose}>
              Cancel
            </Button>
            <Button
              bg="customGray.800"
              color="white"
              _hover={{ bg: "customGray.700" }}
              isLoading={isSaving}
              isDisabled={isChecking || !isValid}
              onClick={handleSave}
            >
              Save
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
