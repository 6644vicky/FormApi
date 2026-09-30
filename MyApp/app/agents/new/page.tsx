"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Box, Button, HStack, Input, Text, VStack, useToast } from "@chakra-ui/react";
import { ArrowForwardIcon } from "@chakra-ui/icons";
import { supabase } from "@/lib/supabase";

const MAX_NAME_LENGTH = 50;

export default function NewChatbotPage() {
  const router = useRouter();
  const toast = useToast({ position: "top" });
  const [isCreating, setIsCreating] = useState(false);
  const [workspace, setWorkspace] = useState("");
  // The avatar's eyes track the pointer. Position is written straight to the
  // node each frame — going through React state (and a CSS transition that
  // restarts on every update) made it stutter.
  const avatarRef = useRef<HTMLDivElement>(null);
  const eyesRef = useRef<SVGGElement>(null);
  // Two steps on one page: pick the kind, then name it.
  const [step, setStep] = useState<"type" | "name">("type");
  const [chatbotName, setChatbotName] = useState("");

  useEffect(() => {
    // Carried through so the new agent lands in the workspace it was started from.
    setWorkspace(new URLSearchParams(window.location.search).get("workspace") || "");
    router.prefetch("/chatbot-builder");
  }, [router]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    let frame = 0;

    const onMove = (event: MouseEvent) => {
      const element = avatarRef.current;
      if (!element) return;
      const rect = element.getBoundingClientRect();
      const dx = event.clientX - (rect.left + rect.width / 2);
      const dy = event.clientY - (rect.top + rect.height / 2);
      const distance = Math.hypot(dx, dy) || 1;
      // Full travel once the pointer is ~200px away, so the eyes keep
      // responding across the whole page rather than pinning early.
      const travel = Math.min(distance / 200, 1) * 3.5;
      target.x = (dx / distance) * travel;
      target.y = (dy / distance) * travel;
    };

    // One rAF loop easing toward the target: smooth regardless of how often
    // mousemove fires, and it idles when nothing is moving.
    const tick = () => {
      current.x += (target.x - current.x) * 0.18;
      current.y += (target.y - current.y) * 0.18;
      const node = eyesRef.current;
      if (node) {
        node.style.transform = `translate(${current.x.toFixed(2)}px, ${current.y.toFixed(2)}px)`;
      }
      frame = requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    frame = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(frame);
    };
  }, []);

  const createChatbot = (agentType: "rules" | "ai") => {
    const workspaceParam = workspace ? `&workspace=${encodeURIComponent(workspace)}` : "";
    router.push(`/chatbot-builder?type=${agentType}${workspaceParam}`);
  };

  // A named chatbot is created straight away so it has an id, then lands on
  // its own page to be configured.
  const createAndOpenAgent = async () => {
    const trimmed = chatbotName.trim();
    if (!trimmed || isCreating) return;
    setIsCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push("/");
        return;
      }

      const payload: Record<string, unknown> = {
        user_id: session.user.id,
        workspace_name: workspace || null,
        name: trimmed,
        agent_type: "rules",
      };
      let { data, error } = await supabase.from("chatbot_agents").insert(payload).select("id").single();
      if (error && (error.code === "42703" || error.code === "PGRST204")) {
        // agent_type hasn't been added yet — create without it.
        delete payload.agent_type;
        ({ data, error } = await supabase.from("chatbot_agents").insert(payload).select("id").single());
      }
      if (error || !data) {
        toast({ title: "Couldn't create that chatbot", description: error?.message, status: "error" });
        return;
      }
      const workspaceParam = workspace ? `&workspace=${encodeURIComponent(workspace)}` : "";
      router.push(`/chatbot-builder?id=${data.id}${workspaceParam}`);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Box h="100dvh" w="100vw" bg="customGray.100" overflowY="auto" position="fixed" top={0} left={0}>
      <HStack pt="32px" pr="32px" spacing="6px" position="absolute" top="0" right="0">
        <Button
          size="sm"
          h="36px"
          px="10px"
          variant="ghost"
          fontSize="14px"
          fontWeight="400"
          color="customGray.800"
          iconSpacing="4px"
          leftIcon={
            <svg width="20" height="20" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5.625 5.625L12.375 12.375M12.375 5.625L5.625 12.375" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          }
          _hover={{ bg: "customDark.5" }}
          onClick={() => router.push("/agents")}
        >
          Close
        </Button>
      </HStack>

      <Box minH="100%" display="flex" alignItems="center" justifyContent="center" px="24px" py="32px">
        <VStack w="100%" maxW={step === "type" ? "720px" : "560px"} align="stretch" spacing="24px">
          {step === "type" ? (
          <>
          <Box>
            <Text fontSize="20px" fontWeight="500" color="customGray.800">New chatbot</Text>
            <Text fontSize="16px" color="customGray.500" mt="4px">How should it answer visitors?</Text>
          </Box>

          {/* The recommended route: a full-width row you step into. */}
          <HStack
            as="button"
            w="100%"
            spacing="16px"
            px="20px"
            py="16px"
            borderRadius="16px"
            border="1px solid"
            borderColor="customGray.200"
            bg="white"
            textAlign="left"
            transition="border-color 0.15s ease, box-shadow 0.15s ease"
            _hover={{ borderColor: "customGray.400", boxShadow: "0 0 0 4px var(--chakra-colors-customGray-200)" }}
            onClick={() => createChatbot("ai")}
          >
            <Box ref={avatarRef} w="44px" h="44px" flexShrink={0}>
              <svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
                <g clipPath="url(#ai-agent-clip)">
                  <rect width="44" height="44" rx="22" fill="white"/>
                  <g filter="url(#ai-agent-inner-1)">
                    <rect width="44" height="44.44" rx="22" fill="url(#ai-agent-fill-1)"/>
                  </g>
                  <g filter="url(#ai-agent-inner-2)" style={{ mixBlendMode: "overlay" }}>
                    <rect width="44" height="44.44" rx="22" fill="url(#ai-agent-fill-2)"/>
                  </g>
                  <g ref={eyesRef} filter="url(#ai-agent-bars-shadow)">
                    <rect x="18" y="17" width="6" height="14" rx="3" fill="white"/>
                    <rect x="30" y="17" width="6" height="14" rx="3" fill="white"/>
                  </g>
                </g>
                <defs>
                  <filter id="ai-agent-inner-1" x="0" y="0" width="44" height="44.4399" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                    <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                    <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                    <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
                    <feOffset/>
                    <feGaussianBlur stdDeviation="2.20536"/>
                    <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
                    <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 1 0"/>
                    <feBlend mode="normal" in2="shape" result="effect1_innerShadow"/>
                  </filter>
                  <filter id="ai-agent-inner-2" x="0" y="0" width="44" height="44.4399" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                    <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                    <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                    <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
                    <feOffset/>
                    <feGaussianBlur stdDeviation="2.20536"/>
                    <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
                    <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 1 0"/>
                    <feBlend mode="normal" in2="shape" result="effect1_innerShadow"/>
                  </filter>
                  <filter id="ai-agent-bars-shadow" x="14" y="17" width="26" height="22" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                    <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                    <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
                    <feOffset dy="4"/>
                    <feGaussianBlur stdDeviation="2"/>
                    <feComposite in2="hardAlpha" operator="out"/>
                    <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"/>
                    <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow"/>
                    <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow" result="shape"/>
                  </filter>
                  <linearGradient id="ai-agent-fill-1" x1="22" y1="0" x2="22" y2="44.44" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#ECDDFD"/>
                    <stop offset="1" stopColor="#AA6FFA"/>
                  </linearGradient>
                  <linearGradient id="ai-agent-fill-2" x1="-3.52" y1="-9.46" x2="35.0623" y2="36.8966" gradientUnits="userSpaceOnUse">
                    <stop offset="0.206993" stopColor="#D6BAFD"/>
                    <stop offset="0.644231" stopColor="#AA6FFA"/>
                    <stop offset="1" stopColor="#6A0CEB"/>
                  </linearGradient>
                  <clipPath id="ai-agent-clip">
                    <rect width="44" height="44" rx="22" fill="white"/>
                  </clipPath>
                </defs>
              </svg>
            </Box>
            <Box flex="1" minW="0">
              <HStack spacing="10px" align="center">
                <Text fontSize="16px" fontWeight="500" color="customGray.800">AI agent</Text>
                <Box px="10px" py="2px" borderRadius="full" bg="violet.100">
                  <Text fontSize="12px" fontWeight="500" color="violet.700">Premium</Text>
                </Box>
              </HStack>
              <Text fontSize="14px" color="customGray.500" mt="2px" maxW="480px">
                Automatically handles support tickets and responds to customers using your knowledge base.
              </Text>
            </Box>
            <ArrowForwardIcon boxSize="20px" color="customGray.800" flexShrink={0} />
          </HStack>

          <HStack spacing="16px">
            <Box flex="1" h="1px" bg="customGray.200" />
            <Text fontSize="14px" color="customGray.500">or</Text>
            <Box flex="1" h="1px" bg="customGray.200" />
          </HStack>

          {/* The simpler route, kept quieter. */}
          <HStack
            as="button"
            w="100%"
            justify="center"
            spacing="10px"
            px="20px"
            py="18px"
            borderRadius="16px"
            border="1px solid"
            borderColor="customGray.200"
            bg="white"
            transition="border-color 0.15s ease, box-shadow 0.15s ease"
            _hover={{ borderColor: "customGray.400", boxShadow: "0 0 0 4px var(--chakra-colors-customGray-200)" }}
            onClick={() => setStep("name")}
          >
            <Text fontSize="16px" fontWeight="500" color="customGray.800">Human-assisted support.</Text>
            <Box px="10px" py="2px" borderRadius="full" bg="green.100">
              <Text fontSize="12px" fontWeight="500" color="green.700">Included</Text>
            </Box>
            <ArrowForwardIcon boxSize="18px" color="customGray.600" />
          </HStack>
          </>
          ) : (
          <>
          <Box>
            <Text fontSize="20px" fontWeight="500" color="customGray.800">Complete your chatbot</Text>
            <Text fontSize="16px" color="customGray.500" mt="4px">Choose a name that reflects what it helps with</Text>
          </Box>

          <Box>
            <HStack spacing="4px" mb="8px">
              <Text fontSize="14px" fontWeight="500" color="customGray.800">Chatbot name</Text>
              <Text fontSize="14px" color="red.500">*</Text>
            </HStack>
            <Input
              autoFocus
              value={chatbotName}
              maxLength={MAX_NAME_LENGTH}
              onChange={(event) => setChatbotName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") createAndOpenAgent();
              }}
              placeholder="Support assistant"
              size="md"
              px="14px"
              fontSize="14px"
              _placeholder={{ fontSize: "14px" }}
              borderRadius="10px"
              bg="white"
              borderColor="customGray.200"
              _hover={{ borderColor: "customGray.300" }}
              _focusVisible={{ borderColor: "customGray.400", boxShadow: "0 0 0 4px var(--chakra-colors-customGray-200)" }}
            />
          </Box>

          <HStack justify="space-between">
            {/* Plain Chakra buttons — size md carries the height, padding and
                radius instead of hand-set values. */}
            <Button
              size="sm"
              iconSpacing="8px"
              variant="outline"
              bg="transparent"
              borderColor="customGray.300"
              color="customGray.800"
              _hover={{ bg: "transparent", borderColor: "customGray.400" }}
              _active={{ bg: "transparent", borderColor: "customGray.500" }}
              leftIcon={
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10.9688 5.0625L7.03125 9L10.9688 12.9375" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              }
              onClick={() => setStep("type")}
            >
              Back
            </Button>
            <Button
              size="sm"
              iconSpacing="8px"
              colorScheme="blue"
              rightIcon={
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3.375 8.98521H14.5876M10.1093 4.49121L14.625 9.00021L10.1093 13.5092" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              }
              isDisabled={!chatbotName.trim()}
              isLoading={isCreating}
              onClick={createAndOpenAgent}
            >
              Create chatbot
            </Button>
          </HStack>
          </>
          )}

        </VStack>
      </Box>
    </Box>
  );
}
