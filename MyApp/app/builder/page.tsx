"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
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
  Textarea,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useToast,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Select,
} from "@chakra-ui/react";
import { HomeIcon } from "@chakra-ui/icons";

export default function BuilderPage() {
  const toast = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [selectedNav, setSelectedNav] = useState("Settings");
  const [userEmail, setUserEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

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
          setUserEmail(session.user.email || "");
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Auth check error:", error);
        router.push("/");
      }
    };
    checkAuth();
  }, [router]);

  const navItems = [
    { label: "Home", icon: "home" },
    { label: "Messages", icon: "messages" },
    { label: "Settings", icon: "settings" },
    { label: "Help", icon: "help" },
  ];

  if (isLoading) {
    return <Box bg="white" w="100%" h="100vh" />;
  }

  return (
    <Flex h="100vh" w="100vw" bg="white" overflow="hidden" position="fixed" top={0} left={0}>
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
          {navItems.map((item) => (
            <Button
              key={item.label}
              variant="unstyled"
              w="36px"
              h="36px"
              display="flex"
              alignItems="center"
              justifyContent="center"
              bg={selectedNav === item.label ? "customGray.800" : "customGray.100"}
              _hover={selectedNav === item.label ? {} : { bg: "customGray.200" }}
              onClick={() => setSelectedNav(item.label)}
              borderRadius="base"
              p={0}
            >
              <Text fontSize="sm" color={selectedNav === item.label ? "white" : "customGray.800"}>
                {item.label.charAt(0).toUpperCase()}
              </Text>
            </Button>
          ))}
        </VStack>

        {/* Chat Icon and Account Avatar */}
        <VStack spacing="12px">
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
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 7V9M12 13H12.01M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="#27272A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Box>

          <Menu>
            <MenuButton
              as="div"
              p={0}
            >
              <Avatar
                name={userEmail ? userEmail.charAt(0).toUpperCase() : "U"}
                bg="brand.primary"
                color="white"
                size="sm"
                cursor="pointer"
                _hover={{ bg: "brand.primaryHover" }}
              />
            </MenuButton>
            <MenuList bg="white" borderColor="light.border">
              <MenuItem onClick={() => supabase.auth.signOut().then(() => router.push("/"))}>
                Sign Out
              </MenuItem>
            </MenuList>
          </Menu>
        </VStack>
      </VStack>

      {/* Main Content */}
      <VStack flex={1} bg="white" spacing={0} align="stretch" overflow="hidden">
        {/* Header with Tabs */}
        <VStack align="stretch" spacing={0} borderBottom="1px solid" borderColor="customGray.200" bg="white">
          <HStack h="80px" px="2xl" spacing="lg" align="center">
            <Heading size="sm" color="customGray.800" fontWeight="semibold">
              Builder
            </Heading>
          </HStack>

          <Tabs w="full" variant="unstyled" defaultIndex={0}>
            <TabList borderBottom="1px solid" borderColor="customGray.200" px="2xl">
              <Tab
                _selected={{
                  borderBottom: "2px solid",
                  borderColor: "brand.primary",
                  color: "brand.primary",
                }}
                color="customGray.500"
                fontWeight="500"
                fontSize="sm"
                pb="16px"
              >
                Settings
              </Tab>
              <Tab
                _selected={{
                  borderBottom: "2px solid",
                  borderColor: "brand.primary",
                  color: "brand.primary",
                }}
                color="customGray.500"
                fontWeight="500"
                fontSize="sm"
                pb="16px"
              >
                Training
              </Tab>
              <Tab
                _selected={{
                  borderBottom: "2px solid",
                  borderColor: "brand.primary",
                  color: "brand.primary",
                }}
                color="customGray.500"
                fontWeight="500"
                fontSize="sm"
                pb="16px"
              >
                API
              </Tab>
            </TabList>

            {/* Tab Content */}
            <TabPanels overflowY="auto" flex={1}>
              {/* Settings Tab */}
              <TabPanel py="2xl" px="2xl">
                <VStack align="stretch" spacing="2xl" maxW="600px">
                  {/* General Section */}
                  <VStack align="stretch" spacing="lg">
                    <Heading size="sm" color="customGray.800" fontWeight="semibold">
                      General
                    </Heading>

                    <VStack align="stretch" spacing="sm">
                      <Text fontSize="sm" color="customGray.700" fontWeight="500">
                        Name
                      </Text>
                      <Input
                        placeholder="Enter builder name"
                        bg="white"
                        border="1px solid"
                        borderColor="customGray.300"
                        color="customGray.800"
                        _placeholder={{ color: "customGray.500" }}
                        _focus={{
                          borderColor: "customGray.500",
                          boxShadow: "0 0 0 4px rgba(39, 39, 42, 0.10)",
                        }}
                        borderRadius="base"
                      />
                    </VStack>

                    <VStack align="stretch" spacing="sm">
                      <Text fontSize="sm" color="customGray.700" fontWeight="500">
                        Description
                      </Text>
                      <Textarea
                        placeholder="Enter description"
                        minH="120px"
                        bg="white"
                        border="1px solid"
                        borderColor="customGray.300"
                        color="customGray.800"
                        _placeholder={{ color: "customGray.500" }}
                        _focus={{
                          borderColor: "customGray.500",
                          boxShadow: "0 0 0 4px rgba(39, 39, 42, 0.10)",
                        }}
                        borderRadius="base"
                        resize="none"
                      />
                    </VStack>
                  </VStack>

                  {/* Configuration Section */}
                  <VStack align="stretch" spacing="lg">
                    <Heading size="sm" color="customGray.800" fontWeight="semibold">
                      Configuration
                    </Heading>

                    <VStack align="stretch" spacing="sm">
                      <Text fontSize="sm" color="customGray.700" fontWeight="500">
                        Type
                      </Text>
                      <Select
                        bg="white"
                        border="1px solid"
                        borderColor="customGray.300"
                        color="customGray.800"
                        _focus={{
                          borderColor: "customGray.500",
                          boxShadow: "0 0 0 4px rgba(39, 39, 42, 0.10)",
                        }}
                        borderRadius="base"
                      >
                        <option>Assistant</option>
                        <option>Agent</option>
                        <option>Chatbot</option>
                      </Select>
                    </VStack>
                  </VStack>

                  <Button
                    bg="customGray.800"
                    color="white"
                    size="sm"
                    _hover={{ bg: "customGray.700" }}
                    borderRadius="base"
                    alignSelf="flex-start"
                  >
                    Save Changes
                  </Button>
                </VStack>
              </TabPanel>

              {/* Training Tab */}
              <TabPanel py="2xl" px="2xl">
                <VStack align="stretch" spacing="lg" maxW="600px">
                  <Text color="customGray.600">
                    Training content will be added here
                  </Text>
                </VStack>
              </TabPanel>

              {/* API Tab */}
              <TabPanel py="2xl" px="2xl">
                <VStack align="stretch" spacing="lg" maxW="600px">
                  <Text color="customGray.600">
                    API documentation will be added here
                  </Text>
                </VStack>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </VStack>
      </VStack>
    </Flex>
  );
}
