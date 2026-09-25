"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Avatar,
  Box,
  Button,
  Flex,
  HStack,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Text,
  Textarea,
  VStack,
  useToast,
} from "@chakra-ui/react";
import {
  AtSignIcon,
  AttachmentIcon,
  BellIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  DeleteIcon,
  DownloadIcon,
  EditIcon,
  EmailIcon,
  ExternalLinkIcon,
  HamburgerIcon,
  InfoIcon,
  LinkIcon,
  LockIcon,
  MoonIcon,
  PlusSquareIcon,
  RepeatIcon,
  SearchIcon,
  SettingsIcon,
  StarIcon,
  SunIcon,
  ViewIcon,
} from "@chakra-ui/icons";
import Sidebar from "@/app/components/Sidebar";
import FullPageLoader from "@/app/components/FullPageLoader";
import UsernameField from "@/app/components/UsernameField";
import { FloatingScrollbar, HIDE_NATIVE_SCROLLBAR_SX } from "@/app/components/FloatingScrollbar";
import { detectTimeZone, listTimeZones } from "@/lib/timezones";
import { CURRENCY_SYMBOL, PLANS, monthlyPrice, type BillingCycle } from "@/lib/plans";
import { supabase, syncServerSession } from "@/lib/supabase";

type IconType = typeof EditIcon;

const NAV_GROUPS: { title: string; items: { label: string; icon: IconType }[] }[] = [
  {
    title: "Personal",
    items: [
      { label: "Details", icon: EditIcon },
      { label: "Notifications", icon: BellIcon },
    ],
  },
  {
    title: "Workspace",
    items: [
      { label: "General", icon: SettingsIcon },
      { label: "Billing", icon: StarIcon },
      { label: "Email", icon: EmailIcon },
      { label: "Teammates", icon: AtSignIcon },
      { label: "Views", icon: ViewIcon },
      { label: "Tags", icon: AttachmentIcon },
      { label: "Segments", icon: HamburgerIcon },
      { label: "Reports", icon: InfoIcon },
      { label: "Import", icon: DownloadIcon },
      { label: "Integrations", icon: LinkIcon },
      { label: "Workflows", icon: RepeatIcon },
    ],
  },
  {
    title: "Developers",
    items: [
      { label: "API Tokens", icon: LockIcon },
      { label: "MCP connections", icon: PlusSquareIcon },
      { label: "Webhooks", icon: ExternalLinkIcon },
    ],
  },
];

const APPEARANCES = [
  { label: "Auto", icon: RepeatIcon },
  { label: "Light", icon: SunIcon },
  { label: "Dark", icon: MoonIcon },
] as const;

const LOCALES = [
  "English (United States)",
  "English (United Kingdom)",
  "English (India)",
  "Français (France)",
  "Deutsch (Deutschland)",
  "Español (España)",
  "Português (Brasil)",
  "Nederlands (Nederland)",
  "日本語 (日本)",
  "中文 (简体)",
];

const MAX_AVATAR_BYTES = 1024 * 1024;

const SECTION_SUBTITLES: Record<string, string> = {
  Details: "View and update your account details",
  Billing: "Choose a plan for your workspace",
};

// One label/description column and one control column, divided by a hairline —
// the row shape every setting on this page uses.
function SettingRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <HStack
      align="flex-start"
      spacing="24px"
      px="32px"
      py="20px"
      borderBottom="1px solid"
      borderColor="customGray.200"
    >
      <Box w="240px" flexShrink={0} pt="6px">
        <Text fontSize="14px" fontWeight="500" color="customGray.800">{label}</Text>
        {hint && <Text fontSize="13px" color="customGray.500" mt="2px">{hint}</Text>}
      </Box>
      <Box flex="1" minW="0">{children}</Box>
    </HStack>
  );
}

