"use client";

import { useRouter } from "next/navigation";
import {
  Box,
  Flex,
  VStack,
  HStack,
  Text,
  Button,
  IconButton,
  Input,
  Textarea,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Collapse,
  useToast,
} from "@chakra-ui/react";
import {
  ArrowBackIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CloseIcon,
  CopyIcon,
  RepeatIcon,
  AttachmentIcon,
  ArrowUpIcon,
} from "@chakra-ui/icons";
import { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import FullPageLoader from "@/app/components/FullPageLoader";

export default function ChatbotBuilderPage() {
  const router = useRouter();
  const toast = useToast({ position: "top" });

  const [isLoading, setIsLoading] = useState(true);
  const [agentId, setAgentId] = useState<number | null>(null);
  const [agentStatus, setAgentStatus] = useState("Draft");
  const agentIdRef = useRef<number | null>(null);
  const workspaceNameRef = useRef<string | null>(null);
  const lastSavedSnapshotRef = useRef<string | null>(null);
  const insertInFlightRef = useRef(false);

  const [isDeployOpen, setIsDeployOpen] = useState(true);
  const [isGuidanceOpen, setIsGuidanceOpen] = useState(true);
  const [isAppearanceOpen, setIsAppearanceOpen] = useState(true);
  const [tone, setTone] = useState("Professional");
  const [responseLength, setResponseLength] = useState("Standard");
  const [businessContext, setBusinessContext] = useState("");
  const [alignment, setAlignment] = useState<"left" | "right">("right");
  const [name, setName] = useState("Untitled");
  const [welcomeMessage, setWelcomeMessage] = useState("Hi there! 👋 How can I help you today?");
  const [messagePlaceholder, setMessagePlaceholder] = useState("Type your message...");
  const [footerText, setFooterText] = useState("Optional footer text. Links to privacy and terms.");

  const [isWidgetOpen, setIsWidgetOpen] = useState(true);
  const [previewMessages, setPreviewMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [previewInput, setPreviewInput] = useState("");
  const [isPreviewSending, setIsPreviewSending] = useState(false);
  const previewMessagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    previewMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [previewMessages, isPreviewSending]);

  const embedCode = useMemo(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://your-domain.com";
    const escapeAttr = (value: string) => value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
    return [
      `<script src="${origin}/chatbot-widget.js"`,
      `  data-name="${escapeAttr(name)}"`,
      `  data-welcome-message="${escapeAttr(welcomeMessage)}"`,
      `  data-placeholder="${escapeAttr(messagePlaceholder)}"`,
      `  data-footer-text="${escapeAttr(footerText)}"`,
      `  data-tone="${escapeAttr(tone)}"`,
      `  data-response-length="${escapeAttr(responseLength)}"`,
      `  data-business-context="${escapeAttr(businessContext)}"`,
      `  data-align="${alignment}"`,
      `  defer>`,
      `</script>`,
    ].join("\n");
  }, [name, welcomeMessage, messagePlaceholder, footerText, tone, responseLength, businessContext, alignment]);

  const handleSendPreviewMessage = async () => {
    const text = previewInput.trim();
    if (text === "" || isPreviewSending) return;

    const nextMessages = [...previewMessages, { role: "user" as const, content: text }];
    setPreviewMessages(nextMessages);
    setPreviewInput("");
    setIsPreviewSending(true);

    try {
      const response = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages, tone, responseLength, businessContext }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The chatbot failed to respond.");
      setPreviewMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch (error) {
      setPreviewMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I couldn't respond just now. Please try again." }]);
      toast({ title: "Chatbot error", description: error instanceof Error ? error.message : undefined, status: "error" });
    } finally {
      setIsPreviewSending(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const idParam = params.get("id");
        workspaceNameRef.current = params.get("workspace") || null;

        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        if (idParam) {
          const { data, error } = await supabase
            .from("chatbot_agents")
            .select("*")
            .eq("id", idParam)
            .eq("user_id", session.user.id)
            .single();

          if (data) {
            agentIdRef.current = data.id;
            setAgentId(data.id);
            workspaceNameRef.current = data.workspace_name ?? workspaceNameRef.current;
            setAgentStatus(data.status || "Draft");
            setName(data.name || "Untitled");
            setTone(data.tone || "Professional");
            setResponseLength(data.response_length || "Standard");
            setBusinessContext(data.business_context || "");
            setAlignment(data.alignment === "left" ? "left" : "right");
            setWelcomeMessage(data.welcome_message || "Hi there! 👋 How can I help you today?");
            setMessagePlaceholder(data.message_placeholder || "Type your message...");
            setFooterText(data.footer_text || "");
          }

          if (error) {
            console.log("Note: Agent not found or RLS not configured", error);
          }
        }
      } catch (error) {
        console.error("Error loading chatbot agent:", error);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, []);

  const buildSnapshot = () =>
    JSON.stringify({ name, tone, responseLength, businessContext, alignment, welcomeMessage, messagePlaceholder, footerText });

  useEffect(() => {
    if (isLoading) return;

    const snapshot = buildSnapshot();

    if (lastSavedSnapshotRef.current === null) {
      lastSavedSnapshotRef.current = snapshot;
      return;
    }

    if (lastSavedSnapshotRef.current === snapshot) return;

    const saveTimer = setTimeout(() => {
      lastSavedSnapshotRef.current = snapshot;
      saveAgentToDatabase();
    }, 1000);

    return () => clearTimeout(saveTimer);
  }, [name, tone, responseLength, businessContext, alignment, welcomeMessage, messagePlaceholder, footerText, agentId, isLoading]);

  const saveAgentToDatabase = async (overrideStatus?: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const payload: Record<string, unknown> = {
        user_id: session.user.id,
        workspace_name: workspaceNameRef.current,
        name,
        tone,
        response_length: responseLength,
        business_context: businessContext,
        alignment,
        welcome_message: welcomeMessage,
        message_placeholder: messagePlaceholder,
        footer_text: footerText,
        updated_at: new Date().toISOString(),
      };
      if (overrideStatus) payload.status = overrideStatus;

      if (agentIdRef.current) {
        const { error } = await supabase.from("chatbot_agents").update(payload).eq("id", agentIdRef.current);
        if (error) {
          console.error("Error updating agent:", error);
          toast({ title: "Couldn't save changes", description: error.message, status: "error", isClosable: true });
        }
      } else {
        if (insertInFlightRef.current) return;
        insertInFlightRef.current = true;
        try {
          const { data, error } = await supabase
            .from("chatbot_agents")
            .insert(payload)
            .select("id")
            .single();
          if (error) {
            console.error("Error creating agent:", error);
            toast({ title: "Couldn't create agent", description: error.message, status: "error", isClosable: true });
          } else if (data) {
            agentIdRef.current = data.id;
            setAgentId(data.id);
          }
        } finally {
          insertInFlightRef.current = false;
        }
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handlePublish = async () => {
    setAgentStatus("Published");
    lastSavedSnapshotRef.current = buildSnapshot();
    await saveAgentToDatabase("Published");
    toast({ title: "Agent published", status: "success" });
  };

  const handleBack = async () => {
    const snapshot = buildSnapshot();
    const hasUnsavedChanges = lastSavedSnapshotRef.current !== null && lastSavedSnapshotRef.current !== snapshot;

    if (hasUnsavedChanges) {
      lastSavedSnapshotRef.current = snapshot;
      await saveAgentToDatabase();
    }

    router.push(`/builder?tab=chatbot`);
  };

  if (isLoading) {
    return <FullPageLoader />;
  }

  return (
    <Box h="100dvh" w="100vw" bg="customGray.100" position="relative" overflow="hidden">
      <VStack h="100%" w="100%" align="stretch" spacing={0} overflow="hidden">
        <Box minH="60px" h="60px" bg="white" pl="16px" pr="16px" display="flex" alignItems="center" justifyContent="space-between" borderBottom="1px solid" borderColor="customGray.200" flexShrink={0}>
          <HStack spacing="6px">
            <IconButton
              size="sm"
              icon={<ArrowBackIcon w="20px" h="20px" />}
              variant="ghost"
              color="customGray.800"
              _hover={{ bg: "customGray.100" }}
              onClick={handleBack}
              aria-label="Back"
            />
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Untitled agent"
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
            <Box px="8px" py="2px" bg={agentStatus === "Published" ? "green.100" : "customGray.100"} borderRadius="full">
              <Text fontSize="xs" fontWeight="medium" color={agentStatus === "Published" ? "green.700" : "customGray.600"}>{agentStatus}</Text>
            </Box>
          </HStack>

          <HStack spacing="8px">
            <Button size="sm" px="14px" variant="outline" borderColor="customGray.300" color="customGray.800" _hover={{ bg: "customGray.50" }}>
              Preview
            </Button>
            <Button size="sm" px="14px" bg="brand.primary" color="white" _hover={{ bg: "brand.primaryHover" }} onClick={handlePublish}>
              Publish
            </Button>
          </HStack>
        </Box>

        <Flex flex={1} w="100%" overflow="hidden">
          {/* Settings */}
          <VStack
            flex="1"
            h="100%"
            align="stretch"
            spacing={0}
            overflowY="auto"
            borderRight="1px solid"
            borderColor="customGray.200"
            sx={{
              '&::-webkit-scrollbar': { width: '6px' },
              '&::-webkit-scrollbar-track': { bg: 'transparent' },
              '&::-webkit-scrollbar-thumb': { bg: 'customGray.300', borderRadius: '3px' },
            }}
          >
            {/* Deploy */}
            <Box borderBottom="1px solid" borderColor="customGray.200">
              <HStack px="24px" py="16px" spacing="8px" cursor="pointer" onClick={() => setIsDeployOpen(!isDeployOpen)}>
                <ChevronDownIcon w="16px" h="16px" color="customGray.600" transform={isDeployOpen ? "rotate(0deg)" : "rotate(-90deg)"} transition="transform 0.15s" />
                <Text fontSize="sm" fontWeight="600" color="customGray.800">Deploy</Text>
                <Text fontSize="sm" color="customGray.500">· Add the chat widget to your site</Text>
              </HStack>
              <Collapse in={isDeployOpen} animateOpacity>
                <Box px="24px" pb="20px">
                  <Text fontSize="sm" fontWeight="600" color="customGray.800" mb="4px">Installation</Text>
                  <Text fontSize="xs" color="customGray.500" mb="10px">Copy and paste the embed code near the end of your &lt;body&gt; tag</Text>
                  <Box position="relative" bg="customGray.50" border="1px solid" borderColor="customGray.200" borderRadius="8px" p="12px" pr="36px" maxH="120px" overflowY="auto">
                    <Text as="pre" fontSize="xs" fontFamily="mono" color="customGray.700" whiteSpace="pre-wrap" wordBreak="break-all">
                      {embedCode}
                    </Text>
                    <IconButton
                      aria-label="Copy embed code"
                      icon={<CopyIcon w="12px" h="12px" />}
                      size="xs"
                      variant="ghost"
                      position="absolute"
                      top="8px"
                      right="8px"
                      color="customGray.500"
                      _hover={{ bg: "customGray.200" }}
                      onClick={() => {
                        navigator.clipboard.writeText(embedCode);
                        toast({ title: "Embed code copied", status: "success", duration: 1500 });
                      }}
                    />
                  </Box>
                </Box>
              </Collapse>
            </Box>

            {/* Guidance */}
            <Box borderBottom="1px solid" borderColor="customGray.200">
              <HStack px="24px" py="16px" spacing="8px" cursor="pointer" onClick={() => setIsGuidanceOpen(!isGuidanceOpen)}>
                <ChevronDownIcon w="16px" h="16px" color="customGray.600" transform={isGuidanceOpen ? "rotate(0deg)" : "rotate(-90deg)"} transition="transform 0.15s" />
                <Text fontSize="sm" fontWeight="600" color="customGray.800">Guidance</Text>
                <Text fontSize="sm" color="customGray.500">· Set guidelines for handling conversations</Text>
              </HStack>
              <Collapse in={isGuidanceOpen} animateOpacity>
                <VStack align="stretch" spacing={0} px="24px" pb="8px">
                  <HStack justify="space-between" py="14px" borderBottom="1px solid" borderColor="customGray.100" align="flex-start">
                    <Box>
                      <Text fontSize="sm" fontWeight="600" color="customGray.800">Tone</Text>
                      <Text fontSize="xs" color="customGray.500">Set your agent's tone of voice</Text>
                    </Box>
                    <Menu>
                      <MenuButton as={Button} size="sm" rightIcon={<ChevronDownIcon w="14px" h="14px" />} bg="customGray.100" color="customGray.800" fontWeight="500" _hover={{ bg: "customGray.200" }} _active={{ bg: "customGray.200" }} flexShrink={0}>
                        {tone}
                      </MenuButton>
                      <MenuList fontSize="sm" minW="140px">
                        {["Professional", "Friendly", "Casual", "Formal"].map((option) => (
                          <MenuItem key={option} onClick={() => setTone(option)}>{option}</MenuItem>
                        ))}
                      </MenuList>
                    </Menu>
                  </HStack>
                  <HStack justify="space-between" py="14px" borderBottom="1px solid" borderColor="customGray.100" align="flex-start">
                    <Box>
                      <Text fontSize="sm" fontWeight="600" color="customGray.800">Response length</Text>
                      <Text fontSize="xs" color="customGray.500">Set the desired response length</Text>
                    </Box>
                    <Menu>
                      <MenuButton as={Button} size="sm" rightIcon={<ChevronDownIcon w="14px" h="14px" />} bg="customGray.100" color="customGray.800" fontWeight="500" _hover={{ bg: "customGray.200" }} _active={{ bg: "customGray.200" }} flexShrink={0}>
                        {responseLength}
                      </MenuButton>
                      <MenuList fontSize="sm" minW="140px">
                        {["Concise", "Standard", "Detailed"].map((option) => (
                          <MenuItem key={option} onClick={() => setResponseLength(option)}>{option}</MenuItem>
                        ))}
                      </MenuList>
                    </Menu>
                  </HStack>
                  <Box py="14px">
                    <Text fontSize="sm" fontWeight="600" color="customGray.800" mb="2px">Business context</Text>
                    <Text fontSize="xs" color="customGray.500" mb="10px">Adding detailed context about your business helps your agent provide more accurate and helpful responses to your customers</Text>
                    <Textarea
                      value={businessContext}
                      onChange={(e) => setBusinessContext(e.target.value)}
                      placeholder="Provide relevant information about your business to help the agent provide accurate support to customers and avoid hallucination. This can include: your contact details, working hours, refund policy, etc."
                      fontSize="sm"
                      color="customGray.800"
                      _placeholder={{ color: "customGray.400" }}
                      borderColor="customGray.300"
                      minH="90px"
                      resize="vertical"
                    />
                  </Box>
                </VStack>
              </Collapse>
            </Box>

            {/* Appearance */}
            <Box borderBottom="1px solid" borderColor="customGray.200">
              <HStack px="24px" py="16px" spacing="8px" cursor="pointer" onClick={() => setIsAppearanceOpen(!isAppearanceOpen)}>
                <ChevronDownIcon w="16px" h="16px" color="customGray.600" transform={isAppearanceOpen ? "rotate(0deg)" : "rotate(-90deg)"} transition="transform 0.15s" />
                <Text fontSize="sm" fontWeight="600" color="customGray.800">Appearance</Text>
                <Text fontSize="sm" color="customGray.500">· Customize how the chatbot looks and behaves</Text>
              </HStack>
              <Collapse in={isAppearanceOpen} animateOpacity>
                <VStack align="stretch" spacing={0} px="24px" pb="20px">
                  <Box py="14px" borderBottom="1px solid" borderColor="customGray.100">
                    <Text fontSize="sm" fontWeight="600" color="customGray.800" mb="2px">Alignment</Text>
                    <Text fontSize="xs" color="customGray.500" mb="10px">Display the chatbot on the left or right side of the embedded page</Text>
                    <HStack spacing="8px">
                      {(["left", "right"] as const).map((side) => (
                        <Button
                          key={side}
                          size="sm"
                          variant="outline"
                          leftIcon={
                            <Box w="14px" h="12px" border="1.5px solid" borderColor="currentColor" borderRadius="2px" display="flex" alignItems="center" justifyContent={side === "left" ? "flex-start" : "flex-end"} p="1px">
                              <Box w="4px" h="100%" bg="currentColor" borderRadius="1px" />
                            </Box>
                          }
                          bg={alignment === side ? "customGray.100" : "white"}
                          borderColor={alignment === side ? "customGray.300" : "customGray.200"}
                          color="customGray.800"
                          fontWeight="500"
                          _hover={{ bg: "customGray.100" }}
                          onClick={() => setAlignment(side)}
                          textTransform="capitalize"
                        >
                          {side}
                        </Button>
                      ))}
                    </HStack>
                  </Box>
                  <Box py="14px" borderBottom="1px solid" borderColor="customGray.100">
                    <Text fontSize="sm" fontWeight="600" color="customGray.800" mb="2px">Welcome message</Text>
                    <Text fontSize="xs" color="customGray.500" mb="10px">The initial message sent when a customer starts a conversation</Text>
                    <Textarea
                      value={welcomeMessage}
                      onChange={(e) => setWelcomeMessage(e.target.value)}
                      fontSize="sm"
                      color="customGray.800"
                      borderColor="customGray.300"
                      minH="60px"
                      resize="vertical"
                    />
                  </Box>
                  <Box py="14px" borderBottom="1px solid" borderColor="customGray.100">
                    <Text fontSize="sm" fontWeight="600" color="customGray.800" mb="2px">Message placeholder</Text>
                    <Text fontSize="xs" color="customGray.500" mb="10px">The placeholder text customers see in the message box</Text>
                    <Input
                      value={messagePlaceholder}
                      onChange={(e) => setMessagePlaceholder(e.target.value)}
                      fontSize="sm"
                      color="customGray.800"
                      borderColor="customGray.300"
                    />
                  </Box>
                  <Box py="14px" borderBottom="1px solid" borderColor="customGray.100">
                    <Text fontSize="sm" fontWeight="600" color="customGray.800" mb="2px">Footer text</Text>
                    <Text fontSize="xs" color="customGray.500" mb="10px">Optional text displayed at the bottom of the chatbot. Select text to add links.</Text>
                    <Input
                      value={footerText}
                      onChange={(e) => setFooterText(e.target.value)}
                      fontSize="sm"
                      color="customGray.800"
                      borderColor="customGray.300"
                    />
                  </Box>
                  <Box py="14px">
                    <Text fontSize="sm" fontWeight="600" color="customGray.800" mb="2px">Quick prompts</Text>
                    <Text fontSize="xs" color="customGray.500" mb="10px">Prompts appear above the message input, giving customers an easy way to ask questions</Text>
                    <Button size="sm" bg="customGray.100" color="customGray.800" fontWeight="500" _hover={{ bg: "customGray.200" }}>
                      Manage · 0
                    </Button>
                  </Box>
                </VStack>
              </Collapse>
            </Box>
          </VStack>

          {/* Live preview */}
          <Box flex="1" h="100%" bg="customGray.100" display="flex" alignItems="center" justifyContent="center" p="24px" overflow="hidden" position="relative">
            {isWidgetOpen && (
              <Box bg="white" borderRadius="20px" boxShadow="0 20px 40px rgba(0,0,0,0.12)" w="360px" maxH="100%" display="flex" flexDirection="column" position="relative" overflow="hidden">
                <HStack px="16px" py="14px" borderBottom="1px solid" borderColor="customGray.100" spacing="10px">
                  <Box w="28px" h="28px" borderRadius="full" bg="customGray.800" display="flex" alignItems="center" justifyContent="center" flexShrink={0}>
                    <Text fontSize="xs" fontWeight="600" color="white">{(name || "U").charAt(0).toUpperCase()}</Text>
                  </Box>
                  <Text fontSize="md" fontWeight="600" color="customGray.800" flex="1">{name}</Text>
                  <IconButton aria-label="Reset conversation" icon={<RepeatIcon w="14px" h="14px" />} size="xs" variant="ghost" color="customGray.500" _hover={{ bg: "customGray.100" }} onClick={() => setPreviewMessages([])} />
                  <IconButton aria-label="Close preview" icon={<CloseIcon w="12px" h="12px" />} size="xs" variant="ghost" color="customGray.500" _hover={{ bg: "customGray.100" }} onClick={() => setIsWidgetOpen(false)} />
                </HStack>

                <VStack align="stretch" spacing="12px" px="16px" py="16px" flex="1" overflowY="auto" minH="220px">
                  <HStack spacing="10px" align="flex-start">
                    <Box w="24px" h="24px" borderRadius="full" bg="customGray.200" display="flex" alignItems="center" justifyContent="center" flexShrink={0} mt="2px">
                      <Text fontSize="xs" fontWeight="600" color="customGray.700">I</Text>
                    </Box>
                    <Box bg="customGray.100" borderRadius="12px" px="14px" py="10px">
                      <Text fontSize="sm" color="customGray.800">{welcomeMessage}</Text>
                    </Box>
                  </HStack>
                  {previewMessages.map((message, index) =>
                    message.role === "user" ? (
                      <HStack key={index} justify="flex-end">
                        <Box bg="customGray.800" borderRadius="12px" px="14px" py="10px" maxW="80%">
                          <Text fontSize="sm" color="white">{message.content}</Text>
                        </Box>
                      </HStack>
                    ) : (
                      <HStack key={index} spacing="10px" align="flex-start">
                        <Box w="24px" h="24px" borderRadius="full" bg="customGray.200" display="flex" alignItems="center" justifyContent="center" flexShrink={0} mt="2px">
                          <Text fontSize="xs" fontWeight="600" color="customGray.700">I</Text>
                        </Box>
                        <Box bg="customGray.100" borderRadius="12px" px="14px" py="10px" maxW="80%">
                          <Text fontSize="sm" color="customGray.800" whiteSpace="pre-wrap">{message.content}</Text>
                        </Box>
                      </HStack>
                    )
                  )}
                  {isPreviewSending && (
                    <HStack spacing="10px" align="flex-start">
                      <Box w="24px" h="24px" borderRadius="full" bg="customGray.200" display="flex" alignItems="center" justifyContent="center" flexShrink={0} mt="2px">
                        <Text fontSize="xs" fontWeight="600" color="customGray.700">I</Text>
                      </Box>
                      <Box bg="customGray.100" borderRadius="12px" px="14px" py="10px">
                        <Text fontSize="sm" color="customGray.500">Typing...</Text>
                      </Box>
                    </HStack>
                  )}
                  <Box ref={previewMessagesEndRef} />
                </VStack>

                <Box px="16px" pb="12px">
                  <HStack border="1px solid" borderColor="customGray.200" borderRadius="full" pl="14px" pr="6px" h="40px" spacing="6px">
                    <Input
                      value={previewInput}
                      onChange={(e) => setPreviewInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleSendPreviewMessage();
                        }
                      }}
                      placeholder={messagePlaceholder}
                      variant="unstyled"
                      fontSize="sm"
                      flex="1"
                      isDisabled={isPreviewSending}
                      _placeholder={{ color: "customGray.400" }}
                    />
                    <IconButton aria-label="Attach file" icon={<AttachmentIcon w="14px" h="14px" />} size="xs" variant="ghost" color="customGray.400" _hover={{ bg: "customGray.100" }} />
                    <IconButton
                      aria-label="Send message"
                      icon={<ArrowUpIcon w="14px" h="14px" />}
                      size="xs"
                      borderRadius="full"
                      bg={previewInput.trim() === "" ? "customGray.200" : "customGray.800"}
                      color={previewInput.trim() === "" ? "customGray.500" : "white"}
                      _hover={previewInput.trim() === "" ? { bg: "customGray.300" } : { bg: "customGray.700" }}
                      isLoading={isPreviewSending}
                      isDisabled={previewInput.trim() === ""}
                      onClick={handleSendPreviewMessage}
                    />
                  </HStack>
                  {footerText && (
                    <Text fontSize="xs" color="customGray.400" textAlign="center" mt="10px">
                      {footerText}
                    </Text>
                  )}
                </Box>

                <HStack justify="center" py="10px" borderTop="1px solid" borderColor="customGray.100" bg="customGray.50" spacing="6px">
                  <Box w="12px" h="12px" display="flex" alignItems="center" justifyContent="center">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M4 6L12 2L20 6L12 10L4 6Z" fill="#A1A1AA"/>
                      <path d="M4 12L12 8L20 12L12 16L4 12Z" fill="#A1A1AA"/>
                      <path d="M4 18L12 14L20 18L12 22L4 18Z" fill="#A1A1AA"/>
                    </svg>
                  </Box>
                  <Text fontSize="xs" color="customGray.500">Powered by Weav</Text>
                </HStack>
              </Box>
            )}

            <IconButton
              aria-label={isWidgetOpen ? "Close chat widget" : "Open chat widget"}
              icon={isWidgetOpen ? <ChevronDownIcon w="18px" h="18px" /> : <ChevronUpIcon w="18px" h="18px" />}
              position="absolute"
              bottom="24px"
              right="24px"
              size="lg"
              borderRadius="full"
              bg="customGray.800"
              color="white"
              boxShadow="0 8px 20px rgba(0,0,0,0.25)"
              _hover={{ bg: "customGray.700" }}
              onClick={() => setIsWidgetOpen(!isWidgetOpen)}
            />
          </Box>
        </Flex>
      </VStack>
    </Box>
  );
}
