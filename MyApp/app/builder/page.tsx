"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { deleteUserAccount } from "@/app/actions/deleteUser";
import { getAgents, createAgent } from "@/app/actions/agentActions";
import CryptoJS from "crypto-js";
import Sidebar from "@/app/components/Sidebar";
import {
  Box,
  Flex,
  VStack,
  HStack,
  Text,
  Heading,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  useDisclosure,
  Textarea,
  Input,
  Tag,
  TagLabel,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
} from "@chakra-ui/react";

export default function BuilderPage() {
  const toast = useToast();
  const router = useRouter();
  const [selectedNav, setSelectedNav] = useState("Messages");
  const [userEmail, setUserEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const { isOpen: isFeedbackOpen, onOpen: onFeedbackOpen, onClose: onFeedbackClose } = useDisclosure();
  const { isOpen: isCreateOpen, onOpen: onCreateOpen, onClose: onCreateClose } = useDisclosure();
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [isFeedbackSubmitting, setIsFeedbackSubmitting] = useState(false);
  const [feedbackError, setFeedbackError] = useState("");
  const [agentName, setAgentName] = useState("");
  const [agents, setAgents] = useState<Array<{ name: string; services: string[] }>>([]);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [hoveredAgent, setHoveredAgent] = useState<string | null>(null);
  const [createError, setCreateError] = useState("");

  useEffect(() => {
    const cached = localStorage.getItem("user_avatar");
    if (cached) {
      setAvatarUrl(cached);
    }

    const loadAgents = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          const dbAgents = await getAgents(session.user.id);
          setAgents(dbAgents);
          if (dbAgents.length > 0) {
            setSelectedAgent(dbAgents[dbAgents.length - 1].name);
          }
          localStorage.setItem("workspace_agents", JSON.stringify(dbAgents));
        } else {
          const cachedAgents = localStorage.getItem("workspace_agents");
          if (cachedAgents) {
            try {
              const parsed = JSON.parse(cachedAgents);
              setAgents(parsed);
              if (parsed.length > 0) {
                setSelectedAgent(parsed[parsed.length - 1].name);
              }
            } catch (error) {
              console.error("Error loading agents from localStorage:", error);
            }
          }
        }
      } catch (error) {
        console.error("Error loading agents:", error);
        const cachedAgents = localStorage.getItem("workspace_agents");
        if (cachedAgents) {
          try {
            const parsed = JSON.parse(cachedAgents);
            setAgents(parsed);
            if (parsed.length > 0) {
              setSelectedAgent(parsed[parsed.length - 1].name);
            }
          } catch (error) {
            console.error("Error loading agents from localStorage:", error);
          }
        }
      }
    };

    loadAgents();
    setHydrated(true);
  }, []);

  useEffect(() => {
    localStorage.setItem("workspace_agents", JSON.stringify(agents));
  }, [agents]);

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

          const googlePicture = session.user.user_metadata?.picture || session.user.user_metadata?.avatar_url;

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
          const gravatarUrl = `https://www.gravatar.com/avatar/${emailHash}?d=404&s=128`;

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
    if (!window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      return;
    }

    try {
      await deleteUserAccount();
      await supabase.auth.signOut();
      router.push("/");
      toast({
        title: "Account deleted",
        description: "Your account has been successfully deleted",
        status: "success",
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete account. Please try again.",
        status: "error",
        isClosable: true,
      });
    }
  };

  const colors = ["#EA8C55", "#7C3AED", "#10B981", "#F59E0B", "#EF4444", "#06B6D4", "#8B5CF6", "#EC4899"];

  const serviceColors: { [key: string]: string } = {
    form: "#60A5FA",
    review: "#4ADE80",
    calendar: "#F472B6"
  };

  const handleCreateWorkspace = async () => {
    setCreateError("");

    if (!agentName.trim()) {
      setCreateError("Please enter a workspace name");
      return;
    }

    if (selectedServices.length === 0) {
      setCreateError("Please select at least one service");
      return;
    }

    const newAgent = { name: agentName, services: selectedServices };

    // Always update local state first
    const updatedAgents = [...agents, newAgent];
    setAgents(updatedAgents);
    localStorage.setItem("workspace_agents", JSON.stringify(updatedAgents));

    setSelectedAgent(agentName);
    setAgentName("");
    setSelectedServices([]);
    setCreateError("");
    onCreateClose();

    // Try to save to Supabase in background
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        await createAgent(session.user.id, newAgent);
      }
    } catch (error) {
      console.error("Error saving to Supabase:", error);
    }
  };

  return (
    <Flex h="100vh" w="100vw" bg="dark.bg" overflow="hidden" position="fixed" top={0} left={0}>
      <Sidebar
        selectedNav={selectedNav}
        onNavClick={setSelectedNav}
        userEmail={userEmail}
        avatarUrl={avatarUrl}
        onDelete={handleDeleteAccount}
        onFeedbackOpen={onFeedbackOpen}
        isLoading={!hydrated}
      />

      <VStack
        flex={1}
        bg="customGray.100"
        spacing={0}
        align="stretch"
        overflow="hidden"
        pt="12px"
        pr="12px"
        pb="12px"
      >

        <HStack flex={1} align="stretch" spacing={0} bg="white" borderRadius="12px" border="1px solid" borderColor="customGray.200" overflow="hidden">
          <VStack w="255px" h="100%" align="stretch" spacing={0} borderRight="1px solid" borderColor="customGray.200" overflow="hidden">
            <HStack h="64px" align="center" justify="space-between" pl="20px" pr="16px" pt="20px" pb="16px">
              <Text fontSize="base" fontWeight="medium" color="customGray.800">
                Workspace
              </Text>
              <Button
                variant="ghost"
                size="sm"
                p="6px"
                minW="auto"
                _hover={{ bg: "customGray.100" }}
                onClick={onCreateOpen}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Button>
            </HStack>
            <VStack
              flex={1}
              align="stretch"
              spacing="4px"
              px="12px"
              pt="12px"
              pb="16px"
              overflowY="auto"
              sx={{
                '&::-webkit-scrollbar': {
                  display: 'none',
                },
                msOverflowStyle: 'none',
                scrollbarWidth: 'none',
              }}
            >
              {agents.map((agentObj, index) => (
                <Box
                  key={index}
                  h="32px"
                  bg={selectedAgent === agentObj.name ? "customGray.100" : "white"}
                  borderRadius="8px"
                  px="12px"
                  py="12px"
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                  cursor="pointer"
                  onClick={() => setSelectedAgent(agentObj.name)}
                  onMouseEnter={() => setHoveredAgent(agentObj.name)}
                  onMouseLeave={() => setHoveredAgent(null)}
                  _hover={{ bg: selectedAgent === agentObj.name ? "customGray.100" : "customGray.50" }}
                  transition="all 0.2s"
                >
                  <HStack spacing="4px" flex={1} minW={0} justifyContent="space-between">
                    <Text fontSize="sm" fontWeight={selectedAgent === agentObj.name ? "medium" : "normal"} color={selectedAgent === agentObj.name ? "customGray.800" : "customGray.500"} noOfLines={1} overflow="hidden" textOverflow="ellipsis" minW={0}>
                      {agentObj.name}
                    </Text>
                    {agentObj.services.length > 0 && (selectedAgent === agentObj.name || hoveredAgent === agentObj.name) ? (
                      <HStack spacing="4px" flexShrink={0}>
                        {agentObj.services.map((service) => (
                          <Box
                            key={service}
                            w="8px"
                            h="8px"
                            borderRadius="full"
                            bg={serviceColors[service]}
                          />
                        ))}
                      </HStack>
                    ) : null}
                  </HStack>
                </Box>
              ))}
            </VStack>
          </VStack>
          <VStack flex={1} h="100%" align="stretch" spacing={0} overflow="hidden">
            <HStack h="64px" align="center" justify="space-between" pl="20px" pr="16px" pt="12px" pb="16px">
              <Text fontSize="lg" fontWeight="medium" color="customGray.800">
                {selectedAgent || "Builder"}
              </Text>
              <Button size="sm" bg="customGray.800" color="white" _hover={{ bg: "customGray.700" }}>
                Save changes
              </Button>
            </HStack>
            <Tabs flex={1} display="flex" flexDirection="column">
              <TabList px="20px" bg="white">
                <Tab fontSize="sm" color="customGray.500" _selected={{ color: "customGray.800", borderColor: "customGray.800" }} pb="12px">
                  Overview
                </Tab>
                <Tab fontSize="sm" color="customGray.500" _selected={{ color: "customGray.800", borderColor: "customGray.800" }} pb="12px">
                  Settings
                </Tab>
              </TabList>
              <TabPanels flex={1} overflow="hidden">
                <TabPanel h="100%" overflow="auto">
                  <VStack align="center" justify="center" h="100%">
                    <Text fontSize="lg" color="customGray.800">
                      Overview
                    </Text>
                  </VStack>
                </TabPanel>
                <TabPanel h="100%" overflow="auto">
                  <VStack align="center" justify="center" h="100%">
                    <Text fontSize="lg" color="customGray.800">
                      Settings
                    </Text>
                  </VStack>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </VStack>
        </HStack>
      </VStack>

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
          boxShadow="0 10px 40px rgba(0, 0, 0, 0.1)"
        >
          <ModalHeader pb={0} pt="lg">
            <Heading size="sm" color="customGray.800">
              Send us your feedback
            </Heading>
          </ModalHeader>
          <ModalBody pt="md">
            <Textarea
              value={feedbackMessage}
              onChange={(e) => {
                setFeedbackMessage(e.target.value);
                if (feedbackError && e.target.value.trim().length >= 10) {
                  setFeedbackError("");
                }
              }}
              placeholder="Share your thoughts..."
              fontSize="sm"
              fontWeight="normal"
              minH="120px"
              bg="customGray.50"
              border="1px solid"
              borderColor={feedbackError ? "#FF6B6B" : "customGray.300"}
              color="customGray.800"
              _placeholder={{ color: "customGray.500" }}
              _focus={{
                borderColor: feedbackError ? "#FF6B6B" : "customGray.500",
                boxShadow: feedbackError ? "0 0 0 4px rgba(255, 107, 107, 0.1)" : "0 0 0 4px rgba(39, 39, 42, 0.10)",
              }}
              borderRadius="base"
              resize="none"
            />
            {feedbackError && (
              <Text fontSize="xs" color="#FF6B6B" mt="8px">
                {feedbackError}
              </Text>
            )}
          </ModalBody>
          <ModalFooter pt="lg">
            <HStack spacing="md">
              <Button
                variant="outline"
                borderColor="customGray.300"
                color="customGray.800"
                onClick={() => {
                  onFeedbackClose();
                  setFeedbackError("");
                  setFeedbackMessage("");
                }}
              >
                Cancel
              </Button>
              <Button
                bg="brand.primary"
                color="white"
                _hover={{ bg: "brand.primaryHover" }}
                isLoading={isFeedbackSubmitting}
                onClick={handleFeedbackSubmit}
              >
                Send
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal
        isOpen={isCreateOpen}
        onClose={() => {
          onCreateClose();
          setAgentName("");
          setSelectedServices([]);
          setCreateError("");
        }}
        isCentered
      >
        <ModalOverlay bg="rgba(0, 0, 0, 0.5)" />
        <ModalContent
          bg="white"
          borderRadius="lg"
          boxShadow="0 10px 40px rgba(0, 0, 0, 0.1)"
        >
          <ModalHeader pb={0} pt="lg" px="16px">
            <Heading fontSize="base" fontWeight="medium" color="customGray.800">
              Create workspace
            </Heading>
            <Text fontSize="sm" fontWeight="normal" color="customGray.500" mt="4px">
              Add a new workspace to your workspace
            </Text>
          </ModalHeader>
          <ModalBody pt="lg" px="16px">
            <VStack align="stretch" spacing="16px">
              <Input
                placeholder="Enter name"
                value={agentName}
                onChange={(e) => {
                  const value = e.target.value;
                  const capitalized = value.charAt(0).toUpperCase() + value.slice(1);
                  setAgentName(capitalized);
                  setCreateError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleCreateWorkspace();
                  }
                }}
                fontSize="sm"
                border="1px solid"
                borderColor="customGray.300"
                color="customGray.800"
                _placeholder={{ color: "customGray.500" }}
                _focus={{
                  borderColor: "customGray.500",
                  boxShadow: "0 0 0 3px rgba(39, 39, 42, 0.1)",
                }}
                borderRadius="base"
              />
              <VStack align="stretch" spacing="8px">
                <Text fontSize="sm" fontWeight="medium" color="customGray.800">
                  Select service
                </Text>
                <HStack spacing="8px">
                  <Tag
                    h="36px"
                    px="12px"
                    py="6px"
                    bg={selectedServices.includes("form") ? "customGray.50" : "white"}
                    border="1px solid"
                    borderColor={selectedServices.includes("form") ? "customGray.500" : "customGray.300"}
                    cursor="pointer"
                    borderRadius="full"
                    _hover={{ bg: "customGray.50" }}
                    display="flex"
                    alignItems="center"
                    gap="6px"
                    onClick={() => {
                      if (selectedServices.includes("form")) {
                        setSelectedServices(selectedServices.filter(s => s !== "form"));
                      } else {
                        setSelectedServices([...selectedServices, "form"]);
                      }
                    }}
                  >
                    <Box w="8px" h="8px" borderRadius="full" bg="#60A5FA" flexShrink={0} />
                    <TagLabel fontSize="sm" color="customGray.800" m={0}>Form</TagLabel>
                    {selectedServices.includes("form") ? (
                      <svg width="20" height="20" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" clipRule="evenodd" d="M2.25 9C2.25 12.7274 5.27258 15.75 9 15.75C12.7274 15.75 15.75 12.7274 15.75 9C15.75 5.27258 12.7274 2.25 9 2.25C5.27258 2.25 2.25 5.27258 2.25 9ZM6.25282 11.7472C5.97823 11.4726 5.97823 11.0274 6.25282 10.7528L8.00563 9L6.25282 7.24718C5.97823 6.9726 5.97823 6.5274 6.25282 6.25282C6.5274 5.97823 6.9726 5.97823 7.24718 6.25282L9 8.00563L10.7528 6.25282C11.0274 5.97823 11.4726 5.97823 11.7472 6.25282C12.0218 6.5274 12.0218 6.9726 11.7472 7.24718L9.99437 9L11.7472 10.7528C12.0218 11.0274 12.0218 11.4726 11.7472 11.7472C11.4726 12.0218 11.0274 12.0218 10.7528 11.7472L9 9.99437L7.24718 11.7472C6.9726 12.0218 6.5274 12.0218 6.25282 11.7472Z" fill="#71717A"/>
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </Tag>
                  <Tag
                    h="36px"
                    px="12px"
                    py="6px"
                    bg={selectedServices.includes("review") ? "customGray.50" : "white"}
                    border="1px solid"
                    borderColor={selectedServices.includes("review") ? "customGray.500" : "customGray.300"}
                    cursor="pointer"
                    borderRadius="full"
                    _hover={{ bg: "customGray.50" }}
                    display="flex"
                    alignItems="center"
                    gap="6px"
                    onClick={() => {
                      if (selectedServices.includes("review")) {
                        setSelectedServices(selectedServices.filter(s => s !== "review"));
                      } else {
                        setSelectedServices([...selectedServices, "review"]);
                      }
                    }}
                  >
                    <Box w="8px" h="8px" borderRadius="full" bg="#4ADE80" flexShrink={0} />
                    <TagLabel fontSize="sm" color="customGray.800" m={0}>Review</TagLabel>
                    {selectedServices.includes("review") ? (
                      <svg width="20" height="20" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" clipRule="evenodd" d="M2.25 9C2.25 12.7274 5.27258 15.75 9 15.75C12.7274 15.75 15.75 12.7274 15.75 9C15.75 5.27258 12.7274 2.25 9 2.25C5.27258 2.25 2.25 5.27258 2.25 9ZM6.25282 11.7472C5.97823 11.4726 5.97823 11.0274 6.25282 10.7528L8.00563 9L6.25282 7.24718C5.97823 6.9726 5.97823 6.5274 6.25282 6.25282C6.5274 5.97823 6.9726 5.97823 7.24718 6.25282L9 8.00563L10.7528 6.25282C11.0274 5.97823 11.4726 5.97823 11.7472 6.25282C12.0218 6.5274 12.0218 6.9726 11.7472 7.24718L9.99437 9L11.7472 10.7528C12.0218 11.0274 12.0218 11.4726 11.7472 11.7472C11.4726 12.0218 11.0274 12.0218 10.7528 11.7472L9 9.99437L7.24718 11.7472C6.9726 12.0218 6.5274 12.0218 6.25282 11.7472Z" fill="#71717A"/>
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </Tag>
                  <Tag
                    h="36px"
                    px="12px"
                    py="6px"
                    bg={selectedServices.includes("calendar") ? "customGray.50" : "white"}
                    border="1px solid"
                    borderColor={selectedServices.includes("calendar") ? "customGray.500" : "customGray.300"}
                    cursor="pointer"
                    borderRadius="full"
                    _hover={{ bg: "customGray.50" }}
                    display="flex"
                    alignItems="center"
                    gap="6px"
                    onClick={() => {
                      if (selectedServices.includes("calendar")) {
                        setSelectedServices(selectedServices.filter(s => s !== "calendar"));
                      } else {
                        setSelectedServices([...selectedServices, "calendar"]);
                      }
                    }}
                  >
                    <Box w="8px" h="8px" borderRadius="full" bg="#F472B6" flexShrink={0} />
                    <TagLabel fontSize="sm" color="customGray.800" m={0}>Calendar</TagLabel>
                    {selectedServices.includes("calendar") ? (
                      <svg width="20" height="20" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" clipRule="evenodd" d="M2.25 9C2.25 12.7274 5.27258 15.75 9 15.75C12.7274 15.75 15.75 12.7274 15.75 9C15.75 5.27258 12.7274 2.25 9 2.25C5.27258 2.25 2.25 5.27258 2.25 9ZM6.25282 11.7472C5.97823 11.4726 5.97823 11.0274 6.25282 10.7528L8.00563 9L6.25282 7.24718C5.97823 6.9726 5.97823 6.5274 6.25282 6.25282C6.5274 5.97823 6.9726 5.97823 7.24718 6.25282L9 8.00563L10.7528 6.25282C11.0274 5.97823 11.4726 5.97823 11.7472 6.25282C12.0218 6.5274 12.0218 6.9726 11.7472 7.24718L9.99437 9L11.7472 10.7528C12.0218 11.0274 12.0218 11.4726 11.7472 11.7472C11.4726 12.0218 11.0274 12.0218 10.7528 11.7472L9 9.99437L7.24718 11.7472C6.9726 12.0218 6.5274 12.0218 6.25282 11.7472Z" fill="#71717A"/>
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </Tag>
                </HStack>
                {createError && (
                  <Text fontSize="xs" color="#FF6B6B" fontWeight="normal" mt="4px">
                    {createError}
                  </Text>
                )}
              </VStack>
            </VStack>
          </ModalBody>
          <ModalFooter pt="lg" px="16px">
            <HStack spacing="md">
              <Button
                size="sm"
                variant="outline"
                borderColor="customGray.300"
                color="customGray.800"
                _hover={{ bg: "customGray.50", borderColor: "customGray.500" }}
                onClick={() => {
                  onCreateClose();
                  setAgentName("");
                  setSelectedServices([]);
                  setCreateError("");
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                bg="customGray.800"
                color="white"
                _hover={{ bg: "customGray.700" }}
                onClick={handleCreateWorkspace}
              >
                Create workspace
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Flex>
  );
}