// A dropdown with a search field in the same card. Matches the timezone picker
// in the event builder: fixed width, current value checked and scrolled into
// view, separators ignored while matching.
const SearchSelect = memo(function SearchSelect({
  value,
  options,
  onChange,
  w = "280px",
  searchPlaceholder = "Search...",
}: {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  w?: string;
  searchPlaceholder?: string;
}) {
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const normalizedQuery = query.toLowerCase().replace(/[^a-z0-9]/g, "");
  const visibleOptions = normalizedQuery
    ? options.filter((option) => option.toLowerCase().replace(/[^a-z0-9]/g, "").includes(normalizedQuery))
    : options;

  const selectedRef = useCallback((node: HTMLElement | null) => {
    const list = listRef.current;
    if (!node || !list) return;
    list.scrollTop = Math.max(0, node.offsetTop - list.clientHeight / 2 + node.offsetHeight / 2);
  }, []);

  return (
    <Menu
      onClose={() => setQuery("")}
      initialFocusRef={searchRef}
      autoSelect={false}
      isLazy
      lazyBehavior="unmount"
    >
      <MenuButton
        as={Button}
        size="sm"
        variant="ghost"
        h="34px"
        px="12px"
        bg="customGray.100"
        borderRadius="8px"
        fontSize="14px"
        fontWeight="400"
        color="customGray.800"
        textAlign="left"
        rightIcon={<ChevronDownIcon />}
        _hover={{ bg: "customGray.200" }}
        _active={{ bg: "customGray.200" }}
      >
        {value}
      </MenuButton>
      <MenuList
        w={w}
        minW={w}
        maxW={w}
        p={0}
        overflow="hidden"
        boxShadow="0 2px 8px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)"
      >
        <Box borderBottom="1px solid" borderColor="customGray.200">
          <InputGroup size="sm" alignItems="center">
            <InputLeftElement pointerEvents="none" h="38px" w="34px">
              <SearchIcon w="13px" h="13px" color="customGray.400" />
            </InputLeftElement>
            {/* Key events stop here or the menu's typeahead swallows them. */}
            <Input
              ref={searchRef}
              placeholder={searchPlaceholder}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => event.stopPropagation()}
              variant="unstyled"
              h="38px"
              pl="34px"
              pr="12px"
              fontSize="14px"
              color="customGray.800"
              _placeholder={{ color: "customGray.400" }}
            />
          </InputGroup>
        </Box>
        <Box position="relative" py="4px">
          <FloatingScrollbar scrollRef={listRef} />
          <Box ref={listRef} maxH="240px" overflowY="auto" overflowX="hidden" sx={HIDE_NATIVE_SCROLLBAR_SX}>
            {visibleOptions.length === 0 && (
              <Text fontSize="14px" color="customGray.500" px="12px" py="8px">No results</Text>
            )}
            {visibleOptions.map((option) => (
              <MenuItem
                key={option}
                ref={option === value ? selectedRef : undefined}
                fontSize="14px"
                py="6px"
                gap="8px"
                bg={option === value ? "customGray.50" : undefined}
                fontWeight={option === value ? "500" : "400"}
                onClick={() => onChange(option)}
              >
                <Box flex="1" minW="0" whiteSpace="nowrap" overflow="hidden" textOverflow="ellipsis">
                  {option}
                </Box>
                {option === value && <CheckIcon w="12px" h="12px" color="customGray.700" flexShrink={0} />}
              </MenuItem>
            ))}
          </Box>
        </Box>
      </MenuList>
    </Menu>
  );
});

// The slanted marks above each plan name — one for Plus, three for Pro, five
// for Max, so the tiers read at a glance.
function PlanMarks({ count }: { count: number }) {
  return (
    <HStack spacing="3px" h="20px">
      {Array.from({ length: count }).map((_, index) => (
        <Box key={index} w="7px" h="20px" bg="customGray.800" borderRadius="3px" transform="skewX(-20deg)" />
      ))}
    </HStack>
  );
}

