"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { keyframes } from "@emotion/react";
import { supabase } from "@/lib/supabase";
import { deleteUserAccount } from "@/app/actions/deleteUser";
import { getAgents, createAgent, deleteAgent } from "@/app/actions/agentActions";
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
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Tooltip,
} from "@chakra-ui/react";

const slideUpFade = keyframes`
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

export default function BuilderPage() {
  const toast = useToast();
  const router = useRouter();
  const [selectedNav, setSelectedNav] = useState("Messages");
  const [userEmail, setUserEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const { isOpen: isFeedbackOpen, onOpen: onFeedbackOpen, onClose: onFeedbackClose } = useDisclosure();
  const { isOpen: isCreateOpen, onOpen: onCreateOpen, onClose: onCreateClose } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [isFeedbackSubmitting, setIsFeedbackSubmitting] = useState(false);
  const [feedbackError, setFeedbackError] = useState("");
  const [agentName, setAgentName] = useState("");
  const [agents, setAgents] = useState<Array<{ name: string; services: string[] }>>([]);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [hoveredAgent, setHoveredAgent] = useState<string | null>(null);
  const [createError, setCreateError] = useState("");
  const [isWorkspaceListCollapsed, setIsWorkspaceListCollapsed] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { isOpen: isAddFieldOpen, onOpen: onAddFieldOpen, onClose: onAddFieldClose } = useDisclosure();
  const [formFields, setFormFields] = useState<Array<{ id: string; name: string; type: string }>>([
    { id: "1", name: "First name", type: "text" },
    { id: "2", name: "Last name", type: "text" },
    { id: "3", name: "Mail id", type: "email" },
    { id: "4", name: "Message", type: "textarea" },
  ]);
  const [insertAtIndex, setInsertAtIndex] = useState<number>(0);
  const [visibleFields, setVisibleFields] = useState<Set<string>>(new Set());
  const fieldRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

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
    const observerOptions = {
      threshold: 0.1,
      rootMargin: "0px 0px -50px 0px",
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setVisibleFields((prev) => new Set([...prev, entry.target.id]));
        }
      });
    }, observerOptions);

    Object.values(fieldRefs.current).forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, [formFields]);

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

      await deleteUserAccount(userId);
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
        h="100vh"
        bg="customGray.100"
        spacing={0}
        align="stretch"
        overflow="hidden"
        pt="12px"
        pr="12px"
        pb="12px"
      >

        <HStack flex={1} h="100%" align="stretch" spacing={0} bg="white" borderRadius="12px" border="1px solid" borderColor="customGray.200" overflow="hidden">
          <VStack w={isWorkspaceListCollapsed ? "0px" : "255px"} h="100%" align="stretch" spacing={0} borderRight={isWorkspaceListCollapsed ? "none" : "1px solid"} borderColor="customGray.200" overflow="hidden" transition="all 0.3s ease">
            <HStack h="64px" align="center" justify="space-between" pl="20px" pr="16px" pt="14px" pb="16px">
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
              pt="2px"
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
                  py="8px"
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
                  <Text fontSize="sm" fontWeight={selectedAgent === agentObj.name ? "medium" : "normal"} color={selectedAgent === agentObj.name ? "customGray.800" : "customGray.500"} noOfLines={1} overflow="hidden" textOverflow="ellipsis" minW={0}>
                    {agentObj.name}
                  </Text>
                </Box>
              ))}
            </VStack>
          </VStack>
          <VStack flex={1} h="100%" align="stretch" spacing={0} overflow="hidden">
            <HStack h="64px" align="center" justify="space-between" pl="20px" pr="16px" pt="14px" pb="18px">
              <HStack spacing="12px" align="center">
                <Tooltip label={isWorkspaceListCollapsed ? "Expand" : "Collapse"} placement="bottom">
                  <Button
                    variant="ghost"
                    size="sm"
                    p="6px"
                    minW="auto"
                    color="customGray.800"
                    _hover={{ bg: "customGray.50" }}
                    onClick={() => setIsWorkspaceListCollapsed(!isWorkspaceListCollapsed)}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </Button>
                </Tooltip>
                <Text fontSize="lg" fontWeight="medium" color="customGray.800">
                  {selectedAgent || "Builder"}
                </Text>
              </HStack>
              <HStack spacing="8px">
                <Menu>
                  <MenuButton
                    as={Button}
                    size="sm"
                    variant="ghost"
                    color="customGray.800"
                    bg="customGray.100"
                    _hover={{ bg: "customGray.200" }}
                    p="6px"
                    minW="auto"
                    borderRadius="8px"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 5v2m0 6v2m0 6v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="12" cy="6" r="1" fill="currentColor"/>
                      <circle cx="12" cy="13" r="1" fill="currentColor"/>
                      <circle cx="12" cy="20" r="1" fill="currentColor"/>
                    </svg>
                  </MenuButton>
                  <MenuList>
                    <MenuItem fontSize="sm" color="customGray.800">
                      Archive
                    </MenuItem>
                    <MenuItem fontSize="sm" color="#FF6B6B" onClick={onDeleteOpen}>
                      Delete
                    </MenuItem>
                  </MenuList>
                </Menu>
                <Button size="sm" bg="customGray.800" color="white" _hover={{ bg: "customGray.700" }}>
                  Save changes
                </Button>
              </HStack>
            </HStack>
            <Tabs flex={1} display="flex" flexDirection="column" overflow="hidden">
              <TabList pl="20px" borderBottom="1px solid" borderColor="customGray.200">
                <Tab fontSize="sm" color="customGray.500" pb="12px" mb="-1px" borderBottom="2px solid transparent" _selected={{ color: "customGray.800", borderColor: "customGray.800", bg: "white" }} display="flex" alignItems="center" gap="6px">
                  <Box w="8px" h="8px" borderRadius="full" bg={selectedAgent && agents.find(a => a.name === selectedAgent)?.services.includes("form") ? "#60A5FA" : "customGray.300"} />
                  Form
                </Tab>
                <Tab fontSize="sm" color="customGray.500" pb="12px" mb="-1px" borderBottom="2px solid transparent" _selected={{ color: "customGray.800", borderColor: "customGray.800", bg: "white" }} display="flex" alignItems="center" gap="6px">
                  <Box w="8px" h="8px" borderRadius="full" bg={selectedAgent && agents.find(a => a.name === selectedAgent)?.services.includes("calendar") ? "#F472B6" : "customGray.300"} />
                  Calendar
                </Tab>
              </TabList>
              <TabPanels flex={1} overflow="hidden" h="100%">
                <TabPanel h="100%" p="0" overflow="hidden">
                  <HStack align="flex-start" spacing="0" h="100%" w="100%" p="0" m="0" overflow="hidden">
                    <VStack align="center" justify="flex-start" flex={1} pt="64px" pb="64px" px="54px" bg="customDark.2" spacing={0} h="100%" overflowY="auto" sx={{
                      '&::-webkit-scrollbar': {
                        width: '6px',
                      },
                      '&::-webkit-scrollbar-track': {
                        bg: 'transparent',
                      },
                      '&::-webkit-scrollbar-thumb': {
                        bg: 'rgba(0, 0, 0, 0.1)',
                        borderRadius: '3px',
                        '&:hover': {
                          bg: 'rgba(0, 0, 0, 0.2)',
                        },
                      },
                    }}>
                      <Box
                        bg="linear-gradient(135deg, #F9FAFB 0%, #FFFFFF 100%)"
                        borderRadius="16px"
                        p="32px"
                        maxW="500px"
                        boxShadow="0 4px 12px rgba(0, 0, 0, 0.08)"
                      >
                        <VStack align="stretch" spacing="24px" w="100%">
                          <VStack align="center" spacing="8px" w="100%">
                            <Text fontSize="xs" fontWeight="medium" color="customGray.500">
                              Typeform
                            </Text>
                            <Heading fontSize="lg" fontWeight="semibold" color="customGray.800" textAlign="center">
                              Let's get your Intercom demo started
                            </Heading>
                          </VStack>
                          <VStack align="stretch" spacing="12px" w="100%" role="group">
                            {formFields.map((field, index) => (
                              <Box key={field.id} w="100%">
                                {/* Inline add field button - appears on hover between fields */}
                                {index > 0 && (
                                  <HStack
                                    w="100%"
                                    h="0"
                                    align="center"
                                    spacing="8px"
                                    mt="-6px"
                                    mb="-6px"
                                    opacity="0"
                                    _groupHover={{ opacity: 1 }}
                                    transition="opacity 0.2s"
                                    pointerEvents="auto"
                                  >
                                    <Box h="1px" flex={1} bg="#06B6D4" />
                                    <Menu>
                                      <MenuButton
                                        as={Button}
                                        size="sm"
                                        bg="#06B6D4"
                                        color="white"
                                        p="4px"
                                        minW="auto"
                                        h="24px"
                                        w="24px"
                                        fontSize="16px"
                                        _hover={{ bg: "#0891B2" }}
                                        borderRadius="full"
                                      >
                                        +
                                      </MenuButton>
                                      <MenuList minW="200px">
                                        <MenuItem fontSize="sm" color="customGray.800" onClick={() => { const newField = { id: Date.now().toString(), name: "Short text", type: "text" }; const newFields = [...formFields]; newFields.splice(index, 0, newField); setFormFields(newFields); }}>Aa Short text</MenuItem>
                                        <MenuItem fontSize="sm" color="customGray.800" onClick={() => { const newField = { id: Date.now().toString(), name: "Email", type: "email" }; const newFields = [...formFields]; newFields.splice(index, 0, newField); setFormFields(newFields); }}>@ Email</MenuItem>
                                        <MenuItem fontSize="sm" color="customGray.800" onClick={() => { const newField = { id: Date.now().toString(), name: "Long text", type: "textarea" }; const newFields = [...formFields]; newFields.splice(index, 0, newField); setFormFields(newFields); }}>¶ Long text</MenuItem>
                                        <MenuItem fontSize="sm" color="customGray.800" onClick={() => { const newField = { id: Date.now().toString(), name: "Phone", type: "text" }; const newFields = [...formFields]; newFields.splice(index, 0, newField); setFormFields(newFields); }}>☎ Phone</MenuItem>
                                      </MenuList>
                                    </Menu>
                                    <Box h="1px" flex={1} bg="#06B6D4" />
                                  </HStack>
                                )}

                                {/* Form field */}
                                <Box
                                  w="100%"
                                  id={field.id}
                                  ref={(el) => {
                                    if (el) fieldRefs.current[field.id] = el;
                                  }}
                                  animation={visibleFields.has(field.id) ? `${slideUpFade} 0.6s ease-out forwards` : "none"}
                                >
                                  {field.type === "textarea" ? (
                                    <Textarea
                                      placeholder={field.name}
                                      isDisabled
                                      fontSize="sm"
                                      border="1px solid"
                                      borderColor="customGray.200"
                                      color="customGray.800"
                                      _placeholder={{ color: "customGray.400" }}
                                      borderRadius="base"
                                      minH="80px"
                                      resize="none"
                                    />
                                  ) : (
                                    <Input
                                      placeholder={field.name}
                                      isDisabled
                                      fontSize="sm"
                                      border="1px solid"
                                      borderColor="customGray.200"
                                      color="customGray.800"
                                      _placeholder={{ color: "customGray.400" }}
                                      borderRadius="base"
                                      h="40px"
                                    />
                                  )}
                                </Box>
                              </Box>
                            ))}
                          </VStack>
                          <Button
                            w="100%"
                            bg="customGray.800"
                            color="white"
                            _hover={{ bg: "customGray.700" }}
                            fontSize="sm"
                            fontWeight="medium"
                            h="40px"
                            rightIcon={
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            }
                          >
                            Submit
                          </Button>
                          <Text fontSize="xs" color="customGray.500" textAlign="center">
                            Made with Webform
                          </Text>
                        </VStack>
                      </Box>
                    </VStack>
                    <VStack align="stretch" spacing="16px" w="300px" h="100%" pl="16px" pr="16px" pt="0" pb="24px" bg="white" borderLeft="1px solid" borderLeftColor="customGray.200" overflowY="auto" overflowX="hidden" sx={{
                      '&::-webkit-scrollbar': {
                        width: '0px',
                      },
                      '&::-webkit-scrollbar-track': {
                        bg: 'transparent',
                      },
                      '&::-webkit-scrollbar-thumb': {
                        bg: 'transparent',
                      },
                      msOverflowStyle: 'none',
                      scrollbarWidth: 'none',
                    }}>
                      {/* Form Properties Section */}
                      <Box w="100%" flex="none">
                        <VStack align="start" spacing="0" w="calc(100% + 32px)" ml="-16px" mr="-16px" p="0" flex="none">
                          {/* Full Width Toggle */}
                          <VStack align="start" spacing="18px" w="100%" pl="16px" pr="16px" pt="16px" pb="16px" flex="none" borderBottom="1px solid" borderBottomColor="customGray.200">
                            <Text fontSize="sm" fontWeight="medium" color="customGray.800" w="100%">
                              Form Properties
                            </Text>
                            <HStack justify="space-between" w="100%">
                              <Text fontSize="xs" fontWeight="medium" color="customGray.600">Full Width</Text>
                              <Box w="36px" h="20px" bg="customGray.300" borderRadius="full" position="relative" cursor="pointer">
                                <Box w="16px" h="16px" bg="white" borderRadius="full" position="absolute" top="2px" left="2px" />
                              </Box>
                            </HStack>
                            {/* Width and Height */}
                            <HStack spacing="12px" w="100%">
                              <HStack flex={1} spacing="8px">
                                <Text fontSize="xs" color="customGray.600" minW="fit-content">Width</Text>
                                <Input placeholder="16px" fontSize="xs" border="1px solid" borderColor="customGray.300" h="28px" w="78px" px="14px" py="6px" borderRadius="base" />
                              </HStack>
                              <HStack flex={1} spacing="8px">
                                <Text fontSize="xs" color="customGray.600" minW="fit-content">Height</Text>
                                <Input placeholder="16px" fontSize="xs" border="1px solid" borderColor="customGray.300" h="28px" w="78px" px="14px" py="6px" borderRadius="base" />
                              </HStack>
                            </HStack>
                          </VStack>

                          {/* Form Padding */}
                          <VStack align="start" spacing="8px" w="100%" pl="16px" pr="16px" pt="16px" pb="16px" flex="none" borderBottom="1px solid" borderBottomColor="customGray.200">
                            <Text fontSize="xs" fontWeight="medium" color="customGray.600">Form padding</Text>
                            <Input placeholder="16px" fontSize="sm" border="1px solid" borderColor="customGray.300" h="32px" borderRadius="base" />
                          </VStack>

                          {/* Form Colour */}
                          <VStack align="start" spacing="8px" w="100%" pl="16px" pr="16px" pt="16px" pb="16px" flex="none" borderBottom="1px solid" borderBottomColor="customGray.200">
                            <Text fontSize="xs" fontWeight="medium" color="customGray.600">Form Colour</Text>
                            <HStack spacing="8px" w="100%">
                              <HStack flex={1} border="1px solid" borderColor="customGray.300" borderRadius="base" px="8px" py="6px">
                                <Box w="16px" h="16px" borderRadius="4px" bg="#E85C5C" />
                                <Text fontSize="sm" color="customGray.600">E85C5C</Text>
                              </HStack>
                              <Box w="32px" h="32px" borderRadius="6px" bg="#EC4899" cursor="pointer" />
                              <Box w="32px" h="32px" borderRadius="6px" bg="#A855F7" cursor="pointer" />
                              <Box w="32px" h="32px" borderRadius="6px" bg="#06B6D4" cursor="pointer" />
                              <Button size="sm" variant="outline" borderColor="customGray.300" p="6px" minW="auto" h="32px" w="32px">+</Button>
                            </HStack>
                          </VStack>

                          {/* Border Radius */}
                          <VStack align="start" spacing="8px" w="100%" pl="16px" pr="16px" pt="16px" pb="16px" flex="none" borderBottom="1px solid" borderBottomColor="customGray.200">
                            <Text fontSize="xs" fontWeight="medium" color="customGray.600">Border Radius</Text>
                            <Input placeholder="16px" fontSize="sm" border="1px solid" borderColor="customGray.300" h="32px" borderRadius="base" />
                          </VStack>

                          {/* Border Colour */}
                          <VStack align="start" spacing="8px" w="100%" px="24px" pt="16px" flex="none">
                            <HStack justify="space-between" w="100%">
                              <HStack spacing="8px">
                                <Box w="16px" h="16px" border="1px solid" borderColor="customGray.300" borderRadius="4px" />
                                <Text fontSize="xs" fontWeight="medium" color="customGray.600">Border colour</Text>
                              </HStack>
                              <HStack border="1px solid" borderColor="customGray.300" borderRadius="base" px="8px" py="4px">
                                <Box w="12px" h="12px" borderRadius="3px" bg="#E85C5C" />
                                <Text fontSize="sm" color="customGray.600">E85C5C</Text>
                              </HStack>
                            </HStack>
                          </VStack>
                        </VStack>
                      </Box>
                    </VStack>
                  </HStack>
                </TabPanel>
                <TabPanel h="100%" p="0" overflow="hidden">
                  <HStack align="flex-start" spacing="0" h="100%" w="100%" overflow="hidden">
                    <VStack align="center" justify="center" flex={1} h="100%" bg="customDark.2" pt="64px" pb="64px" px="54px">
                      <Text fontSize="lg" color="customGray.800">
                        Calendar
                      </Text>
                    </VStack>
                    <VStack align="stretch" spacing="16px" w="300px" h="100%" p="24px" bg="white" borderLeft="1px solid" borderLeftColor="customGray.200" overflowY="auto" sx={{
                      '&::-webkit-scrollbar': {
                        width: '6px',
                      },
                      '&::-webkit-scrollbar-track': {
                        bg: 'transparent',
                      },
                      '&::-webkit-scrollbar-thumb': {
                        bg: 'rgba(0, 0, 0, 0.1)',
                        borderRadius: '3px',
                        '&:hover': {
                          bg: 'rgba(0, 0, 0, 0.2)',
                        },
                      },
                    }}>
                      <Text fontSize="sm" color="customGray.500">Calendar settings would go here</Text>
                    </VStack>
                  </HStack>
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

      <Modal
        isOpen={isDeleteOpen}
        onClose={onDeleteClose}
        isCentered
      >
        <ModalOverlay bg="rgba(0, 0, 0, 0.5)" />
        <ModalContent
          bg="white"
          borderRadius="lg"
          boxShadow="0 10px 40px rgba(0, 0, 0, 0.1)"
        >
          <ModalHeader pb={0} pt="lg" px="16px">
            <VStack align="start" spacing="12px" w="100%">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <g clipPath="url(#clip0_138_3095)">
                  <path fillRule="evenodd" clipRule="evenodd" d="M23.1709 7.7166L35.1387 28.6614C36.5294 31.0959 34.7715 34.1258 31.9682 34.1258H8.03263C5.2278 34.1258 3.4699 31.0959 4.86215 28.6614L16.83 7.7166C18.2316 5.26178 21.7693 5.26178 23.1709 7.7166ZM20.0004 12.5001C20.9278 12.5001 21.6796 13.2519 21.6796 14.1794V20.2972C21.6796 21.2247 20.9278 21.9765 20.0004 21.9765C19.0729 21.9765 18.3211 21.2247 18.3211 20.2972V14.1794C18.3211 13.2519 19.0729 12.5001 20.0004 12.5001ZM20.0005 29.6668C21.2892 29.6668 22.3339 28.6221 22.3339 27.3334C22.3339 26.0448 21.2892 25.0001 20.0005 25.0001C18.7118 25.0001 17.6672 26.0448 17.6672 27.3334C17.6672 28.6221 18.7118 29.6668 20.0005 29.6668Z" fill="#EF4444"/>
                </g>
                <defs>
                  <clipPath id="clip0_138_3095">
                    <rect width="40" height="40" fill="white"/>
                  </clipPath>
                </defs>
              </svg>
              <Heading fontSize="base" fontWeight="medium" color="customGray.800">
                Delete the workspace
              </Heading>
            </VStack>
          </ModalHeader>
          <ModalBody pt="8px" px="16px">
            <Text fontSize="sm" color="customGray.600">
              Are you sure you want to delete this workspace? This action cannot be undone.
            </Text>
          </ModalBody>
          <ModalFooter pt="12px" pr="16px" pb="16px">
            <HStack spacing="md">
              <Button
                size="sm"
                variant="outline"
                borderColor="customGray.300"
                color="customGray.800"
                onClick={onDeleteClose}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                bg="customGray.800"
                color="white"
                px="16px"
                isLoading={isDeleting}
                _hover={{ bg: "customGray.700" }}
                onClick={async () => {
                  if (selectedAgent) {
                    setIsDeleting(true);
                    try {
                      // Get current user session
                      const { data: { session } } = await supabase.auth.getSession();
                      const userId = session?.user?.id;

                      if (!userId) {
                        toast({
                          title: "Error",
                          description: "User session not found",
                          status: "error",
                          isClosable: true,
                          position: "top",
                        });
                        return;
                      }

                      // Delete from Supabase first
                      const success = await deleteAgent(userId, selectedAgent);

                      if (!success) {
                        toast({
                          title: "Error",
                          description: "Failed to delete workspace. Please try again.",
                          status: "error",
                          isClosable: true,
                          position: "top",
                        });
                        return;
                      }

                      // Only update local state after successful Supabase deletion
                      const updatedAgents = agents.filter(a => a.name !== selectedAgent);
                      setAgents(updatedAgents);
                      localStorage.setItem("workspace_agents", JSON.stringify(updatedAgents));

                      if (updatedAgents.length > 0) {
                        setSelectedAgent(updatedAgents[updatedAgents.length - 1].name);
                      } else {
                        setSelectedAgent(null);
                      }

                      toast({
                        title: "Workspace deleted",
                        description: "The workspace has been deleted successfully",
                        status: "success",
                        isClosable: true,
                        position: "top",
                      });
                    } finally {
                      setIsDeleting(false);
                      onDeleteClose();
                    }
                  }
                }}
              >
                Delete
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal
        isOpen={isAddFieldOpen}
        onClose={onAddFieldClose}
        isCentered
      >
        <ModalOverlay bg="rgba(0, 0, 0, 0.5)" />
        <ModalContent
          bg="white"
          borderRadius="lg"
          boxShadow="0 10px 40px rgba(0, 0, 0, 0.1)"
          maxW="400px"
        >
          <ModalHeader pb="12px" pt="lg" px="16px">
            <Heading fontSize="base" fontWeight="medium" color="customGray.800">
              Add a field
            </Heading>
          </ModalHeader>
          <ModalBody pt="0" px="16px" pb="16px">
            <VStack align="stretch" spacing="8px">
              {[
                { type: "text", label: "Short text", icon: "Aa" },
                { type: "email", label: "Email", icon: "@" },
                { type: "textarea", label: "Long text", icon: "¶" },
                { type: "phone", label: "Phone", icon: "☎" },
              ].map((fieldOption) => (
                <Button
                  key={fieldOption.type}
                  variant="ghost"
                  w="100%"
                  justifyContent="flex-start"
                  fontSize="sm"
                  color="customGray.800"
                  _hover={{ bg: "customGray.50" }}
                  p="12px"
                  h="auto"
                  onClick={() => {
                    const newField = {
                      id: Date.now().toString(),
                      name: fieldOption.label,
                      type: fieldOption.type,
                    };
                    const newFields = [...formFields];
                    newFields.splice(insertAtIndex, 0, newField);
                    setFormFields(newFields);
                    onAddFieldClose();
                  }}
                >
                  <HStack spacing="12px" w="100%">
                    <Text fontSize="base" fontWeight="medium" color="customGray.500">
                      {fieldOption.icon}
                    </Text>
                    <Text>{fieldOption.label}</Text>
                  </HStack>
                </Button>
              ))}
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Flex>
  );
}

