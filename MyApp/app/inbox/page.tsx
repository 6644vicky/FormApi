"use client";

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
  Badge,
  Input,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Textarea,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useToast,
} from "@chakra-ui/react";

interface Message {
  id: number;
  sender: string;
  initials: string;
  avatarColor: string;
  subject: string;
  category: string;
  status: "live" | "resolved" | "escalated";
  priority: number;
}

const mockMessages: Message[] = [
  {
    id: 1,
    sender: "Vicky Vignesh",
    initials: "W",
    avatarColor: "#8b5cf6",
    subject: "hi",
    category: "Normal",
    status: "live",
    priority: 1,
  },
  {
    id: 2,
    sender: "Sarah Johnson",
    initials: "S",
    avatarColor: "#a855f7",
    subject: "How do I set up my account?",
    category: "Normal",
    status: "live",
    priority: 2,
  },
  {
    id: 3,
    sender: "Product Team",
    initials: "P",
    avatarColor: "#9333ea",
    subject: "Would love to see dark mode...",
    category: "Normal",
    status: "live",
    priority: 3,
  },
];

export default function InboxPage() {
  const toast = useToast();
  const router = useRouter();
  const [selectedStatus, setSelectedStatus] = useState("live");
  const [selectedNav, setSelectedNav] = useState("Home");
  const [messages] = useState(mockMessages);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [selectedFeedback, setSelectedFeedback] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackError, setFeedbackError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Refresh session to get latest user data
        await supabase.auth.refreshSession();

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push("/");
        } else if (!session.user.email_confirmed_at) {
          // User is logged in but email not verified
          router.push("/verify-email?email=" + encodeURIComponent(session.user.email || ""));
        } else {
          // Email is confirmed, allow access
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
    const confirmDelete = window.confirm(
      "Are you sure you want to delete your account? This action cannot be undone."
    );

    if (!confirmDelete) return;

    try {
      // Get current user ID
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      if (!userId) {
        toast({
          title: "Error",
          description: "User ID not found",
          status: "error",
          duration: 4000,
          isClosable: true,
        });
        return;
      }

      // Call Server Action to delete account securely
      const result = await deleteUserAccount(userId);

      if (result.success) {
        toast({
          title: "Account deleted",
          description: "Your account has been successfully deleted",
          status: "success",
          duration: 3000,
          isClosable: true,
        });

        // Sign out and redirect to home
        await supabase.auth.signOut();
        router.push("/");
      }
    } catch (error) {
      console.error("Delete account error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete account",
        status: "error",
        duration: 4000,
        isClosable: true,
      });
    }
  };

  const currentUser = {
    name: "Segun Adebayo",
    email: "segun@weav.com",
    id: "USR_001",
  };

  const liveCount = messages.filter((m) => m.status === "live").length;
  const escalatedCount = messages.filter((m) => m.status === "escalated").length;

  const filteredMessages = messages.filter((m) => m.status === selectedStatus);
  const normalCount = filteredMessages.filter((m) => m.category === "Normal").length;

  const navItems = [
    { icon: "/assets/home-icon.svg", label: "Home", isImage: true },
    { icon: "/assets/ai-agent-icon.svg", label: "AI Agent", badge: true, isImage: true },
    { icon: "/assets/knowledge-base-icon.svg", label: "Knowledge Base", isImage: true },
    { icon: "/assets/contacts-icon.svg", label: "Contacts", isImage: true },
    { icon: "/assets/analytics-icon.svg", label: "Analytics", isImage: true },
    { icon: "/assets/settings-icon.svg", label: "Settings", isImage: true },
  ];

  const categories = [
    { label: "Live", icon: "💬", count: liveCount, id: "live" },
    { label: "Resolved", icon: "✅", count: null, id: "resolved" },
    { label: "Escalated", icon: "⬆️", count: escalatedCount, id: "escalated" },
  ];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Flex minH="100vh" bg="customGray.50">
      {/* Left Sidebar - Navigation */}
      <Flex
        w="256px"
        bg="customGray.50"
        borderRight="1px solid"
        borderColor="customGray.200"
        px={3}
        py={6}
        flexDirection="column"
        minH="100vh"
      >
        <Box
          w="32px"
          h="32px"
          borderRadius="md"
          border="2px solid black"
          mb={6}
          display="flex"
          alignItems="center"
          justifyContent="center"
          fontSize="lg"
          cursor="pointer"
          overflow="hidden"
          _hover={{ opacity: 0.8 }}
          onClick={() => document.getElementById("image-upload")?.click()}
        >
          {uploadedImage ? (
            <img src={uploadedImage} alt="uploaded" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            "📱"
          )}
        </Box>
        <Input
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          display="none"
          id="image-upload"
        />

        <VStack as="nav" spacing={1} flex={1} overflowY="auto">
          {navItems.map((item) => (
            <HStack
              key={item.label}
              w="full"
              h="32px"
              borderRadius="10px"
              cursor="pointer"
              bg={selectedNav === item.label ? "customDark.5" : "transparent"}
              color={selectedNav === item.label ? "gray.800" : "customGray.500"}
              fontSize="sm"
              fontWeight="medium"
              onClick={() => setSelectedNav(item.label)}
              _hover={{ bg: "customDark.5" }}
              gap={2}
              pl={2}
            >
              <Box
                display="flex"
                alignItems="center"
                justifyContent="center"
                w={5}
                h={5}
                filter={selectedNav === item.label ? "brightness(0.5)" : "brightness(1)"}
              >
                {item.isImage ? (
                  <img src={item.icon} alt={item.label} style={{ width: "100%", height: "100%" }} />
                ) : (
                  <Box as="span" fontSize="lg">
                    {item.icon}
                  </Box>
                )}
              </Box>
              <Text fontSize="sm">{item.label}</Text>
              {item.badge && (
                <Button
                  ml="auto"
                  mr={2}
                  w="22px"
                  h="22px"
                  p={0}
                  minW={0}
                  bg="white"
                  border="1px solid"
                  borderColor="customGray.300"
                  borderRadius="6px"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  _hover={{ borderColor: "customGray.400", bg: "white" }}
                  as="div"
                >
                  <img
                    src="/assets/plus-icon.svg"
                    alt="add"
                    style={{
                      width: "12px",
                      height: "12px",
                      filter: selectedNav === item.label ? "brightness(0.5)" : "brightness(1)"
                    }}
                  />
                </Button>
              )}
            </HStack>
          ))}
        </VStack>

        <HStack
          h="32px"
          px={3}
          borderRadius="md"
          cursor="pointer"
          bg={selectedFeedback ? "customDark.5" : "transparent"}
          color={selectedFeedback ? "gray.800" : "customGray.500"}
          fontSize="sm"
          fontWeight={500}
          mb={4}
          alignItems="center"
          onClick={() => setSelectedFeedback(!selectedFeedback)}
          _hover={{ bg: "customDark.5" }}
        >
          <Box
            display="flex"
            alignItems="center"
            justifyContent="center"
            w={5}
            h={5}
          >
            <img
              src="/assets/feedback-icon.svg"
              alt="feedback"
              style={{
                width: "100%",
                height: "100%",
                filter: selectedFeedback ? "brightness(0.5)" : "brightness(1)"
              }}
            />
          </Box>
          <Text fontSize="sm">Feedback</Text>
        </HStack>

        <Box borderTop="1px solid" borderColor="customGray.200" />
        <HStack pt={4} gap={2} bg="customGray.50">
          <Avatar name="Segun Adebayo" bg="green.400" size="sm" />
          <VStack spacing={0} flex={1} align="flex-start">
            <Text fontSize="sm" fontWeight={500}>Segun Adebayo</Text>
          </VStack>
          <Menu>
            <MenuButton as={Text} fontSize="sm" cursor="pointer" color="customGray.500">
              ⋯
            </MenuButton>
            <MenuList>
              <MenuItem onClick={handleDeleteAccount} color="red.600">
                Delete Account
              </MenuItem>
            </MenuList>
          </Menu>
        </HStack>
      </Flex>

      {/* Middle Sidebar - Categories */}
      <Box w="478px" bg="white" borderRight="1px solid" borderColor="customGray.200" p={5}>
        <HStack mb={6} gap={2}>
          <input type="checkbox" />
          <Text fontSize="sm" fontWeight={600}>Inbox</Text>
        </HStack>

        <VStack spacing={2} align="stretch">
          {categories.map((category) => (
            <HStack
              key={category.id}
              px={2}
              py={3}
              borderRadius="md"
              cursor="pointer"
              bg={selectedStatus === category.id ? "gray.100" : "transparent"}
              color={selectedStatus === category.id ? "gray.900" : "customGray.500"}
              fontSize="sm"
              fontWeight={500}
              onClick={() => setSelectedStatus(category.id as any)}
              _hover={{ bg: "gray.100" }}
            >
              <Text fontSize="sm">{category.icon}</Text>
              <Text fontSize="sm">{category.label}</Text>
              {category.count !== null && (
                <Badge ml="auto" fontWeight={600} fontSize="xs">{category.count}</Badge>
              )}
            </HStack>
          ))}
        </VStack>
      </Box>

      {/* Main Content - Messages */}
      <Box flex={1} overflowY="auto">
        <Box display="flex" alignItems="center" justifyContent="space-between" p={6} borderBottom="1px solid" borderColor="customGray.200">
          <Heading size="md" fontSize="lg">
            {selectedStatus.charAt(0).toUpperCase() + selectedStatus.slice(1)}
          </Heading>
          <HStack gap={2}>
            <Button size="sm" variant="outline" fontSize="sm">
              🔍 Filter
            </Button>
            <Button size="sm" variant="outline" fontSize="sm">
              ↕️ Sort
            </Button>
            <Button size="sm" variant="outline" fontSize="sm">
              + New view
            </Button>
          </HStack>
        </Box>

        {filteredMessages.length > 0 && (
          <Box px={6} py={3} bg="gray.100" borderBottom="1px solid" borderColor="customGray.200" fontSize="xs" color="gray.600" fontWeight={500}>
            |||| {filteredMessages[0].category} · {normalCount}
          </Box>
        )}

        {filteredMessages.map((msg) => (
          <HStack
            key={msg.id}
            px={6}
            py={4}
            borderBottom="1px solid"
            borderColor="customGray.200"
            cursor="pointer"
            _hover={{ bg: "gray.50" }}
            gap={4}
            align="flex-start"
          >
            <Box w={3} h={3} bg="black" borderRadius="sm" flexShrink={0} mt={1.5} />

            <VStack gap={0.5} flexShrink={0}>
              {[...Array(4)].map((_, i) => (
                <Box key={i} w={0.5} h={4} bg="customGray.200" />
              ))}
            </VStack>

            <Avatar name={msg.initials} bg={msg.avatarColor} color="white" size="sm" flexShrink={0} />

            <VStack spacing={1} align="flex-start" flex={1}>
              <Text fontSize="xs" color="customGray.500">{msg.sender}</Text>
              <Text fontSize="sm" fontWeight={500}>{msg.subject}</Text>
            </VStack>
          </HStack>
        ))}
      </Box>

      {/* Feedback Modal */}
      <Modal isOpen={selectedFeedback} onClose={() => setSelectedFeedback(false)} isCentered>
        <ModalOverlay />
        <ModalContent bg="white" borderRadius="12px" boxShadow="lg" w="578px">
          <ModalBody pb="16px" px="16px" pt="16px">
            <VStack spacing="16px" align="stretch">
              <Text color="customGray.800" fontSize="sm" fontWeight="semibold">
                Share feedback about Weav
              </Text>
              <Textarea
                placeholder="Tell us what you think..."
                value={feedbackText}
                onChange={(e) => {
                  setFeedbackText(e.target.value);
                  if (e.target.value.length > 10) {
                    setFeedbackError("");
                  }
                }}
                bg="customGray.50"
                border="1px solid"
                borderColor="customGray.300"
                color="gray.900"
                _placeholder={{ color: "customGray.500" }}
                _focus={{ borderColor: "customGray.400", boxShadow: "0 0 0 4px rgba(39, 39, 42, 0.1)" }}
                w="full"
                minH="150px"
                fontSize="sm"
              />
              {feedbackError && (
                <Text color="red.500" fontSize="xs" mt="-12px">
                  {feedbackError}
                </Text>
              )}
              <HStack justify="flex-end" gap="8px">
                <Button
                  size="sm"
                  variant="outline"
                  color="gray.900"
                  borderColor="gray.300"
                  borderRadius="8px"
                  onClick={() => {
                    setSelectedFeedback(false);
                    setFeedbackText("");
                    setFeedbackError("");
                  }}
                  _hover={{ bg: "gray.100" }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  bg="gray.900"
                  color="white"
                  fontWeight={600}
                  borderRadius="8px"
                  isLoading={isSubmitting}
                  loadingText="Sending"
                  onClick={async () => {
                    if (feedbackText.length < 10) {
                      setFeedbackError("Please enter at least 10 characters");
                    } else {
                      setIsSubmitting(true);
                      try {
                        const payload = {
                          name: currentUser.name,
                          email: currentUser.email,
                          userId: currentUser.id,
                          message: feedbackText,
                          timestamp: new Date().toISOString(),
                        };

                        const response = await fetch("https://formspree.io/f/mvzjrqlw", {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                            Accept: "application/json",
                          },
                          body: JSON.stringify(payload),
                        });

                        if (response.ok) {
                          toast({
                            title: "Thank you for sharing feedback with us",
                            status: "success",
                            duration: 4000,
                            isClosable: false,
                            position: "top",
                            containerStyle: {
                              width: "355px",
                              height: "40px",
                              padding: "8px 12px",
                            },
                            render: () => (
                              <Box
                                w="355px"
                                h="40px"
                                bg="white"
                                borderRadius="12px"
                                border="1px solid"
                                borderColor="customGray.300"
                                display="flex"
                                alignItems="center"
                                gap="8px"
                                px={3}
                                py={2}
                                boxShadow="0 122px 34px 0 rgba(39, 39, 42, 0.00), 0 78px 31px 0 rgba(0, 0, 0, 0.01), 0 44px 26px 0 rgba(39, 39, 42, 0.03), 0 20px 20px 0 rgba(39, 39, 42, 0.06), 0 5px 11px 0 rgba(39, 39, 42, 0.20)"
                              >
                                <Box
                                  w={5}
                                  h={5}
                                  bg="green.500"
                                  borderRadius="full"
                                  display="flex"
                                  alignItems="center"
                                  justifyContent="center"
                                  color="white"
                                  fontSize="sm"
                                  flexShrink={0}
                                >
                                  ✓
                                </Box>
                                <Text fontSize="sm" fontWeight="medium" color="customGray.800">
                                  Thank you for sharing feedback with us
                                </Text>
                              </Box>
                            ),
                          });
                          setFeedbackError("");
                          setSelectedFeedback(false);
                          setFeedbackText("");
                        } else {
                          toast({
                            title: "Failed to submit feedback",
                            description: "Please try again.",
                            status: "error",
                            duration: 4000,
                            isClosable: true,
                            position: "top",
                          });
                        }
                      } catch (error) {
                        console.error("Error submitting feedback:", error);
                        toast({
                          title: "Error",
                          description: "Failed to submit feedback. Please try again.",
                          status: "error",
                          duration: 4000,
                          isClosable: true,
                          position: "top",
                        });
                      } finally {
                        setIsSubmitting(false);
                      }
                    }
                  }}
                  _hover={{ bg: "gray.800" }}
                >
                  Submit
                </Button>
              </HStack>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Flex>
  );
}
