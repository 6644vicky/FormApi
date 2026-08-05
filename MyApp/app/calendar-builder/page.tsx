"use client";

import { useRouter } from "next/navigation";
import { Box, VStack, HStack, Text, Button, Heading, IconButton, Input, Textarea, useToast, Tabs, TabList, Tab, Avatar, Menu, MenuButton, MenuList, MenuItem, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton, useDisclosure, Checkbox, Badge, Divider, Alert, AlertIcon, Tag, TagLabel, TagCloseButton, Progress } from "@chakra-ui/react";
import { Spinner } from "@chakra-ui/react";
import { ArrowBackIcon, DeleteIcon, AddIcon, ChevronDownIcon, DragHandleIcon, CloseIcon, ViewIcon } from "@chakra-ui/icons";
import { useState, useEffect } from "react";
import { CalendarPicker } from "@/components/CalendarPicker";
import { AddPage } from "@/components/AddPage";
import { supabase } from "@/lib/supabase";

export default function CalendarBuilderPage() {
  const router = useRouter();
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [tabIndex, setTabIndex] = useState(0);
  const [selectedPage, setSelectedPage] = useState("Main page");

  // Inline title state
  const [formName, setFormName] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [googleProfilePicture, setGoogleProfilePicture] = useState<string | null>(null);
  const [userName, setUserName] = useState("Vicky Vignesh");

  // Sidebar form fields state
  const [ownerName, setOwnerName] = useState("Vicky Vignesh");
  const [title, setTitle] = useState("Demo call");
  const [description, setDescription] = useState("Get to know each other and discuss your needs. A perfect opportunity to connect and explore possibilities together.");
  const [descriptionError, setDescriptionError] = useState(false);
  const [meetingLink, setMeetingLink] = useState("Link");
  const [meetingLinkUrl, setMeetingLinkUrl] = useState("");
  const [durations, setDurations] = useState<string[]>(["15 min"]);
  const [availablePages, setAvailablePages] = useState<string[]>(["Main page", "Form page", "Success page"]);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [isZoomConnected, setIsZoomConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentEventId, setCurrentEventId] = useState<number | null>(null);

  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const idParam = params.get("id");

        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const avatarUrl = session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture;
          const fullName = session.user.user_metadata?.full_name || session.user.email || "User";

          if (avatarUrl) {
            setGoogleProfilePicture(avatarUrl);
            setUserAvatar(avatarUrl);
          }
          setUserName(fullName);
          setOwnerName(fullName);

          // Check if user has OAuth providers linked
          const { data: providers } = await supabase.auth.getUserIdentities();
          const hasGoogleProvider = providers?.identities?.some(
            (identity) => identity.provider === "google"
          );
          const hasZoomProvider = providers?.identities?.some(
            (identity) => identity.provider === "zoom"
          );
          setIsGoogleConnected(!!hasGoogleProvider);
          setIsZoomConnected(!!hasZoomProvider);

          // Only load event data when editing an existing event (id in URL).
          // No id = a fresh "Create event", so keep the defaults.
          if (idParam) {
            const { data: eventData, error: eventError } = await supabase
              .from("calendar_events")
              .select("*")
              .eq("id", idParam)
              .eq("user_id", session.user.id)
              .single();

            if (eventData) {
              setCurrentEventId(eventData.id);
              setFormName(eventData.title || "");
              setInputValue(eventData.title || "");
              if (eventData.event_title) setTitle(eventData.event_title);
              setDescription(eventData.description || "");
              setOwnerName(eventData.owner_name || fullName);
              setMeetingLink(eventData.meeting_link || "Link");
              setMeetingLinkUrl(eventData.meeting_link_url || "");
              setDurations(eventData.durations || ["15 min"]);
            }

            if (eventError) {
              console.log("Note: Event not found or RLS not configured", eventError);
            }
          }
        }
      } catch (error) {
        console.error("Error loading user profile:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserProfile();
  }, []);

  useEffect(() => {
    // Only auto-save updates for an existing event. A brand-new event is
    // saved as a draft when the user clicks the back button (handleBack).
    if (isLoading || currentEventId === null) return;

    const saveTimer = setTimeout(() => {
      saveEventToDatabase();
    }, 1000);

    return () => clearTimeout(saveTimer);
  }, [formName, title, description, ownerName, meetingLink, meetingLinkUrl, durations, userAvatar, currentEventId, isLoading]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);

    if (val.trim().length >= 3) {
      setFormName(val);
    }
  };

  const handleBack = async () => {
    await saveEventToDatabase();
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab') || 'calendar';
    router.push(`/builder?tab=${tab}`);
  };

  const saveEventToDatabase = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const payload: Record<string, unknown> = {
        user_id: session.user.id,
        title: formName,
        event_title: title,
        description: description,
        owner_name: ownerName,
        meeting_link: meetingLink,
        meeting_link_url: meetingLinkUrl,
        durations: durations,
        avatar_url: userAvatar,
        updated_at: new Date().toISOString(),
      };

      if (currentEventId) {
        // Update the existing event
        const { error } = await supabase
          .from("calendar_events")
          .update(payload)
          .eq("id", currentEventId);
        if (error) console.error("Error updating event:", error);
      } else {
        // Insert a new event and remember its id for subsequent saves
        const { data, error } = await supabase
          .from("calendar_events")
          .insert(payload)
          .select("id")
          .single();
        if (error) {
          console.error("Error creating event:", error);
        } else if (data) {
          setCurrentEventId(data.id);
        }
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const addDurationField = () => {
    setDurations([...durations, "15 min"]);
  };

  const removeDurationField = (index: number) => {
    const updated = durations.filter((_, i) => i !== index);
    setDurations(updated.length > 0 ? updated : ["15 min"]);
  };

  const updateDurationValue = (index: number, val: string) => {
    const updated = [...durations];
    updated[index] = val;
    setDurations(updated);
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.size <= 10 * 1024 * 1024) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setUserAvatar(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else if (file) {
      toast({
        title: "File size must be less than 10MB",
        status: "error",
        duration: 2000,
        isClosable: true,
        position: "top",
      });
    }
  };

  const handleConnectGoogle = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/calendar-builder`,
          scopes: "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/meet.readonly",
        },
      });

      if (error) {
        toast({
          title: "Failed to connect Google",
          description: error.message,
          status: "error",
          duration: 3000,
          isClosable: true,
          position: "top",
        });
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Error connecting Google:", error);
      toast({
        title: "Connection error",
        description: "Failed to connect Google account",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top",
      });
    }
  };

  const handleConnectZoom = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "zoom",
        options: {
          redirectTo: `${window.location.origin}/calendar-builder`,
        },
      });

      if (error) {
        toast({
          title: "Failed to connect Zoom",
          description: error.message,
          status: "error",
          duration: 3000,
          isClosable: true,
          position: "top",
        });
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Error connecting Zoom:", error);
      toast({
        title: "Connection error",
        description: "Failed to connect Zoom account",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top",
      });
    }
  };


  if (isLoading) {
    return (
      <>
        <style jsx global>{`
          html, body, #__next {
            height: 100%;
            margin: 0;
            padding: 0;
            overflow: hidden;
          }
        `}</style>
        <Box h="100dvh" w="100vw" bg="white" display="flex" alignItems="center" justifyContent="center">
          <Progress
            isIndeterminate
            size="xs"
            width="200px"
            borderRadius="full"
            sx={{
              "& > div": {
                backgroundColor: "#3F3F46 !important",
                backgroundImage: "none",
              },
            }}
          />
        </Box>
      </>
    );
  }

  return (
    <>
      <style jsx global>{`
        html, body, #__next {
          height: 100%;
          margin: 0;
          padding: 0;
          overflow: hidden;
        }
      `}</style>

      <Box h="100dvh" w="100vw" bg="customGray.100" position="relative" overflow="hidden">
        <VStack h="100%" w="100%" align="stretch" spacing={0} overflow="hidden">

          {/* Top Bar with Inline Editable Title Input */}
          <Box minH="60px" h="60px" bg="white" pl="16px" pr="16px" display="flex" alignItems="center" justifyContent="center" position="relative" borderBottom="1px solid" borderColor="customGray.200" zIndex="20" flexShrink={0}>
            <HStack spacing="6px" position="absolute" left="16px">
              <IconButton
                size="sm"
                icon={
                  <Box display="flex" alignItems="center" justifyContent="center" w="20px" h="20px">
                    <ArrowBackIcon w="20px" h="20px" />
                  </Box>
                }
                variant="ghost"
                color="customGray.800"
                _hover={{ bg: "customGray.100" }}
                onClick={handleBack}
                aria-label="Back"
              />
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Untitled event"
                size="sm"
                variant="unstyled"
                fontWeight="500"
                fontSize="14px"
                color="customGray.800"
                px="8px"
                py="4px"
                borderRadius="md"
                _hover={{ bg: "customGray.100" }}
                _focus={{ bg: "white", boxShadow: "0 0 0 1px #27272a" }}
              />
            </HStack>

            <HStack spacing="24px">
              <Text
                fontSize="14px"
                color={tabIndex === 0 ? "customGray.800" : "customGray.600"}
                fontWeight={tabIndex === 0 ? "500" : "400"}
                cursor="pointer"
                onClick={() => setTabIndex(0)}
                pb="2px"
                borderBottom={tabIndex === 0 ? "2px solid" : "none"}
                borderBottomColor={tabIndex === 0 ? "customGray.800" : "transparent"}
              >
                Build
              </Text>
              <Text
                fontSize="14px"
                color={tabIndex === 1 ? "customGray.800" : "customGray.600"}
                fontWeight={tabIndex === 1 ? "500" : "400"}
                cursor="pointer"
                onClick={() => setTabIndex(1)}
                pb="2px"
                borderBottom={tabIndex === 1 ? "2px solid" : "none"}
                borderBottomColor={tabIndex === 1 ? "customGray.800" : "transparent"}
              >
                Design
              </Text>
              <Text
                fontSize="14px"
                color={tabIndex === 2 ? "customGray.800" : "customGray.600"}
                fontWeight={tabIndex === 2 ? "500" : "400"}
                cursor="pointer"
                onClick={() => setTabIndex(2)}
                pb="2px"
                borderBottom={tabIndex === 2 ? "2px solid" : "none"}
                borderBottomColor={tabIndex === 2 ? "customGray.800" : "transparent"}
              >
                Configure
              </Text>
              <Text
                fontSize="14px"
                color={tabIndex === 3 ? "customGray.800" : "customGray.600"}
                fontWeight={tabIndex === 3 ? "500" : "400"}
                cursor="pointer"
                onClick={() => setTabIndex(3)}
                pb="2px"
                borderBottom={tabIndex === 3 ? "2px solid" : "none"}
                borderBottomColor={tabIndex === 3 ? "customGray.800" : "transparent"}
              >
                Workflow
              </Text>
            </HStack>

            <HStack spacing="8px" position="absolute" right="16px">
              <Button size="sm" px="14px" variant="outline" borderColor="customGray.300" color="customGray.800" _hover={{ bg: "customGray.50" }}>
                Preview
              </Button>
              <Button size="sm" px="14px" bg="customGray.800" color="white" _hover={{ bg: "customGray.700" }}>
                Share
              </Button>
            </HStack>
          </Box>

          <HStack spacing="0px" flex="1" align="stretch" w="100%" overflow="hidden">
            {/* Left Sidebar */}
            <Box w="380px" bg="white" borderRight="1px solid" borderColor="customGray.200" p="0px" overflowY="auto">
              <VStack spacing="0px" align="stretch">
                <HStack spacing="8px" py="20px" px="24px">
                  <Text fontSize="14px" fontWeight="bold">📅</Text>
                  <Heading fontSize="14px" fontWeight="600" color="customGray.800">General</Heading>
                </HStack>

                <Box h="1px" bg="customGray.200" w="100%" />

                <HStack justify="space-between" align="center" py="20px" px="24px" w="100%">
                  <Text fontSize="14px" fontWeight="500" color="customGray.800">Owner name</Text>
                  <Input
                    size="md"
                    w="180px"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="Owner name"
                    borderRadius="md"
                    bg="customGray.50"
                    border="1px solid"
                    borderColor="customGray.300"
                    fontSize="14px"
                    fontWeight="400"
                    color="customGray.800"
                    px="8px"
                    _hover={{ borderColor: "customGray.400" }}
                    _focus={{ bg: "customGray.50", borderColor: "customGray.500", boxShadow: "0 0 0 3px rgba(39, 39, 42, 0.1)" }}
                  />
                </HStack>

                <Box h="1px" bg="customGray.200" w="100%" />

                <VStack spacing="2px" align="stretch" py="20px" px="24px">
                  <Text fontSize="14px" fontWeight="500" color="customGray.800">Profile picture</Text>
                  <Text fontSize="xs" color="customGray.500">Choose the times of day you'll accept meetings.</Text>
                  <HStack spacing="12px" pt="12px">
                    <Avatar name={ownerName} src={userAvatar || undefined} size="sm" bg="customGray.300" color="customGray.800" />
                    <Button
                      size="sm"
                      bg="customGray.100"
                      fontWeight="400"
                      fontSize="14px"
                      onClick={() => document.getElementById("avatar-upload")?.click()}
                    >
                      Upload
                    </Button>
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/jpeg,image/png"
                      onChange={handleAvatarUpload}
                      style={{ display: "none" }}
                    />
                    <Text fontSize="xs" color="customGray.500">JPG or PNG. 1MB Max.</Text>
                    <IconButton
                      size="sm"
                      variant="ghost"
                      aria-label="Delete avatar"
                      icon={
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M2 3.99967H14M12.6667 3.99967V13.333C12.6667 13.9997 12 14.6663 11.3333 14.6663H4.66667C4 14.6663 3.33333 13.9997 3.33333 13.333V3.99967M5.33333 3.99967V2.66634C5.33333 1.99967 6 1.33301 6.66667 1.33301H9.33333C10 1.33301 10.6667 1.99967 10.6667 2.66634V3.99967M6.66667 7.33301V11.333M9.33333 7.33301V11.333" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      }
                      onClick={() => setUserAvatar(googleProfilePicture)}
                      color="customGray.600"
                      _hover={{ color: "red.500", bg: "rgba(239, 68, 68, 0.1)" }}
                    />
                  </HStack>
                </VStack>

                <Box h="1px" bg="customGray.200" w="100%" />

                <VStack spacing="12px" align="stretch" py="20px" px="24px">
                  <VStack spacing="2px" align="stretch">
                    <Text fontSize="14px" fontWeight="500" color="customGray.800">Description</Text>
                    <Text fontSize="xs" color="customGray.500">Choose the times of day you'll accept meetings.</Text>
                  </VStack>
                  <Textarea
                    size="sm"
                    value={description}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDescription(val);
                      if (val.trim().length > 0 && val.trim().length < 10) {
                        setDescriptionError(true);
                      } else {
                        setDescriptionError(false);
                      }
                    }}
                    placeholder="enter your description"
                    borderRadius="md"
                    bg="white"
                    border="1px solid"
                    borderColor={descriptionError ? "red.500" : "customGray.300"}
                    fontSize="14px"
                    fontWeight="400"
                    color="customGray.800"
                    rows={3}
                    maxLength={150}
                    _hover={{ borderColor: descriptionError ? "red.500" : "customGray.400" }}
                    _focus={{ bg: "white", borderColor: descriptionError ? "red.500" : "customGray.500", boxShadow: descriptionError ? "0 0 0 3px rgba(239, 68, 68, 0.1)" : "0 0 0 3px rgba(39, 39, 42, 0.1)" }}
                  />
                  {descriptionError && (
                    <Text fontSize="xs" color="red.500" fontWeight="500" mt="-10px">
                      Description must be at least 10 characters
                    </Text>
                  )}
                </VStack>

                <Box h="1px" bg="customGray.200" w="100%" />

                <VStack spacing="12px" align="stretch" py="20px" px="24px">
                  <VStack spacing="2px" align="stretch">
                    <Text fontSize="14px" fontWeight="500" color="customGray.800">Meeting link</Text>
                    <Text fontSize="xs" color="customGray.500">Choose the times of day you'll accept meetings.</Text>
                  </VStack>
                  <HStack
                    spacing="0px"
                    border="1px solid"
                    borderColor="customGray.300"
                    borderRadius="md"
                    bg="customGray.50"
                    _hover={{ borderColor: "customGray.400" }}
                  >
                    {meetingLink === "G-meet" ? (
                      <HStack spacing="8px" flex="1" px="8px">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M1.0979 12.7441C1.0979 13.2433 1.50574 13.6477 2.00823 13.6477H2.02131C1.51113 13.6477 1.0979 13.2433 1.0979 12.7441Z" fill="#FBBC05"/>
                          <path d="M8.92102 5.74083V8.09984L12.1014 5.53452V3.25608C12.1014 2.75688 11.6935 2.35254 11.191 2.35254H4.30083L4.29468 5.74083H8.92102Z" fill="#FBBC05"/>
                          <path d="M8.92064 10.4596H4.28665L4.28125 13.6468H11.1907C11.694 13.6468 12.1011 13.2425 12.1011 12.7433V10.6862L8.92064 8.10059V10.4596Z" fill="#34A853"/>
                          <path d="M4.30059 2.35254L1.0979 5.74083H4.29519L4.30059 2.35254Z" fill="#EA4335"/>
                          <path d="M1.0979 10.46V12.7437C1.0979 13.2429 1.51113 13.6472 2.02131 13.6472H4.28139L4.28672 10.46H1.0979Z" fill="#1967D2"/>
                          <path d="M4.29519 5.74023H1.0979V10.459H4.28672L4.29519 5.74023Z" fill="#4285F4"/>
                          <path d="M14.8975 11.9405V4.18511C14.7181 3.15582 13.5893 4.3357 13.5893 4.3357L12.1018 5.53515V10.686L14.231 12.4171C14.9998 12.518 14.8975 11.9405 14.8975 11.9405Z" fill="#34A853"/>
                          <path d="M8.92102 8.09966L12.1022 10.6861V5.53516L8.92102 8.09966Z" fill="#188038"/>
                        </svg>
                        <Text fontSize="14px" fontWeight="400" color="customGray.800">Google Meet</Text>
                      </HStack>
                    ) : meetingLink === "Zoom" ? (
                      <HStack spacing="8px" flex="1" px="8px">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <rect x="1" y="1" width="14" height="14" rx="4" fill="#519CFD"/>
                          <path d="M4.04785 6.59228C4.04785 6.13357 4.41971 5.76172 4.87842 5.76172H8.15353C9.07094 5.76172 9.81466 6.50543 9.81466 7.42285V9.62011C9.81466 10.0788 9.4428 10.4507 8.98409 10.4507H5.70898C4.79157 10.4507 4.04785 9.70696 4.04785 8.78955V6.59228Z" fill="white"/>
                          <path d="M10.1261 8.91005V7.19351C10.1261 7.16967 10.1363 7.14699 10.1542 7.13122L11.586 5.86815C11.7469 5.72621 12 5.84045 12 6.055V10.0383C12 10.2523 11.7479 10.3668 11.5868 10.2258L10.1545 8.97255C10.1364 8.95678 10.1261 8.934 10.1261 8.91005Z" fill="white"/>
                        </svg>
                        <Text fontSize="14px" fontWeight="400" color="customGray.800">Zoom</Text>
                      </HStack>
                    ) : (
                      <Input
                        size="md"
                        flex="1"
                        value={meetingLinkUrl}
                        onChange={(e) => setMeetingLinkUrl(e.target.value)}
                        placeholder={meetingLink === "In person" ? "Enter the address" : "Enter the meet link"}
                        border="none"
                        bg="transparent"
                        fontSize="14px"
                        fontWeight="400"
                        color="customGray.800"
                        px="8px"
                        _focus={{ boxShadow: "none" }}
                        _hover={{ bg: "transparent" }}
                      />
                    )}
                    <Box w="1px" h="24px" bg="customGray.300" />
                    <Menu>
                      <MenuButton
                        as={Box}
                        px="12px"
                        py="8px"
                        cursor="pointer"
                        display="flex"
                        alignItems="center"
                        gap="4px"
                        fontSize="14px"
                        color="customGray.800"
                        fontWeight="400"
                      >
                        {meetingLink}
                        <ChevronDownIcon w="16px" h="16px" />
                      </MenuButton>
                      <MenuList fontSize="14px">
                        <MenuItem onClick={() => setMeetingLink("G-meet")}>G-meet</MenuItem>
                        <MenuItem onClick={() => setMeetingLink("Zoom")}>Zoom</MenuItem>
                        <MenuItem onClick={() => setMeetingLink("In person")}>In person</MenuItem>
                        <MenuItem onClick={() => setMeetingLink("Link")}>Link</MenuItem>
                      </MenuList>
                    </Menu>
                  </HStack>
                  {meetingLink === "G-meet" && !isGoogleConnected && (
                    <Alert
                      status="warning"
                      variant="subtle"
                      bg="orange.50"
                      borderRadius="md"
                      border="1px solid"
                      borderColor="orange.200"
                      flexDirection="column"
                      alignItems="flex-start"
                      px="16px"
                      py="12px"
                    >
                      <HStack spacing="12px" align="flex-start" w="100%">
                        <AlertIcon mt="2px" />
                        <VStack spacing="8px" align="stretch" flex="1">
                          <Text fontSize="14px" fontWeight="500" color="customGray.800">
                            You must configure your calendar connections to push events to a Google Calendar to host Google Meet web conferences on your events.
                          </Text>
                          <Button
                            size="sm"
                            variant="outline"
                            fontWeight="500"
                            fontSize="14px"
                            borderColor="customGray.800"
                            color="customGray.800"
                            _hover={{ bg: "customGray.50" }}
                            onClick={handleConnectGoogle}
                            rightIcon={
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M13 3H10V2H14V6H13V3ZM3 13H6V14H2V10H3V13Z" fill="currentColor"/>
                              </svg>
                            }
                          >
                            Connect Google
                          </Button>
                        </VStack>
                      </HStack>
                    </Alert>
                  )}
                  {meetingLink === "Zoom" && !isZoomConnected && (
                    <Alert
                      status="warning"
                      variant="subtle"
                      bg="orange.50"
                      borderRadius="md"
                      border="1px solid"
                      borderColor="orange.200"
                      flexDirection="column"
                      alignItems="flex-start"
                      px="16px"
                      py="12px"
                    >
                      <HStack spacing="12px" align="flex-start" w="100%">
                        <AlertIcon mt="2px" />
                        <VStack spacing="8px" align="stretch" flex="1">
                          <Text fontSize="14px" fontWeight="500" color="customGray.800">
                            Your Zoom account is not connected
                          </Text>
                          <Button
                            size="sm"
                            variant="outline"
                            fontWeight="500"
                            fontSize="14px"
                            borderColor="customGray.800"
                            color="customGray.800"
                            _hover={{ bg: "customGray.50" }}
                            onClick={handleConnectZoom}
                            rightIcon={
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M13 3H10V2H14V6H13V3ZM3 13H6V14H2V10H3V13Z" fill="currentColor"/>
                              </svg>
                            }
                          >
                            Connect Zoom
                          </Button>
                        </VStack>
                      </HStack>
                    </Alert>
                  )}
                </VStack>

                <Box h="1px" bg="customGray.200" w="100%" />

                <VStack spacing="8px" align="stretch" py="20px" px="24px" pb="32px">
                  <Text fontSize="14px" fontWeight="500" color="customGray.800">Duration</Text>
                  <Box position="relative" w="100%">
                    <Menu matchWidth>
                      <MenuButton
                        as={Box}
                        w="100%"
                        borderRadius="md"
                        bg="white"
                        border="1px solid"
                        borderColor="customGray.300"
                        pt="8px"
                        px="8px"
                        pb="2px"
                        minH="unset"
                        display="flex"
                        alignItems="center"
                        flexWrap="wrap"
                        cursor="pointer"
                        _hover={{ borderColor: "customGray.400" }}
                        _focus={{ borderColor: "customGray.500", boxShadow: "0 0 0 3px rgba(39, 39, 42, 0.1)" }}
                        _focusWithin={{ borderColor: "customGray.500", boxShadow: "0 0 0 3px rgba(39, 39, 42, 0.1)" }}
                      >
                        {durations.map((dur, index) => (
                          <Tag
                            key={index}
                            size="md"
                            borderRadius="md"
                            bg="customGray.100"
                            color="customGray.800"
                            mr="8px"
                            mb="8px"
                          >
                            <TagLabel>{dur}</TagLabel>
                            <TagCloseButton
                              pointerEvents="auto"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                removeDurationField(index);
                              }}
                            />
                          </Tag>
                        ))}
                      </MenuButton>
                      <MenuList fontSize="14px">
                        {!durations.includes("15 min") && <MenuItem onClick={() => setDurations([...durations, "15 min"])}>15 min</MenuItem>}
                        {!durations.includes("30 min") && <MenuItem onClick={() => setDurations([...durations, "30 min"])}>30 min</MenuItem>}
                        {!durations.includes("45 min") && <MenuItem onClick={() => setDurations([...durations, "45 min"])}>45 min</MenuItem>}
                        {!durations.includes("60 min") && <MenuItem onClick={() => setDurations([...durations, "60 min"])}>60 min</MenuItem>}
                      </MenuList>
                    </Menu>
                  </Box>
                </VStack>
              </VStack>
            </Box>

            {/* Center Preview */}
            <Box
              flex="1"
              bg="customGray.50"
              p="24px"
              overflowY="auto"
              display="flex"
              alignItems="center"
              justifyContent="center"
              sx={{
                backgroundImage: "radial-gradient(circle, rgba(169, 169, 169, 0.1) 1px, transparent 1px)",
                backgroundSize: "24px 24px"
              }}
            >
              <VStack spacing="24px" align="center">
                {/* Floating Toolbar */}
                <HStack
                  spacing="4px"
                  bg="white"
                  px="4px"
                  py="4px"
                  borderRadius="14px"
                  border="1px solid"
                  borderColor="customGray.200"
                  boxShadow="0 2px 4px rgba(0,0,0,0.04)"
                >
                  <Menu>
                    <MenuButton
                      as={Button}
                      rightIcon={<ChevronDownIcon />}
                      size="sm"
                      variant="ghost"
                      fontWeight="500"
                      fontSize="14px"
                      color="customGray.800"
                      _hover={{ bg: "customGray.100" }}
                      _active={{ bg: "customGray.200" }}
                    >
                      {selectedPage}
                    </MenuButton>
                    <MenuList fontSize="14px">
                      {availablePages.map((page) => (
                        <Box key={page}>
                          <MenuItem onClick={() => setSelectedPage(page)}>
                            {page}
                          </MenuItem>
                          {page === "Main page" && <Divider my="0px" />}
                        </Box>
                      ))}
                    </MenuList>
                  </Menu>

                  {selectedPage === "Form page" && (
                    <>
                      <Box w="1px" h="16px" bg="customGray.200" mx="2px" />
                      <IconButton
                        size="sm"
                        variant="ghost"
                        aria-label="Form page icon"
                        icon={<ViewIcon boxSize="12px" />}
                        color="customGray.600"
                        _hover={{ bg: "customGray.100" }}
                      />
                    </>
                  )}


                </HStack>

                {/* Preview Card */}
                <Box w="fit-content" h={selectedPage === "Success page" ? "580px" : "460px"} bg="white" borderRadius="12px" p="0px" border="1px solid" borderColor="customGray.200" boxShadow="0 2px 8px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)" _focusWithin={{ boxShadow: "0 0 0 3px rgba(91, 95, 255, 0.1), 0 2px 8px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)" }}>
                <HStack spacing="0px" align="stretch" w="100%" h="100%">
                  {selectedPage !== "Success page" && (
                    <VStack spacing="16px" align="start" flex="0 0 280px" p="24px" overflowY="auto" maxH="100%">
                      <HStack spacing="12px">
                        <Avatar name={ownerName} src={userAvatar || undefined} size="sm" flexShrink={0} bg="customGray.300" color="customGray.800" />
                        <VStack spacing="2px" align="start">
                          <Text fontSize="14px" fontWeight="600" color="customGray.800">{ownerName}</Text>
                        </VStack>
                      </HStack>
                      <VStack spacing="8px" align="start" w="100%">
                        <Text fontSize="lg" fontWeight="600" color="customGray.800" whiteSpace="normal" wordBreak="break-word">{title}</Text>
                        <Text fontSize="14px" color="customGray.600" lineHeight="1.5" whiteSpace="normal" wordBreak="break-word">{description}</Text>
                      </VStack>
                      <VStack spacing="8px" align="start" w="100%" pt="8px">
                        <HStack spacing="8px" fontSize="14px" color="customGray.700">
                          <Box>🕐</Box>
                          <Text>{durations[0] || "15m"}</Text>
                        </HStack>
                        <HStack spacing="8px" fontSize="14px" color="customGray.700">
                          <Box>📹</Box>
                          <Text>{meetingLink}</Text>
                        </HStack>
                        <HStack spacing="8px" fontSize="14px" color="customGray.700">
                          <Box>🌍</Box>
                          <Text>Asia/Kolkata</Text>
                        </HStack>
                      </VStack>
                    </VStack>
                  )}

                  {selectedPage === "Main page" ? (
                    <>
                      <Box flex="0 0 440px" display="flex" alignItems="flex-start" justifyContent="center" borderLeft="1px solid" borderColor="customGray.200" px="24px" pt="24px">
                        <CalendarPicker />
                      </Box>

                      <VStack spacing="0px" flex="0 0 260px" borderLeft="1px solid" borderColor="customGray.200" p="0px">
                        <HStack w="100%" justify="space-between" px="24px" pt="24px" pb="12px">
                          <Text fontSize="14px" fontWeight="600" color="customGray.800">Thu 23</Text>
                          <Tabs variant="soft-rounded" colorScheme="gray" size="sm">
                            <TabList bg="customGray.100" borderRadius="9999px" p="4px">
                              <Tab fontSize="12px" _selected={{ bg: "white", color: "customGray.800" }}>12h</Tab>
                              <Tab fontSize="12px" _selected={{ bg: "white", color: "customGray.800" }}>24h</Tab>
                            </TabList>
                          </Tabs>
                        </HStack>
                        <VStack spacing="12px" w="100%" overflowY="auto" maxH="380px" align="stretch" px="24px" pt="4px" pb="16px" sx={{ "&::-webkit-scrollbar": { w: "0px" }, "&::-webkit-scrollbar-track": { bg: "transparent" }, "&::-webkit-scrollbar-thumb": { bg: "transparent" } }}>
                          {["09:00 AM", "09:15 AM", "09:30 AM", "09:45 AM", "10:00 AM", "10:15 AM", "10:30 AM", "10:45 AM", "11:00 AM"].map((time) => (
                            <Button
                              key={time}
                              w="100%"
                              h="36px"
                              p="0px"
                              flexShrink={0}
                              fontSize="14px"
                              fontWeight="400"
                              variant="outline"
                              borderColor="customGray.200"
                              boxShadow="0 1px 2px rgba(0,0,0,0.05)"
                              bg={time === "09:30 AM" ? "customGray.800" : "white"}
                              color={time === "09:30 AM" ? "white" : "customGray.500"}
                              _hover={{ bg: time === "09:30 AM" ? "customGray.700" : "customGray.50", borderColor: "customGray.300" }}>
                              {time}
                            </Button>
                          ))}
                        </VStack>
                      </VStack>
                    </>
                  ) : selectedPage === "Form page" ? (
                    <VStack spacing="16px" flex="1" align="stretch" borderLeft="1px solid" borderColor="customGray.200" p="24px" overflowY="auto">
                      <VStack spacing="8px" align="stretch">
                        <Text fontSize="14px" fontWeight="600" color="customGray.800">Your name <Text as="span" color="red.500">*</Text></Text>
                        <Input
                          size="sm"
                          placeholder="Your name"
                          borderRadius="md"
                          bg="white"
                          border="1px solid"
                          borderColor="customGray.300"
                          fontSize="14px"
                          fontWeight="400"
                          color="customGray.800"
                          px="12px"
                          py="8px"
                          _hover={{ borderColor: "customGray.400" }}
                          _focus={{ bg: "white", borderColor: "customGray.500", boxShadow: "0 0 0 3px rgba(39, 39, 42, 0.1)" }}
                        />
                      </VStack>

                      <VStack spacing="8px" align="stretch">
                        <Text fontSize="14px" fontWeight="600" color="customGray.800">Email address <Text as="span" color="red.500">*</Text></Text>
                        <Input
                          size="sm"
                          placeholder="your@email.com"
                          borderRadius="md"
                          bg="white"
                          border="1px solid"
                          borderColor="customGray.300"
                          fontSize="14px"
                          fontWeight="400"
                          color="customGray.800"
                          px="12px"
                          py="8px"
                          _hover={{ borderColor: "customGray.400" }}
                          _focus={{ bg: "white", borderColor: "customGray.500", boxShadow: "0 0 0 3px rgba(39, 39, 42, 0.1)" }}
                        />
                      </VStack>

                      <VStack spacing="8px" align="stretch">
                        <Text fontSize="14px" fontWeight="600" color="customGray.800">Additional notes</Text>
                        <Textarea
                          size="sm"
                          placeholder="Please share anything that will help prepare for our meeting."
                          borderRadius="md"
                          bg="white"
                          border="1px solid"
                          borderColor="customGray.300"
                          fontSize="14px"
                          fontWeight="400"
                          color="customGray.800"
                          rows={4}
                          px="12px"
                          py="8px"
                          _hover={{ borderColor: "customGray.400" }}
                          _focus={{ bg: "white", borderColor: "customGray.500", boxShadow: "0 0 0 3px rgba(39, 39, 42, 0.1)" }}
                        />
                      </VStack>

                      <HStack w="100%" spacing="8px" justify="flex-start" fontSize="14px" color="customGray.600">
                        <Box>👥</Box>
                        <Text>Add guests</Text>
                      </HStack>

                      <Text fontSize="xs" color="customGray.500" pt="8px">By proceeding, you agree to Cal.com's Terms and Privacy Policy.</Text>
                    </VStack>
                  ) : (
                    <VStack spacing="20px" flex="1" align="center" borderLeft="1px solid" borderColor="customGray.200" p="24px" overflowY="auto" justify="flex-start">
                      <VStack spacing="16px" align="center" pt="8px">
                        <Box w="64px" h="64px" borderRadius="full" bg="green.100" display="flex" alignItems="center" justifyContent="center" flexShrink={0}>
                          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M8 16L12 20L24 8" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </Box>
                        <VStack spacing="8px" align="center">
                          <Text fontSize="lg" fontWeight="600" color="customGray.800">This meeting is scheduled</Text>
                          <Text fontSize="14px" color="customGray.600" textAlign="center">We sent an email with a calendar invitation with the details to everyone.</Text>
                        </VStack>
                      </VStack>

                      <VStack spacing="16px" align="stretch" w="100%" border="1px solid" borderColor="customGray.200" borderRadius="8px" p="20px" bg="customGray.50">
                        <HStack spacing="32px" justify="flex-start">
                          <VStack spacing="4px" align="start">
                            <Text fontSize="14px" fontWeight="600" color="customGray.800">What</Text>
                            <Text fontSize="14px" color="customGray.700">{title} between {ownerName} and Jane Doe</Text>
                          </VStack>
                        </HStack>

                        <HStack spacing="32px" justify="flex-start">
                          <VStack spacing="4px" align="start">
                            <Text fontSize="14px" fontWeight="600" color="customGray.800">When</Text>
                            <VStack spacing="0px" align="start">
                              <Text fontSize="14px" color="customGray.700">Wednesday, July 29, 2026</Text>
                              <Text fontSize="14px" color="customGray.700">10:00 AM - 10:15 AM <Text as="span" fontSize="xs" color="customGray.600">(India Standard Time)</Text></Text>
                            </VStack>
                          </VStack>
                        </HStack>

                        <HStack spacing="32px" justify="flex-start">
                          <VStack spacing="4px" align="start">
                            <Text fontSize="14px" fontWeight="600" color="customGray.800">Who</Text>
                            <VStack spacing="8px" align="start">
                              <HStack spacing="4px">
                                <Text fontSize="14px" color="customGray.700">{ownerName}</Text>
                                <Text fontSize="xs" fontWeight="500" bg="blue.100" color="blue.700" px="6px" py="2px" borderRadius="4px">Host</Text>
                              </HStack>
                              <VStack spacing="2px" align="start">
                                <HStack spacing="4px">
                                  <Text fontSize="14px" color="customGray.700">Jane Doe</Text>
                                  <Text fontSize="xs" fontWeight="500" bg="yellow.100" color="yellow.700" px="6px" py="2px" borderRadius="4px">Guest</Text>
                                </HStack>
                                <Text fontSize="14px" color="customGray.600">jane.doe@example.com</Text>
                              </VStack>
                            </VStack>
                          </VStack>
                        </HStack>

                        <HStack spacing="32px" justify="flex-start">
                          <VStack spacing="4px" align="start">
                            <Text fontSize="14px" fontWeight="600" color="customGray.800">Where</Text>
                            <Text fontSize="14px" color="customGray.700" bg="customGray.100" px="8px" py="4px" borderRadius="4px">{meetingLink}</Text>
                          </VStack>
                        </HStack>
                      </VStack>

                      <HStack spacing="12px" w="100%" justify="center" pt="8px">
                        <Text fontSize="14px" color="customGray.700">Add to calendar</Text>
                        <HStack spacing="8px">
                          <Button size="sm" variant="outline" borderColor="customGray.200" bg="white" p="6px" >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                              <text x="2" y="14" fontSize="12">G</text>
                            </svg>
                          </Button>
                          <Button size="sm" variant="outline" borderColor="customGray.200" bg="white" p="6px" >
                            <Text fontSize="xs">📅</Text>
                          </Button>
                        </HStack>
                      </HStack>

                      <Text fontSize="xs" color="customGray.600" textAlign="center" pt="8px">Need to make a change? <Text as="span" color="blue.600" cursor="pointer" textDecoration="underline">Reschedule</Text> or <Text as="span" color="blue.600" cursor="pointer" textDecoration="underline">Cancel</Text></Text>
                    </VStack>
                  )}
                </HStack>
              </Box>
              </VStack>
            </Box>
          </HStack>
        </VStack>
      </Box>

      <AddPage
        isOpen={isOpen}
        onClose={onClose}
        availablePages={availablePages}
        setAvailablePages={setAvailablePages}
        setSelectedPage={setSelectedPage}
      />
    </>
  );
}
