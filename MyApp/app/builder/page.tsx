"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { keyframes } from "@emotion/react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { deleteUserAccount } from "@/app/actions/deleteUser";
import { getAgents, createAgent, deleteAgent } from "@/app/actions/agentActions";
import CryptoJS from "crypto-js";
import Sidebar from "@/app/components/Sidebar";
import FullPageLoader from "@/app/components/FullPageLoader";
import UsernameModal from "@/app/components/UsernameModal";
import ServiceSelector from "@/app/components/ServiceSelector";
import OnboardingGate from "@/app/components/OnboardingGate";
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
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Checkbox,
  Skeleton,
} from "@chakra-ui/react";
import { SearchIcon, ChevronDownIcon, HamburgerIcon, CloseIcon, DeleteIcon, CopyIcon } from "@chakra-ui/icons";

const MotionBox = motion(Box);

// Chakra clones this with isIndeterminate/isChecked, so the same `icon`
// can render the row checkmark and the header's "select all" dash.
function CheckboxGlyph({ isIndeterminate }: { isIndeterminate?: boolean }) {
  return isIndeterminate ? (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 12H19" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ) : (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 13L9.5 17.5L19 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const checkboxControlSx = {
  ".chakra-checkbox__control": {
    borderWidth: "1px",
    borderColor: "customGray.500",
    _checked: {
      bg: "sky.400",
      borderColor: "sky.400",
      _hover: { bg: "sky.400", borderColor: "sky.400" },
    },
  },
};

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
  // Default every toast on this page to the top; individual calls can override.
  const toast = useToast({ position: "top" });
  const router = useRouter();
  const [selectedNav, setSelectedNav] = useState("Messages");
  const [userEmail, setUserEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const { isOpen: isFeedbackOpen, onOpen: onFeedbackOpen, onClose: onFeedbackClose } = useDisclosure();
  const { isOpen: isCreateOpen, onOpen: onCreateOpen, onClose: onCreateClose } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const { isOpen: isUsernameOpen, onOpen: onUsernameOpen, onClose: onUsernameClose } = useDisclosure();
  const [username, setUsername] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [isFeedbackSubmitting, setIsFeedbackSubmitting] = useState(false);
  const [feedbackError, setFeedbackError] = useState("");
  const [agentName, setAgentName] = useState("");
  const [agents, setAgents] = useState<Array<{ name: string; services: string[]; website?: string }>>([]);
  // Selection is by position, not name: two workspaces can share a name, and
  // matching on the name highlighted both at once and made one unselectable.
  const [selectedAgentIndex, setSelectedAgentIndex] = useState<number | null>(null);
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
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // autoFocus only fires on mount, and this input never unmounts (it just
  // resizes), so re-focus explicitly every time it expands again.
  useEffect(() => {
    if (isSearchExpanded) searchInputRef.current?.focus();
    else setSearchQuery("");
  }, [isSearchExpanded]);

  const [isSearching, setIsSearching] = useState(false);

  // Every keystroke shows a brief skeleton instead of snapping straight to
  // the filtered rows, so the list reads as "searching" rather than just
  // instantly cutting rows out.
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    const timer = setTimeout(() => setIsSearching(false), 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);
  // Chakra's Tooltip opens on focus as well as hover, so closing the create
  // workspace modal (which restores focus into the header) popped these open
  // with no pointer nearby. Driving isOpen from hover alone keeps them
  // pointer-only.
  const [hoveredTooltip, setHoveredTooltip] = useState<"collapse" | "create" | null>(null);

  useOutsideClick({
    ref: searchRef,
    // A non-empty query means there's an active search — clicking away
    // shouldn't lose it, only an empty box collapses back to just the icon.
    handler: () => { if (searchQuery === "") setIsSearchExpanded(false); },
  });
  const [calendarEvents, setCalendarEvents] = useState<Array<{ id: number; title: string; meeting_link: string; slug: string; updated_at: string; status: string }>>([]);
  const [chatbotAgents, setChatbotAgents] = useState<Array<{ id: number; name: string; status: string; updated_at: string }>>([]);
  const [selectedEventIds, setSelectedEventIds] = useState<Set<number>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isBulkDuplicating, setIsBulkDuplicating] = useState(false);

  const handleBulkDeleteEvents = async () => {
    const ids = Array.from(selectedEventIds);
    if (ids.length === 0) return;
    setIsBulkDeleting(true);
    const { error } = await supabase.from("calendar_events").delete().in("id", ids);
    setIsBulkDeleting(false);
    if (error) {
      toast({ title: "Failed to delete events", description: error.message, status: "error" });
      return;
    }
    setCalendarEvents((prev) => prev.filter((e) => !selectedEventIds.has(e.id)));
    setSelectedEventIds(new Set());
    toast({ title: `${ids.length} event${ids.length > 1 ? "s" : ""} deleted`, status: "success" });
  };

  const handleBulkDuplicateEvents = async () => {
    const ids = Array.from(selectedEventIds);
    if (ids.length === 0) return;
    setIsBulkDuplicating(true);
    const { data: rows, error: fetchError } = await supabase
      .from("calendar_events")
      .select("*")
      .in("id", ids);

    if (fetchError || !rows) {
      setIsBulkDuplicating(false);
      toast({ title: "Failed to duplicate events", description: fetchError?.message, status: "error" });
      return;
    }

    // Drop the primary key and timestamps so the insert gets fresh ones;
    // everything else (title, workspace, owner, etc.) carries over as-is.
    // The listing's own numbering logic then labels same-named events
    // "(1)", "(2)", ... once there's more than one.
    const copies = rows.map(({ id, created_at, updated_at, ...rest }) => rest);
    const { error: insertError } = await supabase.from("calendar_events").insert(copies);
    setIsBulkDuplicating(false);

    if (insertError) {
      toast({ title: "Failed to duplicate events", description: insertError.message, status: "error" });
      return;
    }

    setSelectedEventIds(new Set());
    await loadCalendarEvents();
    toast({ title: `${ids.length} event${ids.length > 1 ? "s" : ""} duplicated`, status: "success" });
  };

  // Name of the selected workspace, derived from the index. Everything that
  // scopes by name (event queries, delete, the header) reads this.
  const selectedAgent = selectedAgentIndex !== null ? agents[selectedAgentIndex]?.name ?? null : null;

  // Matches the event listing search box against event names. Select-all and
  // the header checkbox operate on this rather than the full list, so a
  // filtered search only selects/counts what's actually visible.
  const filteredCalendarEvents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (query === "") return calendarEvents;
    return calendarEvents.filter((e) => e.title.toLowerCase().includes(query));
  }, [calendarEvents, searchQuery]);

  const isAllEventsSelected = filteredCalendarEvents.length > 0 && filteredCalendarEvents.every((e) => selectedEventIds.has(e.id));
  const isSomeEventsSelected = selectedEventIds.size > 0 && !isAllEventsSelected;
  const toggleSelectAllEvents = () => {
    // Anything short of everything selected reads as "off" — clicking always
    // selects all from there; only a fully-checked box clears the selection.
    setSelectedEventIds(isAllEventsSelected ? new Set() : new Set(filteredCalendarEvents.map((e) => e.id)));
  };

  useEffect(() => {
    isMountedRef.current = true;
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const cached = localStorage.getItem("user_avatar");
    if (cached) {
      setAvatarUrl(cached);
    }

    // Restore whichever workspace was last open so a refresh (or coming back
    // from the calendar builder) stays put instead of jumping to the newest
    // one. Stores name *and* index so duplicate names resolve to the exact one
    // that was open. Falls back to the most recent if it can't be found.
    const pickWorkspaceIndex = (list: Array<{ name: string }>) => {
      const raw = localStorage.getItem("selected_workspace");
      if (raw) {
        let savedName: string | undefined;
        let savedIndex: number | undefined;
        try {
          const parsed = JSON.parse(raw);
          savedName = parsed?.name;
          savedIndex = parsed?.index;
        } catch {
          savedName = raw; // value written before this stored an index
        }

        // Same name still at the same position: unambiguous.
        if (typeof savedIndex === "number" && list[savedIndex]?.name === savedName) {
          return savedIndex;
        }
        // Otherwise settle for the first workspace with that name.
        const byName = list.findIndex((a) => a.name === savedName);
        if (byName !== -1) return byName;
      }
      return list.length - 1;
    };

    const loadAgents = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          const dbAgents = await getAgents(session.user.id);
          setAgents(dbAgents);
          if (dbAgents.length > 0) {
            setSelectedAgentIndex(pickWorkspaceIndex(dbAgents));
          }
          localStorage.setItem("workspace_agents", JSON.stringify(dbAgents));
        } else {
          const cachedAgents = localStorage.getItem("workspace_agents");
          if (cachedAgents) {
            try {
              const parsed = JSON.parse(cachedAgents);
              setAgents(parsed);
              if (parsed.length > 0) {
                setSelectedAgentIndex(pickWorkspaceIndex(parsed));
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
              setSelectedAgentIndex(pickWorkspaceIndex(parsed));
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

  // Remember the open workspace so pickWorkspaceIndex can restore it next load.
  // Both name and index are stored so duplicate names resolve unambiguously.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (selectedAgentIndex === null) return;
    const name = agents[selectedAgentIndex]?.name;
    if (name === undefined) return;
    localStorage.setItem(
      "selected_workspace",
      JSON.stringify({ name, index: selectedAgentIndex })
    );
  }, [selectedAgentIndex, agents]);

  // Labels for the workspace list. Workspaces sharing a name are numbered
  // "Name (1)", "Name (2)", ... so accidental duplicates are tellable apart; a
  // name used once is left alone. Display-only — the stored name is untouched.
  // getAgents orders by created_at, so index order is creation order.
  const workspaceLabels = useMemo(() => {
    const totals = new Map<string, number>();
    agents.forEach((a) => totals.set(a.name, (totals.get(a.name) ?? 0) + 1));

    const running = new Map<string, number>();
    return agents.map((a) => {
      if ((totals.get(a.name) ?? 0) < 2) return a.name;
      const n = (running.get(a.name) ?? 0) + 1;
      running.set(a.name, n);
      return `${a.name} (${n})`;
    });
  }, [agents]);

  const loadCalendarEvents = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      // Events belong to one workspace. With none selected there is nothing to
      // scope the listing to, so show an empty list rather than every event.
      if (!selectedAgent) {
        setCalendarEvents([]);
        return;
      }

      const { data, error } = await supabase
        .from("calendar_events")
        .select("id, event_title, title, meeting_link, slug, updated_at")
        .eq("user_id", session.user.id)
        .eq("workspace_name", selectedAgent)
        .order("updated_at", { ascending: false });

      if (error) {
        console.log("Error loading calendar events:", error);
        return;
      }

      if (data) {
        const rows = data.map((e) => ({
          id: e.id,
          title: e.event_title || e.title || "Untitled event",
          meeting_link: e.meeting_link || "Link",
          slug: e.slug || "",
          updated_at: e.updated_at,
          // No status column on calendar_events yet, so everything is a draft.
          // Once one exists, reading it here is all that's needed for the
          // coloured badges below to start appearing.
          status: "Draft",
        }));

        // Number events that share a name so they're tellable apart in the
        // listing: "Demo call (1)", "Demo call (2)", ... A name used only once
        // is left alone. This is display-only — the stored title is untouched.
        const totals = new Map<string, number>();
        rows.forEach((r) => totals.set(r.title, (totals.get(r.title) ?? 0) + 1));

        const numbered = new Map<number, string>();
        const running = new Map<string, number>();
        // Walk oldest-first (by id) so the numbering follows creation order
        // rather than however the listing happens to be sorted.
        [...rows]
          .sort((a, b) => a.id - b.id)
          .forEach((r) => {
            if ((totals.get(r.title) ?? 0) < 2) return;
            const n = (running.get(r.title) ?? 0) + 1;
            running.set(r.title, n);
            numbered.set(r.id, `${r.title} (${n})`);
          });

        setCalendarEvents(
          rows.map((r) => ({ ...r, title: numbered.get(r.id) ?? r.title }))
        );
      }
    } catch (error) {
      console.error("Error loading calendar events:", error);
    }
    // Refetches whenever the user switches workspace.
  }, [selectedAgent]);

  useEffect(() => {
    loadCalendarEvents();
  }, [loadCalendarEvents]);

  // Events are created/edited on the calendar-builder page, so refetch whenever
  // this page regains focus. Without this the listing keeps showing whatever it
  // fetched on first mount and new events never appear.
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") loadCalendarEvents();
    };

    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [loadCalendarEvents]);

  const loadChatbotAgents = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      // Same scoping as calendar events: no workspace selected means nothing
      // to show rather than every agent across every workspace.
      if (!selectedAgent) {
        setChatbotAgents([]);
        return;
      }

      const { data, error } = await supabase
        .from("chatbot_agents")
        .select("id, name, status, updated_at")
        .eq("user_id", session.user.id)
        .eq("workspace_name", selectedAgent)
        .order("updated_at", { ascending: false });

      if (error) {
        console.log("Error loading chatbot agents:", error);
        return;
      }

      if (data) {
        setChatbotAgents(
          data.map((a) => ({
            id: a.id,
            name: a.name || "Untitled",
            status: a.status || "Draft",
            updated_at: a.updated_at,
          }))
        );
      }
    } catch (error) {
      console.error("Error loading chatbot agents:", error);
    }
    // Refetches whenever the user switches workspace.
  }, [selectedAgent]);

  useEffect(() => {
    loadChatbotAgents();
  }, [loadChatbotAgents]);

  // Agents are created/edited on the chatbot-builder page, so refetch
  // whenever this page regains focus — same reasoning as calendar events.
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") loadChatbotAgents();
    };

    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [loadChatbotAgents]);

  const handleDeleteAgent = async (id: number) => {
    const { error } = await supabase.from("chatbot_agents").delete().eq("id", id);
    if (error) {
      toast({ title: "Failed to delete agent", description: error.message, status: "error" });
      return;
    }
    setChatbotAgents((prev) => prev.filter((a) => a.id !== id));
    toast({ title: "Agent deleted", status: "success" });
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');

    if (tabParam === 'calendar') {
      setActiveTabIndex(1);
    } else if (tabParam === 'form') {
      setActiveTabIndex(0);
    } else if (tabParam === 'newsletter') {
      setActiveTabIndex(2);
    } else if (tabParam === 'chatbot') {
      setActiveTabIndex(3);
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

          supabase
            .from("profiles")
            .select("username")
            .eq("id", session.user.id)
            .maybeSingle()
            .then(({ data }) => setUsername(data?.username || ""));

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
            website: agentToClone.website,
          });

          if (success) {
            // Clone every calendar event scoped to the old workspace into the
            // new one. slug can't be copied byte-for-byte — it's unique per
            // user, not per workspace, so the copy would collide with the
            // original — instead each gets a new slug derived from the old
            // one, so the duplicated event still has its own booking link.
            const { data: oldEvents } = await supabase
              .from("calendar_events")
              .select("*")
              .eq("user_id", session.user.id)
              .eq("workspace_name", selectedAgent);

            if (oldEvents && oldEvents.length > 0) {
              const newEvents = oldEvents.map(({ id, created_at, updated_at, slug, ...rest }) => ({
                ...rest,
                workspace_name: newAgentName,
                slug: slug ? `${slug}-copy-${Math.random().toString(36).slice(2, 6)}` : null,
                updated_at: new Date().toISOString(),
              }));
              await supabase.from("calendar_events").insert(newEvents);
            }

            // Chatbot agents live in a separate table that may not exist in
            // every environment yet — failing to clone them shouldn't block
            // the rest of the duplicate.
            try {
              const { data: oldChatbotAgents } = await supabase
                .from("chatbot_agents")
                .select("*")
                .eq("user_id", session.user.id)
                .eq("workspace_name", selectedAgent);

              if (oldChatbotAgents && oldChatbotAgents.length > 0) {
                const newChatbotAgents = oldChatbotAgents.map(({ id, created_at, updated_at, ...rest }) => ({
                  ...rest,
                  workspace_name: newAgentName,
                  updated_at: new Date().toISOString(),
                }));
                await supabase.from("chatbot_agents").insert(newChatbotAgents);
              }
            } catch (chatbotError) {
              console.log("Skipping chatbot agent clone:", chatbotError);
            }

            const dbAgents = await getAgents(session.user.id);
            setAgents(dbAgents);
            // Select the copy just made — the newest row, so the last index.
            setSelectedAgentIndex(dbAgents.length - 1);
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

      const createdName = agentName;

      // Select the workspace just created — the one appended last. Index-based
      // so an identically-named existing workspace isn't selected instead.
      setSelectedAgentIndex(updatedAgents.length - 1);
      setAgentName("");
      setSelectedServices([]);
      setCreateError("");
      onCreateClose();

      // Land on the calendar listing for the new workspace. No full-page
      // loader here — the spinner inside the Create workspace button already
      // covers the wait, and switching selectedAgent refetches the listing.
      setActiveTabIndex(1);

      toast({
        title: "Workspace created",
        description: `"${createdName}" is ready`,
        status: "success",
        duration: 3000,
        isClosable: true,
        position: "top",
      });
    } catch (error) {
      console.error("Error creating workspace:", error);
      setCreateError("Failed to create workspace. Please try again.");
    } finally {
      setIsCreatingWorkspace(false);
    }
  };

  if (isLoadingWorkspaces) {
    return <FullPageLoader />;
  }

  return (
    <Flex h="100vh" w="100vw" bg="dark.bg" overflow="hidden" position="fixed" top={0} left={0}>
      <OnboardingGate />
      <Sidebar
        selectedNav={selectedNav}
        onNavClick={setSelectedNav}
        userEmail={userEmail}
        avatarUrl={avatarUrl}
        onDelete={handleDeleteAccount}
        onFeedbackOpen={onFeedbackOpen}
        onSettingsClick={onUsernameOpen}
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
              <Tooltip
                label="Create workspace"
                placement="bottom"
                isOpen={hoveredTooltip === "create"}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  p="6px"
                  minW="auto"
                  _hover={{ bg: "customGray.100" }}
                  onMouseEnter={() => setHoveredTooltip("create")}
                  onMouseLeave={() => setHoveredTooltip(null)}
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
                  bg={selectedAgentIndex === index ? "customGray.100" : "transparent"}
                  borderRadius="8px"
                  px="8px"
                  py="8px"
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                  cursor="pointer"
                  onClick={() => setSelectedAgentIndex(index)}
                  onMouseEnter={() => setHoveredAgent(agentObj.name)}
                  onMouseLeave={() => setHoveredAgent(null)}
                  _hover={{ bg: "customGray.100" }}
                  transition="all 0.2s"
                >
                  <Text fontSize="sm" fontWeight={selectedAgentIndex === index ? "medium" : "normal"} color={selectedAgentIndex === index ? "customGray.800" : "customGray.500"} noOfLines={1} overflow="hidden" textOverflow="ellipsis" minW={0}>
                    {workspaceLabels[index]}
                  </Text>
                </Box>
              ))}
            </VStack>
          </VStack>
          <VStack flex={1} h="100%" align="stretch" spacing={0} overflow="hidden">
            {agents.length > 0 && (
            <HStack h="64px" align="center" justify="space-between" pl="30px" pr="14px" pt="14px" pb="18px" w="100%">
              <HStack spacing="4px" align="center">
                <Tooltip
                  label={isWorkspaceListCollapsed ? "Expand" : "Collapse"}
                  placement="bottom"
                  isOpen={hoveredTooltip === "collapse"}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    p="0"
                    w="32px"
                    h="32px"
                    minW="32px"
                    color="customGray.800"
                    _hover={{ bg: "customGray.100" }}
                    onMouseEnter={() => setHoveredTooltip("collapse")}
                    onMouseLeave={() => setHoveredTooltip(null)}
                    onClick={() => {
                      if (!enableSidebarTransition) setEnableSidebarTransition(true);
                      setIsWorkspaceListCollapsed(!isWorkspaceListCollapsed);
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
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
                    <MenuItem color="customGray.800" onClick={handleDuplicate}>
                      Duplicate
                    </MenuItem>
                    <MenuItem color="red.500" onClick={onDeleteOpen}>
                      Delete
                    </MenuItem>
                  </MenuList>
                </Menu>
                {agents.length > 0 && (
                  <Button size="sm" bg="sky.400" color="white" _hover={{ bg: "sky.500" }} display="flex" alignItems="center" gap="8px" onClick={() => {
                    // Carry the workspace through so the new event/agent is
                    // created inside it and stays scoped to it.
                    const workspace = encodeURIComponent(selectedAgent || "");
                    if (activeTabIndex === 3) {
                      router.push(`/chatbot-builder?workspace=${workspace}`);
                      return;
                    }
                    const tab = activeTabIndex === 0 ? "form" : activeTabIndex === 1 ? "calendar" : "newsletter";
                    router.push(`/calendar-builder?tab=${tab}&workspace=${workspace}`);
                  }}>
                    <Box display="flex" alignItems="center" justifyContent="center" w="16px" h="16px">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </Box>
                    {activeTabIndex === 0 ? "Create form" : activeTabIndex === 1 ? "Create event" : activeTabIndex === 3 ? "Create agent" : "Create newsletter"}
                  </Button>
                )}
              </HStack>
            </HStack>
            )}
            {agents.length > 0 ? (
            <Tabs flex={1} display="flex" flexDirection="column" overflow="hidden" w="100%" index={activeTabIndex} onChange={setActiveTabIndex}>
              <TabList pl="38px" borderBottom="1px solid" borderColor="customGray.200">
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
                  Meeting scheduler
                </Tab>
                <Tab fontSize="sm" color="customGray.500" pb="12px" mb="-1px" borderBottom="2px solid transparent" _selected={{ color: "customGray.800", borderColor: "customGray.800", bg: "white" }} display="flex" alignItems="center" gap="6px">
                  <svg width="16" height="16" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2.25 4.5H15.75V13.5C15.75 14.3284 15.0784 15 14.25 15H3.75C2.92157 15 2.25 14.3284 2.25 13.5V4.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M2.25 5.25L9 10.5L15.75 5.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Newsletter
                </Tab>
                <Tab fontSize="sm" color="customGray.500" pb="12px" mb="-1px" borderBottom="2px solid transparent" _selected={{ color: "customGray.800", borderColor: "customGray.800", bg: "white" }} display="flex" alignItems="center" gap="6px">
                  <svg width="16" height="16" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 2.25C5.27208 2.25 2.25 4.92893 2.25 8.25C2.25 9.7867 2.90177 11.1893 3.96186 12.2652C4.13039 12.4372 4.21935 12.6743 4.19811 12.9128L4.02893 14.8168C3.99756 15.1706 4.34987 15.4373 4.68062 15.3005L6.87246 14.3939C7.05377 14.3195 7.25523 14.3103 7.44236 14.3679C7.9366 14.5182 8.45932 14.6 9 14.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M15.75 12.75C15.75 10.6789 13.8995 9 11.625 9C9.35051 9 7.5 10.6789 7.5 12.75C7.5 14.8211 9.35051 16.5 11.625 16.5C12.1173 16.5 12.5891 16.4231 13.0264 16.2812L14.6182 16.9505C14.8845 17.0605 15.1636 16.8391 15.1257 16.5537L14.9636 15.2969C15.4667 14.6089 15.75 13.7089 15.75 12.75Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Chatbot
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
                  <VStack w="100%" h="100%" align="stretch" spacing={0} overflow="hidden" position="relative">
                    <Box flexShrink={0} w="100%" px="14px" py="12px" h="50px" display="flex" alignItems="center" justifyContent="flex-end" bg="white" borderBottom="1px solid" borderBottomColor="customGray.200">
                      <HStack spacing="8px">
                        <HStack ref={searchRef} spacing="0" bg="transparent" borderRadius="6px" border="none" transition="width 0.3s ease" overflow="hidden" h="32px" w={isSearchExpanded ? "224px" : "32px"} flexShrink={0}>
                          <IconButton aria-label="Search" icon={<SearchIcon w="16px" h="16px" />} size="sm" variant="ghost" color="customGray.600" flexShrink={0} _hover={isSearchExpanded ? undefined : { bg: "customGray.50" }} onClick={() => setIsSearchExpanded(!isSearchExpanded)} />
                          <Input
                            ref={searchInputRef}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
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
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                  setSearchQuery("");
                                  searchInputRef.current?.focus();
                                }}
                              />
                            )}
                          </Box>
                        </HStack>
                        <Button
                          size="sm"
                          variant="outline"
                          borderRadius="8px"
                          border="none"
                          bg="white"
                          color="customGray.700"
                          fontSize="sm"
                          fontWeight="medium"
                          _hover={{ bg: "customGray.100" }}
                          leftIcon={
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M8.66667 10.667L11.3333 13.3337L14 10.667M11.3333 13.3337V2.66699M7.33333 5.33366L4.66667 2.66699L2 5.33366M4.66667 2.66699V13.3337" stroke="currentColor" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          }
                        >
                          Sort
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          borderRadius="8px"
                          border="none"
                          bg="white"
                          color="customGray.700"
                          fontSize="sm"
                          fontWeight="medium"
                          _hover={{ bg: "customGray.100" }}
                          leftIcon={
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M2 4H14M4.66667 8H11.3333M6.66667 12H9.33333" stroke="currentColor" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          }
                        >
                          Filters
                        </Button>
                      </HStack>
                    </Box>
                    <Box flexShrink={0} w="100%" bg="customGray.50" borderBottom="1px solid" borderBottomColor="customGray.200">
                      <Table w="100%" sx={{ tableLayout: "fixed" }}>
                        <colgroup>
                          <col style={{ width: "300px" }} />
                          <col style={{ width: "180px" }} />
                          <col style={{ width: "160px" }} />
                          <col style={{ width: "160px" }} />
                          <col style={{ width: "160px" }} />
                        </colgroup>
                        <Thead>
                          <Tr>
                            <Th border="none" h="50px" py="0" pl="12px" pr="0" fontSize="sm" fontWeight="medium" color="customGray.700" textTransform="none" letterSpacing="normal">
                              <HStack spacing="10px" role="group">
                                <Box
                                  opacity={isAllEventsSelected || isSomeEventsSelected ? 1 : 0}
                                  _groupHover={{ opacity: 1 }}
                                  transition="opacity 0.15s"
                                >
                                  <Checkbox
                                    isChecked={isAllEventsSelected}
                                    onChange={toggleSelectAllEvents}
                                    onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
                                    icon={<CheckboxGlyph />}
                                    sx={checkboxControlSx}
                                  />
                                </Box>
                                <Text>Event Name</Text>
                              </HStack>
                            </Th>
                            <Th border="none" h="50px" py="0" px="0" fontSize="sm" fontWeight="medium" color="customGray.700" textTransform="none" letterSpacing="normal">Booking Link</Th>
                            <Th border="none" h="50px" py="0" px="0" fontSize="sm" fontWeight="medium" color="customGray.700" textTransform="none" letterSpacing="normal">Status</Th>
                            <Th border="none" h="50px" py="0" px="0" fontSize="sm" fontWeight="medium" color="customGray.700" textTransform="none" letterSpacing="normal">Bookings</Th>
                            <Th border="none" h="50px" py="0" pr="24px" pl="0" fontSize="sm" fontWeight="medium" color="customGray.700" textTransform="none" letterSpacing="normal">Last Updated</Th>
                          </Tr>
                        </Thead>
                      </Table>
                    </Box>
                    <Box
                      flex={1}
                      w="100%"
                      overflowY="auto"
                      sx={{
                        '&::-webkit-scrollbar': { width: '6px' },
                        '&::-webkit-scrollbar-track': { bg: 'transparent' },
                        '&::-webkit-scrollbar-thumb': { bg: 'customGray.300', borderRadius: '3px' },
                        '&::-webkit-scrollbar-thumb:hover': { bg: 'customGray.400' },
                      }}
                    >
                    <Table w="100%" sx={{ tableLayout: "fixed" }}>
                      <colgroup>
                        <col style={{ width: "300px" }} />
                        <col style={{ width: "180px" }} />
                        <col style={{ width: "160px" }} />
                        <col style={{ width: "160px" }} />
                        <col style={{ width: "160px" }} />
                      </colgroup>
                      <Tbody>
                    {isSearching ? (
                      [0, 1, 2].map((i) => (
                        <Tr key={`search-skeleton-${i}`}>
                          <Td h="50px" py="0" pl="12px" pr="12px" borderBottomColor="customGray.200">
                            <HStack spacing="12px">
                              <Box w="19px" flexShrink={0} />
                              <Skeleton startColor="customGray.100" endColor="customGray.200" h="12px" w="140px" borderRadius="6px" />
                            </HStack>
                          </Td>
                          <Td h="50px" py="0" px="0" borderBottomColor="customGray.200"><Skeleton startColor="customGray.100" endColor="customGray.200" h="12px" w="60%" borderRadius="6px" /></Td>
                          <Td h="50px" py="0" px="0" borderBottomColor="customGray.200"><Skeleton startColor="customGray.100" endColor="customGray.200" h="12px" w="50px" borderRadius="full" /></Td>
                          <Td h="50px" py="0" px="0" borderBottomColor="customGray.200"><Skeleton startColor="customGray.100" endColor="customGray.200" h="12px" w="44px" borderRadius="6px" /></Td>
                          <Td h="50px" py="0" px="0" borderBottomColor="customGray.200"><Skeleton startColor="customGray.100" endColor="customGray.200" h="12px" w="80px" borderRadius="6px" /></Td>
                        </Tr>
                      ))
                    ) : filteredCalendarEvents.length === 0 && searchQuery.trim() !== "" ? (
                      <Tr>
                        <Td colSpan={5} h="80px" textAlign="center" borderBottomColor="customGray.200">
                          <Text fontSize="sm" color="customGray.500">No events match "{searchQuery}"</Text>
                        </Td>
                      </Tr>
                    ) : filteredCalendarEvents.map((event) => {
                      const initial = (event.title || "U").charAt(0).toUpperCase();
                      const updatedLabel = new Date(event.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                      // Drafts keep the neutral grey badge. The colour palette
                      // only kicks in once the event goes live, and is keyed off
                      // the event id so it stays the same across refetches and
                      // reordering.
                      const isLive = event.status === "Online" || event.status === "Offline";
                      const badgeColor = isLive ? colors[event.id % colors.length] : "customGray.400";
                      const isSelected = selectedEventIds.has(event.id);
                      const toggleSelected = () => {
                        setSelectedEventIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(event.id)) {
                            next.delete(event.id);
                          } else {
                            next.add(event.id);
                          }
                          return next;
                        });
                      };
                      return (
                        <Tr key={event.id} role="group" cursor="pointer" bg="white" _hover={{ bg: "customGray.50" }} transition="background-color 0.2s" onClick={() => router.push(`/calendar-builder?id=${event.id}&tab=calendar`)}>
                          <Td h="50px" py="0" pl="12px" pr="12px" borderBottomColor="customGray.200">
                            <Flex align="center" gap="10px">
                              <Box display="contents" onClick={(e) => e.stopPropagation()}>
                                <Checkbox
                                  isChecked={isSelected}
                                  onChange={toggleSelected}
                                  onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
                                  icon={<CheckboxGlyph />}
                                  sx={checkboxControlSx}
                                  flexShrink={0}
                                  opacity={isSelected ? 1 : 0}
                                  _groupHover={{ opacity: 1 }}
                                  transition="opacity 0.15s"
                                />
                              </Box>
                              <Box
                                w="24px"
                                h="24px"
                                bg={badgeColor}
                                borderRadius="full"
                                display="flex"
                                alignItems="center"
                                justifyContent="center"
                                flexShrink={0}
                              >
                                <Text fontSize="xs" fontWeight="medium" color="white">{initial}</Text>
                              </Box>
                              <Text fontSize="sm" fontWeight="500" color="customGray.800">{event.title}</Text>
                            </Flex>
                          </Td>
                          <Td h="50px" py="0" px="0" borderBottomColor="customGray.200">
                            {username && event.slug ? (
                              <Tooltip
                                label={`formsparrow.com/${username}/${event.slug}`}
                                placement="top"
                                hasArrow
                                bg="customGray.800"
                                color="white"
                              >
                                <Text
                                  fontSize="sm"
                                  color="customGray.600"
                                  textDecoration="underline"
                                  noOfLines={1}
                                  maxW="160px"
                                  _hover={{ color: "sky.500" }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(`/${username}/${event.slug}`, "_blank");
                                  }}
                                >
                                  formsparrow.com/{username}/{event.slug}
                                </Text>
                              </Tooltip>
                            ) : (
                              <Text fontSize="sm" color="customGray.400">—</Text>
                            )}
                          </Td>
                          <Td h="50px" py="0" px="0" borderBottomColor="customGray.200">
                            <Box px="8px" py="2px" bg="customGray.100" borderRadius="full" display="inline-block">
                              <Text fontSize="xs" fontWeight="medium" color="customGray.600">{event.status}</Text>
                            </Box>
                          </Td>
                          <Td h="50px" py="0" px="0" borderBottomColor="customGray.200">
                            <Text fontSize="sm" color="customGray.600">0</Text>
                          </Td>
                          <Td h="50px" py="0" pr="24px" pl="0" borderBottomColor="customGray.200">
                            <Text fontSize="sm" color="customGray.600">{updatedLabel}</Text>
                          </Td>
                        </Tr>
                      );
                    })}
                      </Tbody>
                    </Table>
                    </Box>
                    {selectedEventIds.size > 0 && (
                      <HStack
                        position="absolute"
                        bottom="24px"
                        left="50%"
                        transform="translateX(-50%)"
                        bg="customGray.800"
                        color="white"
                        borderRadius="full"
                        pl="8px"
                        pr="8px"
                        py="6px"
                        spacing="16px"
                        boxShadow="0 8px 24px rgba(0,0,0,0.25)"
                        zIndex={10}
                      >
                        <HStack spacing="10px">
                          <IconButton
                            aria-label="Clear selection"
                            icon={<CloseIcon w="10px" h="10px" />}
                            size="xs"
                            borderRadius="full"
                            bg="customGray.600"
                            color="white"
                            _hover={{ bg: "customGray.500" }}
                            onClick={() => setSelectedEventIds(new Set())}
                          />
                          <Text fontSize="sm" fontWeight="medium">{selectedEventIds.size} Selected</Text>
                        </HStack>
                        <Box w="1px" h="20px" bg="customGray.600" />
                        <Box
                          as="button"
                          position="relative"
                          overflow="hidden"
                          display="flex"
                          alignItems="center"
                          gap="6px"
                          h="32px"
                          px="12px"
                          borderRadius="full"
                          bg="transparent"
                          border="none"
                          cursor={isBulkDuplicating ? "default" : "pointer"}
                          _hover={isBulkDuplicating ? undefined : { bg: "customGray.700" }}
                          disabled={isBulkDuplicating}
                          onClick={isBulkDuplicating ? undefined : handleBulkDuplicateEvents}
                        >
                          {isBulkDuplicating && (
                            <MotionBox
                              position="absolute"
                              top={0}
                              left={0}
                              h="100%"
                              w="45%"
                              bg="customGray.600"
                              borderRadius="full"
                              initial={{ x: "-100%" }}
                              animate={{ x: "320%" }}
                              transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
                            />
                          )}
                          <HStack position="relative" zIndex={1} spacing="6px" color="white" fontSize="sm" fontWeight="medium">
                            <CopyIcon w="14px" h="14px" />
                            <Text>Duplicate</Text>
                          </HStack>
                        </Box>
                        <Box w="1px" h="20px" bg="customGray.600" />
                        <Box
                          as="button"
                          position="relative"
                          overflow="hidden"
                          display="flex"
                          alignItems="center"
                          gap="6px"
                          h="32px"
                          px="12px"
                          borderRadius="full"
                          bg="transparent"
                          border="none"
                          cursor={isBulkDeleting ? "default" : "pointer"}
                          _hover={isBulkDeleting ? undefined : { bg: "customGray.700" }}
                          disabled={isBulkDeleting}
                          onClick={isBulkDeleting ? undefined : handleBulkDeleteEvents}
                        >
                          {isBulkDeleting && (
                            <MotionBox
                              position="absolute"
                              top={0}
                              left={0}
                              h="100%"
                              w="45%"
                              bg="customGray.600"
                              borderRadius="full"
                              initial={{ x: "-100%" }}
                              animate={{ x: "320%" }}
                              transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
                            />
                          )}
                          <HStack position="relative" zIndex={1} spacing="6px" color="white" fontSize="sm" fontWeight="medium">
                            <DeleteIcon w="14px" h="14px" />
                            <Text>Delete</Text>
                          </HStack>
                        </Box>
                      </HStack>
                    )}
                  </VStack>
                </TabPanel>
                <TabPanel h="100%" p="0" overflow="hidden">
                  <VStack w="100%" align="center" justify="center" spacing="24px">
                    <VStack align="center" spacing="12px">
                      <Box w="120px" h="120px" display="flex" alignItems="center" justifyContent="center">
                        <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="60" cy="60" r="50" stroke="#E4E4E7" strokeWidth="2" opacity="0.5"/>
                          <path d="M40 48H80V74C80 75.1046 79.1046 76 78 76H42C40.8954 76 40 75.1046 40 74V48Z" stroke="#A1A1AA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M40 50L60 64L80 50" stroke="#A1A1AA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </Box>
                      <VStack align="center" spacing="8px">
                        <Heading fontSize="18px" fontWeight="500" color="customGray.800">
                          Newsletter coming soon
                        </Heading>
                        <Text fontSize="14px" color="customGray.600" textAlign="center" maxW="280px">
                          Newsletter features will be available soon
                        </Text>
                      </VStack>
                    </VStack>
                  </VStack>
                </TabPanel>
                <TabPanel h="100%" p="0" overflow="hidden">
                  <VStack w="100%" h="100%" align="stretch" spacing={0} overflow="hidden">
                    <Box flexShrink={0} w="100%" bg="customGray.50" borderBottom="1px solid" borderBottomColor="customGray.200">
                      <Table w="100%" sx={{ tableLayout: "fixed" }}>
                        <colgroup>
                          <col style={{ width: "300px" }} />
                          <col style={{ width: "180px" }} />
                          <col />
                          <col style={{ width: "56px" }} />
                        </colgroup>
                        <Thead>
                          <Tr>
                            <Th border="none" h="50px" py="0" pl="24px" pr="0" fontSize="sm" fontWeight="medium" color="customGray.600" textTransform="none" letterSpacing="normal">Agent Name</Th>
                            <Th border="none" h="50px" py="0" px="0" fontSize="sm" fontWeight="medium" color="customGray.600" textTransform="none" letterSpacing="normal">Status</Th>
                            <Th border="none" h="50px" py="0" px="0" fontSize="sm" fontWeight="medium" color="customGray.600" textTransform="none" letterSpacing="normal">Last Updated</Th>
                            <Th border="none" h="50px" py="0" pr="24px" pl="0"></Th>
                          </Tr>
                        </Thead>
                      </Table>
                    </Box>
                    <Box
                      flex={1}
                      w="100%"
                      overflowY="auto"
                      sx={{
                        '&::-webkit-scrollbar': { width: '6px' },
                        '&::-webkit-scrollbar-track': { bg: 'transparent' },
                        '&::-webkit-scrollbar-thumb': { bg: 'customGray.300', borderRadius: '3px' },
                        '&::-webkit-scrollbar-thumb:hover': { bg: 'customGray.400' },
                      }}
                    >
                      {chatbotAgents.length === 0 ? (
                        <VStack w="100%" py="60px" spacing="8px">
                          <Text fontSize="sm" color="customGray.500">No agents yet</Text>
                          <Text fontSize="xs" color="customGray.400">Click "Create agent" to build your first chatbot</Text>
                        </VStack>
                      ) : (
                        <Table w="100%" sx={{ tableLayout: "fixed" }}>
                          <colgroup>
                            <col style={{ width: "300px" }} />
                            <col style={{ width: "180px" }} />
                            <col />
                            <col style={{ width: "56px" }} />
                          </colgroup>
                          <Tbody>
                            {chatbotAgents.map((agent) => {
                              const initial = (agent.name || "U").charAt(0).toUpperCase();
                              const updatedLabel = new Date(agent.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                              const isPublished = agent.status === "Published";
                              return (
                                <Tr key={agent.id} cursor="pointer" bg="white" _hover={{ bg: "customGray.50" }} transition="background-color 0.2s" onClick={() => router.push(`/chatbot-builder?id=${agent.id}&workspace=${encodeURIComponent(selectedAgent || "")}`)}>
                                  <Td h="50px" py="0" pl="24px" pr="0" borderBottomColor="customGray.200">
                                    <Flex align="center" gap="8px">
                                      <Box w="24px" h="24px" bg="customGray.400" borderRadius="full" display="flex" alignItems="center" justifyContent="center" flexShrink={0}>
                                        <Text fontSize="xs" fontWeight="medium" color="white">{initial}</Text>
                                      </Box>
                                      <Text fontSize="sm" color="customGray.800">{agent.name}</Text>
                                    </Flex>
                                  </Td>
                                  <Td h="50px" py="0" px="0" borderBottomColor="customGray.200">
                                    <Box px="8px" py="2px" bg={isPublished ? "green.100" : "customGray.100"} borderRadius="full" display="inline-block">
                                      <Text fontSize="xs" fontWeight="medium" color={isPublished ? "green.700" : "customGray.600"}>{agent.status}</Text>
                                    </Box>
                                  </Td>
                                  <Td h="50px" py="0" px="0" borderBottomColor="customGray.200">
                                    <Text fontSize="sm" color="customGray.600">{updatedLabel}</Text>
                                  </Td>
                                  <Td h="50px" py="0" pr="24px" pl="0" borderBottomColor="customGray.200">
                                    <Menu>
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
                                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                                      />
                                      <MenuList fontSize="sm" minW="160px">
                                        <MenuItem color="red.500" onClick={() => handleDeleteAgent(agent.id)}>
                                          Delete
                                        </MenuItem>
                                      </MenuList>
                                    </Menu>
                                  </Td>
                                </Tr>
                              );
                            })}
                          </Tbody>
                        </Table>
                      )}
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

      <UsernameModal
        isOpen={isUsernameOpen}
        onClose={onUsernameClose}
        currentUsername={username}
        onSaved={setUsername}
      />

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
                <ServiceSelector
                  selected={selectedServices}
                  onToggle={(service) => {
                    setSelectedServices(
                      selectedServices.includes(service)
                        ? selectedServices.filter((s) => s !== service)
                        : [...selectedServices, service]
                    );
                  }}
                />
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

                      // Only update local state after successful Supabase
                      // deletion. Drop by index, not name, so deleting one of
                      // two identically-named workspaces removes just that row.
                      const removedIndex = selectedAgentIndex ?? 0;
                      const updatedAgents = agents.filter((_, i) => i !== removedIndex);
                      setAgents(updatedAgents);
                      localStorage.setItem("workspace_agents", JSON.stringify(updatedAgents));

                      if (updatedAgents.length > 0) {
                        // Stay near where the deleted one was.
                        setSelectedAgentIndex(Math.min(removedIndex, updatedAgents.length - 1));
                      } else {
                        setSelectedAgentIndex(null);
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

