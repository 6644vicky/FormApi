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
import { DeleteIcon, SettingsIcon, LogOutIcon, HomeIcon } from "@chakra-ui/icons";

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
    <Flex h="100vh" bg="dark.bg" overflow="hidden">
      {/* Sidebar */}
      <VStack
        w="64px"
        bg="light.bg"
        borderRight="1px solid"
        borderColor="light.border"
        spacing={0}
        align="stretch"
        py="lg"
        px="md"
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
          {navItems.map((item) => (
            <Button
              key={item.label}
              variant="unstyled"
              w="44px"
              h="44px"
              display="flex"
              alignItems="center"
              justifyContent="center"
              bg={selectedNav === item.label ? "dark.surface" : "transparent"}
              _hover={{ bg: "gray.200" }}
              onClick={() => setSelectedNav(item.label)}
              borderRadius="base"
            >
              {item.icon === "home" && <HomeIcon boxSize={5} color={selectedNav === item.label ? "brand.primary" : "dark.text"} />}
              {item.icon === "messages" && <Text fontSize="lg">💬</Text>}
              {item.icon === "settings" && <SettingsIcon boxSize={5} color={selectedNav === item.label ? "brand.primary" : "dark.text"} />}
              {item.icon === "help" && <Text fontSize="lg" fontWeight="bold">?</Text>}
            </Button>
          ))}
        </VStack>

        {/* Account Menu */}
        <Menu>
          <MenuButton
            as={Button}
            variant="unstyled"
            w="44px"
            h="44px"
            display="flex"
            alignItems="center"
            justifyContent="center"
            borderRadius="base"
            _hover={{ bg: "gray.200" }}
          >
            <Box w="20px" h="20px" borderRadius="full" bg="dark.text" />
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
