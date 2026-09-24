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
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tooltip,
  Tr,
  VStack,
  useToast,
} from "@chakra-ui/react";
import { CloseIcon, SearchIcon } from "@chakra-ui/icons";
import Sidebar from "@/app/components/Sidebar";
import FullPageLoader from "@/app/components/FullPageLoader";
import { FloatingScrollbar, HIDE_NATIVE_SCROLLBAR_SX } from "@/app/components/FloatingScrollbar";
import { supabase, syncServerSession } from "@/lib/supabase";

type AgentRow = {
  id: number;
  name: string;
  status: string;
  workspace_name: string | null;
  updated_at: string;
};

const FILTERS = ["All Agents", "Online", "Draft"] as const;
type Filter = (typeof FILTERS)[number];

type Sort = "updated_desc" | "updated_asc" | "name_asc" | "name_desc";

const AVATAR_COLORS = ["#EA8C55", "#7C3AED", "#10B981", "#F59E0B", "#EF4444", "#06B6D4", "#8B5CF6", "#EC4899"];

export default function AgentsPage() {
  const router = useRouter();
  const toast = useToast({ position: "top" });

  const listRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [agents, setAgents] = useState<AgentRow[]>([]);

  const [filter, setFilter] = useState<Filter>("All Agents");
  const [sort, setSort] = useState<Sort>("updated_desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [isListCollapsed, setIsListCollapsed] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push("/login");
        return;
      }
      await syncServerSession(session);
      setUserEmail(session.user.email || "");
      setUserName(session.user.user_metadata?.full_name || "");
      setAvatarUrl(session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || "");

      // Every agent this user owns, across workspaces — this section isn't
      // scoped to whichever workspace the builder has selected.
      const { data, error } = await supabase
        .from("chatbot_agents")
        .select("id, name, status, workspace_name, updated_at")
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

  const filterCounts = useMemo(
    () => ({
      "All Agents": agents.length,
      Online: agents.filter((agent) => agent.status === "Published").length,
      Draft: agents.filter((agent) => agent.status !== "Published").length,
    }),
    [agents]
  );

  const visibleAgents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const byFilter = agents.filter((agent) => {
      if (filter === "Online") return agent.status === "Published";
      if (filter === "Draft") return agent.status !== "Published";
      return true;
    });
    const bySearch = query === "" ? byFilter : byFilter.filter((agent) => agent.name.toLowerCase().includes(query));

    return [...bySearch].sort((a, b) => {
      switch (sort) {
        case "name_asc":
          return a.name.localeCompare(b.name);
        case "name_desc":
          return b.name.localeCompare(a.name);
        case "updated_asc":
          return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
        default:
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }
    });
  }, [agents, filter, searchQuery, sort]);

  const openAgent = (agent: AgentRow) => {
    const workspace = agent.workspace_name ? `&workspace=${encodeURIComponent(agent.workspace_name)}` : "";
    router.push(`/chatbot-builder?id=${agent.id}${workspace}`);
  };

  const createAgent = () => {
    const workspace = agents[0]?.workspace_name;
    router.push(workspace ? `/chatbot-builder?workspace=${encodeURIComponent(workspace)}` : "/chatbot-builder");
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

  if (isLoading) return <FullPageLoader />;

  const toolbarButton = {
    size: "sm" as const,
    variant: "outline" as const,
    borderRadius: "8px",
    border: "none",
    bg: "white",
    color: "customGray.700",
    fontSize: "sm",
    fontWeight: "medium",
    _hover: { bg: "customGray.100" },
  };

  const headerCell = {
    border: "none",
    h: "50px",
    py: "0",
    px: "0",
    fontSize: "sm",
    fontWeight: "medium",
    color: "customGray.700",
    textTransform: "none" as const,
    letterSpacing: "normal",
  };

  return (
    <Flex h="100vh" w="100vw" bg="dark.bg" overflow="hidden" position="fixed" top={0} left={0}>
      <Sidebar
        selectedNav="Agents"
        onNavClick={() => {}}
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
          bg="white"
          borderRadius="12px"
          border="1px solid"
          borderColor="customGray.200"
          overflow="hidden"
        >
          {/* Section list. Fixed inner width so nothing reflows while the
              outer width animates — it slides out rather than squeezing. */}
          <VStack
            w={isListCollapsed ? "0px" : "255px"}
            h="100%"
            align="stretch"
            spacing={0}
            borderRight={isListCollapsed ? "none" : "1px solid"}
            borderColor="customGray.200"
            overflow="hidden"
            transition="width 0.4s cubic-bezier(0.4, 0, 0.2, 1)"
          >
            <VStack
              w="255px"
              h="100%"
              flexShrink={0}
              align="stretch"
              spacing={0}
              transform={isListCollapsed ? "translateX(-255px)" : "translateX(0)"}
              transition="transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)"
            >
              <HStack h="64px" align="center" pl="20px" pr="16px" pt="14px" pb="16px">
                <Text fontSize="base" fontWeight="medium" color="customGray.800">
                  AI Agents
                </Text>
              </HStack>
              <VStack align="stretch" spacing="4px" px="12px" pt="2px" pb="16px">
                {FILTERS.map((label) => {
                  const isActive = filter === label;
                  return (
                    <Box
                      key={label}
                      role="group"
                      h="32px"
                      bg={isActive ? "customGray.100" : "transparent"}
                      borderRadius="8px"
                      px="8px"
                      py="8px"
                      display="flex"
                      alignItems="center"
                      justifyContent="space-between"
                      cursor="pointer"
                      onClick={() => setFilter(label)}
                      _hover={{ bg: "customGray.100" }}
                      transition="all 0.2s"
                    >
                      <Text fontSize="sm" fontWeight={isActive ? "500" : "normal"} color={isActive ? "customGray.700" : "customGray.500"}>
                        {label}
                      </Text>
                      <Text fontSize="sm" fontWeight={isActive ? "500" : "normal"} color="customGray.400" opacity={isActive ? 1 : 0} _groupHover={{ opacity: 1 }}>
                        {filterCounts[label]}
                      </Text>
                    </Box>
                  );
                })}
              </VStack>
            </VStack>
          </VStack>

          <VStack flex={1} h="100%" align="stretch" spacing={0} minW="0">
            {/* Page header */}
            <HStack h="64px" align="center" justify="space-between" pl="14px" pr="16px" flexShrink={0}>
              <HStack spacing="8px">
                <Tooltip label={isListCollapsed ? "Show list" : "Hide list"} placement="bottom" openDelay={400} fontSize="xs">
                  <Button
                    variant="ghost"
                    p="0"
                    w="32px"
                    h="32px"
                    minW="32px"
                    color="customGray.800"
                    _hover={{ bg: "customGray.100" }}
                    onClick={() => setIsListCollapsed((collapsed) => !collapsed)}
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path fillRule="evenodd" clipRule="evenodd" d="M5 4.16667C4.77899 4.16667 4.56702 4.25446 4.41074 4.41074C4.25446 4.56702 4.16667 4.77899 4.16667 5V15C4.16667 15.221 4.25446 15.433 4.41074 15.5893C4.56702 15.7455 4.77899 15.8333 5 15.8333H6.66667V4.16667H5ZM8.33333 4.16667V15.8333H15C15.221 15.8333 15.433 15.7455 15.5893 15.5893C15.7455 15.433 15.8333 15.221 15.8333 15V5C15.8333 4.77899 15.7455 4.56702 15.5893 4.41074C15.433 4.25446 15.221 4.16667 15 4.16667H8.33333ZM2.5 5C2.5 4.33696 2.76339 3.70107 3.23223 3.23223C3.70107 2.76339 4.33696 2.5 5 2.5H15C15.663 2.5 16.2989 2.76339 16.7678 3.23223C17.2366 3.70107 17.5 4.33696 17.5 5V15C17.5 15.663 17.2366 16.2989 16.7678 16.7678C16.2989 17.2366 15.663 17.5 15 17.5H5C4.33696 17.5 3.70107 17.2366 3.23223 16.7678C2.76339 16.2989 2.5 15.663 2.5 15V5Z" fill="currentColor"/>
                    </svg>
                  </Button>
                </Tooltip>
                <Text fontSize="16px" fontWeight="medium" color="customGray.800">{filter}</Text>
              </HStack>

              <Button
                size="sm"
                bg="sky.400"
                color="white"
                _hover={{ bg: "sky.500" }}
                display="flex"
                alignItems="center"
                gap="8px"
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

            {/* Toolbar */}
            <Box
              flexShrink={0}
              w="100%"
              px="14px"
              pt="0px"
              pb="12px"
              h="50px"
              display="flex"
              alignItems="center"
              justifyContent="space-between"
              bg="white"
              borderBottom="1px solid"
              borderBottomColor="customGray.200"
            >
              <HStack spacing="8px">
                <Menu>
                  <MenuButton
                    as={Button}
                    {...toolbarButton}
                    leftIcon={
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M2 4H14M4.66667 8H11.3333M6.66667 12H9.33333" stroke="currentColor" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    }
                  >
                    Filter
                  </MenuButton>
                  <MenuList fontSize="sm" minW="180px">
                    {FILTERS.map((label) => (
                      <MenuItem
                        key={label}
                        color={filter === label ? "customGray.800" : "customGray.600"}
                        fontWeight={filter === label ? "600" : "400"}
                        onClick={() => setFilter(label)}
                      >
                        {label}
                      </MenuItem>
                    ))}
                  </MenuList>
                </Menu>

                <Menu>
                  <MenuButton
                    as={Button}
                    {...toolbarButton}
                    leftIcon={
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M8.66667 10.667L11.3333 13.3337L14 10.667M11.3333 13.3337V2.66699M7.33333 5.33366L4.66667 2.66699L2 5.33366M4.66667 2.66699V13.3337" stroke="currentColor" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    }
                  >
                    Sort
                  </MenuButton>
                  <MenuList fontSize="sm" minW="180px">
                    {([
                      ["updated_desc", "Last updated (newest)"],
                      ["updated_asc", "Last updated (oldest)"],
                      ["name_asc", "Name (A–Z)"],
                      ["name_desc", "Name (Z–A)"],
                    ] as [Sort, string][]).map(([key, label]) => (
                      <MenuItem
                        key={key}
                        color={sort === key ? "customGray.800" : "customGray.600"}
                        fontWeight={sort === key ? "600" : "400"}
                        onClick={() => setSort(key)}
                      >
                        {label}
                      </MenuItem>
                    ))}
                  </MenuList>
                </Menu>

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
              </HStack>
            </Box>

            {/* Table header sits outside the scroller so it stays put */}
            <Box flexShrink={0} w="100%" bg="customGray.50" borderBottom="1px solid" borderBottomColor="customGray.200">
              <Table w="100%" sx={{ tableLayout: "fixed" }}>
                <colgroup>
                  <col style={{ width: "300px" }} />
                  <col style={{ width: "180px" }} />
                  <col style={{ width: "160px" }} />
                  <col style={{ width: "160px" }} />
                  <col style={{ width: "160px" }} />
                  <col style={{ width: "50px" }} />
                </colgroup>
                <Thead>
                  <Tr>
                    <Th {...headerCell} pl="26px">Agent Name</Th>
                    <Th {...headerCell}>Model</Th>
                    <Th {...headerCell}>Status</Th>
                    <Th {...headerCell}>Schedules</Th>
                    <Th {...headerCell}>Last Updated</Th>
                    <Th {...headerCell} pr="24px" />
                  </Tr>
                </Thead>
              </Table>
            </Box>

            <Box position="relative" flex={1} w="100%" minH="0">
              <FloatingScrollbar scrollRef={listRef} />
              <Box ref={listRef} h="100%" w="100%" overflowY="auto" sx={HIDE_NATIVE_SCROLLBAR_SX}>
                {agents.length === 0 ? (
                  <VStack w="100%" py="60px" spacing="8px">
                    <Text fontSize="sm" color="customGray.500">No agents yet</Text>
                    <Text fontSize="sm" color="customGray.400">Click &quot;Create agent&quot; to build your first chatbot</Text>
                  </VStack>
                ) : (
                  <Table w="100%" sx={{ tableLayout: "fixed" }}>
                    <colgroup>
                      <col style={{ width: "300px" }} />
                      <col style={{ width: "180px" }} />
                      <col style={{ width: "160px" }} />
                      <col style={{ width: "160px" }} />
                      <col style={{ width: "160px" }} />
                      <col style={{ width: "50px" }} />
                    </colgroup>
                    <Tbody>
                      {visibleAgents.length === 0 ? (
                        <Tr>
                          <Td colSpan={6} h="80px" textAlign="center" borderBottomColor="customGray.200">
                            <Text fontSize="sm" color="customGray.500">
                              {searchQuery.trim() !== "" ? `No agents match "${searchQuery}"` : "Nothing here yet"}
                            </Text>
                          </Td>
                        </Tr>
                      ) : (
                        visibleAgents.map((agent) => {
                          const initial = (agent.name || "U").charAt(0).toUpperCase();
                          const isLive = agent.status === "Published";
                          // Drafts stay neutral; published agents take a colour
                          // keyed off the id so it survives refetches.
                          const badgeColor = isLive ? AVATAR_COLORS[agent.id % AVATAR_COLORS.length] : "customGray.400";
                          const updatedLabel = new Date(agent.updated_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          });
                          return (
                            <Tr
                              key={agent.id}
                              role="group"
                              cursor="pointer"
                              bg="white"
                              _hover={{ bg: "sky.50" }}
                              transition="background-color 0.2s"
                              onClick={() => openAgent(agent)}
                            >
                              <Td h="50px" py="0" pl="26px" pr="12px" borderBottomColor="customGray.200">
                                <Flex align="center">
                                  <Box
                                    w="24px"
                                    h="24px"
                                    flexShrink={0}
                                    mr="10px"
                                    bg={badgeColor}
                                    borderRadius="full"
                                    display="flex"
                                    alignItems="center"
                                    justifyContent="center"
                                  >
                                    <Text fontSize="xs" fontWeight="medium" color="white">{initial}</Text>
                                  </Box>
                                  <Text fontSize="sm" fontWeight="500" color="customGray.800" isTruncated minW="0">
                                    {agent.name}
                                  </Text>
                                </Flex>
                              </Td>
                              <Td h="50px" py="0" px="0" borderBottomColor="customGray.200">
                                <Text fontSize="sm" color="customGray.600">Auto</Text>
                              </Td>
                              <Td h="50px" py="0" px="0" borderBottomColor="customGray.200">
                                <Box
                                  as="button"
                                  px="8px"
                                  py="2px"
                                  bg={isLive ? "green.100" : "customGray.100"}
                                  borderRadius="full"
                                  display="inline-block"
                                  onClick={(event: React.MouseEvent) => {
                                    event.stopPropagation();
                                    togglePublish(agent);
                                  }}
                                >
                                  <Text fontSize="xs" fontWeight="medium" color={isLive ? "green.700" : "customGray.600"}>
                                    {isLive ? "Online" : "Draft"}
                                  </Text>
                                </Box>
                              </Td>
                              <Td h="50px" py="0" px="0" borderBottomColor="customGray.200">
                                <Text fontSize="sm" color="customGray.600">0</Text>
                              </Td>
                              <Td h="50px" py="0" px="0" borderBottomColor="customGray.200">
                                <Text fontSize="sm" color="customGray.600">{updatedLabel}</Text>
                              </Td>
                              <Td
                                h="50px"
                                py="0"
                                pr="24px"
                                pl="0"
                                borderBottomColor="customGray.200"
                                onClick={(event) => event.stopPropagation()}
                              >
                                <Box display="flex" alignItems="center" justifyContent="flex-end">
                                  <Menu placement="bottom-end">
                                    <MenuButton
                                      as={IconButton}
                                      aria-label="More options"
                                      icon={
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                          <circle cx="12" cy="5" r="2" fill="currentColor" />
                                          <circle cx="12" cy="12" r="2" fill="currentColor" />
                                          <circle cx="12" cy="19" r="2" fill="currentColor" />
                                        </svg>
                                      }
                                      size="sm"
                                      variant="ghost"
                                      color="customGray.600"
                                      _hover={{ bg: "customGray.200" }}
                                    />
                                    <MenuList fontSize="sm" minW="180px">
                                      <MenuItem onClick={() => openAgent(agent)}>Open</MenuItem>
                                      <MenuItem onClick={() => togglePublish(agent)}>
                                        {isLive ? "Set as draft" : "Publish"}
                                      </MenuItem>
                                      <MenuItem color="red.500" onClick={() => removeAgent(agent)}>
                                        Delete
                                      </MenuItem>
                                    </MenuList>
                                  </Menu>
                                </Box>
                              </Td>
                            </Tr>
                          );
                        })
                      )}
                    </Tbody>
                  </Table>
                )}
              </Box>
            </Box>
          </VStack>
        </HStack>
      </VStack>
    </Flex>
  );
}
