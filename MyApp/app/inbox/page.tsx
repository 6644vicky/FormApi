"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { deleteUserAccount } from "@/app/actions/deleteUser";
import CryptoJS from "crypto-js";
import Sidebar from "@/app/components/Sidebar";
import OnboardingGate from "@/app/components/OnboardingGate";
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
  IconButton,
  Tooltip,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
  Portal,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@chakra-ui/react";
import { ChevronDownIcon, AddIcon } from "@chakra-ui/icons";

type FolderKey = "open" | "assigned" | "subscribed" | "later" | "done" | "drafts" | "sent" | "trash" | "spam";

const FOLDERS: { key: FolderKey; label: string }[] = [
  { key: "open", label: "Open" },
  { key: "assigned", label: "Assigned to me" },
  { key: "subscribed", label: "Subscribed" },
  { key: "later", label: "Later" },
  { key: "done", label: "Done" },
  { key: "drafts", label: "Drafts" },
];

const MORE_FOLDERS: { key: FolderKey; label: string }[] = [
  { key: "sent", label: "Sent" },
  { key: "trash", label: "Trash" },
  { key: "spam", label: "Spam" },
];

const TAG_COLORS = ["#7C3AED", "#0EA5E9", "#F59E0B", "#10B981", "#EF4444", "#EC4899"];

type InboxTag = { id: number; name: string; color: string };
type InboxChannel = { id: number; name: string; icon_color: string };
type InboxConversation = {
  id: number;
  subject: string;
  status: "open" | "later" | "done" | "trash" | "spam";
  kind: "message" | "task" | "discussion";
  direction: "inbound" | "outbound";
  is_draft: boolean;
  sender_name: string | null;
  sender_initials: string | null;
  sender_avatar_color: string;
  assignee_id: string | null;
  channel_id: number | null;
  created_at: string;
  updated_at: string;
  tags: InboxTag[];
  is_subscribed: boolean;
  preview: string;
};
type InboxMessage = {
  id: number;
  conversation_id: number;
  author_user_id: string | null;
  author_name: string | null;
  body: string;
  is_internal_comment: boolean;
  created_at: string;
};

