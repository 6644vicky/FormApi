"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { deleteUserAccount } from "@/app/actions/deleteUser";
import CryptoJS from "crypto-js";
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
import { DeleteIcon, SettingsIcon, LogOutIcon } from "@chakra-ui/icons";

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

const navItems = [
  { label: "Home", icon: "home" },
  { label: "Messages", icon: "messages" },
  { label: "Settings", icon: "settings" },
  { label: "Help", icon: "help" },
];

export default function InboxPage() {
  const toast = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [selectedNav, setSelectedNav] = useState("Messages");
  const [searchQuery, setSearchQuery] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const { isOpen: isFeedbackOpen, onOpen: onFeedbackOpen, onClose: onFeedbackClose } = useDisclosure();
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [isFeedbackSubmitting, setIsFeedbackSubmitting] = useState(false);

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

          // Fetch Gravatar image
          try {
            const emailHash = hashEmail(email.toLowerCase().trim());
            const gravatarUrl = `https://www.gravatar.com/avatar/${emailHash}?d=404&s=128`;

            // Check if Gravatar image exists
            const response = await fetch(gravatarUrl);
            if (response.ok) {
              setAvatarUrl(gravatarUrl);
            }
          } catch (error) {
            console.error("Error fetching Gravatar:", error);
          }

          setIsLoading(false);
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
    if (!feedbackMessage.trim()) {
      toast({
        title: "Error",
        description: "Please enter your feedback",
        status: "error",
        isClosable: true,
      });
      return;
    }

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

  if (isLoading) {
    return <Box bg="dark.bg" w="100%" h="100vh" />;
  }

  return (
    <Flex h="100vh" w="100vw" bg="dark.bg" overflow="hidden" position="fixed" top={0} left={0}>
      {/* Sidebar */}
      <VStack
        w="64px"
        h="100%"
        bg="customGray.100"
        borderRight="1px solid"
        borderColor="light.border"
        spacing={0}
        align="stretch"
        p="12px"
        overflow="hidden"
      >
        {/* Logo */}
        <Box
          w="36px"
          h="36px"
          bg="brand.primary"
          borderRadius="base"
          display="flex"
          alignItems="center"
          justifyContent="center"
          mb="xl"
          cursor="pointer"
        >
          <Text fontSize="lg" fontWeight="bold" color="white">W</Text>
        </Box>

        {/* Nav Items */}
        <VStack spacing="16px" flex={1}>
          {navItems.map((item) => {
            const renderSvgIcon = () => {
              const strokeColor = selectedNav === item.label ? "#ffffff" : "#27272a";

              if (item.icon === "home") {
                return (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 12H15.6L13.8 14.7H10.2L8.4 12H3M3 12L6.105 5.79905C6.25402 5.49916 6.48374 5.24678 6.76834 5.0703C7.05294 4.89382 7.38112 4.80023 7.716 4.80005H16.284C16.6189 4.80023 16.9471 4.89382 17.2317 5.0703C17.5163 5.24678 17.746 5.49916 17.895 5.79905L21 12V17.4C21 17.8774 20.8104 18.3353 20.4728 18.6728C20.1352 19.0104 19.6774 19.2 19.2 19.2H4.8C4.32261 19.2 3.86477 19.0104 3.52721 18.6728C3.18964 18.3353 3 17.8774 3 17.4V12Z" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                );
              }

              if (item.icon === "messages") {
                return (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 16.5V21M9.30001 10.884C9.29983 11.2189 9.20624 11.5471 9.02976 11.8317C8.85328 12.1163 8.6009 12.346 8.30101 12.495L6.69901 13.305C6.39912 13.454 6.14675 13.6837 5.97026 13.9683C5.79378 14.2529 5.70019 14.5811 5.70001 14.916V15.6C5.70001 15.8387 5.79483 16.0676 5.96362 16.2364C6.1324 16.4052 6.36132 16.5 6.60001 16.5H17.4C17.6387 16.5 17.8676 16.4052 18.0364 16.2364C18.2052 16.0676 18.3 15.8387 18.3 15.6V14.916C18.2998 14.5811 18.2062 14.2529 18.0298 13.9683C17.8533 13.6837 17.6009 13.454 17.301 13.305L15.699 12.495C15.3991 12.346 15.1467 12.1163 14.9703 11.8317C14.7938 11.5471 14.7002 11.2189 14.7 10.884V7.5C14.7 7.26131 14.7948 7.03239 14.9636 6.8636C15.1324 6.69482 15.3613 6.6 15.6 6.6C16.0774 6.6 16.5352 6.41036 16.8728 6.07279C17.2104 5.73523 17.4 5.27739 17.4 4.8C17.4 4.32261 17.2104 3.86477 16.8728 3.52721C16.5352 3.18964 16.0774 3 15.6 3H8.40001C7.92262 3 7.46479 3.18964 7.12722 3.52721C6.78965 3.86477 6.60001 4.32261 6.60001 4.8C6.60001 5.27739 6.78965 5.73523 7.12722 6.07279C7.46479 6.41036 7.92262 6.6 8.40001 6.6C8.63871 6.6 8.86763 6.69482 9.03641 6.8636C9.20519 7.03239 9.30001 7.26131 9.30001 7.5V10.884Z" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                );
              }

              if (item.icon === "settings") {
                return (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20.3255 15.4911C19.7516 16.8486 18.8541 18.0448 17.7113 18.9752C16.5685 19.9056 15.2153 20.5417 13.7699 20.8281C12.3245 21.1144 10.8311 21.0422 9.42004 20.6178C8.00901 20.1934 6.72339 19.4298 5.67559 18.3935C4.62778 17.3573 3.84969 16.0801 3.40933 14.6736C2.96898 13.2671 2.87977 11.7741 3.14951 10.3251C3.41926 8.87611 4.03973 7.51529 4.95669 6.3616C5.87365 5.20791 7.05918 4.29648 8.40963 3.70699M20.136 11.9811C20.634 11.9811 21.0426 11.576 20.993 11.0806C20.785 9.0091 19.8673 7.07323 18.3954 5.60122C16.9235 4.12921 14.988 3.21165 12.9171 3.00409C12.421 2.95446 12.0169 3.36321 12.0169 3.86128V11.0797C12.0169 11.319 12.1119 11.5486 12.2811 11.7178C12.4502 11.887 12.6797 11.982 12.9189 11.982L20.136 11.9811Z" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                );
              }

              if (item.icon === "help") {
                return (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 7H11M14 17H5M14 17C14 18.6569 15.3431 20 17 20C18.6569 20 20 18.6569 20 17C20 15.3431 18.6569 14 17 14C15.3431 14 14 15.3431 14 17ZM10 7C10 8.65685 8.65685 10 7 10C5.34315 10 4 8.65685 4 7C4 5.34315 5.34315 4 7 4C8.65685 4 10 5.34315 10 7Z" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                );
              }
            };

            return (
              <Button
                key={item.label}
                variant="unstyled"
                w="36px"
                h="36px"
                display="flex"
                alignItems="center"
                justifyContent="center"
                bg="transparent"
                _hover={{ bg: "transparent" }}
                onClick={() => setSelectedNav(item.label)}
                borderRadius="base"
                p={0}
              >
                <Box
                  w="36px"
                  h="36px"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  bg={selectedNav === item.label ? "customGray.800" : "customGray.100"}
                  borderRadius="base"
                  transition="all 0.2s"
                  _hover={selectedNav === item.label ? {} : { bg: "customGray.200" }}
                >
                  {renderSvgIcon()}
                </Box>
              </Button>
            );
          })}
        </VStack>

        {/* Chat Icon and Account Avatar */}
        <VStack spacing="12px">
          {/* Chat Icon */}
          <Box
            w="36px"
            h="36px"
            display="flex"
            alignItems="center"
            justifyContent="center"
            bg="customGray.100"
            borderRadius="base"
            cursor="pointer"
            _hover={{ bg: "customGray.200" }}
            onClick={onFeedbackOpen}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 7V9M12 13H12.01M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="#27272A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Box>

          {/* Account Menu */}
          <Menu>
            <MenuButton as="div" p={0}>
              <Avatar
                src={avatarUrl || undefined}
                name={userEmail ? userEmail.charAt(0).toUpperCase() : "U"}
                bg="brand.primary"
                color="white"
                size="sm"
                cursor="pointer"
                _hover={{ bg: "brand.primaryHover" }}
              />
            </MenuButton>
            <MenuList bg="white" borderColor="light.border">
              <MenuItem onClick={handleDeleteAccount} color="red.500">
                Delete Account
              </MenuItem>
              <MenuItem onClick={() => supabase.auth.signOut().then(() => router.push("/"))}>
                Sign Out
              </MenuItem>
            </MenuList>
          </Menu>
        </VStack>
      </VStack>

      {/* Main Content */}
      <VStack
        flex={1}
        bg="dark.bg"
        spacing={0}
        align="stretch"
        overflow="hidden"
      >
        {/* Header */}
        <HStack
          h="80px"
          px="2xl"
          borderBottom="1px solid"
          borderColor="dark.border"
          spacing="lg"
          bg="dark.bg"
        >
          <VStack align="start" spacing="xs" flex={1}>
            <Heading size="sm" color="dark.text" fontWeight="semibold">
              Messages
            </Heading>
            <Text fontSize="xs" color="dark.secondary">
              {mockMessages.length} new messages
            </Text>
          </VStack>

          <Input
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            w="300px"
            h="44px"
            bg="dark.surface"
            border="1px solid"
            borderColor="dark.border"
            color="dark.text"
            _placeholder={{ color: "dark.secondary" }}
            _focus={{ borderColor: "brand.primary", boxShadow: "0 0 0 3px rgba(147, 51, 234, 0.1)" }}
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
              bg="dark.surface"
              border="1px solid"
              borderColor="dark.border"
              borderRadius="base"
              p="lg"
              _hover={{ bg: "dark.muted", cursor: "pointer" }}
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
      <Modal isOpen={isFeedbackOpen} onClose={onFeedbackClose} isCentered>
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
            <Textarea
              placeholder="Tell us what you think..."
              value={feedbackMessage}
              onChange={(e) => setFeedbackMessage(e.target.value)}
              minH="200px"
              bg="white"
              border="1px solid"
              borderColor="customGray.300"
              color="dark.text"
              _placeholder={{ color: "customGray.500" }}
              _focus={{
                borderColor: "brand.primary",
                boxShadow: "0 0 0 3px rgba(147, 51, 234, 0.1)",
              }}
              borderRadius="base"
              resize="none"
            />
          </ModalBody>

          <ModalFooter gap="12px" px="16px" py="16px">
            <Button
              variant="outline"
              colorScheme="gray"
              onClick={onFeedbackClose}
              borderColor="customGray.300"
              color="dark.text"
              _hover={{ bg: "customGray.100" }}
              borderRadius="base"
            >
              Cancel
            </Button>
            <Button
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
