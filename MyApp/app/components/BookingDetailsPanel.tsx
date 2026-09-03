"use client";

import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Icon,
  IconButton,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Avatar,
  AvatarGroup,
  Tooltip,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
  Portal,
  Collapse,
  Image,
  Textarea,
  useToast,
} from "@chakra-ui/react";
import { useState } from "react";
import { CloseIcon, ExternalLinkIcon, ChevronDownIcon, AttachmentIcon, ArrowUpIcon, CopyIcon } from "@chakra-ui/icons";
import { formatTime } from "@/lib/bookingTime";
import {
  MAX_COMMENT_ATTACHMENTS,
  CommentThread,
  useBookingComments,
  type BookingCommentRow,
} from "@/app/components/BookingComments";

const BOOKING_AVATAR_COLORS = ["#EA8C55", "#7C3AED", "#10B981", "#F59E0B", "#EF4444", "#06B6D4", "#8B5CF6", "#EC4899"];

export type PanelBooking = {
  id: number;
  guest_name: string;
  guest_email: string;
  guest_phone: string | null;
  guest_notes: string | null;
  booking_date: string;
  booking_time: string;
  created_at: string;
  extra_fields: Record<string, unknown> | null;
  source: string;
  meeting_url: string | null;
};

export function BookingDetailsPanel({
  booking,
  isOpen,
  onClose,
  eventTitle,
  ownerName,
  userAvatar,
  meetingLinkUrl,
  currentUserId,
}: {
  booking: PanelBooking | null;
  isOpen: boolean;
  onClose: () => void;
  eventTitle: string;
  ownerName: string;
  userAvatar: string | null;
  meetingLinkUrl?: string;
  currentUserId: string | null;
}) {
  const toast = useToast({ position: "top" });
  const [isNotesExpanded, setIsNotesExpanded] = useState(true);
  const {
    comments: bookingComments,
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
  } = useBookingComments(isOpen ? booking?.id ?? null : null, currentUserId);

  // Rendered unconditionally (even before any booking has ever been
  // selected) so the container is already mounted in its closed position —
  // the very first click otherwise mounts it pre-opened, and a property
  // that's already at its final value on mount never animates.
  return (
    <Box
      position="absolute"
      top="0"
      right="0"
      w="420px"
      h="100%"
      bg="white"
      borderLeft="1px solid"
      borderColor="customGray.200"
      boxShadow="-4px 0 16px rgba(0,0,0,0.08)"
      overflow="hidden"
      display="flex"
      flexDirection="column"
      zIndex={10}
      transform={isOpen ? "translateX(0)" : "translateX(420px)"}
      transition="transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
    >
      {booking && (() => {
        const [bookingYear, bookingMonth, bookingDay] = booking.booking_date.split("-").map(Number);
        const dateLabel = new Date(bookingYear, bookingMonth - 1, bookingDay).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
        const [bookingHour, bookingMinute] = booking.booking_time.split(":").map(Number);
        const timeLabel = formatTime(bookingHour, bookingMinute, false);
        const isWebhook = booking.source === "webhook";
        const createdAtLabel = new Date(booking.created_at).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
        const panelInitial = (booking.guest_name || "?").charAt(0).toUpperCase();
        const panelAvatarColor = BOOKING_AVATAR_COLORS[booking.id % BOOKING_AVATAR_COLORS.length];
        const joinMeetingUrl = booking.meeting_url || meetingLinkUrl || "";
        const storedAttendees = booking.extra_fields?.attendees;
        const attendees = Array.isArray(storedAttendees)
          ? (storedAttendees as unknown[])
              .filter((attendee): attendee is Record<string, unknown> => Boolean(attendee) && typeof attendee === "object")
              .map((attendee) => ({
                name: typeof attendee.name === "string" ? attendee.name : "",
                email: typeof attendee.email === "string" ? attendee.email : "",
              }))
              .filter((attendee) => attendee.name || attendee.email)
          : [];

        if (attendees.length === 0) {
          attendees.push({ name: booking.guest_name || "", email: booking.guest_email || "" });
        }

        return (
      <Tabs variant="unstyled" display="flex" flexDirection="column" h="100%" overflow="hidden">
        <HStack flexShrink={0} justify="space-between" borderBottom="1px solid" borderColor="customGray.200" px="16px">
          <TabList>
            <Tab fontSize="sm" fontWeight="500" color="customGray.500" py="16px" mr="8px" _selected={{ color: "customGray.800", borderBottom: "2px solid", borderColor: "customGray.800" }}>Details</Tab>
            <Tab fontSize="sm" fontWeight="500" color="customGray.500" py="16px" _selected={{ color: "customGray.800", borderBottom: "2px solid", borderColor: "customGray.800" }}>Notes</Tab>
          </TabList>
          <IconButton
            aria-label="Close details"
            icon={<CloseIcon w="10px" h="10px" />}
            size="sm"
            variant="ghost"
            color="customGray.500"
            _hover={{ bg: "customGray.100" }}
            onClick={onClose}
          />
        </HStack>
        <TabPanels flex="1" overflowY="auto">
          <TabPanel p="24px">
            <VStack align="stretch" spacing="0px">
              <HStack justify="space-between" align="center">
                <HStack spacing="10px" flex="1" minW="0">
                  <Box w="32px" h="32px" bg={panelAvatarColor} borderRadius="full" display="flex" alignItems="center" justifyContent="center" flexShrink={0}>
                    <Text fontSize="sm" fontWeight="medium" color="white">{panelInitial}</Text>
                  </Box>
                  <Tooltip label={eventTitle || "Untitled event"} placement="top" hasArrow bg="customGray.800" color="white">
                    <Text fontSize="lg" fontWeight="600" color="customGray.800" isTruncated minW="0">{eventTitle || "Untitled event"}</Text>
                  </Tooltip>
                </HStack>
                <Button
                  aria-label="Join meeting"
                  leftIcon={<ExternalLinkIcon w="14px" h="14px" />}
                  size="sm"
                  variant="ghost"
                  color="brand.primary"
                  bg="transparent"
                  pr="0"
                  isDisabled={!joinMeetingUrl}
                  _hover={{ bg: "transparent", color: "brand.primaryHover", textDecoration: "underline" }}
                  _active={{ bg: "transparent", color: "brand.primaryHover" }}
                  onClick={() => window.open(joinMeetingUrl, "_blank")}
                >
                  Join meeting
                </Button>
              </HStack>
              <Text mt="24px" fontSize="sm" fontWeight="600" color="customGray.800">
                Attendee details
              </Text>
              <VStack align="stretch" spacing="0px" mt="8px">
                {attendees.length > 1 ? (
                  <HStack justify="space-between" py="10px" borderBottom="1px solid" borderColor="customGray.100">
                    <Text fontSize="sm" color="customGray.500">Attendees</Text>
                    <Popover trigger="hover" placement="bottom-end" openDelay={200} gutter={8} isLazy>
                      <PopoverTrigger>
                        <Box cursor="pointer">
                          <HStack spacing="8px">
                            <AvatarGroup size="xs" max={2} spacing="-8px" sx={{ "--avatar-font-size": "12px" }}>
                              <Avatar
                                key="first-attendee"
                                name={attendees[0]?.name || "Guest 0"}
                                getInitials={(name) => name.charAt(0).toUpperCase()}
                                borderWidth="1px"
                                bg={BOOKING_AVATAR_COLORS[booking.id % BOOKING_AVATAR_COLORS.length]}
                                color="white"
                                fontWeight="medium"
                                sx={{ "--avatar-font-size": "12px" }}
                              />
                              <Avatar
                                key="attendee-count"
                                name={String(attendees.length)}
                                getInitials={(name) => name}
                                borderWidth="1px"
                                bg="customGray.200"
                                color="customGray.700"
                                fontWeight="medium"
                                sx={{ "--avatar-font-size": "12px" }}
                              />
                            </AvatarGroup>
                            <Text fontSize="sm" color="customGray.800" textUnderlineOffset="3px" _hover={{ textDecoration: "underline" }}>
                              {attendees.length} attendees
                            </Text>
                          </HStack>
                        </Box>
                      </PopoverTrigger>
                      <Portal>
                        <PopoverContent
                          w="260px"
                          borderRadius="12px"
                          overflow="hidden"
                          border="1px solid"
                          borderColor="customGray.200"
                          boxShadow="0 8px 24px rgba(0,0,0,0.12)"
                          _focus={{ boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}
                        >
                          <PopoverBody p="0px">
                            <Text w="100%" bg="white" fontSize="10px" fontWeight="600" color="customGray.400" textTransform="uppercase" letterSpacing="0.04em" pl="16px" pr="0" pt="12px" pb="10px" borderBottom="1px solid" borderColor="customGray.100">
                              Participants
                            </Text>
                            <Box
                              maxH="240px"
                              overflowY="auto"
                              overscrollBehavior="contain"
                              pb="8px"
                            >
                            {attendees.map((attendee, index) => {
                              const displayName = attendee.name || `Guest ${index}`;
                              return (
                                <Box
                                  key={`${attendee.email}-${index}`}
                                  pl="12px"
                                  pr="0"
                                  py="10px"
                                  _hover={{ bg: "customGray.100" }}
                                >
                                  <HStack role="group" spacing="8px" w="100%" position="relative">
                                    <Box
                                      w="28px"
                                      h="28px"
                                      bg={BOOKING_AVATAR_COLORS[(booking.id + index) % BOOKING_AVATAR_COLORS.length]}
                                      borderRadius="full"
                                      display="flex"
                                      alignItems="center"
                                      justifyContent="center"
                                      flexShrink={0}
                                    >
                                      <Text fontSize="xs" fontWeight="medium" color="white">
                                        {displayName.charAt(0).toUpperCase()}
                                      </Text>
                                    </Box>
                                    <VStack align="start" spacing="0px" minW="0" flex="1">
                                      <Text fontSize="sm" fontWeight="medium" color="customGray.800" isTruncated maxW="100%">{displayName}</Text>
                                      <Text fontSize="xs" color="customGray.500" isTruncated maxW="100%">{attendee.email || "No email provided"}</Text>
                                    </VStack>
                                    {attendee.email && (
                                      <Tooltip label="Copy" hasArrow placement="top">
                                        <IconButton
                                          aria-label="Copy email"
                                          icon={<CopyIcon w="12px" h="12px" />}
                                          size="sm"
                                          variant="ghost"
                                          position="absolute"
                                          right="8px"
                                          top="50%"
                                          transform="translateY(-50%)"
                                          bg="transparent"
                                          _hover={{ bg: "transparent" }}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            navigator.clipboard.writeText(attendee.email);
                                            toast({ title: "Email copied", status: "success", duration: 2000 });
                                          }}
                                        />
                                      </Tooltip>
                                    )}
                                  </HStack>
                                </Box>
                              );
                            })}
                            </Box>
                          </PopoverBody>
                        </PopoverContent>
                      </Portal>
                    </Popover>
                  </HStack>
                ) : (
                  <>
                    <HStack justify="space-between" py="10px" borderBottom="1px solid" borderColor="customGray.100">
                      <Text fontSize="sm" color="customGray.500">Attendee</Text>
                      <Popover trigger="hover" placement="bottom-end" openDelay={200} gutter={8} isLazy>
                        <PopoverTrigger>
                          <HStack spacing="6px" cursor="pointer">
                            <Box
                              w="20px"
                              h="20px"
                              bg={BOOKING_AVATAR_COLORS[booking.id % BOOKING_AVATAR_COLORS.length]}
                              borderRadius="full"
                              display="flex"
                              alignItems="center"
                              justifyContent="center"
                              flexShrink={0}
                            >
                              <Text fontSize="10px" fontWeight="medium" color="white">
                                {(attendees[0].name || "?").charAt(0).toUpperCase()}
                              </Text>
                            </Box>
                            <Text fontSize="sm" color="customGray.800" textUnderlineOffset="3px" _hover={{ textDecoration: "underline" }}>{attendees[0].name || "—"}</Text>
                          </HStack>
                        </PopoverTrigger>
                        <Portal>
                          <PopoverContent w="300px" borderRadius="16px" border="1px solid" borderColor="customGray.200" boxShadow="0 8px 24px rgba(0,0,0,0.12)" _focus={{ boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}>
                            <PopoverBody p="0px">
                              <HStack spacing="12px" align="center" p="12px">
                                <Box w="40px" h="40px" bg={BOOKING_AVATAR_COLORS[booking.id % BOOKING_AVATAR_COLORS.length]} borderRadius="full" display="flex" alignItems="center" justifyContent="center" flexShrink={0}>
                                  <Text fontSize="sm" fontWeight="medium" color="white">{(attendees[0].name || "?").charAt(0).toUpperCase()}</Text>
                                </Box>
                                <VStack align="start" spacing="0px" flex="1" minW="0">
                                  <Text fontSize="sm" fontWeight="600" color="customGray.800" isTruncated maxW="100%">{attendees[0].name || "No name provided"}</Text>
                                  <Text fontSize="xs" color="customGray.500" isTruncated maxW="100%">{attendees[0].email || "No email provided"}</Text>
                                </VStack>
                              </HStack>
                              <HStack spacing="8px" p="12px" borderTop="1px solid" borderColor="customGray.200">
                                <Button
                                  w="fit-content"
                                  size="sm"
                                  variant="outline"
                                  borderColor="customGray.200"
                                  bg="customGray.50"
                                  fontWeight="400"
                                  leftIcon={<CopyIcon w="12px" h="12px" />}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigator.clipboard.writeText(attendees[0].email || "");
                                    toast({ title: "Email copied", status: "success", duration: 2000 });
                                  }}
                                >
                                  Copy
                                </Button>
                              </HStack>
                            </PopoverBody>
                          </PopoverContent>
                        </Portal>
                      </Popover>
                    </HStack>
                  </>
                )}
                <HStack justify="space-between" py="10px" borderBottom="1px solid" borderColor="customGray.100">
                  <Text fontSize="sm" color="customGray.500">Phone</Text>
                  <Text fontSize="sm" color="customGray.800">{booking.guest_phone || "—"}</Text>
                </HStack>
                <HStack justify="space-between" py="10px" borderBottom="1px solid" borderColor="customGray.100">
                  <Text fontSize="sm" color="customGray.500">Meeting</Text>
                  <Text fontSize="sm" color="customGray.800">{dateLabel} · {timeLabel}</Text>
                </HStack>
                <HStack justify="space-between" py="10px" borderBottom="1px solid" borderColor="customGray.100">
                  <Text fontSize="sm" color="customGray.500">Owner</Text>
                  <Text fontSize="sm" color="customGray.800">{ownerName || "—"}</Text>
                </HStack>
                <HStack justify="space-between" py="10px" borderBottom="1px solid" borderColor="customGray.100">
                  <Text fontSize="sm" color="customGray.500">Status</Text>
                  <Box px="8px" py="2px" bg="green.50" borderRadius="full">
                    <Text fontSize="xs" fontWeight="medium" color="green.700">Confirmed</Text>
                  </Box>
                </HStack>
                <HStack justify="space-between" py="10px" borderBottom="1px solid" borderColor="customGray.100">
                  <Text fontSize="sm" color="customGray.500">Source</Text>
                  <Box px="8px" py="2px" bg={isWebhook ? "purple.100" : "customGray.100"} borderRadius="full">
                    <Text fontSize="xs" fontWeight="medium" color={isWebhook ? "purple.700" : "customGray.600"}>{isWebhook ? "Webhook" : "Direct"}</Text>
                  </Box>
                </HStack>
                <HStack justify="space-between" py="10px">
                  <Text fontSize="sm" color="customGray.500">Created at</Text>
                  <Text fontSize="sm" color="customGray.800">{createdAtLabel}</Text>
                </HStack>
              </VStack>
              <VStack
                align="stretch"
                spacing="4px"
                mt="8px"
                pt="14px"
                pb="16px"
                borderTop="1px solid"
                borderBottom="1px solid"
                borderColor="customGray.100"
                borderRadius="md"
                cursor="pointer"
                role="button"
                tabIndex={0}
                onClick={() => setIsNotesExpanded((prev) => !prev)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setIsNotesExpanded((prev) => !prev);
                  }
                }}
              >
                <HStack justify="space-between">
                  <Text fontSize="sm" fontWeight="600" color="customGray.800">Notes</Text>
                  <IconButton
                    aria-label={isNotesExpanded ? "Collapse notes" : "Expand notes"}
                    icon={
                      <Icon
                        as={ChevronDownIcon}
                        boxSize="16px"
                        transform={isNotesExpanded ? "rotate(180deg)" : "rotate(0deg)"}
                        transition="transform 0.3s ease-in-out"
                      />
                    }
                    size="sm"
                    variant="ghost"
                    color="customGray.700"
                    _hover={{ bg: "customGray.100" }}
                    onClick={(event) => {
                      event.stopPropagation();
                      setIsNotesExpanded((prev) => !prev);
                    }}
                  />
                </HStack>
                <Collapse
                  in={isNotesExpanded}
                  animateOpacity
                  transition={{
                    enter: { duration: 0.3, ease: "easeInOut" },
                    exit: { duration: 0.25, ease: "easeInOut" },
                  }}
                >
                  <Text fontSize="sm" color={booking.guest_notes ? "customGray.600" : "customGray.400"}>
                    {booking.guest_notes || "No notes added"}
                  </Text>
                </Collapse>
              </VStack>
              {booking.extra_fields && Object.keys(booking.extra_fields).some((key) => key !== "attendees") && (
                <VStack align="stretch" spacing="6px" mt="24px">
                  <Text fontSize="sm" fontWeight="600" color="customGray.800">Additional details</Text>
                  {Object.entries(booking.extra_fields).filter(([key]) => key !== "attendees").map(([key, value]) => (
                    <HStack key={key} justify="space-between">
                      <Text fontSize="sm" color="customGray.500">{key}</Text>
                      <Text fontSize="sm" color="customGray.800">{String(value)}</Text>
                    </HStack>
                  ))}
                </VStack>
              )}
            </VStack>
          </TabPanel>
          <TabPanel h="100%" p="0" bg="customGray.50" display="flex" flexDirection="column" justifyContent="flex-end">
            {bookingComments.length > 0 && (
              <Box flex="1" minH="0" display="flex">
                <VStack
                  align="stretch"
                  spacing="12px"
                  flex="1"
                  minH="0"
                  overflowY="auto"
                  pt="12px"
                  pb="12px"
                  sx={{
                    scrollbarWidth: 'thin',
                    scrollbarColor: 'var(--chakra-colors-customGray-300) transparent',
                    '&::-webkit-scrollbar': { width: '6px' },
                    '&::-webkit-scrollbar-track': { bg: 'transparent' },
                    '&::-webkit-scrollbar-thumb': { bg: 'customGray.300', borderRadius: '3px' },
                  }}
                >
                  {(() => {
                    const topLevel = bookingComments.filter((c) => !c.parent_id);
                    const repliesByParent = new Map<number, BookingCommentRow[]>();
                    bookingComments.forEach((c) => {
                      if (c.parent_id != null) {
                        const list = repliesByParent.get(c.parent_id) || [];
                        list.push(c);
                        repliesByParent.set(c.parent_id, list);
                      }
                    });
                    repliesByParent.forEach((list) =>
                      list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                    );
                    return topLevel.map((comment) => (
                      <CommentThread
                        key={comment.id}
                        comment={comment}
                        replies={repliesByParent.get(comment.id) || []}
                        ownerName={ownerName}
                        userAvatar={userAvatar}
                        currentUserId={currentUserId}
                        onToggleReaction={toggleReaction}
                        onSendReply={handleSendReply}
                        onDeleteComment={handleDeleteComment}
                        onEditComment={handleEditComment}
                      />
                    ));
                  })()}
                </VStack>
              </Box>
            )}
            <Box p="12px">
            <Box bg="white" border="1px solid" borderColor="customGray.200" borderRadius="12px" p="0" _hover={{ borderColor: "customGray.500" }} _focusWithin={{ borderColor: "customGray.500", boxShadow: "0 0 0 4px rgba(161, 161, 170, 0.35)" }}>
              {pastedImages.length > 0 && (
                <HStack
                  align="center"
                  spacing="8px"
                  py="10px"
                  pl="12px"
                  pr="12px"
                  borderBottom="1px solid"
                  borderColor="customGray.200"
                  overflowX="auto"
                  sx={{ "&::-webkit-scrollbar": { display: "none" } }}
                >
                  {pastedImages.map((img, index) => (
                    <HStack
                      key={img.previewUrl}
                      spacing="6px"
                      bg="customGray.50"
                      border="1px solid"
                      borderColor="customGray.200"
                      borderRadius="8px"
                      pl="6px"
                      pr="4px"
                      py="4px"
                      flexShrink={0}
                    >
                      <Image src={img.previewUrl} boxSize="28px" objectFit="cover" borderRadius="4px" flexShrink={0} />
                      <VStack align="start" spacing="0px" minW="0">
                        <Text fontSize="xs" fontWeight="600" color="customGray.800" noOfLines={1} maxW="100px">{img.file.name}</Text>
                        <Text fontSize="10px" color="customGray.400">{img.width}×{img.height}</Text>
                      </VStack>
                      <IconButton
                        aria-label="Remove attachment"
                        icon={<CloseIcon w="7px" h="7px" />}
                        size="xs"
                        variant="ghost"
                        color="customGray.500"
                        _hover={{ bg: "customGray.100" }}
                        onClick={() => setPastedImages((prev) => prev.filter((_, i) => i !== index))}
                      />
                    </HStack>
                  ))}
                </HStack>
              )}
              <Box
                maxH="132px"
                overflowY="auto"
                pl="12px"
                pr="12px"
                sx={{
                  scrollbarWidth: 'thin',
                  scrollbarColor: 'var(--chakra-colors-customGray-300) transparent',
                  '&::-webkit-scrollbar': { width: '6px' },
                  '&::-webkit-scrollbar-track': { bg: 'transparent' },
                  '&::-webkit-scrollbar-thumb': { bg: 'customGray.300', borderRadius: '3px' },
                  '&::-webkit-scrollbar-thumb:hover': { bg: 'customGray.400' },
                }}
              >
                <Textarea
                  ref={commentTextareaRef}
                  variant="unstyled"
                  border="none"
                  borderRadius="0"
                  _focus={{ boxShadow: "none" }}
                  _focusVisible={{ boxShadow: "none" }}
                  placeholder="Leave a comment..."
                  fontSize="sm"
                  lineHeight="20px"
                  color="customGray.800"
                  _placeholder={{ color: "customGray.400" }}
                  pt="12px"
                  pb="0"
                  mb="12px"
                  rows={1}
                  resize="none"
                  minH="20px"
                  value={commentDraft}
                  onChange={(e) => {
                    setCommentDraft(e.target.value);
                    const el = e.target;
                    el.style.height = "auto";
                    el.style.height = `${el.scrollHeight}px`;
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendComment();
                    }
                  }}
                  onPaste={(e) => {
                    const items = Array.from(e.clipboardData.items).filter((i) => i.type.startsWith("image/"));
                    if (items.length === 0) return;
                    e.preventDefault();
                    const room = MAX_COMMENT_ATTACHMENTS - pastedImages.length;
                    if (room <= 0) {
                      toast({ title: `You can attach up to ${MAX_COMMENT_ATTACHMENTS} images`, status: "warning" });
                      return;
                    }
                    const accepted = items.slice(0, room);
                    if (items.length > accepted.length) {
                      toast({ title: `You can attach up to ${MAX_COMMENT_ATTACHMENTS} images`, status: "warning" });
                    }
                    accepted.forEach((item) => {
                      const file = item.getAsFile();
                      if (!file) return;
                      const previewUrl = URL.createObjectURL(file);
                      const img = new window.Image();
                      img.onload = () => {
                        setPastedImages((prev) =>
                          prev.length >= MAX_COMMENT_ATTACHMENTS
                            ? prev
                            : [...prev, { file, previewUrl, width: img.naturalWidth, height: img.naturalHeight }]
                        );
                      };
                      img.src = previewUrl;
                    });
                  }}
                />
              </Box>
              <HStack justify="flex-end" spacing="10px" pr="12px" pt="12px" pb="12px">
                <IconButton
                  aria-label="Attach file"
                  icon={<AttachmentIcon w="14px" h="14px" />}
                  size="sm"
                  variant="ghost"
                  color="customGray.500"
                  _hover={{ bg: "customGray.100" }}
                />
                <IconButton
                  aria-label="Send comment"
                  icon={<ArrowUpIcon w="14px" h="14px" />}
                  size="sm"
                  variant="ghost"
                  isDisabled={(!commentDraft.trim() && pastedImages.length === 0) || isSendingComment}
                  isLoading={isSendingComment}
                  onClick={handleSendComment}
                  {...(commentDraft.trim() || pastedImages.length > 0
                    ? { bg: "brand.primary", color: "white", _hover: { bg: "brand.primaryHover" } }
                    : { color: "customGray.800", _hover: { bg: "customGray.100" } })}
                />
              </HStack>
            </Box>
            </Box>
          </TabPanel>
        </TabPanels>
      </Tabs>
        );
      })()}
    </Box>
  );
}