function formatRelativeTime(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function InboxPage() {
  const toast = useToast({ position: "top" });
  const router = useRouter();
  const [selectedNav, setSelectedNav] = useState("Home");
  const [searchQuery, setSearchQuery] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const { isOpen: isFeedbackOpen, onOpen: onFeedbackOpen, onClose: onFeedbackClose } = useDisclosure();
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [isFeedbackSubmitting, setIsFeedbackSubmitting] = useState(false);
  const [feedbackError, setFeedbackError] = useState("");

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoadingInbox, setIsLoadingInbox] = useState(true);
  const [conversations, setConversations] = useState<InboxConversation[]>([]);
  const [channels, setChannels] = useState<InboxChannel[]>([]);
  const [tagCatalog, setTagCatalog] = useState<InboxTag[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<FolderKey>("open");
  const [selectedChannelId, setSelectedChannelId] = useState<number | null>(null);
  const [activeListTab, setActiveListTab] = useState<"all" | "tasks" | "discussions">("all");
  const [isMoreExpanded, setIsMoreExpanded] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [threadMessages, setThreadMessages] = useState<InboxMessage[]>([]);
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [isAddingChannel, setIsAddingChannel] = useState(false);

  const { isOpen: isComposeOpen, onOpen: onComposeOpen, onClose: onComposeClose } = useDisclosure();
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [isComposeSaving, setIsComposeSaving] = useState(false);

  const seededRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const cached = localStorage.getItem("user_avatar");
    if (cached) {
      setAvatarUrl(cached);
    }
    setHydrated(true);
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
          setCurrentUserId(session.user.id);

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

  // Demo content so a first-time user sees a working inbox instead of three
  // empty folders — mirrors the three messages this page used to hardcode.
  const seedDemoConversations = useCallback(async (userId: string) => {
    const seedRows = [
      { subject: "Welcome to our platform", sender_name: "Vicky Vignesh", sender_initials: "V", sender_avatar_color: "#9333ea", tagName: "System", tagColor: "#7C3AED", body: "Welcome aboard! Let us know if you need anything to get started." },
      { subject: "How do I set up my account?", sender_name: "Sarah Johnson", sender_initials: "S", sender_avatar_color: "#a855f7", tagName: "Support", tagColor: "#0EA5E9", body: "Hi, I'm having trouble finding the account settings page — can you point me in the right direction?" },
      { subject: "New features available", sender_name: "Product Team", sender_initials: "P", sender_avatar_color: "#7c3aed", tagName: "Update", tagColor: "#10B981", body: "We just shipped a few new features this week. Check the changelog for details!" },
    ];
    for (const row of seedRows) {
      const { data: tagRow } = await supabase
        .from("inbox_tags")
        .insert({ user_id: userId, name: row.tagName, color: row.tagColor })
        .select("id")
        .single();
      const { data: conv } = await supabase
        .from("inbox_conversations")
        .insert({ user_id: userId, subject: row.subject, sender_name: row.sender_name, sender_initials: row.sender_initials, sender_avatar_color: row.sender_avatar_color, status: "open" })
        .select("id")
        .single();
      if (conv) {
        await supabase.from("inbox_messages").insert({ conversation_id: conv.id, author_name: row.sender_name, body: row.body });
        if (tagRow) await supabase.from("inbox_conversation_tags").insert({ conversation_id: conv.id, tag_id: tagRow.id });
      }
    }
  }, []);

  const loadInboxData = useCallback(async () => {
    if (!currentUserId) return;
    setIsLoadingInbox(true);

    const [{ data: convData }, { data: channelData }, { data: tagData }, { data: subData }] = await Promise.all([
      supabase.from("inbox_conversations").select("*").eq("user_id", currentUserId).order("updated_at", { ascending: false }),
      supabase.from("inbox_channels").select("id, name, icon_color").eq("user_id", currentUserId).order("created_at", { ascending: true }),
      supabase.from("inbox_tags").select("id, name, color").eq("user_id", currentUserId),
      supabase.from("inbox_conversation_subscribers").select("conversation_id").eq("user_id", currentUserId),
    ]);

    if (!seededRef.current && (convData?.length ?? 0) === 0) {
      seededRef.current = true;
      await seedDemoConversations(currentUserId);
      return loadInboxData();
    }

    const conversationIds = (convData || []).map((c) => c.id);
    const { data: tagLinks } = conversationIds.length > 0
      ? await supabase.from("inbox_conversation_tags").select("conversation_id, tag_id").in("conversation_id", conversationIds)
      : { data: [] as Array<{ conversation_id: number; tag_id: number }> };
    const { data: lastMessages } = conversationIds.length > 0
      ? await supabase.from("inbox_messages").select("conversation_id, body, is_internal_comment, created_at").in("conversation_id", conversationIds).eq("is_internal_comment", false).order("created_at", { ascending: false })
      : { data: [] as Array<{ conversation_id: number; body: string; is_internal_comment: boolean; created_at: string }> };

    const tagById = new Map((tagData || []).map((t) => [t.id, t as InboxTag]));
    const previewByConv = new Map<number, string>();
    (lastMessages || []).forEach((m) => {
      if (!previewByConv.has(m.conversation_id)) previewByConv.set(m.conversation_id, m.body);
    });
    const subscribedIds = new Set((subData || []).map((s) => s.conversation_id));

    const rows: InboxConversation[] = (convData || []).map((c) => ({
      ...c,
      tags: (tagLinks || []).filter((l) => l.conversation_id === c.id).map((l) => tagById.get(l.tag_id)).filter((t): t is InboxTag => Boolean(t)),
      is_subscribed: subscribedIds.has(c.id),
      preview: previewByConv.get(c.id) || "",
    }));

    setConversations(rows);
    setChannels((channelData as InboxChannel[]) || []);
    setTagCatalog((tagData as InboxTag[]) || []);
    setIsLoadingInbox(false);
  }, [currentUserId, seedDemoConversations]);

  useEffect(() => {
    if (currentUserId) loadInboxData();
  }, [currentUserId, loadInboxData]);

  const loadThread = useCallback(async (conversationId: number) => {
    setIsLoadingThread(true);
    const { data } = await supabase
      .from("inbox_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    setThreadMessages((data as InboxMessage[]) || []);
    setIsLoadingThread(false);
  }, []);

  const handleSelectConversation = (conv: InboxConversation) => {
    setSelectedConversationId(conv.id);
    loadThread(conv.id);
  };

  const selectedConversation = conversations.find((c) => c.id === selectedConversationId) || null;

  const folderCounts = useMemo(() => {
    const counts: Record<FolderKey, number> = { open: 0, assigned: 0, subscribed: 0, later: 0, done: 0, drafts: 0, sent: 0, trash: 0, spam: 0 };
    conversations.forEach((c) => {
      if (c.is_draft) { counts.drafts++; return; }
      if (c.status === "trash") { counts.trash++; return; }
      if (c.status === "spam") { counts.spam++; return; }
      if (c.direction === "outbound") counts.sent++;
      if (c.status === "open") counts.open++;
      if (c.status === "later") counts.later++;
      if (c.status === "done") counts.done++;
      if (c.assignee_id === currentUserId) counts.assigned++;
      if (c.is_subscribed) counts.subscribed++;
    });
    return counts;
  }, [conversations, currentUserId]);

  const channelCounts = useMemo(() => {
    const counts = new Map<number, number>();
    conversations.forEach((c) => {
      if (c.channel_id !== null) counts.set(c.channel_id, (counts.get(c.channel_id) ?? 0) + 1);
    });
    return counts;
  }, [conversations]);

  const filteredConversations = useMemo(() => {
    let list = conversations;
    if (selectedChannelId !== null) {
      list = list.filter((c) => c.channel_id === selectedChannelId);
    } else {
      switch (selectedFolder) {
        case "open": list = list.filter((c) => c.status === "open" && !c.is_draft && c.direction === "inbound"); break;
        case "assigned": list = list.filter((c) => c.assignee_id === currentUserId && c.status === "open"); break;
        case "subscribed": list = list.filter((c) => c.is_subscribed); break;
        case "later": list = list.filter((c) => c.status === "later" && !c.is_draft); break;
        case "done": list = list.filter((c) => c.status === "done" && !c.is_draft); break;
        case "drafts": list = list.filter((c) => c.is_draft); break;
        case "sent": list = list.filter((c) => c.direction === "outbound" && !c.is_draft); break;
        case "trash": list = list.filter((c) => c.status === "trash"); break;
        case "spam": list = list.filter((c) => c.status === "spam"); break;
      }
    }
    if (activeListTab === "tasks") list = list.filter((c) => c.kind === "task");
    else if (activeListTab === "discussions") list = list.filter((c) => c.kind === "discussion");
    const query = searchQuery.trim().toLowerCase();
    if (query) list = list.filter((c) => c.subject.toLowerCase().includes(query) || (c.sender_name || "").toLowerCase().includes(query));
    return list;
  }, [conversations, selectedFolder, selectedChannelId, activeListTab, searchQuery, currentUserId]);

  const currentFolderLabel = selectedChannelId !== null
    ? channels.find((ch) => ch.id === selectedChannelId)?.name || "Channel"
    : [...FOLDERS, ...MORE_FOLDERS].find((f) => f.key === selectedFolder)?.label || "Open";

  const handleMoveStatus = async (id: number, status: InboxConversation["status"]) => {
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
    const { error } = await supabase.from("inbox_conversations").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) toast({ title: "Couldn't move conversation", description: error.message, status: "error" });
  };

  const handleToggleSubscribe = async (conv: InboxConversation) => {
    if (!currentUserId) return;
    const next = !conv.is_subscribed;
    setConversations((prev) => prev.map((c) => (c.id === conv.id ? { ...c, is_subscribed: next } : c)));
    if (next) {
      await supabase.from("inbox_conversation_subscribers").insert({ conversation_id: conv.id, user_id: currentUserId });
    } else {
      await supabase.from("inbox_conversation_subscribers").delete().eq("conversation_id", conv.id).eq("user_id", currentUserId);
    }
  };

  const handleToggleAssignToMe = async (conv: InboxConversation) => {
    if (!currentUserId) return;
    const nextAssignee = conv.assignee_id === currentUserId ? null : currentUserId;
    setConversations((prev) => prev.map((c) => (c.id === conv.id ? { ...c, assignee_id: nextAssignee } : c)));
    await supabase.from("inbox_conversations").update({ assignee_id: nextAssignee }).eq("id", conv.id);
  };

  const handleCreateAndAttachTag = async (conv: InboxConversation, name: string) => {
    if (!currentUserId || !name.trim()) return;
    const color = TAG_COLORS[tagCatalog.length % TAG_COLORS.length];
    const { data: tagRow, error } = await supabase
      .from("inbox_tags")
      .insert({ user_id: currentUserId, name: name.trim(), color })
      .select("id, name, color")
      .single();
    if (error || !tagRow) {
      toast({ title: "Couldn't create tag", status: "error" });
      return;
    }
    setTagCatalog((prev) => [...prev, tagRow as InboxTag]);
    await handleAttachTag(conv, tagRow as InboxTag);
  };

  const handleAttachTag = async (conv: InboxConversation, tag: InboxTag) => {
    if (conv.tags.some((t) => t.id === tag.id)) return;
    setConversations((prev) => prev.map((c) => (c.id === conv.id ? { ...c, tags: [...c.tags, tag] } : c)));
    await supabase.from("inbox_conversation_tags").insert({ conversation_id: conv.id, tag_id: tag.id });
  };

  const handleRemoveTag = async (conv: InboxConversation, tag: InboxTag) => {
    setConversations((prev) => prev.map((c) => (c.id === conv.id ? { ...c, tags: c.tags.filter((t) => t.id !== tag.id) } : c)));
    await supabase.from("inbox_conversation_tags").delete().eq("conversation_id", conv.id).eq("tag_id", tag.id);
  };

  const handlePostComment = async () => {
    if (!selectedConversation || !commentDraft.trim() || !currentUserId) return;
    setIsPostingComment(true);
    const { data, error } = await supabase
      .from("inbox_messages")
      .insert({ conversation_id: selectedConversation.id, author_user_id: currentUserId, author_name: userEmail, body: commentDraft.trim(), is_internal_comment: true })
      .select("*")
      .single();
    setIsPostingComment(false);
    if (error || !data) {
      toast({ title: "Couldn't post comment", status: "error" });
      return;
    }
    setThreadMessages((prev) => [...prev, data as InboxMessage]);
    setCommentDraft("");
  };

  const handleCreateChannel = async () => {
    if (!currentUserId || !newChannelName.trim()) return;
    const color = TAG_COLORS[channels.length % TAG_COLORS.length];
    const { data, error } = await supabase
      .from("inbox_channels")
      .insert({ user_id: currentUserId, name: newChannelName.trim(), icon_color: color })
      .select("id, name, icon_color")
      .single();
    if (error || !data) {
      toast({ title: "Couldn't create channel", status: "error" });
      return;
    }
    setChannels((prev) => [...prev, data as InboxChannel]);
    setNewChannelName("");
    setIsAddingChannel(false);
  };

  const resetCompose = () => {
    setComposeSubject("");
    setComposeBody("");
  };

  const handleSaveCompose = async (asDraft: boolean) => {
    if (!currentUserId || !composeSubject.trim()) return;
    setIsComposeSaving(true);
    const { data: conv, error } = await supabase
      .from("inbox_conversations")
      .insert({
        user_id: currentUserId,
        subject: composeSubject.trim(),
        direction: "outbound",
        is_draft: asDraft,
        status: "open",
        sender_name: userEmail,
        sender_initials: (userEmail.charAt(0) || "Y").toUpperCase(),
        sender_avatar_color: "#334155",
      })
      .select("*")
      .single();
    if (error || !conv) {
      setIsComposeSaving(false);
      toast({ title: "Couldn't save message", description: error?.message, status: "error" });
      return;
    }
    if (composeBody.trim()) {
      await supabase.from("inbox_messages").insert({ conversation_id: conv.id, author_user_id: currentUserId, author_name: userEmail, body: composeBody.trim() });
    }
    setIsComposeSaving(false);
    onComposeClose();
    resetCompose();
    setSelectedFolder(asDraft ? "drafts" : "sent");
    setSelectedChannelId(null);
    await loadInboxData();
    toast({ title: asDraft ? "Saved as draft" : "Message sent", status: "success" });
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

  return (
    <Flex h="100vh" w="100vw" bg="dark.bg" overflow="hidden" position="fixed" top={0} left={0}>
      <OnboardingGate />
      {/* Sidebar Component — left untouched by the inbox redesign */}
      <Sidebar
        selectedNav={selectedNav}
        onNavClick={setSelectedNav}
        userEmail={userEmail}
        avatarUrl={avatarUrl}
        onDelete={handleDeleteAccount}
        onFeedbackOpen={onFeedbackOpen}
        isLoading={!hydrated}
      />

      {/* Folder panel */}
      <VStack w="240px" h="100vh" flexShrink={0} align="stretch" spacing={0} bg="white" borderRight="1px solid" borderColor="customGray.200" overflowY="auto">
        <HStack h="56px" px="16px" justify="space-between" flexShrink={0}>
          <HStack spacing="6px">
            <Text fontSize="sm" fontWeight="600" color="customGray.800">Inbox</Text>
            <ChevronDownIcon color="customGray.500" />
          </HStack>
          <Tooltip label="New message">
            <IconButton aria-label="New message" icon={<AddIcon w="10px" h="10px" />} size="xs" borderRadius="full" bg="customGray.800" color="white" _hover={{ bg: "customGray.700" }} onClick={onComposeOpen} />
          </Tooltip>
        </HStack>

        <VStack align="stretch" spacing="2px" px="8px" pb="8px">
          {FOLDERS.map((folder) => (
            <HStack
              key={folder.key}
              justify="space-between"
              h="32px"
              px="8px"
              borderRadius="8px"
              cursor="pointer"
              bg={selectedChannelId === null && selectedFolder === folder.key ? "customGray.100" : "transparent"}
              _hover={{ bg: "customGray.100" }}
              onClick={() => { setSelectedFolder(folder.key); setSelectedChannelId(null); }}
            >
              <Text fontSize="sm" color="customGray.800" fontWeight={selectedFolder === folder.key && selectedChannelId === null ? "600" : "400"}>{folder.label}</Text>
              {folderCounts[folder.key] > 0 && <Text fontSize="xs" color="customGray.500">{folderCounts[folder.key]}</Text>}
            </HStack>
          ))}

          <HStack h="28px" px="8px" cursor="pointer" onClick={() => setIsMoreExpanded((v) => !v)}>
            <ChevronDownIcon color="customGray.400" transform={isMoreExpanded ? "rotate(0deg)" : "rotate(-90deg)"} transition="transform 0.15s" />
            <Text fontSize="xs" color="customGray.500">{isMoreExpanded ? "Less" : "More"}</Text>
          </HStack>

          {isMoreExpanded && MORE_FOLDERS.map((folder) => (
            <HStack
              key={folder.key}
              justify="space-between"
              h="32px"
              px="8px"
              borderRadius="8px"
              cursor="pointer"
              bg={selectedChannelId === null && selectedFolder === folder.key ? "customGray.100" : "transparent"}
              _hover={{ bg: "customGray.100" }}
              onClick={() => { setSelectedFolder(folder.key); setSelectedChannelId(null); }}
            >
              <Text fontSize="sm" color="customGray.800" fontWeight={selectedFolder === folder.key && selectedChannelId === null ? "600" : "400"}>{folder.label}</Text>
              {folderCounts[folder.key] > 0 && <Text fontSize="xs" color="customGray.500">{folderCounts[folder.key]}</Text>}
            </HStack>
          ))}
        </VStack>

        <Box flexShrink={0} px="16px" py="8px">
          <Text fontSize="10px" fontWeight="600" color="customGray.400" textTransform="uppercase" letterSpacing="0.04em">Shared</Text>
        </Box>
        <VStack align="stretch" spacing="2px" px="8px" flex="1">
          {channels.map((channel) => (
            <HStack
              key={channel.id}
              justify="space-between"
              h="32px"
              px="8px"
              borderRadius="8px"
              cursor="pointer"
              bg={selectedChannelId === channel.id ? "customGray.100" : "transparent"}
              _hover={{ bg: "customGray.100" }}
              onClick={() => setSelectedChannelId(channel.id)}
            >
              <HStack spacing="8px" minW="0">
                <Box w="8px" h="8px" borderRadius="full" bg={channel.icon_color} flexShrink={0} />
                <Text fontSize="sm" color="customGray.800" noOfLines={1}>{channel.name}</Text>
              </HStack>
              <Text fontSize="xs" color="customGray.500">{channelCounts.get(channel.id) ?? 0}</Text>
            </HStack>
          ))}
          {isAddingChannel ? (
            <HStack px="8px" py="4px">
              <Input
                size="sm"
                autoFocus
                placeholder="Channel name"
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleCreateChannel(); if (e.key === "Escape") setIsAddingChannel(false); }}
                onBlur={() => { if (!newChannelName.trim()) setIsAddingChannel(false); }}
              />
            </HStack>
          ) : (
            <HStack h="32px" px="8px" borderRadius="8px" cursor="pointer" _hover={{ bg: "customGray.100" }} onClick={() => setIsAddingChannel(true)}>
              <AddIcon w="10px" h="10px" color="customGray.400" />
              <Text fontSize="sm" color="customGray.500">Add channel</Text>
            </HStack>
          )}
        </VStack>
      </VStack>

      {/* Message list panel */}
      <VStack w="360px" h="100vh" flexShrink={0} align="stretch" spacing={0} bg="customGray.50" borderRight="1px solid" borderColor="customGray.200" overflow="hidden">
        <VStack align="stretch" spacing="8px" px="16px" py="12px" borderBottom="1px solid" borderColor="customGray.200" bg="white" flexShrink={0}>
          <HStack justify="space-between">
            <Heading fontSize="md" color="customGray.800">{currentFolderLabel}</Heading>
            <Text fontSize="xs" color="customGray.500">{filteredConversations.length}</Text>
          </HStack>
          <Input
            size="sm"
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            bg="customGray.50"
            borderRadius="8px"
          />
          <HStack spacing="16px">
            {(["all", "tasks", "discussions"] as const).map((tab) => (
              <Text
                key={tab}
                fontSize="xs"
                fontWeight={activeListTab === tab ? "600" : "400"}
                color={activeListTab === tab ? "customGray.800" : "customGray.500"}
                borderBottom={activeListTab === tab ? "2px solid" : "2px solid transparent"}
                borderColor={activeListTab === tab ? "customGray.800" : "transparent"}
                pb="4px"
                cursor="pointer"
                textTransform="capitalize"
                onClick={() => setActiveListTab(tab)}
              >
                {tab}
              </Text>
            ))}
          </HStack>
        </VStack>

        <VStack align="stretch" spacing={0} overflowY="auto" flex="1">
          {isLoadingInbox ? (
            <Text fontSize="sm" color="customGray.400" p="16px">Loading…</Text>
          ) : filteredConversations.length === 0 ? (
            <Text fontSize="sm" color="customGray.400" p="16px">Nothing here.</Text>
          ) : filteredConversations.map((conv) => (
            <Box
              key={conv.id}
              px="16px"
              py="12px"
              borderBottom="1px solid"
              borderColor="customGray.100"
              bg={selectedConversationId === conv.id ? "sky.50" : "white"}
              cursor="pointer"
              _hover={{ bg: selectedConversationId === conv.id ? "sky.50" : "customGray.50" }}
              onClick={() => handleSelectConversation(conv)}
            >
              <HStack align="start" spacing="10px">
                <Avatar name={conv.sender_initials || conv.sender_name || "?"} bg={conv.sender_avatar_color} color="white" size="sm" />
                <VStack align="start" spacing="2px" flex="1" minW="0">
                  <HStack spacing="6px" w="100%" justify="space-between">
                    <Text fontSize="sm" fontWeight="600" color="customGray.800" noOfLines={1}>{conv.sender_name || "Unknown"}</Text>
                    <Text fontSize="xs" color="customGray.400" flexShrink={0}>{formatRelativeTime(conv.updated_at)}</Text>
                  </HStack>
                  <Text fontSize="sm" color="customGray.800" noOfLines={1}>{conv.subject}</Text>
                  <Text fontSize="xs" color="customGray.500" noOfLines={1}>{conv.preview}</Text>
                  {conv.tags.length > 0 && (
                    <HStack spacing="4px" pt="2px">
                      {conv.tags.map((tag) => (
                        <Box key={tag.id} px="6px" py="1px" borderRadius="full" bg={tag.color}>
                          <Text fontSize="10px" color="white" fontWeight="medium">{tag.name}</Text>
                        </Box>
                      ))}
                    </HStack>
                  )}
                </VStack>
              </HStack>
            </Box>
          ))}
        </VStack>
      </VStack>

      {/* Detail / thread panel */}
      <VStack flex="1" h="100vh" align="stretch" spacing={0} bg="white" overflow="hidden">
        {!selectedConversation ? (
          <Flex flex="1" align="center" justify="center">
            <Text fontSize="sm" color="customGray.400">Select a conversation to view it here.</Text>
          </Flex>
        ) : (
          <>
            <VStack align="stretch" spacing="10px" px="24px" py="16px" borderBottom="1px solid" borderColor="customGray.200" flexShrink={0}>
              <HStack justify="space-between">
                <Heading fontSize="lg" color="customGray.800" noOfLines={1}>{selectedConversation.subject}</Heading>
                <Menu>
                  <MenuButton as={Button} size="sm" variant="outline">Move to…</MenuButton>
                  <MenuList fontSize="sm">
                    <MenuItem onClick={() => handleMoveStatus(selectedConversation.id, "open")}>Open</MenuItem>
                    <MenuItem onClick={() => handleMoveStatus(selectedConversation.id, "later")}>Later</MenuItem>
                    <MenuItem onClick={() => handleMoveStatus(selectedConversation.id, "done")}>Done</MenuItem>
                    <MenuItem onClick={() => handleMoveStatus(selectedConversation.id, "spam")}>Spam</MenuItem>
                    <MenuItem color="red.500" onClick={() => handleMoveStatus(selectedConversation.id, "trash")}>Trash</MenuItem>
                  </MenuList>
                </Menu>
              </HStack>
              <HStack spacing="8px" flexWrap="wrap">
                {selectedConversation.tags.map((tag) => (
                  <HStack key={tag.id} spacing="4px" px="8px" py="2px" borderRadius="full" bg={tag.color} cursor="pointer" onClick={() => handleRemoveTag(selectedConversation, tag)}>
                    <Text fontSize="xs" color="white" fontWeight="medium">{tag.name}</Text>
                    <Text fontSize="xs" color="white">×</Text>
                  </HStack>
                ))}
                <Popover placement="bottom-start">
                  <PopoverTrigger>
                    <IconButton aria-label="Add tag" icon={<AddIcon w="9px" h="9px" />} size="xs" variant="outline" borderRadius="full" />
                  </PopoverTrigger>
                  <Portal>
                    <PopoverContent w="200px">
                      <PopoverBody>
                        <VStack align="stretch" spacing="4px">
                          {tagCatalog.filter((t) => !selectedConversation.tags.some((st) => st.id === t.id)).map((tag) => (
                            <HStack key={tag.id} px="6px" py="4px" borderRadius="6px" cursor="pointer" _hover={{ bg: "customGray.50" }} onClick={() => handleAttachTag(selectedConversation, tag)}>
                              <Box w="8px" h="8px" borderRadius="full" bg={tag.color} />
                              <Text fontSize="sm">{tag.name}</Text>
                            </HStack>
                          ))}
                          <Input
                            size="sm"
                            placeholder="New tag…"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleCreateAndAttachTag(selectedConversation, e.currentTarget.value);
                                e.currentTarget.value = "";
                              }
                            }}
                          />
                        </VStack>
                      </PopoverBody>
                    </PopoverContent>
                  </Portal>
                </Popover>
                <Box flex="1" />
                <Button size="xs" variant="outline" onClick={() => handleToggleSubscribe(selectedConversation)}>
                  {selectedConversation.is_subscribed ? "Subscribed" : "Subscribe"}
                </Button>
                <Button size="xs" variant="outline" onClick={() => handleToggleAssignToMe(selectedConversation)}>
                  {selectedConversation.assignee_id === currentUserId ? "Assigned to you" : "Assign to me"}
                </Button>
              </HStack>
            </VStack>

            <VStack align="stretch" spacing="16px" flex="1" overflowY="auto" px="24px" py="16px">
              {isLoadingThread ? (
                <Text fontSize="sm" color="customGray.400">Loading…</Text>
              ) : threadMessages.length === 0 ? (
                <Text fontSize="sm" color="customGray.400">No messages yet.</Text>
              ) : threadMessages.map((msg) => (
                <HStack key={msg.id} align="start" spacing="10px">
                  <Avatar name={msg.author_name || "?"} size="sm" bg={msg.is_internal_comment ? "orange.400" : "customGray.400"} color="white" />
                  <Box flex="1" bg={msg.is_internal_comment ? "yellow.50" : "customGray.50"} borderRadius="8px" p="12px">
                    <HStack justify="space-between" mb="4px">
                      <Text fontSize="sm" fontWeight="600" color="customGray.800">{msg.author_name || "Unknown"}{msg.is_internal_comment ? " · internal note" : ""}</Text>
                      <Text fontSize="xs" color="customGray.400">{formatRelativeTime(msg.created_at)}</Text>
                    </HStack>
                    <Text fontSize="sm" color="customGray.800" whiteSpace="pre-wrap">{msg.body}</Text>
                  </Box>
                </HStack>
              ))}
            </VStack>

            <Box borderTop="1px solid" borderColor="customGray.200" px="24px" py="12px" flexShrink={0}>
              <VStack align="stretch" spacing="6px">
                <Textarea
                  placeholder="Add internal comment"
                  size="sm"
                  rows={2}
                  value={commentDraft}
                  onChange={(e) => setCommentDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handlePostComment();
                    }
                  }}
                />
                <HStack justify="flex-end">
                  <Button size="sm" bg="customGray.800" color="white" _hover={{ bg: "customGray.700" }} isDisabled={!commentDraft.trim()} isLoading={isPostingComment} onClick={handlePostComment}>
                    Comment
                  </Button>
                </HStack>
              </VStack>
            </Box>
          </>
        )}
      </VStack>

      {/* Compose modal */}
      <Modal isOpen={isComposeOpen} onClose={() => { onComposeClose(); resetCompose(); }} isCentered size="lg">
        <ModalOverlay bg="rgba(0, 0, 0, 0.5)" />
        <ModalContent bg="white" borderRadius="lg" boxShadow="0 10px 40px rgba(0, 0, 0, 0.1)">
          <ModalHeader fontSize="sm" fontWeight="semibold" color="customGray.800">New message</ModalHeader>
          <ModalBody>
            <VStack align="stretch" spacing="8px">
              <Input placeholder="Subject" value={composeSubject} onChange={(e) => setComposeSubject(e.target.value)} />
              <Textarea placeholder="Write a message…" minH="160px" value={composeBody} onChange={(e) => setComposeBody(e.target.value)} />
            </VStack>
          </ModalBody>
          <ModalFooter gap="8px">
            <Button size="sm" variant="outline" isLoading={isComposeSaving} onClick={() => handleSaveCompose(true)}>Save as draft</Button>
            <Button size="sm" bg="customGray.800" color="white" _hover={{ bg: "customGray.700" }} isDisabled={!composeSubject.trim()} isLoading={isComposeSaving} onClick={() => handleSaveCompose(false)}>Send</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Feedback Modal */}
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
          maxW="500px"
          boxShadow="0 10px 40px rgba(0, 0, 0, 0.1)"
        >
          <ModalHeader
            fontSize="sm"
            fontWeight="semibold"
            color="customGray.800"
            px="16px"
            pt="16px"
            pb="0px"
          >
            Share feedback about Weav
          </ModalHeader>

          <ModalBody py="16px" px="16px">
            <VStack align="stretch" spacing="8px">
              <Textarea
                placeholder="Tell us what you think..."
                value={feedbackMessage}
                onChange={(e) => {
                  setFeedbackMessage(e.target.value);
                  setFeedbackError("");
                }}
                minH="200px"
                bg="white"
                border="1px solid"
                borderColor={feedbackError ? "#FF6B6B" : "customGray.300"}
                color={feedbackMessage ? "customGray.800" : "customGray.500"}
                fontSize="sm"
                fontWeight="normal"
                _placeholder={{ color: "customGray.500", fontSize: "sm", fontWeight: "normal" }}
                _focus={{
                  borderColor: feedbackError ? "#FF6B6B" : "customGray.500",
                  boxShadow: feedbackError
                    ? "0 0 0 3px rgba(255, 107, 107, 0.1)"
                    : "0 0 0 4px rgba(39, 39, 42, 0.10)",
                  color: "customGray.800",
                }}
                borderRadius="base"
                resize="none"
              />
              {feedbackError && (
                <Text fontSize="xs" color="#FF6B6B" fontWeight="normal">
                  {feedbackError}
                </Text>
              )}
            </VStack>
          </ModalBody>

          <ModalFooter gap="12px" px="16px" pt="0px" pb="16px">
            <Button
              size="sm"
              variant="outline"
              colorScheme="gray"
              onClick={onFeedbackClose}
              borderColor="customGray.300"
              color="customGray.800"
              _hover={{ bg: "customGray.100", borderColor: "customGray.500" }}
              borderRadius="base"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              bg="customGray.800"
              color="white"
              onClick={handleFeedbackSubmit}
              isLoading={isFeedbackSubmitting}
              _hover={{ bg: "customGray.700" }}
              borderRadius="base"
            >
              Submit
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Flex>
  );
}
