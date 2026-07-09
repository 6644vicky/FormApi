"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { deleteUserAccount } from "@/app/actions/deleteUser";
import CryptoJS from "crypto-js";
import Sidebar from "@/app/components/Sidebar";
import {
  Box,
  Flex,
  VStack,
  HStack,
  Avatar,
  Text,
  Heading,
  Button,
  Input,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useToast,
  IconButton,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Textarea,
} from "@chakra-ui/react";
import { DeleteIcon, SettingsIcon } from "@chakra-ui/icons";

interface Message {
  id: number;
  sender: string;
  initials: string;
  avatarColor: string;
  subject: string;
  category: string;
  status: "live" | "resolved" | "escalated";
  timestamp: string;
}

const mockMessages: Message[] = [
  {
    id: 1,
    sender: "Vicky Vignesh",
    initials: "V",
    avatarColor: "#9333ea",
    subject: "Welcome to our platform",
    category: "System",
    status: "live",
    timestamp: "2 min ago",
  },
  {
    id: 2,
    sender: "Sarah Johnson",
    initials: "S",
    avatarColor: "#a855f7",
    subject: "How do I set up my account?",
    category: "Support",
    status: "live",
    timestamp: "1 hour ago",
  },
  {
    id: 3,
    sender: "Product Team",
    initials: "P",
    avatarColor: "#7c3aed",
    subject: "New features available",
    category: "Update",
    status: "live",
    timestamp: "3 hours ago",
  },
];

