"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Icon,
  IconButton,
  Input,
  Textarea,
  Image,
  Avatar,
  AvatarGroup,
  useToast,
  Link,
} from "@chakra-ui/react";
import { ArrowUpIcon } from "@chakra-ui/icons";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import { supabase } from "@/lib/supabase";

export const MAX_COMMENT_ATTACHMENTS = 4;

export type BookingCommentRow = {
  id: number;
  user_id: string;
  body: string | null;
  created_at: string;
  edited_at: string | null;
  attachments: Array<{ url: string; name: string; width: number; height: number }>;
  parent_id: number | null;
  reactions: Array<{ emoji: string; user_id: string }>;
};

// "29 mins" for recent activity, falling back to a plain date once a note is
// old enough that a relative label stops being useful.
function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const diffMin = Math.round((Date.now() - date.getTime()) / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin} min${diffMin === 1 ? "" : "s"}`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hr${diffHr === 1 ? "" : "s"}`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 7) return `${diffDay} day${diffDay === 1 ? "" : "s"}`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Splits comment body text on bare URLs, turning each into a clickable link
// that opens in a new tab while leaving the surrounding text untouched.
function renderTextWithLinks(text: string) {
  const urlPattern = /(https?:\/\/[^\s]+)/g;
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = urlPattern.exec(text)) !== null) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    nodes.push(
      <Link key={key++} href={match[0]} isExternal color="blue.500" textDecoration="underline">
        {match[0]}
      </Link>
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

// Manages a single booking's comment thread: fetching, posting, replying,
// editing, deleting, and reacting. Parameterized by bookingId so it works
// for any booking, regardless of which page renders the thread.
export function useBookingComments(bookingId: number | null, currentUserId: string | null) {
  const toast = useToast({ position: "top" });
  const [comments, setComments] = useState<BookingCommentRow[]>([]);
  const [commentDraft, setCommentDraft] = useState("");
  const [pastedImages, setPastedImages] = useState<Array<{ file: File; previewUrl: string; width: number; height: number }>>([]);
  const [isSendingComment, setIsSendingComment] = useState(false);
  const commentTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!bookingId) {
      setComments([]);
      setCommentDraft("");
      setPastedImages([]);
      return;
    }
    supabase
      .from("booking_comments")
      .select("id, user_id, body, created_at, edited_at, attachments, parent_id, reactions:booking_comment_reactions(emoji, user_id)")
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: true })
      .then(({ data }) => setComments((data as BookingCommentRow[] | null) || []));
  }, [bookingId]);

  const handleSendComment = async () => {
    const body = commentDraft.trim();
    if ((!body && pastedImages.length === 0) || !bookingId || isSendingComment) return;
    setIsSendingComment(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      setIsSendingComment(false);
      return;
    }

    const attachments: Array<{ url: string; name: string; width: number; height: number }> = [];
    for (const img of pastedImages) {
      const path = `${bookingId}/${Date.now()}_${img.file.name}`;
      const { error: uploadError } = await supabase.storage.from("comment-attachments").upload(path, img.file);
      if (uploadError) {
        setIsSendingComment(false);
        toast({ title: "Couldn't upload image", status: "error" });
        return;
      }
      const { data: publicUrlData } = supabase.storage.from("comment-attachments").getPublicUrl(path);
      attachments.push({ url: publicUrlData.publicUrl, name: img.file.name, width: img.width, height: img.height });
    }

    const { data, error } = await supabase
      .from("booking_comments")
      .insert({
        booking_id: bookingId,
        user_id: session.user.id,
        body: body || null,
        attachments,
      })
      .select("id, user_id, body, created_at, edited_at, attachments, parent_id")
      .single();
    setIsSendingComment(false);
    if (error || !data) {
      toast({ title: "Couldn't post comment", status: "error" });
      return;
    }
    setComments((prev) => [...prev, { ...data, reactions: [] }]);
    setCommentDraft("");
    setPastedImages([]);
    if (commentTextareaRef.current) commentTextareaRef.current.style.height = "auto";
  };

  const handleSendReply = async (parentId: number, body: string): Promise<boolean> => {
    if (!bookingId) return false;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return false;

    const { data, error } = await supabase
      .from("booking_comments")
      .insert({
        booking_id: bookingId,
        user_id: session.user.id,
        parent_id: parentId,
        body,
        attachments: [],
      })
      .select("id, user_id, body, created_at, edited_at, attachments, parent_id")
      .single();
    if (error || !data) {
      toast({ title: "Couldn't post reply", status: "error" });
      return false;
    }
    setComments((prev) => [...prev, { ...data, reactions: [] }]);
    return true;
  };

  const handleDeleteComment = async (commentId: number) => {
    const { error } = await supabase.from("booking_comments").delete().eq("id", commentId);
    if (error) {
      toast({ title: "Couldn't delete comment", description: error.message, status: "error" });
      return;
    }
    setComments((prev) => prev.filter((c) => c.id !== commentId && c.parent_id !== commentId));
  };

  const handleEditComment = async (commentId: number, newBody: string): Promise<boolean> => {
    const editedAt = new Date().toISOString();
    const { error } = await supabase
      .from("booking_comments")
      .update({ body: newBody, edited_at: editedAt })
      .eq("id", commentId);
    if (error) {
      toast({ title: "Couldn't update comment", description: error.message, status: "error" });
      return false;
    }
    setComments((prev) =>
      prev.map((c) => (c.id === commentId ? { ...c, body: newBody, edited_at: editedAt } : c))
    );
    return true;
  };

  const toggleReaction = async (commentId: number, emoji: string) => {
    if (!currentUserId) return;
    const target = comments.find((c) => c.id === commentId);
    const hasReacted = target?.reactions.some((r) => r.emoji === emoji && r.user_id === currentUserId) ?? false;

    setComments((prev) =>
      prev.map((c) =>
        c.id === commentId
          ? {
              ...c,
              reactions: hasReacted
                ? c.reactions.filter((r) => !(r.emoji === emoji && r.user_id === currentUserId))
                : [...c.reactions, { emoji, user_id: currentUserId }],
            }
          : c
      )
    );

    if (hasReacted) {
      await supabase
        .from("booking_comment_reactions")
        .delete()
        .eq("comment_id", commentId)
        .eq("user_id", currentUserId)
        .eq("emoji", emoji);
    } else {
      const { error } = await supabase
        .from("booking_comment_reactions")
        .insert({ comment_id: commentId, user_id: currentUserId, emoji });
      if (error) {
        // Roll back the optimistic add if the insert didn't actually stick.
        setComments((prev) =>
          prev.map((c) =>
            c.id === commentId
              ? { ...c, reactions: c.reactions.filter((r) => !(r.emoji === emoji && r.user_id === currentUserId)) }
              : c
          )
        );
      }
    }
  };

  return {
    comments,
    commentDraft,
    setCommentDraft,
    pastedImages,
    setPastedImages,
    isSendingComment,
    commentTextareaRef,
    handleSendComment,
    handleSendReply,
    handleDeleteComment,
    handleEditComment,
    toggleReaction,
  };
}

