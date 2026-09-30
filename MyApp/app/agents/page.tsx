"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  Flex,
  HStack,
  IconButton,
  Input,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  SimpleGrid,
  Skeleton,
  SkeletonCircle,
  Text,
  VStack,
  useToast,
} from "@chakra-ui/react";
import { CloseIcon, SearchIcon } from "@chakra-ui/icons";
import Sidebar from "@/app/components/Sidebar";
import { AgentMark } from "@/app/components/AgentMark";
import { FloatingScrollbar, HIDE_NATIVE_SCROLLBAR_SX } from "@/app/components/FloatingScrollbar";
import { AGENT_CATEGORIES, type AgentConfig } from "@/app/components/AgentConfigPanel";
import { supabase, syncServerSession } from "@/lib/supabase";

type AgentRow = {
  id: number;
  name: string;
  status: string;
  workspace_name: string | null;
  updated_at: string;
  config: AgentConfig | null;
};

const TABS = ["All", "My Agents"] as const;
type Tab = (typeof TABS)[number];

const STATUS_FILTERS = ["All Agents", "Online", "Draft"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

// Starting points that create a real agent with its brief already written,
// rather than dropping you into an empty builder.
const TEMPLATES = [
  {
    name: "Support assistant",
    category: "Support",
    blurb: "Answers common questions about your product and hands anything unusual to a person.",
    instructions:
      "You answer customer questions about the product using the business context provided. " +
      "If you are not confident, say so and offer to pass the conversation to a teammate.",
  },
  {
    name: "Lead qualifier",
    category: "Sales",
    blurb: "Greets visitors, learns what they need, and collects their details for your sales team.",
    instructions:
      "You greet website visitors, ask what problem they are trying to solve, and collect their name, " +
      "email and company before handing the conversation to sales.",
  },
  {
    name: "Onboarding guide",
    category: "Onboarding",
    blurb: "Walks new customers through setup, one step at a time, and links to the right docs.",
    instructions:
      "You guide new customers through setting up the product. Give one step at a time, confirm it worked, " +
      "then move on. Link to documentation where it helps.",
  },
];

const TEMPLATES_DISMISSED_KEY = "agents_templates_dismissed";

export default function AgentsPage() {
  const router = useRouter();
  const toast = useToast({ position: "top" });
  const scrollRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [userId, setUserId] = useState("");
  const [agents, setAgents] = useState<AgentRow[]>([]);

  const [tab, setTab] = useState<Tab>("All");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All Agents");
  const [trainingFilter, setTrainingFilter] = useState<"skills" | "knowledge" | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [showTemplates, setShowTemplates] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push("/");
        return;
      }
      // Cookie sync for Server Actions runs alongside the queries below
      // rather than in front of them.
      void syncServerSession(session);
      setUserEmail(session.user.email || "");
      setUserName(session.user.user_metadata?.full_name || "");
      setAvatarUrl(session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || "");
      setUserId(session.user.id);

      try {
        setShowTemplates(localStorage.getItem(TEMPLATES_DISMISSED_KEY) !== "1");
      } catch {
        // Private windows can throw on storage access; the strip just stays.
      }

      // Every agent this user owns, across workspaces — this section isn't
      // scoped to whichever workspace the builder has selected.
      const { data, error } = await supabase
        .from("chatbot_agents")
        .select("id, name, status, workspace_name, updated_at, config")
        .eq("user_id", session.user.id)
        .order("updated_at", { ascending: false });

      if (error) {
        console.error("Error loading agents:", error);
      } else {
        setAgents((data || []) as AgentRow[]);
      }
      setIsLoading(false);
    })();
  }, [router]);

  const visibleAgents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return agents.filter((agent) => {
      if (statusFilter === "Online" && agent.status !== "Published") return false;
      if (statusFilter === "Draft" && agent.status === "Published") return false;
      // Training rows list the agents still missing that piece.
      if (trainingFilter === "skills" && (agent.config?.skills || []).length > 0) return false;
      if (trainingFilter === "knowledge" && (agent.config?.knowledge || []).length > 0) return false;
      if (!query) return true;
      const description = agent.config?.description || "";
      return `${agent.name} ${description}`.toLowerCase().includes(query);
    });
  }, [agents, statusFilter, trainingFilter, searchQuery]);

  const statusCounts = useMemo(
    () => ({
      "All Agents": agents.length,
      Online: agents.filter((agent) => agent.status === "Published").length,
      Draft: agents.filter((agent) => agent.status !== "Published").length,
    }),
    [agents]
  );

  const trainingCounts = useMemo(
    () => ({
      skills: agents.filter((agent) => (agent.config?.skills || []).length === 0).length,
      knowledge: agents.filter((agent) => (agent.config?.knowledge || []).length === 0).length,
    }),
    [agents]
  );

  const recentAgents = useMemo(
    () =>
      [...agents]
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, 5),
    [agents]
  );

  // Cards are grouped by the category set on the agent; anything without one
  // collects under "Other", which sorts last.
  const groups = useMemo(() => {
    const byCategory = new Map<string, AgentRow[]>();
    visibleAgents.forEach((agent) => {
      const category = agent.config?.category || "Other";
      byCategory.set(category, [...(byCategory.get(category) || []), agent]);
    });
    const order = [...AGENT_CATEGORIES, "Other"];
    return [...byCategory.entries()].sort(
      ([a], [b]) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99)
    );
  }, [visibleAgents]);

  const openAgent = (agent: AgentRow) => {
    const workspace = agent.workspace_name ? `&workspace=${encodeURIComponent(agent.workspace_name)}` : "";
    router.push(`/chatbot-builder?id=${agent.id}${workspace}`);
  };

  const createAgent = () => {
    const workspace = agents[0]?.workspace_name;
    router.push(workspace ? `/agents/new?workspace=${encodeURIComponent(workspace)}` : "/agents/new");
  };

  const createFromTemplate = async (template: (typeof TEMPLATES)[number]) => {
    if (isCreating) return;
    setIsCreating(true);
    try {
      const payload: Record<string, unknown> = {
        user_id: userId,
        workspace_name: agents[0]?.workspace_name ?? null,
        name: template.name,
        business_context: template.instructions,
        agent_type: "ai",
        config: { category: template.category, description: template.blurb },
      };

      let { data, error } = await supabase.from("chatbot_agents").insert(payload).select("id").single();
      if (error && (error.code === "42703" || error.code === "PGRST204")) {
        // Older database without the newer columns — create what it can hold.
        delete payload.agent_type;
        delete payload.config;
        ({ data, error } = await supabase.from("chatbot_agents").insert(payload).select("id").single());
      }
      if (error || !data) {
        toast({ title: "Couldn't create that agent", description: error?.message, status: "error" });
        return;
      }
      router.push(`/chatbot-builder?id=${data.id}`);
    } finally {
      setIsCreating(false);
    }
  };

  const togglePublish = async (agent: AgentRow) => {
    const nextStatus = agent.status === "Published" ? "Draft" : "Published";
    const { error } = await supabase
      .from("chatbot_agents")
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq("id", agent.id);
    if (error) {
      toast({ title: "Couldn't update that agent", description: error.message, status: "error" });
      return;
    }
    setAgents((current) =>
      current.map((entry) => (entry.id === agent.id ? { ...entry, status: nextStatus } : entry))
    );
  };

  const removeAgent = async (agent: AgentRow) => {
    const { error } = await supabase.from("chatbot_agents").delete().eq("id", agent.id);
    if (error) {
      toast({ title: "Failed to delete agent", description: error.message, status: "error" });
      return;
    }
    setAgents((current) => current.filter((entry) => entry.id !== agent.id));
    toast({ title: "Agent deleted", status: "success" });
  };

  const dismissTemplates = () => {
    setShowTemplates(false);
    try {
      localStorage.setItem(TEMPLATES_DISMISSED_KEY, "1");
    } catch {
      // Nothing to do — it just reappears next visit.
    }
  };

  const agentCard = (agent: AgentRow) => {
    const isLive = agent.status === "Published";
    return (
      <VStack
        key={agent.id}
        align="stretch"
        spacing="0"
        bg="white"
        border="1px solid"
        borderColor="customGray.200"
        borderRadius="16px"
        p="20px"
        cursor="pointer"
        transition="border-color 0.15s ease, box-shadow 0.15s ease"
        _hover={{ borderColor: "customGray.300", boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)" }}
        onClick={() => openAgent(agent)}
      >
        <HStack justify="space-between" align="flex-start">
          <AgentMark size={40} variant={agent.id} animate={false} />
          <Menu isLazy placement="bottom-end">
            <MenuButton
              as={IconButton}
              aria-label="Agent actions"
              icon={<Text fontSize="18px" lineHeight="1" color="customGray.500">···</Text>}
              size="sm"
              variant="ghost"
              borderRadius="8px"
              _hover={{ bg: "customGray.100" }}
              onClick={(event) => event.stopPropagation()}
            />
            <MenuList minW="170px" boxShadow="0 2px 8px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)">
              <MenuItem fontSize="14px" onClick={(event) => { event.stopPropagation(); openAgent(agent); }}>
                Open
              </MenuItem>
              <MenuItem fontSize="14px" onClick={(event) => { event.stopPropagation(); togglePublish(agent); }}>
                {isLive ? "Set as draft" : "Publish"}
              </MenuItem>
              <MenuItem
                fontSize="14px"
                color="red.500"
                onClick={(event) => { event.stopPropagation(); removeAgent(agent); }}
              >
                Delete
              </MenuItem>
            </MenuList>
          </Menu>
        </HStack>

        <Text fontSize="16px" fontWeight="600" color="customGray.800" mt="14px" noOfLines={1}>
          {agent.name}
        </Text>
        <Text fontSize="14px" color="customGray.500" mt="2px" noOfLines={2} minH="40px">
          {agent.config?.description || "No description yet"}
        </Text>

        <Box h="1px" bg="customGray.200" mt="16px" mb="12px" />

        <HStack justify="space-between">
          <Text fontSize="13px" color="customGray.500" isTruncated>
            {agent.workspace_name || "Personal"}
          </Text>
          <HStack spacing="6px">
            <Box w="7px" h="7px" borderRadius="full" bg={isLive ? "green.500" : "customGray.300"} />
            <Text fontSize="13px" color="customGray.500">{isLive ? "Online" : "Draft"}</Text>
          </HStack>
        </HStack>
      </VStack>
    );
  };

  return (
    <Flex h="100vh" w="100vw" bg="dark.bg" overflow="hidden" position="fixed" top={0} left={0}>
      <Sidebar
        selectedNav="Agents"
        onNavClick={() => {}}
        isLoading={isLoading}
        userName={userName}
        userEmail={userEmail}
        avatarUrl={avatarUrl}
      />

      <VStack flex={1} h="100vh" bg="appBg" spacing={0} align="stretch" overflow="hidden" pt="12px" pr="12px" pb="12px">
        <HStack
          flex={1}
          h="100%"
          align="stretch"
          spacing={0}
          minH="0"
          bg="white"
          borderRadius="12px"
          border="1px solid"
          borderColor="customGray.200"
          overflow="hidden"
        >
          {/* Section list */}
          <VStack
            w="255px"
            flexShrink={0}
            h="100%"
            align="stretch"
            spacing={0}
            borderRight="1px solid"
            borderColor="customGray.200"
            overflowY="auto"
            sx={HIDE_NATIVE_SCROLLBAR_SX}
          >
            <HStack h="64px" align="center" pl="20px" pr="16px" pt="14px" pb="16px">
              <Text fontSize="base" fontWeight="medium" color="customGray.800">AI Agents</Text>
            </HStack>

            <VStack align="stretch" spacing="4px" px="12px" pt="2px" pb="16px">
              {STATUS_FILTERS.map((label) => {
                const isActive = statusFilter === label && trainingFilter === null;
                return (
                  <Box
                    key={label}
                    role="group"
                    h="32px"
                    bg={isActive ? "customGray.100" : "transparent"}
                    borderRadius="8px"
                    px="8px"
                    display="flex"
                    alignItems="center"
                    justifyContent="space-between"
                    cursor="pointer"
                    transition="all 0.2s"
                    _hover={{ bg: "customGray.100" }}
                    onClick={() => {
                      setStatusFilter(label);
                      setTrainingFilter(null);
                    }}
                  >
                    <Text fontSize="sm" fontWeight={isActive ? "500" : "normal"} color={isActive ? "customGray.700" : "customGray.500"}>
                      {label}
                    </Text>
                    <Text fontSize="sm" color="customGray.400" opacity={isActive ? 1 : 0} _groupHover={{ opacity: 1 }}>
                      {statusCounts[label]}
                    </Text>
                  </Box>
                );
              })}
            </VStack>

            {/* Training: the two things an agent still needs before it is
                much use. Each row lists the agents missing that piece. */}
            <VStack align="stretch" spacing="4px" px="12px" pt="8px" pb="16px">
              <Text fontSize="11px" fontWeight="600" color="customGray.800" textTransform="uppercase" letterSpacing="0.04em" px="8px" pb="4px">
                Training
              </Text>
              {([
                ["skills", "Add skills", trainingCounts.skills],
                ["knowledge", "Knowledge base", trainingCounts.knowledge],
              ] as const).map(([key, label, count]) => {
                const isActive = trainingFilter === key;
                return (
                  <Box
                    key={key}
                    role="group"
                    h="32px"
                    bg={isActive ? "customGray.100" : "transparent"}
                    borderRadius="8px"
                    px="8px"
                    display="flex"
                    alignItems="center"
                    justifyContent="space-between"
                    cursor="pointer"
                    transition="all 0.2s"
                    _hover={{ bg: "customGray.100" }}
                    onClick={() => {
                      setTrainingFilter(isActive ? null : key);
                      setStatusFilter("All Agents");
                    }}
                  >
                    <Text fontSize="sm" fontWeight={isActive ? "500" : "normal"} color={isActive ? "customGray.700" : "customGray.500"} isTruncated>
                      {label}
                    </Text>
                    <Text fontSize="sm" color="customGray.400" opacity={isActive ? 1 : 0} _groupHover={{ opacity: 1 }}>
                      {count}
                    </Text>
                  </Box>
                );
              })}
            </VStack>

            {recentAgents.length > 0 && (
              <VStack align="stretch" spacing="4px" px="12px" pt="8px" pb="16px">
                <Text fontSize="11px" fontWeight="600" color="customGray.800" textTransform="uppercase" letterSpacing="0.04em" px="8px" pb="4px">
                  Recent agents
                </Text>
                {recentAgents.map((agent) => (
                  <Box
                    key={agent.id}
                    h="32px"
                    borderRadius="8px"
                    px="8px"
                    display="flex"
                    alignItems="center"
                    cursor="pointer"
                    transition="all 0.2s"
                    _hover={{ bg: "customGray.100" }}
                    onClick={() => openAgent(agent)}
                  >
                    <Text fontSize="sm" color="customGray.500" isTruncated>{agent.name}</Text>
                  </Box>
                ))}
              </VStack>
            )}
          </VStack>

          {/* Content */}
          <VStack flex="1" minW="0" h="100%" align="stretch" spacing={0}>
          <Box position="relative" flex="1" minH="0">
            <FloatingScrollbar scrollRef={scrollRef} />
            <Box ref={scrollRef} h="100%" overflowY="auto" sx={HIDE_NATIVE_SCROLLBAR_SX}>
              <Box maxW="1120px" mx="auto" px="32px" pb="48px">
                {/* Heading */}
                <Text fontSize="xl" fontWeight="500" color="customGray.800" mt="24px">Agents</Text>
                <Text fontSize="14px" color="customGray.600" mt="6px">
                  Agents answer your visitors around the clock. Give them your knowledge base, a tone of voice,
                  and the questions you want them to handle.
                </Text>

                {/* Tabs + search */}
                <HStack justify="space-between" mt="40px" spacing="16px" wrap="wrap">
                  <HStack spacing="4px">
                    {TABS.map((entry) => (
                      <Box
                        key={entry}
                        as="button"
                        px="12px"
                        h="32px"
                        borderRadius="full"
                        bg={tab === entry ? "customGray.100" : "transparent"}
                        _hover={{ bg: tab === entry ? "customGray.100" : "customGray.50" }}
                        onClick={() => setTab(entry)}
                      >
                        <Text fontSize="14px" fontWeight={tab === entry ? "500" : "400"} color="customGray.800">
                          {entry}
                        </Text>
                      </Box>
                    ))}
                  </HStack>

                  <HStack spacing="10px">
                    {/* Same expanding search the events list uses. */}
                    <HStack
                      spacing="0"
                      bg="transparent"
                      borderRadius="6px"
                      border="none"
                      transition="width 0.3s ease"
                      overflow="hidden"
                      h="32px"
                      w={isSearchExpanded ? "224px" : "32px"}
                      flexShrink={0}
                    >
                      <IconButton
                        aria-label="Search"
                        icon={<SearchIcon w="16px" h="16px" />}
                        size="sm"
                        variant="ghost"
                        color="customGray.600"
                        flexShrink={0}
                        _hover={isSearchExpanded ? undefined : { bg: "customGray.50" }}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => setIsSearchExpanded(!isSearchExpanded)}
                      />
                      <Input
                        ref={searchInputRef}
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="Search..."
                        variant="unstyled"
                        w="160px"
                        flexShrink={0}
                        px="8px"
                        fontSize="sm"
                        color="customGray.800"
                        _placeholder={{ color: "customGray.400" }}
                        onBlur={() => { if (searchQuery === "") setIsSearchExpanded(false); }}
                      />
                      <Box w="32px" h="32px" flexShrink={0} display="flex" alignItems="center" justifyContent="center">
                        {searchQuery !== "" && (
                          <IconButton
                            aria-label="Clear search"
                            icon={<CloseIcon w="9px" h="9px" />}
                            size="xs"
                            variant="ghost"
                            color="customGray.500"
                            _hover={{ bg: "customGray.100" }}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => {
                              setSearchQuery("");
                              searchInputRef.current?.focus({ preventScroll: true });
                            }}
                          />
                        )}
                      </Box>
                    </HStack>

                    <Button
                      size="sm"
                      px="14px"
                      bg="brand.primary"
                      color="white"
                      flexShrink={0}
                      display="flex"
                      alignItems="center"
                      gap="8px"
                      _hover={{ bg: "brand.primaryHover" }}
                      onClick={createAgent}
                    >
                      <Box display="flex" alignItems="center" justifyContent="center" w="16px" h="16px">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </Box>
                      Create agent
                    </Button>
                  </HStack>
                </HStack>

                {/* Templates */}
                {showTemplates && (
                  <Box bg="customGray.50" borderRadius="16px" p="24px" mt="28px">
                    <HStack justify="space-between" align="flex-start">
                      <Text fontSize="17px" fontWeight="600" color="customGray.800">Get started with a template</Text>
                      <IconButton
                        aria-label="Hide templates"
                        icon={<CloseIcon boxSize="10px" />}
                        size="sm"
                        variant="ghost"
                        color="customGray.500"
                        _hover={{ bg: "customGray.100" }}
                        onClick={dismissTemplates}
                      />
                    </HStack>

                    <SimpleGrid columns={{ base: 1, md: 3 }} spacing="16px" mt="16px">
                      {TEMPLATES.map((template) => (
                        <VStack
                          key={template.name}
                          align="stretch"
                          spacing="0"
                          bg="white"
                          border="1px solid"
                          borderColor="customGray.200"
                          borderRadius="14px"
                          p="18px"
                          cursor="pointer"
                          transition="border-color 0.15s ease, box-shadow 0.15s ease"
                          _hover={{ borderColor: "customGray.300", boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)" }}
                          onClick={() => createFromTemplate(template)}
                        >
                          <AgentMark size={36} animate={false} variant={TEMPLATES.indexOf(template) + 1} />
                          <Text fontSize="15px" fontWeight="600" color="customGray.800" mt="14px">
                            {template.name}
                          </Text>
                          <Text fontSize="14px" color="customGray.500" mt="4px" noOfLines={2}>
                            {template.blurb}
                          </Text>
                          <Box h="1px" bg="customGray.200" mt="14px" mb="10px" />
                          <Text fontSize="13px" color="customGray.500">{template.category}</Text>
                        </VStack>
                      ))}
                    </SimpleGrid>
                  </Box>
                )}

                {/* Agents, grouped by category */}
                {isLoading ? (
                  <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing="16px" mt="32px">
                    {[0, 1, 2].map((card) => (
                      <VStack
                        key={`skeleton-${card}`}
                        align="stretch"
                        spacing="12px"
                        border="1px solid"
                        borderColor="customGray.200"
                        borderRadius="16px"
                        p="20px"
                      >
                        <SkeletonCircle size="40px" startColor="customGray.100" endColor="customGray.200" />
                        <Skeleton h="14px" w="60%" borderRadius="6px" startColor="customGray.100" endColor="customGray.200" />
                        <Skeleton h="12px" w="90%" borderRadius="6px" startColor="customGray.100" endColor="customGray.200" />
                      </VStack>
                    ))}
                  </SimpleGrid>
                ) : groups.length === 0 ? (
                  <VStack spacing="10px" py="64px">
                    <Text fontSize="15px" color="customGray.600">
                      {agents.length === 0 ? "No agents yet" : "No agents match that search"}
                    </Text>
                    {agents.length === 0 && (
                      <Button size="sm" variant="ghost" fontSize="14px" color="customGray.700" onClick={createAgent}>
                        Create your first agent
                      </Button>
                    )}
                  </VStack>
                ) : (
                  groups.map(([category, rows]) => (
                    <Box key={category} mt="36px">
                      <Text fontSize="19px" fontWeight="600" color="customGray.800" mb="16px">{category}</Text>
                      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing="16px">
                        {rows.map(agentCard)}
                      </SimpleGrid>
                    </Box>
                  ))
                )}
              </Box>
            </Box>
          </Box>
          </VStack>
        </HStack>
      </VStack>
    </Flex>
  );
}
