"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { deleteUserAccount } from "@/app/actions/deleteUser";
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
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Auth check error:", error);
        router.push("/");
      }
    };
    checkAuth();
  }, [router]);

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
        py="8px"
        px="6px"
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
        <VStack spacing="md" flex={1}>
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
                    <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                );
              }

              if (item.icon === "settings") {
                return (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M19.07 4.93L17.65 7.07C17.3814 6.38503 16.9957 5.77267 16.5157 5.26537C16.0356 4.75806 15.4723 4.37383 14.85 4.14L16.27 2.29C16.9181 2.13077 17.5744 2.05658 18.2322 2.07C18.8901 2.08342 19.5406 2.18461 20.1701 2.37L19.07 4.93Z" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M4.93 19.07L7.07 17.65C6.38503 17.3814 5.77267 16.9957 5.26537 16.5157C4.75806 16.0356 4.37383 15.4723 4.14 14.85L2.29 16.27C2.13077 16.9181 2.05658 17.5744 2.07 18.2322C2.08342 18.8901 2.18461 19.5406 2.37 20.1701L4.93 19.07Z" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                );
              }

              if (item.icon === "help") {
                return (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M9.09 9C9.3251 8.33167 9.78915 7.76811 10.4 7.40913C11.0108 7.05016 11.7289 6.8999 12.4272 6.98986C13.1254 7.07981 13.7792 7.38579 14.2557 7.86227C14.7322 8.33875 15.0013 8.95233 15 9.6C15 11 13.5 11.9 13.5 11.9" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 18H12.01" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
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

        {/* Account Menu */}
        <Menu>
          <MenuButton
            as={Button}
            variant="unstyled"
            w="36px"
            h="36px"
            display="flex"
            alignItems="center"
            justifyContent="center"
            borderRadius="base"
            _hover={{ bg: "gray.200" }}
          >
            <Box w="16px" h="16px" borderRadius="full" bg="dark.text" />
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
    </Flex>
  );
}