// One comment or reply — avatar, name, relative time, body/attachments, and
// the like / add-reaction / reply action row. Used for both top-level notes
// and the replies nested under them in CommentThread.
export function CommentRow({
  comment,
  ownerName,
  userAvatar,
  currentUserId,
  onToggleReaction,
  onReplyClick,
  onDelete,
  onEdit,
  footer,
}: {
  comment: BookingCommentRow;
  ownerName: string;
  userAvatar: string | null;
  currentUserId: string | null;
  onToggleReaction: (commentId: number, emoji: string) => void;
  onReplyClick?: () => void;
  onDelete: (commentId: number) => void;
  onEdit: (commentId: number, newBody: string) => Promise<boolean>;
  footer?: ReactNode;
}) {
  const reactionGroups = new Map<string, string[]>();
  comment.reactions.forEach((r) => {
    const list = reactionGroups.get(r.emoji) || [];
    list.push(r.user_id);
    reactionGroups.set(r.emoji, list);
  });
  const reactionEntries = Array.from(reactionGroups.entries());

  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.body || "");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const startEditing = () => {
    setEditText(comment.body || "");
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditText(comment.body || "");
  };

  const saveEdit = async () => {
    const trimmed = editText.trim();
    if (!trimmed || isSavingEdit) return;
    setIsSavingEdit(true);
    const ok = await onEdit(comment.id, trimmed);
    setIsSavingEdit(false);
    if (ok) setIsEditing(false);
  };

  return (
    <HStack
      align="flex-start"
      spacing="10px"
      role="group"
      position="relative"
      px="12px"
      py="12px"
      _hover={{ bg: "customDark.5" }}
    >
      <Avatar name={ownerName} src={userAvatar || undefined} size="sm" bg="customGray.300" color="customGray.800" flexShrink={0} />
      <Box flex="1" minW="0">
        <HStack spacing="6px">
          <Text fontSize="sm" fontWeight="600" color="customGray.800">{ownerName}</Text>
          <Text fontSize="xs" color="customGray.400">
            {formatRelativeTime(comment.edited_at || comment.created_at)}
            {comment.edited_at ? " (edited)" : ""}
          </Text>
        </HStack>
        {isEditing ? (
          <Box
            mt="4px"
            border="1px solid"
            borderColor="customGray.200"
            borderRadius="8px"
            bg="white"
            p="8px"
            _hover={{ borderColor: "customGray.500" }}
            _focusWithin={{ borderColor: "customGray.500", boxShadow: "0 0 0 4px rgba(161, 161, 170, 0.35)" }}
          >
            <Textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              variant="unstyled"
              fontSize="sm"
              borderRadius="0"
              p="0"
              minH="auto"
              rows={4}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  saveEdit();
                } else if (e.key === "Escape") {
                  cancelEditing();
                }
              }}
            />
            <HStack spacing="6px" justify="flex-end" mt="6px">
              <Button size="sm" variant="ghost" onClick={cancelEditing}>Cancel</Button>
              <Button
                size="sm"
                bg="brand.primary"
                color="white"
                _hover={{ bg: "brand.primaryHover" }}
                isDisabled={!editText.trim() || isSavingEdit}
                isLoading={isSavingEdit}
                onClick={saveEdit}
              >
                Save
              </Button>
            </HStack>
          </Box>
        ) : (
          comment.body && (
            <Text fontSize="sm" color="customGray.800" whiteSpace="pre-wrap" mt="4px">{renderTextWithLinks(comment.body)}</Text>
          )
        )}
        {comment.attachments && comment.attachments.length > 0 && (
          <HStack spacing="6px" flexWrap="wrap" mt="12px">
            {comment.attachments.map((att, index) => (
              <Image
                key={`${comment.id}-${index}`}
                src={att.url}
                alt={att.name}
                maxW="120px"
                maxH="120px"
                objectFit="cover"
                borderRadius="8px"
                border="1px solid"
                borderColor="customGray.200"
              />
            ))}
          </HStack>
        )}
        {reactionEntries.length > 0 && (
          <HStack spacing="4px" mt="12px" flexWrap="wrap">
            {reactionEntries.map(([emoji, userIds]) => {
              const reactedByMe = userIds.includes(currentUserId || "");
              return (
                <Button
                  key={emoji}
                  size="sm"
                  variant="ghost"
                  h="28px"
                  px="10px"
                  py="2px"
                  borderRadius="full"
                  border="1px solid"
                  borderColor={reactedByMe ? "#24789b" : "#24789b"}
                  bg={reactedByMe ? "#87ceeb26" : "#0c4257"}
                  _hover={{ bg: "customGray.100" }}
                  onClick={() => onToggleReaction(comment.id, emoji)}
                >
                  <HStack spacing="4px">
                    <Text fontSize="16px">{emoji}</Text>
                    <Text fontSize="12px" color="#24789b">{userIds.length}</Text>
                  </HStack>
                </Button>
              );
            })}
          </HStack>
        )}
        {footer}
      </Box>
      {/* Hover toolbar — hidden until the comment row is hovered, matching a
          Slack-style floating action bar instead of a permanently visible row. */}
      <HStack
        spacing="0px"
        position="absolute"
        top="-14px"
        right="18px"
        bg="white"
        border="1px solid"
        borderColor="customGray.200"
        borderRadius="12px"
        boxShadow="0 1px 4px rgba(0,0,0,0.08)"
        p="2px"
        opacity="0"
        pointerEvents="none"
        _groupHover={{ opacity: 1, pointerEvents: "auto" }}
        transition="opacity 0.12s ease"
      >
        {comment.user_id === currentUserId && (
          <IconButton
            aria-label="Edit"
            icon={<Icon as={FiEdit2} w="16px" h="16px" />}
            size="sm"
            variant="ghost"
            color="customGray.700"
            _hover={{ bg: "customGray.100" }}
            onClick={startEditing}
          />
        )}
        {comment.user_id === currentUserId && (
          <IconButton
            aria-label="Delete"
            icon={<Icon as={FiTrash2} w="16px" h="16px" />}
            size="sm"
            variant="ghost"
            color="customGray.700"
            _hover={{ bg: "red.50", color: "red.500" }}
            onClick={() => onDelete(comment.id)}
          />
        )}
      </HStack>
    </HStack>
  );
}

