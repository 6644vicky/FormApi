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
  IconButton,
  useOutsideClick,
  Progress,
} from "@chakra-ui/react";
import { SearchIcon, ChevronDownIcon, HamburgerIcon } from "@chakra-ui/icons";

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

const spin = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
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
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
  const [isLoadingWorkspaces, setIsLoadingWorkspaces] = useState(true);
  const [enableSidebarTransition, setEnableSidebarTransition] = useState(false);
  const isMountedRef = useRef(false);
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useOutsideClick({
    ref: searchRef,
    handler: () => setIsSearchExpanded(false),
  });
  const [calendarEvents, setCalendarEvents] = useState<Array<{ id: number; title: string; meeting_link: string; updated_at: string }>>([]);

  useEffect(() => {
    isMountedRef.current = true;
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

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
      } finally {
        setIsLoadingWorkspaces(false);
      }
    };

    loadAgents();
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem("workspace_agents", JSON.stringify(agents));
  }, [agents]);

  useEffect(() => {
    const loadCalendarEvents = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        const { data, error } = await supabase
          .from("calendar_events")
          .select("id, event_title, title, meeting_link, updated_at")
          .eq("user_id", session.user.id)
          .order("updated_at", { ascending: false });

        if (error) {
          console.log("Error loading calendar events:", error);
          return;
        }

        if (data) {
          setCalendarEvents(
            data.map((e) => ({
              id: e.id,
              title: e.event_title || e.title || "Untitled event",
              meeting_link: e.meeting_link || "Link",
              updated_at: e.updated_at,
            }))
          );
        }
      } catch (error) {
        console.error("Error loading calendar events:", error);
      }
    };

    loadCalendarEvents();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');

    if (tabParam === 'calendar') {
      setActiveTabIndex(1);
    } else if (tabParam === 'form') {
      setActiveTabIndex(0);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

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

  const handleDuplicate = async () => {
    if (selectedAgent) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) {
          toast({
            title: "Error",
            description: "User not authenticated",
            status: "error",
            duration: 3000,
            isClosable: true,
          });
          return;
        }

        const agentToClone = agents.find(a => a.name === selectedAgent);
        if (agentToClone) {
          const newAgentName = `${selectedAgent} (Copy)`;
          const success = await createAgent(session.user.id, {
            name: newAgentName,
            services: agentToClone.services,
          });

          if (success) {
            const dbAgents = await getAgents(session.user.id);
            setAgents(dbAgents);
            setSelectedAgent(newAgentName);
            localStorage.setItem("workspace_agents", JSON.stringify(dbAgents));
            toast({
              title: "Duplicated!",
              description: `${selectedAgent} has been duplicated as "${newAgentName}"`,
              status: "success",
              duration: 3000,
              isClosable: true,
            });
          }
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to duplicate workspace",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
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

    setIsCreatingWorkspace(true);

    const newAgent = { name: agentName, services: selectedServices };

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        await createAgent(session.user.id, newAgent);
      }

      // Update local state after successful creation
      const updatedAgents = [...agents, newAgent];
      setAgents(updatedAgents);
      localStorage.setItem("workspace_agents", JSON.stringify(updatedAgents));

      setSelectedAgent(agentName);
      setAgentName("");
      setSelectedServices([]);
      setCreateError("");
      onCreateClose();
    } catch (error) {
      console.error("Error creating workspace:", error);
      setCreateError("Failed to create workspace. Please try again.");
    } finally {
      setIsCreatingWorkspace(false);
    }
  };

  if (isLoadingWorkspaces) {
    return (
      <div style={{ height: "100vh", width: "100vw", backgroundColor: "white", position: "fixed", top: 0, left: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Flex
          align="center"
          justify="center"
        >
          <Progress
            isIndeterminate
            size="xs"
            width="200px"
            bg="transparent"
            borderRadius="full"
            sx={{
              "& > div": {
                backgroundColor: "#27272A",
              },
            }}
          />
        </Flex>
      </div>
    );
  }

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
          <VStack w={agents.length === 0 ? "0px" : isWorkspaceListCollapsed ? "0px" : "255px"} h="100%" align="stretch" spacing={0} borderRight={agents.length === 0 || isWorkspaceListCollapsed ? "none" : "1px solid"} borderColor="customGray.200" overflow="hidden" transition={enableSidebarTransition ? "width 0.3s ease-in-out" : "none"}>
            <HStack h="64px" align="center" justify="space-between" pl="20px" pr="16px" pt="14px" pb="16px">
              <Text fontSize="base" fontWeight="medium" color="customGray.800">
                Workspace
              </Text>
              <Tooltip label="Create workspace" placement="bottom">
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
              </Tooltip>
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
                  bg={selectedAgent === agentObj.name ? "customGray.100" : "transparent"}
                  borderRadius="8px"
                  px="8px"
                  py="8px"
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                  cursor="pointer"
                  onClick={() => setSelectedAgent(agentObj.name)}
                  onMouseEnter={() => setHoveredAgent(agentObj.name)}
                  onMouseLeave={() => setHoveredAgent(null)}
                  _hover={{ bg: selectedAgent === agentObj.name ? "customGray.100" : "customGray.100" }}
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
            {agents.length > 0 && (
            <HStack h="64px" align="center" justify="space-between" pl="20px" pr="14px" pt="14px" pb="18px" w="100%">
              <HStack spacing="4px" align="center">
                <Tooltip label={isWorkspaceListCollapsed ? "Expand" : "Collapse"} placement="bottom">
                  <Button
                    variant="ghost"
                    size="sm"
                    p="6px"
                    minW="auto"
                    color="customGray.800"
                    _hover={{ bg: "customGray.50" }}
                    onClick={() => {
                      if (!enableSidebarTransition) setEnableSidebarTransition(true);
                      setIsWorkspaceListCollapsed(!isWorkspaceListCollapsed);
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M14.25 2.25H3.75C2.92157 2.25 2.25 2.92157 2.25 3.75V14.25C2.25 15.0784 2.92157 15.75 3.75 15.75H14.25C15.0784 15.75 15.75 15.0784 15.75 14.25V3.75C15.75 2.92157 15.0784 2.25 14.25 2.25Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M8 13.25L8 4.75C8 4.33579 7.66421 4 7.25 4L4.75 4C4.33579 4 4 4.33579 4 4.75L4 13.25C4 13.6642 4.33579 14 4.75 14L7.25 14C7.66421 14 8 13.6642 8 13.25Z" fill="currentColor"/>
                    </svg>
                  </Button>
                </Tooltip>
                <Text fontSize="16px" fontWeight="medium" color="customGray.800">
                  {selectedAgent || "form dev"}
                </Text>
              </HStack>
              <HStack spacing="8px">
                <Menu>
                  <MenuButton
                    as={IconButton}
                    aria-label="More options"
                    size="sm"
                    variant="ghost"
                    color="customGray.600"
                    _hover={{ bg: "customGray.100" }}
                    _active={{ bg: "customGray.100" }}
                    icon={
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="5" r="2" fill="currentColor" />
                        <circle cx="12" cy="12" r="2" fill="currentColor" />
                        <circle cx="12" cy="19" r="2" fill="currentColor" />
                      </svg>
                    }
                  />
                  <MenuList fontSize="sm" minW="160px">
                    <MenuItem color="customGray.800">
                      Duplicate
                    </MenuItem>
                    <MenuItem color="red.500" onClick={onDeleteOpen}>
                      Delete
                    </MenuItem>
                  </MenuList>
                </Menu>
                {agents.length > 0 && (
                  <Button size="sm" bg="customGray.800" color="white" _hover={{ bg: "customGray.700" }} display="flex" alignItems="center" gap="8px" onClick={() => {
                    const tab = activeTabIndex === 1 ? 'calendar' : 'form';
                    router.push(`/calendar-builder?tab=${tab}`);
                  }}>
                    <Box display="flex" alignItems="center" justifyContent="center" w="16px" h="16px">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </Box>
                    {activeTabIndex === 0 ? "Create form" : "Create event"}
                  </Button>
                )}
              </HStack>
            </HStack>
            )}
            {agents.length > 0 ? (
            <Tabs flex={1} display="flex" flexDirection="column" overflow="hidden" w="100%" index={activeTabIndex} onChange={setActiveTabIndex}>
              <TabList pl="24px" borderBottom="1px solid" borderColor="customGray.200">
                <Tab fontSize="sm" color="customGray.500" pb="12px" mb="-1px" borderBottom="2px solid transparent" _selected={{ color: "customGray.800", borderColor: "customGray.800", bg: "white" }} display="flex" alignItems="center" gap="6px" pl="0px">
                  <svg width="16" height="16" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10.5 1.5V4.5C10.5 4.89782 10.658 5.27936 10.9393 5.56066C11.2206 5.84196 11.6022 6 12 6H15M7.5 6.75H6M12 9.75H6M12 12.75H6M11.25 1.5H4.5C4.10218 1.5 3.72064 1.65804 3.43934 1.93934C3.15804 2.22064 3 2.60218 3 3V15C3 15.3978 3.15804 15.7794 3.43934 16.0607C3.72064 16.342 4.10218 16.5 4.5 16.5H13.5C13.8978 16.5 14.2794 16.342 14.5607 16.0607C14.842 15.7794 15 15.3978 15 15V5.25L11.25 1.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Form
                </Tab>
                <Tab fontSize="sm" color="customGray.500" pb="12px" mb="-1px" borderBottom="2px solid transparent" _selected={{ color: "customGray.800", borderColor: "customGray.800", bg: "white" }} display="flex" alignItems="center" gap="6px">
                  <svg width="16" height="16" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 1.5V4.5M12 1.5V4.5M2.25 7.5H15.75M3.75 3H14.25C15.0784 3 15.75 3.67157 15.75 4.5V15C15.75 15.8284 15.0784 16.5 14.25 16.5H3.75C2.92157 16.5 2.25 15.8284 2.25 15V4.5C2.25 3.67157 2.92157 3 3.75 3Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Calendar
                </Tab>
              </TabList>
              <TabPanels flex={1} overflow="hidden" h="100%">
                <TabPanel h="100%" p="0" overflow="hidden">
                  <VStack w="100%" align="center" justify="center" spacing="24px">
                    <VStack align="center" spacing="12px">
                      <Box w="120px" h="120px" display="flex" alignItems="center" justifyContent="center">
                        <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="60" cy="60" r="50" stroke="#E4E4E7" strokeWidth="2" opacity="0.5"/>
                          <path d="M60 40L75 55M60 40L45 55M60 40V75M45 55H75" stroke="#A1A1AA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </Box>
                      <VStack align="center" spacing="8px">
                        <Heading fontSize="18px" fontWeight="500" color="customGray.800">
                          Form builder coming soon
                        </Heading>
                        <Text fontSize="14px" color="customGray.600" textAlign="center" maxW="280px">
                          Form builder features will be available soon
                        </Text>
                      </VStack>
                    </VStack>
                  </VStack>
                </TabPanel>
                <TabPanel h="100%" p="0" overflow="hidden">
                  <VStack w="100%" align="stretch" spacing={0}>
                    <Box w="100%" px="24px" py="12px" h="50px" display="flex" alignItems="center" justifyContent="flex-end" bg="white" borderBottom="1px solid" borderBottomColor="customGray.200">
                      <HStack spacing="12px">
                        <HStack ref={searchRef} spacing="0" bg={isSearchExpanded ? "white" : "transparent"} borderRadius="6px" border="1px solid" borderColor={isSearchExpanded ? "customGray.300" : "transparent"} transition="all 0.3s ease" overflow="hidden" h="32px">
                          <IconButton aria-label="Search" icon={<SearchIcon w="16px" h="16px" />} size="sm" variant="ghost" color="customGray.600" _hover={{ bg: "customGray.50" }} onClick={() => setIsSearchExpanded(!isSearchExpanded)} />
                          <Input placeholder="Search..." variant="unstyled" w={isSearchExpanded ? "160px" : "0px"} opacity={isSearchExpanded ? 1 : 0} transition="all 0.3s ease" px={isSearchExpanded ? "8px" : "0px"} fontSize="sm" color="customGray.800" _placeholder={{ color: "customGray.400" }} onBlur={() => setIsSearchExpanded(false)} autoFocus={isSearchExpanded} />
                        </HStack>
                        <IconButton aria-label="Filter" icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 6H21M5 12H19M7 18H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>} size="sm" variant="ghost" color="customGray.600" _hover={{ bg: "customGray.50" }} />
                        <Button size="sm" variant="outline" leftIcon={<Box w="8px" h="8px" display="flex" alignItems="center" justifyContent="center"><svg width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M0 4C0 1.79086 1.79086 0 4 0V0C6.20914 0 8 1.79086 8 4V4C8 6.20914 6.20914 8 4 8V8C1.79086 8 0 6.20914 0 4V4Z" fill="#16A34A"/></svg></Box>} rightIcon={<ChevronDownIcon w="16px" h="16px" />} borderRadius="full" border="1px solid" borderColor="customGray.300" bg="white" color="customGray.600" fontSize="sm" fontWeight="medium" _hover={{ bg: "customGray.50" }} iconSpacing="4px">
                          Online
                        </Button>
                      </HStack>
                    </Box>
                    <Box w="100%" bg="customGray.50" borderBottom="1px solid" borderBottomColor="customGray.200">
                      <Flex w="100%" h="50px" pl="24px" pr="24px" align="center" gap="12px">
                        <Box w="300px" display="flex" alignItems="center">
                          <Text fontSize="sm" fontWeight="medium" color="customGray.600">Event Name</Text>
                        </Box>
                        <Box w="256px" display="flex" alignItems="center">
                          <Text fontSize="sm" fontWeight="medium" color="customGray.600">Booking Link</Text>
                        </Box>
                        <Box w="132px" display="flex" alignItems="center">
                          <Text fontSize="sm" fontWeight="medium" color="customGray.600">Status</Text>
                        </Box>
                        <Box w="132px" display="flex" alignItems="center">
                          <Text fontSize="sm" fontWeight="medium" color="customGray.600">Bookings</Text>
                        </Box>
                        <Box flex={1} display="flex" alignItems="center">
                          <Text fontSize="sm" fontWeight="medium" color="customGray.600">Last Updated</Text>
                        </Box>
                        <Box display="flex" alignItems="center" justifyContent="center" w="32px" h="32px" ml="12px">
                        </Box>
                      </Flex>
                    </Box>
                    {calendarEvents.map((event) => {
                      const initial = (event.title || "U").charAt(0).toUpperCase();
                      const updatedLabel = new Date(event.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                      return (
                        <Box key={event.id} w="100%" cursor="pointer" onClick={() => router.push(`/calendar-builder?id=${event.id}&tab=calendar`)}>
                          <Flex w="100%" h="50px" pl="24px" pr="24px" bg="white" borderBottom="1px solid" borderBottomColor="customGray.200" align="center" gap="12px" _hover={{ bg: "customGray.50" }} transition="background-color 0.2s">
                            <Box w="300px" display="flex" alignItems="center" gap="8px">
                              <Box w="24px" h="24px" bg="customGray.400" borderRadius="full" display="flex" alignItems="center" justifyContent="center" flexShrink={0}>
                                <Text fontSize="xs" fontWeight="medium" color="white">{initial}</Text>
                              </Box>
                              <Text fontSize="sm" color="customGray.800">{event.title}</Text>
                            </Box>
                            <Box w="256px" display="flex" alignItems="center">
                              <Text fontSize="sm" color="customGray.400">—</Text>
                            </Box>
                            <Box w="132px" display="flex" alignItems="center">
                              <Box px="8px" py="2px" bg="customGray.100" borderRadius="full">
                                <Text fontSize="xs" fontWeight="medium" color="customGray.600">Draft</Text>
                              </Box>
                            </Box>
                            <Box w="132px" display="flex" alignItems="center">
                              <Text fontSize="sm" color="customGray.600">0</Text>
                            </Box>
                            <Box flex={1} display="flex" alignItems="center">
                              <Text fontSize="sm" color="customGray.600">{updatedLabel}</Text>
                            </Box>
                            <Box display="flex" alignItems="center" justifyContent="center" w="32px" h="32px" ml="12px">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="12" cy="5" r="2" fill="currentColor" />
                                <circle cx="12" cy="12" r="2" fill="currentColor" />
                                <circle cx="12" cy="19" r="2" fill="currentColor" />
                              </svg>
                            </Box>
                          </Flex>
                        </Box>
                      );
                    })}
                    <Box w="100%" cursor="pointer">
                      <Flex w="100%" h="50px" pl="24px" pr="24px" bg="white" borderBottom="1px solid" borderBottomColor="customGray.200" align="center" gap="12px" _hover={{ bg: "customGray.50" }} transition="background-color 0.2s">
                        <Box w="300px" display="flex" alignItems="center" gap="8px">
                          <Box w="24px" h="24px" bg="#7C3AED" borderRadius="full" display="flex" alignItems="center" justifyContent="center" flexShrink={0}>
                            <Text fontSize="xs" fontWeight="medium" color="white">D</Text>
                          </Box>
                          <Text fontSize="sm" color="customGray.800">Demo Event</Text>
                        </Box>
                        <Box w="256px" display="flex" alignItems="center">
                          <Text fontSize="sm" color="customGray.600" textDecoration="underline">example.com/booking</Text>
                        </Box>
                        <Box w="132px" display="flex" alignItems="center">
                          <Text fontSize="sm" color="customGray.600">Active</Text>
                        </Box>
                        <Box w="132px" display="flex" alignItems="center">
                          <Text fontSize="sm" color="customGray.600">12</Text>
                        </Box>
                        <Box flex={1} display="flex" alignItems="center">
                          <Text fontSize="sm" color="customGray.600">Jul 18, 2026</Text>
                        </Box>
                        <Box display="flex" alignItems="center" justifyContent="center" w="32px" h="32px" ml="12px">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="12" cy="5" r="2" fill="currentColor" />
                            <circle cx="12" cy="12" r="2" fill="currentColor" />
                            <circle cx="12" cy="19" r="2" fill="currentColor" />
                          </svg>
                        </Box>
                      </Flex>
                    </Box>
                    <Box w="100%" cursor="pointer">
                      <Flex w="100%" h="50px" pl="24px" pr="24px" bg="white" borderBottom="1px solid" borderBottomColor="customGray.200" align="center" gap="12px" _hover={{ bg: "customGray.50" }} transition="background-color 0.2s">
                        <Box w="300px" display="flex" alignItems="center" gap="8px">
                          <Box w="24px" h="24px" bg="#EC4899" borderRadius="full" display="flex" alignItems="center" justifyContent="center" flexShrink={0}>
                            <Text fontSize="xs" fontWeight="medium" color="white">P</Text>
                          </Box>
                          <Text fontSize="sm" color="customGray.800">Product Launch</Text>
                        </Box>
                        <Box w="256px" display="flex" alignItems="center">
                          <Text fontSize="sm" color="customGray.600" textDecoration="underline">launch.mysite.com</Text>
                        </Box>
                        <Box w="132px" display="flex" alignItems="center">
                          <Text fontSize="sm" color="customGray.600">Pending</Text>
                        </Box>
                        <Box w="132px" display="flex" alignItems="center">
                          <Text fontSize="sm" color="customGray.600">8</Text>
                        </Box>
                        <Box flex={1} display="flex" alignItems="center">
                          <Text fontSize="sm" color="customGray.600">Jul 20, 2026</Text>
                        </Box>
                        <Box display="flex" alignItems="center" justifyContent="center" w="32px" h="32px" ml="12px">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="12" cy="5" r="2" fill="currentColor" />
                            <circle cx="12" cy="12" r="2" fill="currentColor" />
                            <circle cx="12" cy="19" r="2" fill="currentColor" />
                          </svg>
                        </Box>
                      </Flex>
                    </Box>
                    <Box w="100%" cursor="pointer">
                      <Flex w="100%" h="50px" pl="24px" pr="24px" bg="white" borderBottom="1px solid" borderBottomColor="customGray.200" align="center" gap="12px" _hover={{ bg: "customGray.50" }} transition="background-color 0.2s">
                        <Box w="300px" display="flex" alignItems="center" gap="8px">
                          <Box w="24px" h="24px" bg="#0EA5E9" borderRadius="full" display="flex" alignItems="center" justifyContent="center" flexShrink={0}>
                            <Text fontSize="xs" fontWeight="medium" color="white">T</Text>
                          </Box>
                          <Text fontSize="sm" color="customGray.800">Team Meeting</Text>
                        </Box>
                        <Box w="256px" display="flex" alignItems="center">
                          <Text fontSize="sm" color="customGray.600" textDecoration="underline">meet.company.com</Text>
                        </Box>
                        <Box w="132px" display="flex" alignItems="center">
                          <Text fontSize="sm" color="customGray.600">Active</Text>
                        </Box>
                        <Box w="132px" display="flex" alignItems="center">
                          <Text fontSize="sm" color="customGray.600">25</Text>
                        </Box>
                        <Box flex={1} display="flex" alignItems="center">
                          <Text fontSize="sm" color="customGray.600">Jul 19, 2026</Text>
                        </Box>
                        <Box display="flex" alignItems="center" justifyContent="center" w="32px" h="32px" ml="12px">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="12" cy="5" r="2" fill="currentColor" />
                            <circle cx="12" cy="12" r="2" fill="currentColor" />
                            <circle cx="12" cy="19" r="2" fill="currentColor" />
                          </svg>
                        </Box>
                      </Flex>
                    </Box>
                  </VStack>
                </TabPanel>
              </TabPanels>
            </Tabs>
            ) : (
            <VStack flex={1} align="center" justify="center" spacing="24px" w="100%">
              <VStack align="center" spacing="12px">
                <Box w="120px" h="120px" display="flex" alignItems="center" justifyContent="center">
                  <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="60" cy="60" r="50" stroke="#E4E4E7" strokeWidth="2" opacity="0.5"/>
                    <path d="M60 40L75 55M60 40L45 55M60 40V75M45 55H75" stroke="#A1A1AA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </Box>
                <VStack align="center" spacing="8px">
                  <Heading fontSize="18px" fontWeight="500" color="customGray.800">
                    No workspace found
                  </Heading>
                  <Text fontSize="14px" color="customGray.600" textAlign="center" maxW="280px">
                    Create your first workspace to get started with forms and calendar
                  </Text>
                </VStack>
              </VStack>
              <Button
                size="sm"
                bg="customGray.800"
                color="white"
                _hover={{ bg: "customGray.700" }}
                onClick={onCreateOpen}
              >
                <HStack spacing="8px">
                  <Box display="flex" alignItems="center" justifyContent="center">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </Box>
                  <Text>Create workspace</Text>
                </HStack>
              </Button>
            </VStack>
            )}
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
              fontSize="16px"
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
                    px="8px"
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
                    px="8px"
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
                    px="8px"
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
                _disabled={{ bg: "customGray.400", cursor: "not-allowed" }}
                onClick={handleCreateWorkspace}
                isDisabled={isCreatingWorkspace}
                isLoading={isCreatingWorkspace}
                loadingText="Creating..."
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

    </Flex>
  );
}

