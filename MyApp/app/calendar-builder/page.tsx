"use client";

import { useRouter } from "next/navigation";
import { Box, VStack, HStack, Text, Button, Heading, IconButton, Input, Textarea, useToast, Tabs, TabList, Tab, Avatar } from "@chakra-ui/react";
import { ArrowBackIcon, DeleteIcon, AddIcon } from "@chakra-ui/icons";
import { useState, useEffect } from "react";
import { CalendarPicker } from "@/components/CalendarPicker";
import { supabase } from "@/lib/supabase";

export default function CalendarBuilderPage() {
  const router = useRouter();
  const toast = useToast();
  const [tabIndex, setTabIndex] = useState(0);

  // Inline title state
  const [formName, setFormName] = useState("Untitled");
  const [inputValue, setInputValue] = useState(formName);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [userName, setUserName] = useState("Vicky Vignesh");

  // Sidebar form fields state
  const [ownerName, setOwnerName] = useState("Vicky Vignesh");
  const [title, setTitle] = useState("sfd");
  const [description, setDescription] = useState("Get to know each other and discuss your needs. A perfect opportunity to connect and explore possibilities together.");
  const [meetingLink, setMeetingLink] = useState("Cal Video");
  const [durations, setDurations] = useState<string[]>(["15 min"]);

  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const avatarUrl = session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture;
          const fullName = session.user.user_metadata?.full_name || session.user.email || "User";

          if (avatarUrl) {
            setUserAvatar(avatarUrl);
          }
          setUserName(fullName);
          setOwnerName(fullName);
        }
      } catch (error) {
        console.error("Error loading user profile:", error);
      }
    };

    loadUserProfile();
  }, []);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);

    if (val.trim().length > 0 && val.trim().length < 3) {
      toast({
        title: "Please enter a title with at least 3 characters",
        status: "error",
        duration: 2000,
        isClosable: true,
        position: "top",
      });
      return;
    }

    if (val.trim().length >= 3) {
      setFormName(val);
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
                onClick={() => router.push("/builder")}
                aria-label="Back"
              />
              <Input
                value={inputValue}
                onChange={handleTitleChange}
                placeholder="Untitled Survey"
                size="sm"
                variant="unstyled"
                fontWeight="500"
                fontSize="sm"
                color="customGray.800"
                maxW="220px"
                px="8px"
                py="4px"
                borderRadius="md"
                _hover={{ bg: "customGray.50" }}
                _focus={{ bg: "white", boxShadow: "0 0 0 1px #27272a" }}
              />
            </HStack>

            <HStack spacing="24px">
              <Text
                fontSize="sm"
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
                fontSize="sm"
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
                fontSize="sm"
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
                fontSize="sm"
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
              <Box w="1px" h="16px" bg="customGray.200" />
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
                  <Text fontSize="md" fontWeight="bold">📅</Text>
                  <Heading fontSize="md" fontWeight="600" color="customGray.800">General</Heading>
                </HStack>

                <Box h="1px" bg="customGray.200" w="100%" />

                <HStack justify="space-between" align="center" py="20px" px="24px" w="100%">
                  <Text fontSize="sm" fontWeight="400" color="customGray.600">Owner name</Text>
                  <Input
                    size="sm"
                    w="180px"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="Owner name"
                    borderRadius="md"
                    bg="customGray.50"
                    border="1px solid"
                    borderColor="customGray.300"
                    fontSize="sm"
                    fontWeight="400"
                    color="customGray.800"
                    px="8px"
                    _hover={{ borderColor: "customGray.400" }}
                    _focus={{ bg: "customGray.50", borderColor: "customGray.500", boxShadow: "0 0 0 3px rgba(39, 39, 42, 0.1)" }}
                  />
                </HStack>

                <Box h="1px" bg="customGray.200" w="100%" />

                <VStack spacing="2px" align="stretch" py="20px" px="24px">
                  <Text fontSize="sm" fontWeight="600" color="customGray.800">Profile picture</Text>
                  <Text fontSize="xs" color="customGray.500">Choose the times of day you'll accept meetings.</Text>
                  <HStack spacing="12px" pt="12px">
                    <Avatar name={ownerName} src={userAvatar || undefined} size="sm" bg="customGray.300" color="customGray.800" />
                    <Button size="sm" bg="customGray.100" fontWeight="400" fontSize="14px">Upload</Button>
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
                      onClick={() => setUserAvatar(null)}
                      color="customGray.600"
                      _hover={{ color: "red.500", bg: "rgba(239, 68, 68, 0.1)" }}
                    />
                  </HStack>
                </VStack>

                <Box h="1px" bg="customGray.200" w="100%" />

                <HStack justify="space-between" align="center" py="20px" px="24px" w="100%">
                  <Text fontSize="sm" fontWeight="400" color="customGray.600">Title</Text>
                  <Input
                    size="sm"
                    w="180px"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="example@chakraui"
                    borderRadius="md"
                    bg="customGray.50"
                    border="1px solid"
                    borderColor="customGray.300"
                    fontSize="sm"
                    fontWeight="400"
                    color="customGray.800"
                    px="8px"
                    _hover={{ borderColor: "customGray.400" }}
                    _focus={{ bg: "customGray.50", borderColor: "customGray.500", boxShadow: "0 0 0 3px rgba(39, 39, 42, 0.1)" }}
                  />
                </HStack>

                <Box h="1px" bg="customGray.200" w="100%" />

                <VStack spacing="6px" align="stretch" py="20px" px="24px">
                  <Text fontSize="sm" fontWeight="600" color="customGray.800">Description</Text>
                  <Text fontSize="xs" color="customGray.500">Choose the times of day you'll accept meetings.</Text>
                  <Textarea
                    size="sm"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="example@chakraui"
                    borderRadius="md"
                    bg="customGray.50"
                    border="1px solid"
                    borderColor="customGray.300"
                    fontSize="sm"
                    fontWeight="400"
                    color="customGray.800"
                    rows={3}
                    _hover={{ borderColor: "customGray.400" }}
                    _focus={{ bg: "customGray.50", borderColor: "customGray.500", boxShadow: "0 0 0 3px rgba(39, 39, 42, 0.1)" }}
                  />
                </VStack>

                <Box h="1px" bg="customGray.200" w="100%" />

                <VStack spacing="6px" align="stretch" py="20px" px="24px">
                  <Text fontSize="sm" fontWeight="600" color="customGray.800">Meeting link</Text>
                  <Text fontSize="xs" color="customGray.500">Choose the times of day you'll accept meetings.</Text>
                  <Input
                    size="sm"
                    value={meetingLink}
                    onChange={(e) => setMeetingLink(e.target.value)}
                    placeholder="example@chakraui"
                    borderRadius="md"
                    bg="customGray.50"
                    border="1px solid"
                    borderColor="customGray.300"
                    fontSize="sm"
                    fontWeight="400"
                    color="customGray.800"
                    px="8px"
                    _hover={{ borderColor: "customGray.400" }}
                    _focus={{ bg: "customGray.50", borderColor: "customGray.500", boxShadow: "0 0 0 3px rgba(39, 39, 42, 0.1)" }}
                  />
                </VStack>

                <Box h="1px" bg="customGray.200" w="100%" />

                <VStack spacing="8px" align="stretch" py="20px" px="24px">
                  <Text fontSize="sm" fontWeight="600" color="customGray.800">Duration</Text>
                  {durations.map((dur, index) => (
                    <HStack key={index} spacing="8px">
                      <Input
                        size="sm"
                        value={dur}
                        onChange={(e) => updateDurationValue(index, e.target.value)}
                        placeholder="15 min"
                        borderRadius="md"
                        bg="customGray.50"
                        border="1px solid"
                        borderColor="customGray.300"
                        fontSize="sm"
                        fontWeight="400"
                        color="customGray.800"
                        px="8px"
                        _hover={{ borderColor: "customGray.400" }}
                        _focus={{ bg: "customGray.50", borderColor: "customGray.500", boxShadow: "0 0 0 3px rgba(39, 39, 42, 0.1)" }}
                      />
                      {durations.length > 1 && (
                        <IconButton
                          size="sm"
                          variant="ghost"
                          aria-label="Remove duration"
                          icon={<DeleteIcon />}
                          onClick={() => removeDurationField(index)}
                          color="customGray.600"
                        />
                      )}
                    </HStack>
                  ))}
                  <Button
                    size="sm"
                    variant="ghost"
                    leftIcon={<AddIcon />}
                    justifyContent="flex-start"
                    fontWeight="normal"
                    color="customGray.800"
                    px="0px"
                    onClick={addDurationField}
                  >
                    Add multiple duration
                  </Button>
                </VStack>
              </VStack>
            </Box>

            {/* Center Preview */}
            <Box flex="1" bg="customGray.50" p="24px" overflowY="auto" display="flex" alignItems="center" justifyContent="center">
              <Box w="fit-content" h="460px" bg="white" borderRadius="12px" p="0px" border="1px solid" borderColor="customGray.200" boxShadow="0 2px 8px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)" _focusWithin={{ boxShadow: "0 0 0 3px rgba(91, 95, 255, 0.1), 0 2px 8px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)" }}>
                <HStack spacing="0px" align="stretch" w="100%" h="100%">
                  <VStack spacing="16px" align="start" flex="0 0 280px" p="24px">
                    <HStack spacing="12px">
                      <Avatar name={ownerName} src={userAvatar || undefined} size="sm" flexShrink={0} bg="customGray.300" color="customGray.800" />
                      <VStack spacing="2px" align="start">
                        <Text fontSize="sm" fontWeight="600" color="customGray.800">{ownerName}</Text>
                      </VStack>
                    </HStack>
                    <VStack spacing="8px" align="start" w="100%">
                      <Text fontSize="lg" fontWeight="600" color="customGray.800">{title}</Text>
                      <Text fontSize="sm" color="customGray.600" lineHeight="1.5">{description}</Text>
                    </VStack>
                    <VStack spacing="8px" align="start" w="100%" pt="8px">
                      <HStack spacing="8px" fontSize="sm" color="customGray.700">
                        <Box>🕐</Box>
                        <Text>{durations[0] || "15m"}</Text>
                      </HStack>
                      <HStack spacing="8px" fontSize="sm" color="customGray.700">
                        <Box>📹</Box>
                        <Text>{meetingLink}</Text>
                      </HStack>
                      <HStack spacing="8px" fontSize="sm" color="customGray.700">
                        <Box>🌍</Box>
                        <Text>Asia/Kolkata</Text>
                      </HStack>
                    </VStack>
                  </VStack>

                  <Box flex="0 0 440px" display="flex" alignItems="flex-start" justifyContent="center" borderLeft="1px solid" borderColor="customGray.200" px="24px" pt="24px">
                    <CalendarPicker />
                  </Box>

                  <VStack spacing="0px" flex="0 0 260px" borderLeft="1px solid" borderColor="customGray.200" p="0px">
                    <HStack w="100%" justify="space-between" px="24px" pt="24px" pb="12px">
                      <Text fontSize="sm" fontWeight="600" color="customGray.800">Thu 23</Text>
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
                </HStack>
              </Box>
            </Box>
          </HStack>
        </VStack>
      </Box>
    </>
  );
}