function BillingPanel() {
  const toast = useToast({ position: "top" });
  const [cycle, setCycle] = useState<BillingCycle>("Monthly");
  const [pendingPlan, setPendingPlan] = useState("");

  // The amount is decided by the server from lib/plans.ts; we only name a plan.
  const startCheckout = async (planId: string) => {
    setPendingPlan(planId);
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, cycle }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.url) {
        toast({
          title: "Couldn't start checkout",
          description: payload.error || "Stripe didn't return a checkout URL.",
          status: "error",
          duration: 6000,
        });
        return;
      }
      window.location.href = payload.url;
    } catch (error) {
      toast({
        title: "Couldn't reach Stripe",
        description: error instanceof Error ? error.message : "Try again in a moment.",
        status: "error",
      });
    } finally {
      setPendingPlan("");
    }
  };

  return (
    <VStack align="center" spacing="0" bg="customGray.50" minH="100%" px="32px" py="28px">
      {/* Cycle toggle */}
      <HStack spacing="0" bg="customGray.100" borderRadius="10px" p="4px">
        {(["Monthly", "Yearly"] as BillingCycle[]).map((option) => {
          const isSelected = cycle === option;
          return (
            <Box
              key={option}
              as="button"
              px="20px"
              h="34px"
              borderRadius="8px"
              bg={isSelected ? "white" : "transparent"}
              boxShadow={isSelected ? "0 1px 2px rgba(0, 0, 0, 0.08)" : "none"}
              onClick={() => setCycle(option)}
            >
              <Text fontSize="14px" fontWeight={isSelected ? "500" : "400"} color={isSelected ? "customGray.800" : "customGray.500"}>
                {option}
              </Text>
            </Box>
          );
        })}
      </HStack>

      <HStack align="stretch" spacing="20px" mt="32px" w="100%" maxW="1120px">
        {PLANS.map((plan) => {
          const price = monthlyPrice(plan, cycle);
          return (
            <VStack
              key={plan.name}
              flex="1"
              minW="0"
              align="stretch"
              spacing="0"
              position="relative"
              bg="white"
              border="1px solid"
              borderColor="customGray.200"
              borderRadius="16px"
              p="28px"
            >
              {plan.popular && (
                <Box
                  position="absolute"
                  top="-15px"
                  left="50%"
                  transform="translateX(-50%)"
                  bg="brand.primary"
                  color="white"
                  fontSize="13px"
                  fontWeight="500"
                  px="14px"
                  h="30px"
                  lineHeight="30px"
                  borderRadius="full"
                  whiteSpace="nowrap"
                >
                  Most popular
                </Box>
              )}

              <PlanMarks count={plan.marks} />
              <Text fontSize="20px" fontWeight="600" color="customGray.800" mt="20px">{plan.name}</Text>
              <Text fontSize="14px" color="customGray.500" mt="4px">{plan.tagline}</Text>

              <HStack align="baseline" spacing="6px" mt="20px">
                <Text fontSize="36px" fontWeight="700" color="customGray.800" lineHeight="1.1">{CURRENCY_SYMBOL}{price}</Text>
                <Text fontSize="14px" color="customGray.500">/ month</Text>
              </HStack>
              <Text fontSize="13px" color="customGray.500" mt="4px" minH="18px">
                {cycle === "Yearly" ? `Billed yearly at ${CURRENCY_SYMBOL}${price * 12}` : ""}
              </Text>

              <Box h="1px" bg="customGray.200" my="20px" />

              <VStack align="stretch" spacing="14px" flex="1">
                {plan.features.map((feature) => (
                  <HStack key={feature} spacing="12px" align="center">
                    <Box
                      w="20px"
                      h="20px"
                      borderRadius="6px"
                      bg="blue.50"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      flexShrink={0}
                    >
                      <CheckIcon w="10px" h="10px" color="brand.primary" />
                    </Box>
                    <Text fontSize="14px" color="customGray.800">{feature}</Text>
                  </HStack>
                ))}
              </VStack>

              <Box h="1px" bg="customGray.200" mt="24px" mb="20px" />

              <Button
                w="100%"
                h="46px"
                borderRadius="10px"
                fontSize="15px"
                fontWeight="500"
                bg="customGray.800"
                color="white"
                _hover={{ bg: "customGray.700" }}
                isLoading={pendingPlan === plan.id}
                isDisabled={pendingPlan !== "" && pendingPlan !== plan.id}
                onClick={() => startCheckout(plan.id)}
              >
                Subscribe
              </Button>
            </VStack>
          );
        })}
      </HStack>
    </VStack>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const toast = useToast({ position: "top" });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [section, setSection] = useState("Details");
  const [navQuery, setNavQuery] = useState("");
  const [userId, setUserId] = useState("");

  // Everything below "Save changes" controls; email, password and avatar are
  // their own flows because Supabase handles them outside user metadata.
  const [fullName, setFullName] = useState("");
  const [signature, setSignature] = useState("");
  const [appearance, setAppearance] = useState("Light");
  const [timeZone, setTimeZone] = useState(detectTimeZone());
  const [locale, setLocale] = useState(LOCALES[0]);
  const [username, setUsername] = useState("");
  const [savedUsername, setSavedUsername] = useState("");
  const [isUsernameValid, setIsUsernameValid] = useState(true);
  const [isUsernameChecking, setIsUsernameChecking] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const [saved, setSaved] = useState({ fullName: "", signature: "", appearance: "Light", timeZone: "", locale: "" });
  const [isSaving, setIsSaving] = useState(false);

  const [email, setEmail] = useState("");
  const [emailDraft, setEmailDraft] = useState("");
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [isSavingEmail, setIsSavingEmail] = useState(false);

  const [avatarUrl, setAvatarUrl] = useState("");
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const timeZoneOptions = useMemo(listTimeZones, []);

  // Nav search: keeps a group only while one of its items still matches.
  const visibleNavGroups = useMemo(() => {
    const needle = navQuery.trim().toLowerCase();
    if (!needle) return NAV_GROUPS;
    return NAV_GROUPS
      .map((group) => ({ ...group, items: group.items.filter((item) => item.label.toLowerCase().includes(needle)) }))
      .filter((group) => group.items.length > 0);
  }, [navQuery]);

  // Settings is usually opened from somewhere in the app, so go back there;
  // fall back to the events list on a direct visit.
  const leaveSettings = () => {
    if (window.history.length > 1) router.back();
    else router.push("/builder");
  };

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push("/login");
        return;
      }
      await syncServerSession(session);

      const meta = session.user.user_metadata || {};
      const nextName = meta.full_name || meta.name || "";
      const nextSignature = meta.signature || "";
      const nextAppearance = meta.appearance || "Light";
      const nextTimeZone = meta.timezone || detectTimeZone();
      const nextLocale = meta.locale || LOCALES[0];

      setUserId(session.user.id);
      setEmail(session.user.email || "");
      setAvatarUrl(meta.avatar_url || meta.picture || "");
      setFullName(nextName);
      setSignature(nextSignature);
      setAppearance(nextAppearance);
      setTimeZone(nextTimeZone);
      setLocale(nextLocale);
      setSaved({
        fullName: nextName,
        signature: nextSignature,
        appearance: nextAppearance,
        timeZone: nextTimeZone,
        locale: nextLocale,
      });

      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", session.user.id)
        .maybeSingle();
      setUsername(profile?.username || "");
      setSavedUsername(profile?.username || "");

      // Coming back from Stripe Checkout. Read the query directly rather than
      // useSearchParams, which would need its own Suspense boundary here.
      const params = new URLSearchParams(window.location.search);
      const requestedSection = params.get("section");
      if (requestedSection) setSection(requestedSection);
      const billing = params.get("billing");
      if (billing === "success") {
        toast({
          title: "You're subscribed",
          description: "Stripe has your payment. It can take a moment for the receipt to arrive.",
          status: "success",
          duration: 6000,
        });
      } else if (billing === "cancelled") {
        toast({ title: "Checkout cancelled", status: "info", duration: 4000 });
      }
      if (requestedSection || billing) {
        window.history.replaceState({}, "", "/settings");
      }

      setIsLoading(false);
    })();
  }, [router, toast]);

  const handleUsernameValidation = useCallback((state: { isValid: boolean; isChecking: boolean }) => {
    setIsUsernameValid(state.isValid);
    setIsUsernameChecking(state.isChecking);
  }, []);

  const isDirty =
    fullName !== saved.fullName ||
    signature !== saved.signature ||
    appearance !== saved.appearance ||
    timeZone !== saved.timeZone ||
    locale !== saved.locale ||
    username !== savedUsername;

  const handleSave = async () => {
    if (username !== savedUsername && (!isUsernameValid || isUsernameChecking)) {
      setUsernameError("Pick an available username first.");
      return;
    }

    setIsSaving(true);
    setUsernameError("");
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: fullName,
          signature,
          appearance,
          timezone: timeZone,
          locale,
        },
      });
      if (error) {
        toast({ title: "Couldn't save your details", description: error.message, status: "error" });
        return;
      }

      if (username !== savedUsername) {
        const { error: usernameSaveError } = await supabase
          .from("profiles")
          .upsert({ id: userId, username, updated_at: new Date().toISOString() });
        if (usernameSaveError) {
          // 23505 = unique_violation: claimed between the check and the save.
          setUsernameError(
            usernameSaveError.code === "23505"
              ? "This username has already been taken."
              : usernameSaveError.message
          );
          return;
        }
        setSavedUsername(username);
      }

      setSaved({ fullName, signature, appearance, timeZone, locale });
      toast({ title: "Changes saved", status: "success", duration: 2000 });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEmailUpdate = async () => {
    const next = emailDraft.trim();
    if (!next || next === email) {
      setIsEditingEmail(false);
      return;
    }
    setIsSavingEmail(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: next });
      if (error) {
        toast({ title: "Couldn't update your email", description: error.message, status: "error" });
        return;
      }
      setIsEditingEmail(false);
      toast({
        title: "Confirm your new address",
        description: `We sent a confirmation link to ${next}. Your sign-in email changes once you click it.`,
        status: "info",
        duration: 6000,
      });
    } finally {
      setIsSavingEmail(false);
    }
  };

  const handleAvatarFile = async (file: File) => {
    if (file.size > MAX_AVATAR_BYTES) {
      toast({ title: "That image is over 1MB", status: "error", duration: 3000 });
      return;
    }
    setIsUploadingAvatar(true);
    try {
      const extension = file.name.split(".").pop() || "png";
      const path = `avatars/${userId}-${Date.now()}.${extension}`;

      // Prefer a dedicated bucket; fall back to the attachments bucket that
      // already exists so this works before the avatars migration is run.
      let bucket = "avatars";
      let uploadError = (await supabase.storage.from(bucket).upload(path, file, { upsert: true })).error;
      if (uploadError) {
        bucket = "comment-attachments";
        uploadError = (await supabase.storage.from(bucket).upload(path, file, { upsert: true })).error;
      }
      if (uploadError) {
        toast({ title: "Couldn't upload that image", description: uploadError.message, status: "error" });
        return;
      }

      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      const publicUrl = data.publicUrl;
      const { error } = await supabase.auth.updateUser({ data: { avatar_url: publicUrl } });
      if (error) {
        toast({ title: "Couldn't save your avatar", description: error.message, status: "error" });
        return;
      }
      setAvatarUrl(publicUrl);
      toast({ title: "Avatar updated", status: "success", duration: 2000 });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleAvatarRemove = async () => {
    const { error } = await supabase.auth.updateUser({ data: { avatar_url: "" } });
    if (error) {
      toast({ title: "Couldn't remove your avatar", description: error.message, status: "error" });
      return;
    }
    setAvatarUrl("");
  };

  const handlePasswordUpdate = async () => {
    if (newPassword.length < 8) {
      toast({ title: "Use at least 8 characters", status: "error", duration: 3000 });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Those passwords don't match", status: "error", duration: 3000 });
      return;
    }
    setIsSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        toast({ title: "Couldn't update your password", description: error.message, status: "error" });
        return;
      }
      setIsEditingPassword(false);
      setNewPassword("");
      setConfirmPassword("");
      toast({ title: "Password updated", status: "success", duration: 2000 });
    } finally {
      setIsSavingPassword(false);
    }
  };

  if (isLoading) return <FullPageLoader />;

  const fieldStyles = {
    fontSize: "14px",
    borderRadius: "8px",
    borderColor: "customGray.200",
    _hover: { borderColor: "customGray.300" },
    _focusVisible: { borderColor: "customGray.500", boxShadow: "none" },
  };

  return (
    <Flex h="100vh" w="100vw" bg="dark.bg" overflow="hidden" position="fixed" top={0} left={0}>
      {/* No rail item owns this page, so nothing in the rail is highlighted. */}
      <Sidebar
        selectedNav=""
        onNavClick={() => {}}
        userName={fullName}
        userEmail={email}
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
          {/* Settings nav */}
          <VStack
            w="255px"
            h="100%"
            align="stretch"
            spacing={0}
            borderRight="1px solid"
            borderColor="customGray.200"
            overflow="hidden"
          >
            <Box px="12px" pt="18px" pb="12px">
              <HStack
                as="button"
                spacing="6px"
                h="32px"
                px="8px"
                borderRadius="8px"
                _hover={{ bg: "customGray.50" }}
                onClick={leaveSettings}
              >
                <ChevronLeftIcon boxSize="18px" color="customGray.600" />
                <Text fontSize="14px" color="customGray.800">Back to app</Text>
              </HStack>
            </Box>

            <Box px="12px" pb="8px">
              <InputGroup size="sm">
                <InputLeftElement pointerEvents="none" h="32px" w="30px">
                  <SearchIcon w="12px" h="12px" color="customGray.400" />
                </InputLeftElement>
                <Input
                  value={navQuery}
                  onChange={(event) => setNavQuery(event.target.value)}
                  placeholder="Search..."
                  h="32px"
                  pl="30px"
                  fontSize="14px"
                  borderRadius="8px"
                  bg="white"
                  borderColor="customGray.200"
                  boxShadow="0 1px 2px rgba(0, 0, 0, 0.05)"
                  _hover={{ borderColor: "customGray.300" }}
                  _focusVisible={{ borderColor: "customGray.500", boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)" }}
                />
              </InputGroup>
            </Box>

            <Box flex="1" minH="0" overflowY="auto" pb="16px" sx={HIDE_NATIVE_SCROLLBAR_SX}>
              {visibleNavGroups.length === 0 && (
                <Text fontSize="14px" color="customGray.500" px="24px" pt="16px">No results</Text>
              )}
              {visibleNavGroups.map((group) => (
                <Box key={group.title} px="12px" pt="12px">
                  <Text fontSize="13px" color="customGray.500" px="12px" pb="6px">{group.title}</Text>
                  <VStack align="stretch" spacing="2px">
                    {group.items.map((item) => {
                      const isSelected = section === item.label;
                      return (
                        <HStack
                          key={item.label}
                          as="button"
                          spacing="10px"
                          h="32px"
                          px="12px"
                          borderRadius="8px"
                          bg={isSelected ? "customGray.100" : "transparent"}
                          _hover={{ bg: isSelected ? "customGray.100" : "customGray.50" }}
                          onClick={() => setSection(item.label)}
                        >
                          <item.icon boxSize="16px" color="customGray.600" />
                          <Text fontSize="14px" fontWeight={isSelected ? "500" : "400"} color="customGray.800">
                            {item.label}
                          </Text>
                        </HStack>
                      );
                    })}
                  </VStack>
                </Box>
              ))}
            </Box>
          </VStack>

          {/* Panel */}
          <VStack flex={1} h="100%" align="stretch" spacing={0} minW="0">
            <HStack justify="space-between" align="flex-start" px="32px" pt="20px" pb="16px" borderBottom="1px solid" borderColor="customGray.200">
              <Box>
                <Text fontSize="16px" fontWeight="600" color="customGray.800">
                  {section === "Details" ? "Personal details" : section}
                </Text>
                <Text fontSize="14px" color="customGray.500" mt="4px">
                  {SECTION_SUBTITLES[section] || "Nothing to configure here yet"}
                </Text>
              </Box>
              {section === "Details" && (
                <Button
                  size="sm"
                  h="34px"
                  px="16px"
                  borderRadius="8px"
                  fontSize="14px"
                  fontWeight="500"
                  bg="customGray.800"
                  color="white"
                  _hover={{ bg: "customGray.700" }}
                  isDisabled={!isDirty}
                  isLoading={isSaving}
                  onClick={handleSave}
                >
                  Save changes
                </Button>
              )}
            </HStack>

            <Box position="relative" flex="1" minH="0">
              <FloatingScrollbar scrollRef={contentRef} />
              <Box ref={contentRef} h="100%" overflowY="auto" sx={HIDE_NATIVE_SCROLLBAR_SX}>
                {section === "Billing" ? (
                  <BillingPanel />
                ) : section !== "Details" ? (
                  <VStack align="start" spacing="6px" px="32px" py="32px">
                    <Text fontSize="14px" color="customGray.600">
                      {section} settings aren&apos;t built yet.
                    </Text>
                  </VStack>
                ) : (
                  <>
                    <SettingRow label="Name" hint="Message responses will be sent using this name">
                      <Input
                        value={fullName}
                        onChange={(event) => setFullName(event.target.value)}
                        placeholder="Your name"
                        {...fieldStyles}
                      />
                    </SettingRow>

                    <SettingRow label="Username" hint="Your public booking link: webforms.com/username/event">
                      <Box maxW="420px">
                        <UsernameField
                          value={username}
                          onValueChange={(next) => { setUsername(next); setUsernameError(""); }}
                          currentUsername={savedUsername}
                          onValidationChange={handleUsernameValidation}
                          externalError={usernameError}
                        />
                      </Box>
                    </SettingRow>

                    <SettingRow label="Email" hint="Used to sign in and notifications">
                      {isEditingEmail ? (
                        <HStack spacing="8px" align="center">
                          <Input
                            value={emailDraft}
                            onChange={(event) => setEmailDraft(event.target.value)}
                            placeholder="you@company.com"
                            type="email"
                            {...fieldStyles}
                          />
                          <Button
                            size="sm"
                            h="34px"
                            borderRadius="8px"
                            fontSize="14px"
                            fontWeight="500"
                            bg="customGray.800"
                            color="white"
                            _hover={{ bg: "customGray.700" }}
                            isLoading={isSavingEmail}
                            onClick={handleEmailUpdate}
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            h="34px"
                            borderRadius="8px"
                            fontSize="14px"
                            fontWeight="400"
                            variant="ghost"
                            color="customGray.600"
                            onClick={() => setIsEditingEmail(false)}
                          >
                            Cancel
                          </Button>
                        </HStack>
                      ) : (
                        <HStack
                          spacing="8px"
                          bg="customGray.50"
                          border="1px solid"
                          borderColor="customGray.200"
                          borderRadius="8px"
                          pl="16px"
                          pr="8px"
                          h="40px"
                        >
                          <Text flex="1" minW="0" fontSize="14px" color="customGray.700" isTruncated>{email}</Text>
                          <Button
                            size="sm"
                            variant="ghost"
                            fontSize="14px"
                            fontWeight="400"
                            color="customGray.700"
                            _hover={{ bg: "customGray.100" }}
                            onClick={() => { setEmailDraft(email); setIsEditingEmail(true); }}
                          >
                            Update
                          </Button>
                        </HStack>
                      )}
                    </SettingRow>

                    <SettingRow label="Avatar" hint="Message replies will appear with this avatar">
                      <HStack spacing="16px">
                        <Avatar
                          size="sm"
                          src={avatarUrl || undefined}
                          name={fullName || email}
                          borderRadius="8px"
                          bg="customGray.200"
                          color="customGray.700"
                        />
                        <Button
                          size="sm"
                          h="34px"
                          borderRadius="8px"
                          fontSize="14px"
                          fontWeight="500"
                          bg="customGray.100"
                          color="customGray.800"
                          _hover={{ bg: "customGray.200" }}
                          isLoading={isUploadingAvatar}
                          onClick={() => fileInputRef.current?.click()}
                        >
                          Upload
                        </Button>
                        <Text fontSize="14px" color="customGray.500">JPG, GIF or PNG. 1MB Max.</Text>
                        {avatarUrl && (
                          <IconButton
                            aria-label="Remove avatar"
                            icon={<DeleteIcon boxSize="14px" />}
                            size="sm"
                            variant="ghost"
                            color="customGray.500"
                            _hover={{ bg: "transparent", color: "customGray.700" }}
                            onClick={handleAvatarRemove}
                          />
                        )}
                        <Input
                          ref={fileInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/gif"
                          display="none"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            event.target.value = "";
                            if (file) handleAvatarFile(file);
                          }}
                        />
                      </HStack>
                    </SettingRow>

                    <SettingRow label="Appearance" hint="Select your interface color scheme">
                      <HStack spacing="4px">
                        {APPEARANCES.map((option) => {
                          const isSelected = appearance === option.label;
                          return (
                            <HStack
                              key={option.label}
                              as="button"
                              spacing="8px"
                              h="34px"
                              px="12px"
                              borderRadius="8px"
                              bg={isSelected ? "customGray.100" : "transparent"}
                              _hover={{ bg: isSelected ? "customGray.100" : "customGray.50" }}
                              onClick={() => setAppearance(option.label)}
                            >
                              <option.icon boxSize="14px" color="customGray.600" />
                              <Text fontSize="14px" fontWeight={isSelected ? "500" : "400"} color="customGray.800">
                                {option.label}
                              </Text>
                            </HStack>
                          );
                        })}
                      </HStack>
                    </SettingRow>

                    <SettingRow label="Signature" hint="Your signature will be added to all email replies">
                      <Textarea
                        value={signature}
                        onChange={(event) => setSignature(event.target.value)}
                        placeholder="Enter your default signature..."
                        minH="120px"
                        {...fieldStyles}
                      />
                    </SettingRow>

                    <SettingRow label="Password">
                      {isEditingPassword ? (
                        <VStack align="stretch" spacing="8px" maxW="420px">
                          <Input
                            type="password"
                            value={newPassword}
                            onChange={(event) => setNewPassword(event.target.value)}
                            placeholder="New password"
                            {...fieldStyles}
                          />
                          <Input
                            type="password"
                            value={confirmPassword}
                            onChange={(event) => setConfirmPassword(event.target.value)}
                            placeholder="Confirm new password"
                            {...fieldStyles}
                          />
                          <HStack spacing="8px">
                            <Button
                              size="sm"
                              h="34px"
                              borderRadius="8px"
                              fontSize="14px"
                              fontWeight="500"
                              bg="customGray.800"
                              color="white"
                              _hover={{ bg: "customGray.700" }}
                              isLoading={isSavingPassword}
                              onClick={handlePasswordUpdate}
                            >
                              Save password
                            </Button>
                            <Button
                              size="sm"
                              h="34px"
                              borderRadius="8px"
                              fontSize="14px"
                              fontWeight="400"
                              variant="ghost"
                              color="customGray.600"
                              onClick={() => {
                                setIsEditingPassword(false);
                                setNewPassword("");
                                setConfirmPassword("");
                              }}
                            >
                              Cancel
                            </Button>
                          </HStack>
                        </VStack>
                      ) : (
                        <HStack
                          spacing="8px"
                          bg="customGray.50"
                          border="1px solid"
                          borderColor="customGray.200"
                          borderRadius="8px"
                          pl="16px"
                          pr="8px"
                          h="40px"
                        >
                          <Text flex="1" fontSize="14px" color="customGray.700" letterSpacing="2px">••••••••••</Text>
                          <Button
                            size="sm"
                            variant="ghost"
                            fontSize="14px"
                            fontWeight="400"
                            color="customGray.700"
                            _hover={{ bg: "customGray.100" }}
                            onClick={() => setIsEditingPassword(true)}
                          >
                            Update
                          </Button>
                        </HStack>
                      )}
                    </SettingRow>

                    <SettingRow label="Timezone" hint="Set your local timezone">
                      <SearchSelect
                        value={timeZone}
                        options={timeZoneOptions}
                        onChange={setTimeZone}
                        searchPlaceholder="Find timezone..."
                      />
                    </SettingRow>

                    <SettingRow label="Locale" hint="Set your date and time format">
                      <SearchSelect
                        value={locale}
                        options={LOCALES}
                        onChange={setLocale}
                        searchPlaceholder="Find locale..."
                      />
                    </SettingRow>
                  </>
                )}
              </Box>
            </Box>
          </VStack>
        </HStack>
      </VStack>
    </Flex>
  );
}