export default function InboxPage() {
  const toast = useToast();
  const router = useRouter();
  const [selectedNav, setSelectedNav] = useState("Home");
  const [searchQuery, setSearchQuery] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const { isOpen: isFeedbackOpen, onOpen: onFeedbackOpen, onClose: onFeedbackClose } = useDisclosure();
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [isFeedbackSubmitting, setIsFeedbackSubmitting] = useState(false);
  const [feedbackError, setFeedbackError] = useState("");

  useEffect(() => {
    const cached = localStorage.getItem("user_avatar");
    if (cached) {
      setAvatarUrl(cached);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        await supabase.auth.refreshSession();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          router.push("/");
        } else if (!session.user.email_confirmed_at) {
          router.push("/verify-email?email=" + encodeURIComponent(session.user.email || ""));
        } else {
          const email = session.user.email || "";
          setUserEmail(email);

          const googlePicture = session.user.user_metadata?.picture || session.user.user_metadata?.avatar_url || session.user.identities?.[0]?.identity_data?.picture;

          if (googlePicture) {
            const cachedUrl = localStorage.getItem("user_avatar");
            if (cachedUrl === googlePicture) {
              if (avatarUrl !== googlePicture) {
                setAvatarUrl(googlePicture);
              }
              return;
            }
            setAvatarUrl(googlePicture);
            localStorage.setItem("user_avatar", googlePicture);
            return;
          }

          const emailHash = hashEmail(email.toLowerCase().trim());
          const gravatarUrl = `https://www.gravatar.com/avatar/${emailHash}?d=identicon&s=128`;

          const cachedUrl = localStorage.getItem("user_avatar");
          if (cachedUrl === gravatarUrl) {
            if (avatarUrl !== gravatarUrl) {
              setAvatarUrl(gravatarUrl);
            }
            return;
          }

          try {
            const response = await fetch(gravatarUrl);
            if (response.ok) {
              setAvatarUrl(gravatarUrl);
              localStorage.setItem("user_avatar", gravatarUrl);
            } else {
              const initials = email.charAt(0).toUpperCase();
              setAvatarUrl("");
            }
          } catch (error) {
            console.error("Error fetching Gravatar:", error);
          }
        }
      } catch (error) {
        console.error("Auth check error:", error);
        router.push("/");
      }
    };
    checkAuth();
  }, [router]);

  const hashEmail = (email: string): string => {
    return CryptoJS.MD5(email).toString();
  };

  const handleFeedbackSubmit = async () => {
    if (!feedbackMessage.trim() || feedbackMessage.trim().length < 10) {
      setFeedbackError("Please enter at least 10 characters");
      return;
    }

    setFeedbackError("");

    setIsFeedbackSubmitting(true);

    try {
      const response = await fetch("https://formspree.io/f/mdarbajp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: feedbackMessage,
          email: userEmail,
        }),
      });

      if (response.ok) {
        toast({
          title: "Thank you!",
          description: "Your feedback has been sent successfully",
          status: "success",
          isClosable: true,
        });
        setFeedbackMessage("");
        onFeedbackClose();
      } else {
        throw new Error("Failed to submit feedback");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send feedback. Please try again.",
        status: "error",
        isClosable: true,
      });
    } finally {
      setIsFeedbackSubmitting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm("Are you sure? This cannot be undone.")) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      if (!userId) {
        toast({
          title: "Error",
          description: "User ID not found",
          status: "error",
          isClosable: true,
        });
        return;
      }

      const result = await deleteUserAccount(userId);
      if (result.success) {
        toast({
          title: "Account deleted",
          status: "success",
          isClosable: true,
        });
        router.push("/");
      }
    } catch (error) {
      toast({
        title: "Error deleting account",
        status: "error",
        isClosable: true,
      });
    }
  };

  return (
    <Flex h="100vh" w="100vw" bg="dark.bg" overflow="hidden" position="fixed" top={0} left={0}>
      {/* Sidebar Component */}
      <Sidebar
        selectedNav={selectedNav}
        onNavClick={setSelectedNav}
        userEmail={userEmail}
        avatarUrl={avatarUrl}
        onDelete={handleDeleteAccount}
        onFeedbackOpen={onFeedbackOpen}
        isLoading={!hydrated}
      />

      {/* Main Content */}
      <VStack
        flex={1}
        bg="white"
        spacing={0}
        align="stretch"
        overflow="hidden"
        pt="12px"
      >
        {/* Header */}
        <HStack
          h="80px"
          px="2xl"
          borderBottom="1px solid"
          borderColor="customGray.200"
          spacing="lg"
          bg="white"
        >
          <VStack align="start" spacing="xs" flex={1}>
            <Heading size="sm" color="customGray.800" fontWeight="semibold">
              Messages
            </Heading>
            <Text fontSize="xs" color="customGray.500">
              {mockMessages.length} new messages
            </Text>
          </VStack>

          <Input
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            w="300px"
            h="44px"
            bg="customGray.100"
            border="1px solid"
            borderColor="customGray.300"
            color="customGray.800"
            _placeholder={{ color: "customGray.500" }}
            _focus={{ borderColor: "customGray.500", boxShadow: "0 0 0 4px rgba(39, 39, 42, 0.10)" }}
            borderRadius="base"
          />
        </HStack>

        {/* Messages List */}
        <VStack
          flex={1}
          overflowY="auto"
          align="stretch"
          spacing="md"
          px="2xl"
          py="lg"
        >
          {mockMessages.map((message) => (
            <Box
              key={message.id}
              bg="white"
              border="1px solid"
              borderColor="customGray.200"
              borderRadius="12px"
              p="lg"
              _hover={{ bg: "customGray.50", cursor: "pointer" }}
              transition="all 0.2s"
            >
              <HStack justify="space-between">
                <HStack spacing="md" flex={1}>
                  <Avatar
                    name={message.initials}
                    bg={message.avatarColor}
                    color="white"
                    size="md"
                    fontWeight="bold"
                  />
                  <VStack align="start" spacing={0}>
                    <HStack spacing="sm">
                      <Text fontSize="sm" fontWeight="semibold" color="dark.text">
                        {message.sender}
                      </Text>
                      <Box
                        px="sm"
                        py="2px"
                        bg="brand.primary"
                        borderRadius="pill"
                        display="inline-block"
                      >
                        <Text fontSize="xs" color="white" fontWeight="medium">
                          {message.category}
                        </Text>
                      </Box>
                    </HStack>
                    <Text fontSize="sm" color="dark.text" fontWeight="medium">
                      {message.subject}
                    </Text>
                    <Text fontSize="xs" color="dark.secondary">
                      {message.timestamp}
                    </Text>
                  </VStack>
                </HStack>
                <Box
                  w="8px"
                  h="8px"
                  borderRadius="full"
                  bg={
                    message.status === "live"
                      ? "#10b981"
                      : message.status === "resolved"
                      ? "#6b7280"
                      : "#ef4444"
                  }
                />
              </HStack>
            </Box>
          ))}
        </VStack>
      </VStack>

      {/* Feedback Modal */}
      <Modal
        isOpen={isFeedbackOpen}
        onClose={() => {
          onFeedbackClose();
          setFeedbackError("");
          setFeedbackMessage("");
        }}
        isCentered
      >
        <ModalOverlay bg="rgba(0, 0, 0, 0.5)" />
        <ModalContent
          bg="white"
          borderRadius="lg"
          maxW="500px"
          boxShadow="0 10px 40px rgba(0, 0, 0, 0.1)"
        >
          <ModalHeader
            fontSize="sm"
            fontWeight="semibold"
            color="customGray.800"
            px="16px"
            pt="16px"
            pb="0px"
          >
            Share feedback about Weav
          </ModalHeader>

          <ModalBody py="16px" px="16px">
            <VStack align="stretch" spacing="8px">
              <Textarea
                placeholder="Tell us what you think..."
                value={feedbackMessage}
                onChange={(e) => {
                  setFeedbackMessage(e.target.value);
                  setFeedbackError("");
                }}
                minH="200px"
                bg="white"
                border="1px solid"
                borderColor={feedbackError ? "#FF6B6B" : "customGray.300"}
                color={feedbackMessage ? "customGray.800" : "customGray.500"}
                fontSize="sm"
                fontWeight="normal"
                _placeholder={{ color: "customGray.500", fontSize: "sm", fontWeight: "normal" }}
                _focus={{
                  borderColor: feedbackError ? "#FF6B6B" : "customGray.500",
                  boxShadow: feedbackError
                    ? "0 0 0 3px rgba(255, 107, 107, 0.1)"
                    : "0 0 0 4px rgba(39, 39, 42, 0.10)",
                  color: "customGray.800",
                }}
                borderRadius="base"
                resize="none"
              />
              {feedbackError && (
                <Text fontSize="xs" color="#FF6B6B" fontWeight="normal">
                  {feedbackError}
                </Text>
              )}
            </VStack>
          </ModalBody>

          <ModalFooter gap="12px" px="16px" pt="0px" pb="16px">
            <Button
              size="sm"
              variant="outline"
              colorScheme="gray"
              onClick={onFeedbackClose}
              borderColor="customGray.300"
              color="customGray.800"
              _hover={{ bg: "customGray.100", borderColor: "customGray.500" }}
              borderRadius="base"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              bg="customGray.800"
              color="white"
              onClick={handleFeedbackSubmit}
              isLoading={isFeedbackSubmitting}
              _hover={{ bg: "customGray.700" }}
              borderRadius="base"
            >
              Submit
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Flex>
  );
}