// A top-level note plus its (optionally collapsed) replies and the inline
// reply composer. Replies are a single level deep — matches the comment
// schema, which only stores one parent_id per row.
export function CommentThread({
  comment,
  replies,
  ownerName,
  userAvatar,
  currentUserId,
  onToggleReaction,
  onSendReply,
  onDeleteComment,
  onEditComment,
}: {
  comment: BookingCommentRow;
  replies: BookingCommentRow[];
  ownerName: string;
  userAvatar: string | null;
  currentUserId: string | null;
  onToggleReaction: (commentId: number, emoji: string) => void;
  onSendReply: (parentId: number, body: string) => Promise<boolean>;
  onDeleteComment: (commentId: number) => void;
  onEditComment: (commentId: number, newBody: string) => Promise<boolean>;
}) {
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [repliesExpanded, setRepliesExpanded] = useState(false);

  const handleReplySubmit = async () => {
    const body = replyText.trim();
    if (!body || isSendingReply) return;
    setIsSendingReply(true);
    const ok = await onSendReply(comment.id, body);
    setIsSendingReply(false);
    if (ok) {
      setReplyText("");
      setIsReplying(false);
      setRepliesExpanded(true);
    }
  };

  return (
    <Box>
      <CommentRow
        comment={comment}
        ownerName={ownerName}
        userAvatar={userAvatar}
        currentUserId={currentUserId}
        onToggleReaction={onToggleReaction}
        onReplyClick={() => setIsReplying((v) => !v)}
        onDelete={onDeleteComment}
        onEdit={onEditComment}
        footer={
          replies.length > 0 ? (
            <HStack
              spacing="6px"
              mt="12px"
              cursor="pointer"
              onClick={() => setRepliesExpanded((v) => !v)}
            >
              <AvatarGroup size="2xs" max={3} spacing="-6px">
                {replies.map((r) => (
                  <Avatar key={r.id} name={ownerName} src={userAvatar || undefined} bg="customGray.300" color="customGray.800" />
                ))}
              </AvatarGroup>
              <Text fontSize="xs" fontWeight="600" color="brand.primary">
                {replies.length} repl{replies.length === 1 ? "y" : "ies"}
              </Text>
            </HStack>
          ) : undefined
        }
      />
      {repliesExpanded && replies.length > 0 && (
        <VStack align="stretch" spacing="12px" mt="12px" ml="42px">
          {replies.map((reply) => (
            <CommentRow
              key={reply.id}
              comment={reply}
              ownerName={ownerName}
              userAvatar={userAvatar}
              currentUserId={currentUserId}
              onToggleReaction={onToggleReaction}
              onDelete={onDeleteComment}
              onEdit={onEditComment}
            />
          ))}
        </VStack>
      )}
      {isReplying && (
        <HStack mt="12px" ml="42px" spacing="6px" align="center">
          <Input
            size="sm"
            placeholder="Reply..."
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            borderRadius="8px"
            bg="white"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleReplySubmit();
              }
            }}
          />
          <IconButton
            aria-label="Send reply"
            icon={<ArrowUpIcon w="12px" h="12px" />}
            size="sm"
            isDisabled={!replyText.trim() || isSendingReply}
            isLoading={isSendingReply}
            onClick={handleReplySubmit}
            {...(replyText.trim()
              ? { bg: "brand.primary", color: "white", _hover: { bg: "brand.primaryHover" } }
              : { color: "customGray.800", _hover: { bg: "customGray.100" } })}
          />
        </HStack>
      )}
    </Box>
  );
}
