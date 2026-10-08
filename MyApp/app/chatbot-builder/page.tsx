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
import { HIDE_NATIVE_SCROLLBAR_SX } from "@/app/components/FloatingScrollbar";
import { AgentConfigPanel, type AgentConfig } from "@/app/components/AgentConfigPanel";

const TABS = ["Build", "Design", "Deploy"];

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

  const [tabIndex, setTabIndex] = useState(0);
  // New AI agents open on a prompt screen first; rule-based ones and any
  // existing agent go straight into the builder.
  const [agentType, setAgentType] = useState<"rules" | "ai">("rules");
  const [isIntroOpen, setIsIntroOpen] = useState(false);
  const [introPrompt, setIntroPrompt] = useState("");
  const [tone, setTone] = useState("Professional");
  const [responseLength, setResponseLength] = useState("Standard");
  const [businessContext, setBusinessContext] = useState("");
  const [config, setConfig] = useState<AgentConfig>({});
  const hasConfigColumnRef = useRef(true);
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
        const typeParam = params.get("type");
        workspaceNameRef.current = params.get("workspace") || null;
        if (typeParam === "ai" || typeParam === "rules") {
          setAgentType(typeParam);
          setIsIntroOpen(!idParam && typeParam === "ai");
          // Named in the "New chatbot" step before the builder opened.
          const nameParam = params.get("name");
          if (!idParam && nameParam) setName(nameParam);
          const descriptionParam = params.get("description");
          if (!idParam && descriptionParam) setBusinessContext(descriptionParam);
        } else if (!idParam) {
          // A brand new chatbot with no type chosen yet — that question has its
          // own page, so send them there rather than opening an empty builder.
          const workspace = workspaceNameRef.current;
          router.replace(workspace ? `/agents/new?workspace=${encodeURIComponent(workspace)}` : "/agents/new");
          return;
        }

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
            setAgentType(data.agent_type === "ai" ? "ai" : "rules");
            setName(data.name || "Untitled");
            setTone(data.tone || "Professional");
            setResponseLength(data.response_length || "Standard");
            setBusinessContext(data.business_context || "");
            setConfig((data.config as AgentConfig) || {});
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

  const updateConfig = (patch: Partial<AgentConfig>) => setConfig((current) => ({ ...current, ...patch }));

  const addKnowledgeFile = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "That file is over 5MB", status: "error", duration: 3000 });
      return;
    }
    const path = `knowledge/${agentIdRef.current ?? "new"}-${Date.now()}-${file.name}`;
    // Prefer a dedicated bucket; fall back to the one that already exists.
    let bucket = "agent-knowledge";
    let uploadError = (await supabase.storage.from(bucket).upload(path, file)).error;
    if (uploadError) {
      bucket = "comment-attachments";
      uploadError = (await supabase.storage.from(bucket).upload(path, file)).error;
    }
    if (uploadError) {
      toast({ title: "Couldn't upload that file", description: uploadError.message, status: "error" });
      return;
    }
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    updateConfig({ knowledge: [...(config.knowledge || []), { id: path, name: file.name, url: data.publicUrl }] });
  };

  const buildSnapshot = () =>
    JSON.stringify({ name, tone, responseLength, businessContext, alignment, welcomeMessage, messagePlaceholder, footerText, config });

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
  }, [name, tone, responseLength, businessContext, alignment, welcomeMessage, messagePlaceholder, footerText, config, agentId, isLoading]);

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
        agent_type: agentType,
        updated_at: new Date().toISOString(),
      };
      if (hasConfigColumnRef.current) payload.config = config;
      if (overrideStatus) payload.status = overrideStatus;

      // agent_type arrived with the chatbot-type chooser; drop it when the
      // column hasn't been added yet rather than failing the whole save.
      const withoutAgentType = () => {
        const { agent_type: _agentType, config: _config, ...rest } = payload;
        hasConfigColumnRef.current = false;
        return rest;
      };
      const isMissingColumn = (error: { code?: string }) => error.code === "42703" || error.code === "PGRST204";

      if (agentIdRef.current) {
        let { error } = await supabase.from("chatbot_agents").update(payload).eq("id", agentIdRef.current);
        if (error && isMissingColumn(error)) {
          ({ error } = await supabase.from("chatbot_agents").update(withoutAgentType()).eq("id", agentIdRef.current));
        }
        if (error) {
          console.error("Error updating agent:", error);
          toast({ title: "Couldn't save changes", description: error.message, status: "error", isClosable: true });
        }
      } else {
        if (insertInFlightRef.current) return;
        insertInFlightRef.current = true;
        try {
          let { data, error } = await supabase
            .from("chatbot_agents")
            .insert(payload)
            .select("id")
            .single();
          if (error && isMissingColumn(error)) {
            ({ data, error } = await supabase
              .from("chatbot_agents")
              .insert(withoutAgentType())
              .select("id")
              .single());
          }
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

  const startFromPrompt = () => {
    const goal = introPrompt.trim();
    if (goal) {
      setBusinessContext(goal);
      // First line doubles as a working name until the user renames it.
      const firstLine = goal.split("\n")[0].slice(0, 60);
      if (firstLine) setName(firstLine);
    }
    setIsIntroOpen(false);
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

    router.push("/agents");
  };

  if (isLoading) {
    return <FullPageLoader />;
  }

  // Row shapes lifted from the calendar builder's Build panel so both
  // creation flows read the same: label left, control right, hairline between.
  const fieldStyles = {
    bg: "customGray.50",
    border: "1px solid",
    borderColor: "customGray.300",
    borderRadius: "md",
    fontSize: "14px",
    color: "customGray.800",
    _hover: { borderColor: "customGray.400" },
    _focus: { bg: "customGray.50", borderColor: "customGray.500", boxShadow: "0 0 0 3px rgba(39, 39, 42, 0.1)" },
  };

  const Divider = () => <Box h="1px" bg="customGray.200" w="100%" />;

  return (
    <Box position="fixed" top={0} left={0} right={0} bottom={0} bg="appBg" overflow="hidden">
      <VStack h="100%" w="100%" align="stretch" spacing={0} overflow="hidden">

        {/* Top bar: back + inline title on the left, tabs centred, actions right */}
        <Box minH="60px" h="60px" bg="white" pl="16px" pr="16px" display="flex" alignItems="center" justifyContent="center" position="relative" borderBottom="1px solid" borderColor="customGray.200" zIndex="20" flexShrink={0}>
          {/* The name is edited in the panel below, so this is just the way out. */}
          <HStack spacing="6px" position="absolute" left="16px">
            <Button
              size="sm"
              variant="ghost"
              iconSpacing="8px"
              color="customGray.800"
              fontSize="14px"
              fontWeight="500"
              _hover={{ bg: "customGray.100" }}
              leftIcon={
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10.9688 5.0625L7.03125 9L10.9688 12.9375" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              }
              onClick={handleBack}
            >
              Back
            </Button>
          </HStack>

          <HStack spacing="24px" display={isIntroOpen ? "none" : "flex"}>
            {TABS.map((label, index) => (
              <Text
                key={label}
                fontSize="14px"
                color={tabIndex === index ? "customGray.800" : "customGray.600"}
                fontWeight={tabIndex === index ? "500" : "400"}
                cursor="pointer"
                onClick={() => setTabIndex(index)}
                pb="2px"
                borderBottom={tabIndex === index ? "2px solid" : "none"}
                borderBottomColor={tabIndex === index ? "customGray.800" : "transparent"}
              >
                {label}
              </Text>
            ))}
          </HStack>

          <HStack spacing="8px" position="absolute" right="16px" display={isIntroOpen ? "none" : "flex"}>
            <Button
              size="sm"
              px="14px"
              variant="outline"
              borderColor="customGray.300"
              color="customGray.800"
              _hover={{ bg: "customGray.50" }}
              onClick={() => setIsWidgetOpen(true)}
            >
              Preview
            </Button>
            {tabIndex < TABS.length - 1 ? (
              <Button
                size="sm"
                px="14px"
                bg="brand.primary"
                color="white"
                _hover={{ bg: "brand.primaryHover" }}
                onClick={() => setTabIndex(tabIndex + 1)}
              >
                Next
              </Button>
            ) : (
              <Button
                size="sm"
                px="14px"
                bg="brand.primary"
                color="white"
                _hover={{ bg: "brand.primaryHover" }}
                onClick={handlePublish}
              >
                Publish
              </Button>
            )}
          </HStack>
        </Box>

        {isIntroOpen ? (
          <Box flex="1" w="100%" bg="customGray.50" overflowY="auto" display="flex" alignItems="center" justifyContent="center" p="24px">
            <VStack spacing="0" w="100%" maxW="620px">
              <Text fontSize="14px" color="customGray.500">AI agent</Text>
              <Text fontSize="24px" fontWeight="500" color="customGray.800" mt="6px" textAlign="center">
                What would you like to create?
              </Text>

              <Box
                w="100%"
                mt="28px"
                bg="white"
                border="1px solid"
                borderColor="customGray.300"
                borderRadius="14px"
                p="4px"
                boxShadow="0 1px 2px rgba(0, 0, 0, 0.04)"
              >
                <Textarea
                  value={introPrompt}
                  onChange={(e) => setIntroPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      startFromPrompt();
                    }
                  }}
                  placeholder="Explain what this agent should help your visitors with."
                  variant="unstyled"
                  minH="120px"
                  px="14px"
                  pt="12px"
                  fontSize="15px"
                  color="customGray.800"
                  _placeholder={{ color: "customGray.400" }}
                  resize="none"
                />
                <HStack justify="flex-end" px="10px" pb="8px">
                  <IconButton
                    aria-label="Use this description"
                    icon={<ArrowUpIcon w="16px" h="16px" />}
                    size="sm"
                    borderRadius="full"
                    bg={introPrompt.trim() === "" ? "customGray.200" : "customGray.800"}
                    color={introPrompt.trim() === "" ? "customGray.500" : "white"}
                    _hover={introPrompt.trim() === "" ? { bg: "customGray.300" } : { bg: "customGray.700" }}
                    isDisabled={introPrompt.trim() === ""}
                    onClick={startFromPrompt}
                  />
                </HStack>
              </Box>

              <Box h="1px" w="100%" bg="customGray.200" my="32px" />

              <Button
                size="md"
                px="24px"
                h="44px"
                borderRadius="10px"
                bg="customGray.100"
                color="customGray.800"
                fontSize="14px"
                fontWeight="400"
                _hover={{ bg: "customGray.200" }}
                onClick={() => setIsIntroOpen(false)}
              >
                Start from scratch
              </Button>
            </VStack>
          </Box>
        ) : (
        <HStack spacing="0px" flex="1" minH="0" align="stretch" w="100%" overflow="hidden">
          {/* Left panel */}
          {tabIndex === 0 ? (
            <AgentConfigPanel
                name={name}
                onNameChange={setName}
                config={config}
                onConfigChange={updateConfig}
                tone={tone}
                onToneChange={setTone}
                responseLength={responseLength}
                onResponseLengthChange={setResponseLength}
                instructions={businessContext}
                onInstructionsChange={setBusinessContext}
                onAddKnowledgeFile={addKnowledgeFile}
                markVariant={agentId ?? 0}
              />
          ) : (
            <Box
              flex="1"
              minW="0"
              h="100%"
              minH="0"
              bg="white"
              borderRight="1px solid"
              borderColor="customGray.200"
              overflowX="hidden"
              overflowY="auto"
              sx={HIDE_NATIVE_SCROLLBAR_SX}
            >
              {tabIndex === 1 ? (
              <VStack spacing="0px" align="stretch" w="100%">
                <VStack spacing="2px" align="stretch" py="20px" px="20px">
                  <Text fontSize="14px" fontWeight="500" color="customGray.800">Alignment</Text>
                  <Text fontSize="xs" color="customGray.500">Which side of the page the chat widget sits on.</Text>
                  <HStack spacing="8px" pt="12px">
                    {(["left", "right"] as const).map((side) => (
                      <Button
                        key={side}
                        size="sm"
                        variant="outline"
                        fontSize="14px"
                        fontWeight="400"
                        leftIcon={
                          <Box w="14px" h="12px" border="1.5px solid" borderColor="currentColor" borderRadius="2px" display="flex" alignItems="center" justifyContent={side === "left" ? "flex-start" : "flex-end"} p="1px">
                            <Box w="4px" h="100%" bg="currentColor" borderRadius="1px" />
                          </Box>
                        }
                        bg={alignment === side ? "customGray.100" : "white"}
                        borderColor={alignment === side ? "customGray.300" : "customGray.200"}
                        color="customGray.800"
                        _hover={{ bg: "customGray.100" }}
                        onClick={() => setAlignment(side)}
                        textTransform="capitalize"
                      >
                        {side}
                      </Button>
                    ))}
                  </HStack>
                </VStack>

                <Divider />

                <VStack spacing="2px" align="stretch" py="20px" px="20px">
                  <Text fontSize="14px" fontWeight="500" color="customGray.800">Message placeholder</Text>
                  <Text fontSize="xs" color="customGray.500">The hint text inside the message box.</Text>
                  <Box pt="12px">
                    <Input value={messagePlaceholder} onChange={(e) => setMessagePlaceholder(e.target.value)} {...fieldStyles} />
                  </Box>
                </VStack>

                <Divider />

                <VStack spacing="2px" align="stretch" py="20px" px="20px">
                  <Text fontSize="14px" fontWeight="500" color="customGray.800">Footer text</Text>
                  <Text fontSize="xs" color="customGray.500">Shown under the message box — a good spot for privacy and terms links.</Text>
                  <Box pt="12px">
                    <Input value={footerText} onChange={(e) => setFooterText(e.target.value)} {...fieldStyles} />
                  </Box>
                </VStack>

                <Divider />

                <VStack spacing="2px" align="stretch" py="20px" px="20px">
                  <Text fontSize="14px" fontWeight="500" color="customGray.800">Quick prompts</Text>
                  <Text fontSize="xs" color="customGray.500">Suggested questions above the message box, so customers know where to start.</Text>
                  <Text fontSize="xs" color="customGray.500" pt="8px">
                    Taken from the Fields list on the Build tab.
                  </Text>
                </VStack>
              </VStack>
            ) : (
              <VStack spacing="0px" align="stretch" w="100%">
                <VStack spacing="2px" align="stretch" py="20px" px="20px">
                  <Text fontSize="14px" fontWeight="500" color="customGray.800">Installation</Text>
                  <Text fontSize="xs" color="customGray.500">Paste this near the end of your &lt;body&gt; tag.</Text>
                  <Box position="relative" bg="customGray.50" border="1px solid" borderColor="customGray.300" borderRadius="md" p="12px" pr="36px" mt="12px" maxH="220px" overflowY="auto" sx={HIDE_NATIVE_SCROLLBAR_SX}>
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
                </VStack>

                <Divider />

                <VStack spacing="2px" align="stretch" py="20px" px="20px">
                  <Text fontSize="14px" fontWeight="500" color="customGray.800">Status</Text>
                  <Text fontSize="xs" color="customGray.500">
                    {agentStatus === "Published"
                      ? "This agent is live wherever the embed code is installed."
                      : "Publish the agent to make it answer on your site."}
                  </Text>
                </VStack>
              </VStack>
              )}
            </Box>
          )}

          {/* Live preview */}
          <Box
            // 620px up to a 1536px laptop; half the window on anything wider.
            w="620px"
            flexShrink={0}
            h="100%"
            bg="customGray.100"
            p="24px"
            display="flex"
            alignItems="center"
            justifyContent="center"
            overflow="hidden"
            position="relative"
            sx={{
              backgroundImage: "radial-gradient(circle, rgba(169, 169, 169, 0.1) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
              "@media (min-width: 1537px)": { width: "50%" },
            }}
          >
            <VStack spacing="16px" align="flex-end" maxH="100%">
            {isWidgetOpen && (
              <Box bg="white" borderRadius="20px" boxShadow="0 20px 40px rgba(0,0,0,0.12)" w="400px" h="540px" maxH="100%" display="flex" flexDirection="column" position="relative" overflow="hidden">
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

                {/* Suggested questions, tapped instead of typed. */}
                {(config.fields || []).filter((prompt) => prompt.trim()).length > 0 && (
                  <Flex px="16px" pb="10px" gap="8px" wrap="wrap" justify="flex-end">
                    {(config.fields || [])
                      .filter((prompt) => prompt.trim())
                      .map((prompt, index) => (
                        <Box
                          key={index}
                          as="button"
                          px="14px"
                          py="7px"
                          minH="34px"
                          maxW="100%"
                          borderRadius="17px"
                          border="1px solid"
                          borderColor="customGray.200"
                          bg="white"
                          textAlign="left"
                          _hover={{ bg: "customGray.50" }}
                          onClick={() => setPreviewInput(prompt)}
                        >
                          {/* Long prompts wrap inside the pill instead of
                              stretching it past the widget. */}
                          <Text fontSize="sm" color="customGray.800" wordBreak="break-word">{prompt}</Text>
                        </Box>
                      ))}
                  </Flex>
                )}

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
              flexShrink={0}
              size="lg"
              borderRadius="full"
              bg="customGray.800"
              color="white"
              boxShadow="0 8px 20px rgba(0,0,0,0.25)"
              _hover={{ bg: "customGray.700" }}
              onClick={() => setIsWidgetOpen(!isWidgetOpen)}
            />
            </VStack>
          </Box>
        </HStack>
        )}
      </VStack>

    </Box>
  );
}
