"use client";

import { useRouter } from "next/navigation";
import { Box, VStack, HStack, Text, Button, Heading, IconButton, Input, Textarea, useToast, Tabs, TabList, Tab, Avatar, Menu, MenuButton, MenuList, MenuItem, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton, useDisclosure, Badge, Divider, Tag, TagLabel, TagCloseButton, Progress, Tooltip } from "@chakra-ui/react";
import { ArrowBackIcon, ArrowForwardIcon, AddIcon, CloseIcon, ChevronDownIcon, DragHandleIcon, CopyIcon, InfoOutlineIcon } from "@chakra-ui/icons";
import { useState, useEffect, useRef, useMemo, ComponentProps } from "react";
import { CalendarPicker } from "@/components/CalendarPicker";
import { AddPage } from "@/components/AddPage";
import { supabase } from "@/lib/supabase";
import { parseDurationMinutes, formatTime, buildTimeSlots, WEEK_DAYS, DEFAULT_AVAILABILITY, getDayRanges, type WeeklyAvailability } from "@/lib/bookingTime";
import FullPageLoader from "@/app/components/FullPageLoader";
import UsernameModal from "@/app/components/UsernameModal";

// Default slug for the "Scheduling page link" field, derived from the event
// title. Stays in sync with the title until the user edits the slug
// directly (see slugManuallyEditedRef).
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// Parses freeform text like "9:00 AM" / "09:00pm" back into minutes-since-
// midnight. Returns null when it doesn't look like a time yet, so the field
// below can hold an in-progress edit instead of snapping back on every
// keystroke.
function parseTimeText(text: string): number | null {
  const match = text.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;
  const hour12 = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  if (hour12 < 1 || hour12 > 12 || minute > 59) return null;
  const isPM = match[3].toUpperCase() === "PM";
  const hour24 = (hour12 % 12) + (isPM ? 12 : 0);
  return hour24 * 60 + minute;
}

// Plain text field for a time value — no native picker, no dropdown. Holds
// its own draft text so the user can type freely; commits back to the
// parent's minutes-since-midnight value on blur, or reverts if what's typed
// still isn't a valid time.
function TimeTextInput({
  minutes,
  onCommit,
  ...inputProps
}: {
  minutes: number;
  onCommit: (minutes: number) => void;
} & Omit<ComponentProps<typeof Input>, "value" | "onChange" | "onBlur">) {
  const [text, setText] = useState(formatTime(Math.floor(minutes / 60), minutes % 60, false));

  useEffect(() => {
    setText(formatTime(Math.floor(minutes / 60), minutes % 60, false));
  }, [minutes]);

  return (
    <Input
      {...inputProps}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        const parsed = parseTimeText(text);
        if (parsed !== null) {
          onCommit(parsed);
        } else {
          setText(formatTime(Math.floor(minutes / 60), minutes % 60, false));
        }
      }}
    />
  );
}

export default function CalendarBuilderPage() {
  const router = useRouter();
  // Default every toast on this page to the top; individual calls can override.
  const toast = useToast({ position: "top" });
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isShareOpen, onOpen: onShareOpen, onClose: onShareClose } = useDisclosure();
  const { isOpen: isUsernameOpen, onOpen: onUsernameOpen, onClose: onUsernameClose } = useDisclosure();
  const [tabIndex, setTabIndex] = useState(0);
  const [selectedPage, setSelectedPage] = useState("Main page");
  const [isFormPageHidden, setIsFormPageHidden] = useState(false);
  // Weekly hours editor in the Configure tab. Each day holds a list of
  // {start, end} ranges in minutes-since-midnight, empty meaning
  // unavailable that day. Drives both the Main-page preview and (once
  // saved) the live booking page's actual time slots.
  const isAvailabilityOpen = true;
  const [weeklyHours, setWeeklyHours] = useState<WeeklyAvailability>(DEFAULT_AVAILABILITY);
  // Drives the "Main page" preview's calendar/time-slot list — the same
  // state shape PublicBookingView uses, so the preview behaves like the real
  // booking flow instead of a static mockup with hardcoded slots.
  const [previewDate, setPreviewDate] = useState(new Date());
  const [previewTime, setPreviewTime] = useState<number | null>(null);
  const [previewIs24Hour, setPreviewIs24Hour] = useState(false);
  const [bookings, setBookings] = useState<Array<{
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
  }>>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);
  // This event's key for the inbound webhook route (app/api/webhook/[apiKey]) —
  // lets a third-party form post lead data straight to this event.
  const [apiKey, setApiKey] = useState<string | null>(null);

  // Inline title state
  const [formName, setFormName] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [googleProfilePicture, setGoogleProfilePicture] = useState<string | null>(null);
  const [userName, setUserName] = useState("Vicky Vignesh");

  // Sidebar form fields state
  const [ownerName, setOwnerName] = useState("Vicky Vignesh");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [title, setTitle] = useState("Demo call");
  const [description, setDescription] = useState("Get to know each other and discuss your needs. A perfect opportunity to connect and explore possibilities together.");
  const [descriptionError, setDescriptionError] = useState(false);
  const [username, setUsername] = useState("");
  const [slug, setSlug] = useState("");
  // True once the user has typed into the slug field directly, so the
  // title->slug auto-derivation below stops overwriting their edit.
  const slugManuallyEditedRef = useRef(false);
  // Whether the current slug value collides with another one of this user's
  // events. Checked live (see effect below) so the field can say "already
  // taken" up front, rather than the user only finding out from a failed save.
  const [slugCheck, setSlugCheck] = useState<{ checking: boolean; taken: boolean }>({ checking: false, taken: false });
  // Mirrors slugCheck synchronously. saveEventToDatabase reads this instead of
  // the state value, because the debounced autosave timer is scheduled from
  // whatever render was current when the slug last changed — by the time it
  // actually fires, the availability check has often since resolved, and a
  // stale closure over the old slugCheck would wrongly keep rejecting a slug
  // that's since become available (or vice versa).
  const slugCheckRef = useRef({ checking: false, taken: false });
  const updateSlugCheck = (next: { checking: boolean; taken: boolean }) => {
    slugCheckRef.current = next;
    setSlugCheck(next);
  };
  const [meetingLink, setMeetingLink] = useState("Link");
  const [meetingLinkUrl, setMeetingLinkUrl] = useState("");
  const [durations, setDurations] = useState<string[]>(["15 min"]);
  const [availablePages, setAvailablePages] = useState<string[]>(["Main page", "Form page", "Success page"]);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [isZoomConnected, setIsZoomConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentEventId, setCurrentEventId] = useState<number | null>(null);
  // Snapshot of the last-persisted field values. Stays null until the initial
  // load settles, so hydrating the form never counts as a user edit.
  const lastSavedSnapshotRef = useRef<string | null>(null);
  // True while an insert is awaiting a response, to prevent duplicate rows.
  const insertInFlightRef = useRef(false);
  // Chains saves one after another instead of firing them concurrently — two
  // overlapping updates (e.g. rapidly toggling hide-form on then off) would
  // otherwise race at the network level, and whichever request happened to
  // reach the DB last would win, regardless of which click was actually more
  // recent. Awaiting the previous save before starting the next one
  // guarantees writes land in the order the user made them.
  const savePromiseRef = useRef<Promise<void>>(Promise.resolve());
  // Workspace this event belongs to. Comes from the ?workspace= param for a new
  // event, or from the stored row when editing an existing one. Held in a ref so
  // it never counts as an edit in the autosave snapshot.
  const workspaceNameRef = useRef<string | null>(null);
  // Synchronous mirror of currentEventId. saveEventToDatabase decides
  // insert-vs-update from this, because setCurrentEventId is async and a
  // second save firing before React re-renders would otherwise still see null
  // and insert a duplicate row.
  const currentEventIdRef = useRef<number | null>(null);
  // Set right before a discrete, one-shot selection (e.g. picking a meeting
  // link type from its menu) updates state, so the autosave effect below
  // saves it right away instead of behind the usual typing-debounce — a
  // refresh within that debounce window would otherwise cancel the pending
  // save entirely and silently revert the selection.
  const saveImmediatelyRef = useRef(false);

  // Real, working embed snippets for public/booking-widget.js and the raw
  // iframe alternative — both point at the public /book/[id] page, which
  // only exists once this event has actually been saved.
  const widgetEmbedCode = useMemo(() => {
    if (!currentEventId) return "";
    const origin = typeof window !== "undefined" ? window.location.origin : "https://your-domain.com";
    const escapeAttr = (value: string) => value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
    return [
      `<script src="${origin}/booking-widget.js"`,
      `  data-event-id="${currentEventId}"`,
      `  data-label="${escapeAttr(title || "Book a meeting")}"`,
      `  defer>`,
      `</script>`,
    ].join("\n");
  }, [currentEventId, title]);

  const iframeEmbedCode = useMemo(() => {
    if (!currentEventId) return "";
    const origin = typeof window !== "undefined" ? window.location.origin : "https://your-domain.com";
    return `<iframe src="${origin}/book/${currentEventId}" width="100%" height="650" style="border:none;" title="Book a meeting"></iframe>`;
  }, [currentEventId]);

  // Paste this into a third-party form's webhook/POST-URL field (e.g.
  // Framer's Webhook action) to have its submissions land as leads on this
  // event — the api_key in the path is what ties it to this event, so
  // nothing else needs to be configured on their end.
  const webhookUrl = useMemo(() => {
    if (!apiKey) return "";
    const origin = typeof window !== "undefined" ? window.location.origin : "https://your-domain.com";
    return `${origin}/api/webhook/${apiKey}`;
  }, [apiKey]);

  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const idParam = params.get("id");
        // Set for a brand-new event arriving from a workspace's "Create event".
        workspaceNameRef.current = params.get("workspace") || null;

        // Restore whichever preview page (Main/Form/Success) was selected,
        // so a refresh doesn't silently drop the user back to Main page.
        const pageParam = params.get("page");
        if (pageParam && availablePages.includes(pageParam)) {
          setSelectedPage(pageParam);
        }

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
          setOwnerEmail(session.user.email || "");

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

          const { data: profile } = await supabase
            .from("profiles")
            .select("username")
            .eq("id", session.user.id)
            .maybeSingle();
          setUsername(profile?.username || "");

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
              currentEventIdRef.current = eventData.id;
              setCurrentEventId(eventData.id);
              setApiKey(eventData.api_key);
              // Keep the event in the workspace it was created in, rather than
              // whatever the URL happens to say.
              workspaceNameRef.current = eventData.workspace_name ?? workspaceNameRef.current;
              setFormName(eventData.title || "");
              setInputValue(eventData.title || "");
              if (eventData.event_title) setTitle(eventData.event_title);
              if (eventData.slug) {
                setSlug(eventData.slug);
                slugManuallyEditedRef.current = true;
              } else {
                setSlug(slugify(eventData.event_title || eventData.title || ""));
              }
              setDescription(eventData.description || "");
              // ?? not || — an existing event's owner_name can be a
              // deliberately-cleared empty string, which must stay empty
              // rather than falling back to the session's name.
              setOwnerName(eventData.owner_name ?? fullName);
              setMeetingLink(eventData.meeting_link || "Link");
              setMeetingLinkUrl(eventData.meeting_link_url || "");
              setDurations(eventData.durations || ["15 min"]);
              setIsFormPageHidden(eventData.hide_form_page || false);
              setWeeklyHours(eventData.availability || DEFAULT_AVAILABILITY);
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

  // Loads this event's real guest bookings whenever the Results tab is
  // opened, so it always reflects whatever's come in since the tab was last viewed.
  useEffect(() => {
    if (tabIndex !== 4 || !currentEventId) return;
    setIsLoadingBookings(true);
    (async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id, guest_name, guest_email, guest_phone, guest_notes, booking_date, booking_time, created_at, extra_fields, source")
        .eq("event_id", currentEventId)
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Error loading bookings:", error);
      } else {
        setBookings(data || []);
      }
      setIsLoadingBookings(false);
    })();
  }, [tabIndex, currentEventId]);

  // Live slug-uniqueness check, debounced. Runs whenever the slug changes for
  // any reason — typed by hand or auto-derived from the title — so a
  // collision (e.g. two events both defaulting to "demo-call") surfaces as
  // soon as it exists, not just when a save happens to fail.
  useEffect(() => {
    if (isLoading || !slug) {
      updateSlugCheck({ checking: false, taken: false });
      return;
    }
    let active = true;
    updateSlugCheck({ checking: true, taken: false });
    const timer = setTimeout(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      let query = supabase
        .from("calendar_events")
        .select("id")
        .eq("user_id", session.user.id)
        .eq("slug", slug);
      if (currentEventIdRef.current) query = query.neq("id", currentEventIdRef.current);
      const { data } = await query.maybeSingle();
      if (active) updateSlugCheck({ checking: false, taken: !!data });
    }, 400);
    return () => { active = false; clearTimeout(timer); };
  }, [slug, currentEventId, isLoading]);

  // Serialised view of every persisted field. The autosave effect and the back
  // button both compare against lastSavedSnapshotRef using this, so they can't
  // disagree about whether the user changed anything.
  const buildSnapshot = () =>
    JSON.stringify({
      formName, title, description, ownerName, slug,
      meetingLink, meetingLinkUrl, durations, userAvatar, isFormPageHidden, weeklyHours,
    });

  useEffect(() => {
    // Wait for the initial load to settle before watching for edits.
    if (isLoading) return;

    const snapshot = buildSnapshot();

    // First pass after loading: record the baseline without saving, so simply
    // opening the page never creates or touches an event.
    if (lastSavedSnapshotRef.current === null) {
      lastSavedSnapshotRef.current = snapshot;
      return;
    }

    // Nothing the user did actually altered a persisted field.
    if (lastSavedSnapshotRef.current === snapshot) return;

    // A real edit. For an existing event this updates it; for a brand-new one
    // saveEventToDatabase inserts a row and remembers its id, so it shows up
    // in the calendar listing straight away.
    const delay = saveImmediatelyRef.current ? 0 : 1000;
    saveImmediatelyRef.current = false;
    const saveTimer = setTimeout(() => {
      lastSavedSnapshotRef.current = snapshot;
      savePromiseRef.current = savePromiseRef.current.then(() => saveEventToDatabase());
    }, delay);

    return () => clearTimeout(saveTimer);
  }, [formName, title, description, ownerName, slug, meetingLink, meetingLinkUrl, durations, userAvatar, isFormPageHidden, weeklyHours, currentEventId, isLoading]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);

    if (val.trim().length >= 3) {
      setFormName(val);
    }
  };

  const handleBack = async () => {
    // Only persist if the user actually changed something. Opening "Create
    // event" and going straight back must not create an empty event, and
    // re-opening an existing one without editing must not bump updated_at
    // (which would needlessly reorder the listing).
    const snapshot = buildSnapshot();
    const hasUnsavedChanges =
      lastSavedSnapshotRef.current !== null &&
      lastSavedSnapshotRef.current !== snapshot;

    if (hasUnsavedChanges) {
      lastSavedSnapshotRef.current = snapshot;
      await saveEventToDatabase();
    }

    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab') || 'calendar';
    router.push(`/builder?tab=${tab}`);
  };

  const saveEventToDatabase = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const buildPayload = (includeSlug: boolean): Record<string, unknown> => ({
        user_id: session.user.id,
        workspace_name: workspaceNameRef.current,
        title: formName,
        event_title: title,
        description: description,
        owner_name: ownerName,
        // Omitted (not set to null) when taken, so an update leaves whatever
        // slug the row already had untouched — the taken value the user
        // typed is never accepted, but their other edits still save.
        ...(includeSlug ? { slug: slug || null } : {}),
        meeting_link: meetingLink,
        meeting_link_url: meetingLinkUrl,
        durations: durations,
        avatar_url: userAvatar,
        hide_form_page: isFormPageHidden,
        availability: weeklyHours,
        updated_at: new Date().toISOString(),
      });

      if (currentEventIdRef.current) {
        // Update the existing event
        let { error } = await supabase
          .from("calendar_events")
          .update(buildPayload(!slugCheckRef.current.taken))
          .eq("id", currentEventIdRef.current);
        if (error?.code === "23505") {
          // The live check missed a race (e.g. another tab just claimed it) —
          // flag it the same way and retry once, saving everything else.
          updateSlugCheck({ checking: false, taken: true });
          ({ error } = await supabase
            .from("calendar_events")
            .update(buildPayload(false))
            .eq("id", currentEventIdRef.current));
        }
        if (error) {
          console.error("Error updating event:", error);
          toast({
            title: "Couldn't save changes",
            description: error.message,
            status: "error",
            isClosable: true,
          });
        }
      } else {
        // No id yet, so this page session is a brand-new event: insert a fresh
        // row rather than touching any previous event. The in-flight guard
        // stops a concurrent caller (e.g. handleBack firing while the autosave
        // insert is still running) creating a duplicate.
        if (insertInFlightRef.current) return;
        insertInFlightRef.current = true;
        try {
          let { data, error } = await supabase
            .from("calendar_events")
            .insert(buildPayload(!slugCheckRef.current.taken))
            .select("id, api_key")
            .single();
          if (error?.code === "23505") {
            updateSlugCheck({ checking: false, taken: true });
            ({ data, error } = await supabase
              .from("calendar_events")
              .insert(buildPayload(false))
              .select("id, api_key")
              .single());
          }
          if (error) {
            console.error("Error creating event:", error);
            toast({
              title: "Couldn't create event",
              description: error.message,
              status: "error",
              isClosable: true,
            });
          } else if (data) {
            // Set the ref first so any save queued behind this one updates the
            // row we just created instead of inserting another.
            currentEventIdRef.current = data.id;
            setCurrentEventId(data.id);
            setApiKey(data.api_key);
            // Reflect the new id in the URL so a refresh loads this row
            // instead of starting a second brand-new event (which would
            // reset every field, including meetingLink, back to defaults).
            const params = new URLSearchParams(window.location.search);
            params.set("id", String(data.id));
            router.replace(`/calendar-builder?${params.toString()}`);
          }
        } finally {
          insertInFlightRef.current = false;
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
    setDurations(durations.filter((_, i) => i !== index));
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

  const addAvailabilityRange = (day: string) => {
    setWeeklyHours((prev) => ({
      ...prev,
      [day]: [...prev[day], { start: 9 * 60, end: 17 * 60 }],
    }));
  };

  const updateAvailabilityRange = (day: string, index: number, field: "start" | "end", minutes: number) => {
    setWeeklyHours((prev) => ({
      ...prev,
      [day]: prev[day].map((range, i) => (i === index ? { ...range, [field]: minutes } : range)),
    }));
  };

  const removeAvailabilityRange = (day: string, index: number) => {
    setWeeklyHours((prev) => ({
      ...prev,
      [day]: prev[day].filter((_, i) => i !== index),
    }));
  };

  const duplicateAvailabilityRange = (day: string, index: number) => {
    setWeeklyHours((prev) => {
      const ranges = [...prev[day]];
      ranges.splice(index + 1, 0, { ...ranges[index] });
      return { ...prev, [day]: ranges };
    });
  };

  if (isLoading) {
    return <FullPageLoader />;
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
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (!slugManuallyEditedRef.current) setSlug(slugify(e.target.value));
                }}
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
              <Text
                fontSize="14px"
                color={tabIndex === 4 ? "customGray.800" : "customGray.600"}
                fontWeight={tabIndex === 4 ? "500" : "400"}
                cursor="pointer"
                onClick={() => setTabIndex(4)}
                pb="2px"
                borderBottom={tabIndex === 4 ? "2px solid" : "none"}
                borderBottomColor={tabIndex === 4 ? "customGray.800" : "transparent"}
              >
                Results
              </Text>
            </HStack>

            <HStack spacing="8px" position="absolute" right="16px">
              <Button
                size="sm"
                px="14px"
                variant="outline"
                borderColor="customGray.300"
                color="customGray.800"
                _hover={{ bg: "customGray.50" }}
                isDisabled={!currentEventId}
                onClick={() => window.open(`/book/${currentEventId}`, "_blank")}
              >
                Preview
              </Button>
              <Button
                size="sm"
                px="14px"
                bg="brand.primary"
                color="white"
                _hover={{ bg: "brand.primaryHover" }}
                onClick={() => {
                  if (!currentEventId) {
                    toast({ title: "Save the event before sharing", status: "info" });
                    return;
                  }
                  onShareOpen();
                }}
              >
                Share
              </Button>
            </HStack>
          </Box>

          {tabIndex === 4 ? (
            <Box flex="1" w="100%" overflowY="auto" p="30px">
              <Text fontSize="18px" fontWeight="600" color="customGray.800" mb="20px">Results</Text>
              {!currentEventId ? (
                <Text fontSize="14px" color="customGray.500">Save this event before it can receive bookings.</Text>
              ) : isLoadingBookings ? (
                <Text fontSize="14px" color="customGray.500">Loading...</Text>
              ) : bookings.length === 0 ? (
                <Text fontSize="14px" color="customGray.500">No one has booked this event yet.</Text>
              ) : (
                <VStack spacing="12px" align="stretch" maxW="700px">
                  {bookings.map((booking) => (
                    <Box key={booking.id} border="1px solid" borderColor="customGray.200" borderRadius="8px" p="16px" bg="white">
                      <HStack justify="space-between" mb="8px">
                        <HStack spacing="8px">
                          <Text fontSize="14px" fontWeight="600" color="customGray.800">{booking.guest_name || "No name provided"}</Text>
                          {booking.source === "webhook" && (
                            <Badge fontSize="10px" colorScheme="purple" borderRadius="4px">Webhook</Badge>
                          )}
                        </HStack>
                        <Text fontSize="13px" color="customGray.500">{booking.booking_date} · {booking.booking_time}</Text>
                      </HStack>
                      <Text fontSize="13px" color="customGray.600">{booking.guest_email || "No email provided"}</Text>
                      {booking.guest_phone && <Text fontSize="13px" color="customGray.600">{booking.guest_phone}</Text>}
                      {booking.guest_notes && <Text fontSize="13px" color="customGray.600" mt="8px">"{booking.guest_notes}"</Text>}
                      {booking.extra_fields && Object.keys(booking.extra_fields).length > 0 && (
                        <VStack align="stretch" spacing="2px" mt="8px" pt="8px" borderTop="1px solid" borderColor="customGray.100">
                          {Object.entries(booking.extra_fields).map(([key, value]) => (
                            <Text key={key} fontSize="12px" color="customGray.500">
                              <Text as="span" fontWeight="600">{key}:</Text> {String(value)}
                            </Text>
                          ))}
                        </VStack>
                      )}
                    </Box>
                  ))}
                </VStack>
              )}
            </Box>
          ) : tabIndex === 2 ? (
            <HStack align="stretch" flex="1" w="100%" overflowY="auto" p="0px" bg="customGray.50" spacing="0px">
            <HStack align="stretch" flex="1" spacing="0px" overflow="hidden">
              <Box w="255px" flexShrink={0} h="100%" bg="white" overflow="hidden">
                <VStack align="stretch" spacing="4px" px="12px" pb="12px">
                  <Text fontSize="11px" fontWeight="500" textTransform="uppercase" letterSpacing="0.04em" color="customGray.800" px="16px" pt="16px" pb="8px">
                    Configure
                  </Text>
                  {["Availability", "Reschedule and cancel", "Limits & buffers", "Privacy and security"].map((label, i) => (
                    <Box
                      key={i}
                      h="32px"
                      px="14px"
                      display="flex"
                      alignItems="center"
                      borderRadius="8px"
                      bg={i === 0 ? "customGray.100" : "transparent"}
                      cursor="pointer"
                      _hover={{ bg: "customGray.50" }}
                    >
                      <Text fontSize="14px" fontWeight={i === 0 ? "500" : "400"} color={i === 0 ? "customGray.800" : "customGray.500"}>{label}</Text>
                    </Box>
                  ))}
                </VStack>
              </Box>

              <Box flex="1" h="100%" bg="white" borderLeft="1px solid" borderColor="customGray.200" overflow="hidden" display="flex" flexDirection="column">
                <Box flex="1" overflowY="auto" bg="customGray.50">
                <Box w="688px" mx="auto" pt="48px" pb="40px">
                  <Box>
                    <Text fontSize="22px" fontWeight="500" color="customGray.800" mb="2px">Availability</Text>
                    <Text fontSize="14px" color="customGray.500" mb="48px">Weekly hours, buffers, and booking limits</Text>
                  </Box>


                  {isAvailabilityOpen && (
                    <>
                    <Text fontSize="16px" fontWeight="500" color="customGray.800">Weekly hours</Text>
                    <Box bg="white" border="1px solid" borderColor="customGray.200" borderRadius="16px" p="0px" mt="24px" mb="16px">
                      <VStack align="stretch" spacing="0px">
                        {WEEK_DAYS.map((day, dayIndex) => {
                          const ranges = weeklyHours[day];
                          return (
                            <Box key={day} borderBottom={dayIndex < WEEK_DAYS.length - 1 ? "1px solid" : "none"} borderColor="customGray.200">
                              <HStack align="flex-start" spacing="16px" px="24px" py="16px">
                                <Text fontSize="14px" fontWeight="600" color="customGray.800" w="90px" flexShrink={0} pt="6px">
                                  {day}
                                </Text>
                                <VStack align="stretch" spacing="10px" flex="1">
                                  {ranges.length === 0 ? (
                                    <HStack>
                                      <Text w="140px" fontSize="14px" color="customGray.400">Unavailable</Text>
                                      <HStack spacing="2px" p="3px" border="1px solid" borderColor="customGray.200" borderRadius="12px" overflow="hidden" boxShadow="0 1px 8px 0 rgba(0, 0, 0, 0.08)">
                                        <IconButton
                                          aria-label={`Add a time range for ${day}`}
                                          icon={<AddIcon w="12px" h="12px" />}
                                          size="sm"
                                          variant="ghost"
                                          borderRadius="8px"
                                          color="customGray.600"
                                          _hover={{ bg: "customGray.800", color: "white" }}
                                          onClick={() => addAvailabilityRange(day)}
                                        />
                                      </HStack>
                                    </HStack>
                                  ) : (
                                    ranges.map((range, rangeIndex) => (
                                      <HStack key={rangeIndex} spacing="14px">
                                        <TimeTextInput
                                          minutes={range.start}
                                          onCommit={(minutes) => updateAvailabilityRange(day, rangeIndex, "start", minutes)}
                                          bg="customGray.100"
                                          border="none"
                                          borderRadius="8px"
                                          size="sm"
                                          fontSize="14px"
                                          w="140px"
                                        />
                                        <Text color="customGray.400">-</Text>
                                        <TimeTextInput
                                          minutes={range.end}
                                          onCommit={(minutes) => updateAvailabilityRange(day, rangeIndex, "end", minutes)}
                                          bg="customGray.100"
                                          border="none"
                                          borderRadius="8px"
                                          size="sm"
                                          fontSize="14px"
                                          w="140px"
                                        />
                                        <HStack spacing="2px" p="3px" border="1px solid" borderColor="customGray.200" borderRadius="12px" overflow="hidden" boxShadow="0 1px 8px 0 rgba(0, 0, 0, 0.08)">
                                          {rangeIndex === 0 && (
                                            <IconButton
                                              aria-label={`Add a time range for ${day}`}
                                              icon={<AddIcon w="12px" h="12px" />}
                                              size="sm"
                                              variant="ghost"
                                              borderRadius="8px"
                                              color="customGray.600"
                                              isDisabled={ranges.length >= 10}
                                              _hover={ranges.length >= 10 ? undefined : { bg: "customGray.800", color: "white" }}
                                              onClick={() => addAvailabilityRange(day)}
                                            />
                                          )}
                                          <IconButton
                                            aria-label={`Delete this time slot for ${day}`}
                                            icon={
                                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M17.4166 7.83333V17.8333C17.4166 18.2754 17.2411 18.6993 16.9285 19.0118C16.6159 19.3244 16.192 19.5 15.75 19.5H8.24998C7.80795 19.5 7.38403 19.3244 7.07147 19.0118C6.75891 18.6993 6.58331 18.2754 6.58331 17.8333V7.83333M18.6666 7.83333H5.33331M9.08331 7.83333V7.41667C9.08331 6.64312 9.3906 5.90125 9.93758 5.35427C10.4846 4.80729 11.2264 4.5 12 4.5C12.7735 4.5 13.5154 4.80729 14.0624 5.35427C14.6094 5.90125 14.9166 6.64312 14.9166 7.41667V7.83333M10.3333 15.3333V12M13.6667 15.3333V12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                              </svg>
                                            }
                                            size="sm"
                                            variant="ghost"
                                            borderRadius="8px"
                                            color="customGray.600"
                                            _hover={{ bg: "customGray.800", color: "white" }}
                                            onClick={() => removeAvailabilityRange(day, rangeIndex)}
                                          />
                                          {rangeIndex === 0 && (
                                            <IconButton
                                              aria-label={`Duplicate this time slot for ${day}`}
                                              icon={
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                  <rect x="7.8316" y="7.83203" width="11.6715" height="11.6715" rx="1.66667" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                  <path d="M7.83161 16.1686H6.16425C5.24339 16.1686 4.49689 15.4221 4.49689 14.5012V6.16443C4.49689 5.24357 5.24339 4.49707 6.16425 4.49707H14.5011C15.4219 4.49707 16.1684 5.24357 16.1684 6.16443V7.83179" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                              }
                                              size="sm"
                                              variant="ghost"
                                              borderRadius="8px"
                                              color="customGray.600"
                                              _hover={{ bg: "customGray.800", color: "white" }}
                                              onClick={() => duplicateAvailabilityRange(day, rangeIndex)}
                                            />
                                          )}
                                        </HStack>
                                      </HStack>
                                    ))
                                  )}
                                </VStack>
                              </HStack>
                            </Box>
                          );
                        })}
                      </VStack>
                    </Box>
                    </>
                  )}

                </Box>
                </Box>
              </Box>
            </HStack>
            </HStack>
          ) : (
          <HStack spacing="0px" flex="1" align="stretch" w="100%" overflow="hidden">
            {/* Left Sidebar */}
            <Box
              w={selectedPage === "Form page" && isFormPageHidden ? "0px" : "380px"}
              flexShrink={0}
              overflow="hidden"
              pointerEvents={selectedPage === "Form page" && isFormPageHidden ? "none" : "auto"}
              transition="width 0.4s cubic-bezier(0.4, 0, 0.2, 1)"
              bg="white"
              borderRight="1px solid"
              borderColor="customGray.200"
            >
              {/* Fixed width so it never reflows as the outer container's
                  width animates. Sliding this by the same amount, on the
                  same timing, as the outer width collapses makes it read as
                  the panel sliding out to the left rather than being
                  squeezed/clipped in place. */}
              <Box
                w="380px"
                h="100%"
                overflowY="auto"
                transform={selectedPage === "Form page" && isFormPageHidden ? "translateX(-380px)" : "translateX(0)"}
                transition="transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)"
              >
              <VStack spacing="0px" align="stretch">
                <HStack spacing="8px" py="20px" px="30px">
                  <Text fontSize="14px" fontWeight="bold">📅</Text>
                  <Heading fontSize="14px" fontWeight="600" color="customGray.800">General</Heading>
                </HStack>

                <Box h="1px" bg="customGray.200" w="100%" />

                <HStack justify="space-between" align="center" py="20px" px="30px" w="100%">
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

                <VStack spacing="2px" align="stretch" py="20px" px="30px">
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

                <VStack spacing="12px" align="stretch" py="20px" px="30px">
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
                    resize="vertical"
                    minH="80px"
                    overflowY="auto"
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

                <VStack spacing="12px" align="stretch" py="20px" px="30px">
                  <HStack spacing="6px">
                    <Text fontSize="14px" fontWeight="500" color="customGray.800">Scheduling page link</Text>
                    <Text as="span" color="red.500">*</Text>
                    <Tooltip label="This is your public booking link. The username is set in account settings; you can edit the last part here." placement="top" hasArrow>
                      <InfoOutlineIcon w="14px" h="14px" color="customGray.500" />
                    </Tooltip>
                  </HStack>
                  <HStack
                    spacing="0px"
                    h="40px"
                    px="12px"
                    border="1px solid"
                    borderColor={slugCheck.taken ? "red.500" : "customGray.300"}
                    borderRadius="md"
                    bg="customGray.50"
                    _hover={{ borderColor: slugCheck.taken ? "red.500" : "customGray.400" }}
                  >
                    <Text fontSize="14px" color="customGray.600" whiteSpace="nowrap" flexShrink={0}>
                      webforms.com/
                    </Text>
                    {username ? (
                      <Text fontSize="14px" color="customGray.600" whiteSpace="nowrap" flexShrink={0}>
                        {username}/
                      </Text>
                    ) : (
                      <Button
                        size="xs"
                        variant="link"
                        color="sky.500"
                        flexShrink={0}
                        onClick={onUsernameOpen}
                      >
                        Set your username
                      </Button>
                    )}
                    {username && (
                      <Input
                        size="md"
                        flex="1"
                        value={slug}
                        onChange={(e) => {
                          slugManuallyEditedRef.current = true;
                          setSlug(slugify(e.target.value));
                        }}
                        placeholder="event-name"
                        border="none"
                        bg="transparent"
                        fontSize="14px"
                        fontWeight="400"
                        color="customGray.800"
                        px="0px"
                        _focus={{ boxShadow: "none" }}
                        _hover={{ bg: "transparent" }}
                      />
                    )}
                  </HStack>
                  {slugCheck.taken && (
                    <Text fontSize="xs" color="red.500" fontWeight="500">
                      This scheduling link is already taken. Please add a unique slug name.
                    </Text>
                  )}
                </VStack>

                <UsernameModal
                  isOpen={isUsernameOpen}
                  onClose={onUsernameClose}
                  currentUsername={username}
                  onSaved={setUsername}
                />

                <Box h="1px" bg="customGray.200" w="100%" />

                <VStack spacing="12px" align="stretch" py="20px" px="30px">
                  <VStack spacing="2px" align="stretch">
                    <Text fontSize="14px" fontWeight="500" color="customGray.800">Meeting link</Text>
                    <Text fontSize="xs" color="customGray.500">Choose the times of day you'll accept meetings.</Text>
                  </VStack>
                  <HStack
                    h="40px"
                    boxSizing="border-box"
                    spacing="0px"
                    align="center"
                    border="1px solid"
                    borderColor="customGray.300"
                    borderRadius="md"
                    bg="customGray.50"
                    _hover={{ borderColor: "customGray.400" }}
                  >
                    <Menu>
                      <MenuButton
                        as={Box}
                        h="100%"
                        pl="12px"
                        pr="8px"
                        cursor="pointer"
                        display="flex"
                        alignItems="center"
                        fontSize="14px"
                        color="customGray.800"
                        fontWeight="400"
                        flexShrink={0}
                      >
                        {/* Chakra's MenuButton wraps this in its own <span>, which
                            is NOT itself a flex container — so layout must be
                            enforced here, in a single flex box, rather than
                            relying on multiple loose siblings that could wrap. */}
                        <Box as="span" display="flex" flexDirection="row" alignItems="center" gap="4px" whiteSpace="nowrap">
                          {meetingLink === "G-meet" && (
                            <Box as="span" flexShrink={0} display="flex" alignItems="center">
                              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M1.37231 15.9301C1.37231 16.5541 1.88211 17.0596 2.51023 17.0596H2.52658C1.88885 17.0596 1.37231 16.5541 1.37231 15.9301Z" fill="#FBBC05"/>
                                <path d="M11.1513 7.17604V10.1248L15.1268 6.91815V4.0701C15.1268 3.4461 14.6169 2.94067 13.9888 2.94067H5.3761L5.36841 7.17604H11.1513Z" fill="#FBBC05"/>
                                <path d="M11.1508 13.0745H5.35831L5.35156 17.0585H13.9884C14.6175 17.0585 15.1264 16.5531 15.1264 15.9291V13.3577L11.1508 10.1257V13.0745Z" fill="#34A853"/>
                                <path d="M5.37568 2.94067L1.37231 7.17604H5.36893L5.37568 2.94067Z" fill="#EA4335"/>
                                <path d="M1.37231 13.075V15.9296C1.37231 16.5536 1.88885 17.059 2.52658 17.059H5.35168L5.35834 13.075H1.37231Z" fill="#1967D2"/>
                                <path d="M5.36893 7.17529H1.37231V13.0738H5.35834L5.36893 7.17529Z" fill="#4285F4"/>
                                <path d="M18.6218 14.9256V5.23139C18.3976 3.94478 16.9866 5.41963 16.9866 5.41963L15.1272 6.91894V13.3575L17.7887 15.5214C18.7497 15.6475 18.6218 14.9256 18.6218 14.9256Z" fill="#34A853"/>
                                <path d="M11.1511 10.1246L15.1276 13.3576V6.91895L11.1511 10.1246Z" fill="#188038"/>
                              </svg>
                            </Box>
                          )}
                          {meetingLink === "Zoom" && (
                            <Box as="span" flexShrink={0} display="flex" alignItems="center">
                              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M13.75 1.25H6.25C3.48858 1.25 1.25 3.48858 1.25 6.25V13.75C1.25 16.5114 3.48858 18.75 6.25 18.75H13.75C16.5114 18.75 18.75 16.5114 18.75 13.75V6.25C18.75 3.48858 16.5114 1.25 13.75 1.25Z" fill="#519CFD"/>
                                <path d="M5.05981 8.24035C5.05981 7.66696 5.52464 7.20215 6.09803 7.20215H10.1919C11.3387 7.20215 12.2683 8.13179 12.2683 9.27856V12.0251C12.2683 12.5985 11.8035 13.0634 11.2301 13.0634H7.13623C5.98946 13.0634 5.05981 12.1337 5.05981 10.9869V8.24035Z" fill="white"/>
                                <path d="M12.6577 11.1375V8.9918C12.6577 8.962 12.6705 8.93365 12.6928 8.91393L14.4826 7.3351C14.6837 7.15767 15.0001 7.30047 15.0001 7.56866V12.5478C15.0001 12.8153 14.685 12.9584 14.4836 12.7822L12.6932 11.2156C12.6706 11.1959 12.6577 11.1674 12.6577 11.1375Z" fill="white"/>
                              </svg>
                            </Box>
                          )}
                          {meetingLink === "In person" && (
                            <Box as="span" flexShrink={0} display="flex" alignItems="center">
                              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <g clipPath="url(#clip0_58_45)">
                                  <path d="M10.0002 2.5C13.2216 2.50022 15.8331 5.11163 15.8333 8.33301C15.8333 12.6917 10.0434 17.4645 10.0002 17.5C10.0002 17.5 4.16626 12.708 4.16626 8.33301C4.16644 5.11149 6.77869 2.5 10.0002 2.5ZM10.0002 5.83301C8.61952 5.83301 7.50041 6.95232 7.50024 8.33301C7.50024 9.71384 8.61941 10.833 10.0002 10.833C11.381 10.8329 12.5002 9.71376 12.5002 8.33301C12.5001 6.9524 11.3809 5.83314 10.0002 5.83301Z" fill="#52525B"/>
                                </g>
                                <defs>
                                  <clipPath id="clip0_58_45">
                                    <rect width="20" height="20" fill="white"/>
                                  </clipPath>
                                </defs>
                              </svg>
                            </Box>
                          )}
                          {meetingLink === "Link" && (
                            <Box as="span" flexShrink={0} display="flex" alignItems="center">
                              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <g clipPath="url(#clip0_58_39)">
                                  <path d="M13.7301 11.6342L15.5559 9.80834C17.0187 8.3086 16.9888 5.90698 15.4891 4.44418C14.0157 3.00709 11.6651 3.00709 10.1918 4.44418L8.36593 6.27001M12.2251 7.77501L7.7751 12.225M6.2701 8.36584L4.44427 10.1917C2.98146 11.6914 3.0114 14.093 4.51114 15.5558C5.98451 16.9929 8.33507 16.9929 9.80844 15.5558L11.6343 13.73" stroke="#52525B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </g>
                                <defs>
                                  <clipPath id="clip0_58_39">
                                    <rect width="20" height="20" fill="white"/>
                                  </clipPath>
                                </defs>
                              </svg>
                            </Box>
                          )}
                          <Box as="span" flexShrink={0} display="flex" alignItems="center">
                            <ChevronDownIcon w="16px" h="16px" />
                          </Box>
                        </Box>
                      </MenuButton>
                      <MenuList fontSize="14px">
                        <MenuItem onClick={() => { saveImmediatelyRef.current = true; setMeetingLink("G-meet"); }}>G-meet</MenuItem>
                        <MenuItem onClick={() => { saveImmediatelyRef.current = true; setMeetingLink("Zoom"); }}>Zoom</MenuItem>
                        <MenuItem onClick={() => { saveImmediatelyRef.current = true; setMeetingLink("In person"); }}>In person</MenuItem>
                        <MenuItem onClick={() => { saveImmediatelyRef.current = true; setMeetingLink("Link"); }}>Link</MenuItem>
                      </MenuList>
                    </Menu>
                    <Box w="1px" h="24px" bg="customGray.300" flexShrink={0} />
                    {meetingLink === "G-meet" ? (
                      <>
                        <HStack h="100%" spacing="8px" flex="1" px="8px" align="center">
                          <Text fontSize="14px" fontWeight="400" color="customGray.800">Google Meet</Text>
                        </HStack>
                        {isGoogleConnected ? (
                          <HStack h="100%" spacing="4px" flexShrink={0} pr="8px" align="center">
                            <svg width="18" height="18" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M7 1.75C9.8991 1.75 12.25 4.1009 12.25 7C12.25 9.8991 9.8991 12.25 7 12.25C4.1009 12.25 1.75 9.8991 1.75 7C1.75 4.10089 4.10089 1.75 7 1.75ZM9.62793 5.42578C9.39361 5.19157 9.01358 5.1915 8.7793 5.42578L6.28711 7.91797L4.96191 6.5918C4.72767 6.35746 4.34765 6.35757 4.11328 6.5918C3.87901 6.82605 3.87908 7.20608 4.11328 7.44043L5.8623 9.19141C5.97481 9.30397 6.12796 9.36716 6.28711 9.36719C6.44605 9.36719 6.59845 9.30368 6.71094 9.19141L9.62793 6.27441C9.86224 6.0401 9.86224 5.6601 9.62793 5.42578Z" fill="#16A34A"/>
                            </svg>
                            <Text fontSize="14px" fontWeight="500" color="green.500">Connected</Text>
                          </HStack>
                        ) : (
                          <Button
                            size="xs"
                            variant="outline"
                            flexShrink={0}
                            mr="8px"
                            borderColor="customGray.300"
                            color="customGray.800"
                            bg="white"
                            _hover={{ bg: "customGray.50" }}
                            onClick={handleConnectGoogle}
                          >
                            Connect
                          </Button>
                        )}
                      </>
                    ) : meetingLink === "Zoom" ? (
                      <>
                        <HStack h="100%" spacing="8px" flex="1" px="8px" align="center">
                          <Text fontSize="14px" fontWeight="400" color="customGray.800">Zoom</Text>
                        </HStack>
                        {isZoomConnected ? (
                          <HStack h="100%" spacing="4px" flexShrink={0} pr="8px" align="center">
                            <svg width="18" height="18" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M7 1.75C9.8991 1.75 12.25 4.1009 12.25 7C12.25 9.8991 9.8991 12.25 7 12.25C4.1009 12.25 1.75 9.8991 1.75 7C1.75 4.10089 4.10089 1.75 7 1.75ZM9.62793 5.42578C9.39361 5.19157 9.01358 5.1915 8.7793 5.42578L6.28711 7.91797L4.96191 6.5918C4.72767 6.35746 4.34765 6.35757 4.11328 6.5918C3.87901 6.82605 3.87908 7.20608 4.11328 7.44043L5.8623 9.19141C5.97481 9.30397 6.12796 9.36716 6.28711 9.36719C6.44605 9.36719 6.59845 9.30368 6.71094 9.19141L9.62793 6.27441C9.86224 6.0401 9.86224 5.6601 9.62793 5.42578Z" fill="#16A34A"/>
                            </svg>
                            <Text fontSize="14px" fontWeight="500" color="green.500">Connected</Text>
                          </HStack>
                        ) : (
                          <Button
                            size="xs"
                            variant="outline"
                            flexShrink={0}
                            mr="8px"
                            borderColor="customGray.300"
                            color="customGray.800"
                            bg="white"
                            _hover={{ bg: "customGray.50" }}
                            onClick={handleConnectZoom}
                          >
                            Connect
                          </Button>
                        )}
                      </>
                    ) : (
                      <Input
                        h="100%"
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
                  </HStack>
                </VStack>

                <Box h="1px" bg="customGray.200" w="100%" />

                <VStack spacing="8px" align="stretch" py="20px" px="30px" pb="32px">
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
                        {durations.length === 0 && (
                          <Text fontSize="14px" color="customGray.400" mb="8px">
                            Enter the duration
                          </Text>
                        )}
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
                  <IconButton
                    aria-label={selectedPage === "Main page" ? "Go to Form page" : "Go back"}
                    size="sm"
                    variant="ghost"
                    icon={
                      selectedPage === "Main page" ? (
                        <ArrowForwardIcon w="16px" h="16px" />
                      ) : (
                        <ArrowBackIcon w="16px" h="16px" />
                      )
                    }
                    _hover={{ bg: "customGray.100" }}
                    onClick={
                      selectedPage === "Main page"
                        ? () => setSelectedPage("Form page")
                        : selectedPage === "Form page"
                        ? () => setSelectedPage("Main page")
                        : () => setSelectedPage("Form page")
                    }
                  />
                  {selectedPage === "Form page" && (
                    <IconButton
                      aria-label="Go to Success page"
                      size="sm"
                      variant="ghost"
                      icon={<ArrowForwardIcon w="16px" h="16px" />}
                      _hover={{ bg: "customGray.100" }}
                      onClick={() => setSelectedPage("Success page")}
                    />
                  )}
                  <Box w="1px" h="16px" bg="customGray.200" mx="2px" />
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
                          <MenuItem
                            onClick={() => {
                              setSelectedPage(page);
                              const params = new URLSearchParams(window.location.search);
                              params.set("page", page);
                              router.replace(`/calendar-builder?${params.toString()}`);
                            }}
                          >
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
                        aria-label={isFormPageHidden ? "Show form page" : "Hide form page"}
                        icon={
                          isFormPageHidden ? (
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <g clipPath="url(#clip0_470_1664)">
                                <path d="M7.91313 15.4212C8.59563 15.6853 9.29813 15.8337 9.99979 15.8337C12.9123 15.8337 15.8248 13.3062 17.4015 10.3903C17.5323 10.1478 17.5323 9.85366 17.4015 9.61116C16.9865 8.84366 16.4748 8.10866 15.899 7.43449M4.16646 15.8337L15.8331 4.16699M8.14396 11.8562C7.11896 10.8312 7.11896 9.16866 8.14396 8.14366C9.16896 7.11866 10.8315 7.11866 11.8565 8.14366M14.2031 5.79699C12.914 4.79949 11.4565 4.16699 9.99979 4.16699C7.08729 4.16699 4.17479 6.69449 2.59813 9.61116C2.46729 9.85366 2.46729 10.1478 2.59813 10.3903C3.38646 11.8478 4.50813 13.2078 5.79646 14.2045" stroke="#52525B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </g>
                              <defs>
                                <clipPath id="clip0_470_1664">
                                  <rect width="20" height="20" fill="white"/>
                                </clipPath>
                              </defs>
                            </svg>
                          ) : (
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <g clipPath="url(#clip0_470_1648)">
                                <path d="M11.7683 8.23366C12.7442 9.20949 12.7442 10.7937 11.7683 11.7712C10.7925 12.747 9.20833 12.747 8.23083 11.7712C7.255 10.7953 7.255 9.21116 8.23083 8.23366C9.20833 7.25616 10.7917 7.25616 11.7683 8.23366Z" stroke="#52525B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M2.5 10.0003C2.5 9.45116 2.62667 8.90783 2.87167 8.40699C4.13417 5.82616 6.92417 4.16699 10 4.16699C13.0758 4.16699 15.8658 5.82616 17.1283 8.40699C17.3733 8.90783 17.5 9.45116 17.5 10.0003C17.5 10.5495 17.3733 11.0928 17.1283 11.5937C15.8658 14.1745 13.0758 15.8337 10 15.8337C6.92417 15.8337 4.13417 14.1745 2.87167 11.5937C2.62667 11.0928 2.5 10.5495 2.5 10.0003Z" stroke="#52525B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </g>
                              <defs>
                                <clipPath id="clip0_470_1648">
                                  <rect width="20" height="20" fill="white"/>
                                </clipPath>
                              </defs>
                            </svg>
                          )
                        }
                        color="customGray.600"
                        bg={isFormPageHidden ? "customGray.100" : "transparent"}
                        _hover={{ bg: "customGray.100" }}
                        onClick={() => {
                          saveImmediatelyRef.current = true;
                          setIsFormPageHidden((prev) => !prev);
                        }}
                      />
                    </>
                  )}


                </HStack>

                {/* Preview Card */}
                <Box w="fit-content" h={selectedPage === "Success page" ? "580px" : "484px"} p={selectedPage === "Success page" ? "0px" : "12px"} bg="white" border="1px solid" borderColor="customGray.200" boxShadow="0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)" borderRadius="20px" position="relative" overflow="hidden">
                <HStack
                  spacing="0px"
                  align="stretch"
                  w="100%"
                  h="100%"
                  filter={selectedPage === "Form page" && isFormPageHidden ? "blur(4px)" : "none"}
                  pointerEvents={selectedPage === "Form page" && isFormPageHidden ? "none" : "auto"}
                  userSelect={selectedPage === "Form page" && isFormPageHidden ? "none" : "auto"}
                  transition="filter 0.4s cubic-bezier(0.4, 0, 0.2, 1)"
                >
                  {selectedPage !== "Success page" && (
                    <VStack spacing="16px" align="start" w="280px" flexShrink={0} pl="16px" pr="24px" pt="24px" pb="24px" overflowY="auto" maxH="100%">
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
                          <Text>{Intl.DateTimeFormat().resolvedOptions().timeZone}</Text>
                        </HStack>
                      </VStack>
                    </VStack>
                  )}

                  {selectedPage === "Main page" ? (
                    <Box display="flex" border="1px solid" borderColor="customGray.200" borderRadius="8px" overflow="hidden">
                      <Box w="440px" flexShrink={0} display="flex" alignItems="flex-start" justifyContent="center" bg="customGray.50" px="30px" pt="24px">
                        <CalendarPicker
                          value={previewDate}
                          onChange={(date) => { setPreviewDate(date); setPreviewTime(null); }}
                          isDateDisabled={(date) => getDayRanges(weeklyHours, date).length === 0}
                        />
                      </Box>

                      <VStack spacing="0px" w="260px" flexShrink={0} borderLeft="1px solid" borderColor="customGray.200" bg="customGray.50" p="0px">
                        <HStack w="100%" justify="space-between" px="30px" pt="24px" pb="12px">
                          <Text fontSize="14px" fontWeight="600" color="customGray.800">
                            {previewDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                          </Text>
                          <Tabs
                            variant="soft-rounded"
                            colorScheme="gray"
                            size="sm"
                            index={previewIs24Hour ? 1 : 0}
                            onChange={(index) => setPreviewIs24Hour(index === 1)}
                          >
                            <TabList bg="customGray.100" borderRadius="9999px" p="4px">
                              <Tab fontSize="12px" _selected={{ bg: "white", color: "customGray.800" }}>12h</Tab>
                              <Tab fontSize="12px" _selected={{ bg: "white", color: "customGray.800" }}>24h</Tab>
                            </TabList>
                          </Tabs>
                        </HStack>
                        <VStack spacing="12px" w="100%" overflowY="auto" maxH="380px" align="stretch" px="30px" pt="4px" pb="16px" sx={{ "&::-webkit-scrollbar": { w: "0px" }, "&::-webkit-scrollbar-track": { bg: "transparent" }, "&::-webkit-scrollbar-thumb": { bg: "transparent" } }}>
                          {getDayRanges(weeklyHours, previewDate).length === 0 && (
                            <Text fontSize="13px" color="customGray.500" textAlign="center" pt="16px">No availability this day.</Text>
                          )}
                          {buildTimeSlots(parseDurationMinutes(durations[0]), getDayRanges(weeklyHours, previewDate)).map((minutes) => {
                            const label = formatTime(Math.floor(minutes / 60), minutes % 60, previewIs24Hour);
                            const isSelected = minutes === previewTime;
                            if (isSelected) {
                              const compactDateLabel = previewDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                              return (
                                <Box key={minutes} w="100%" flexShrink={0} borderRadius="8px" overflow="hidden">
                                  <Box bg="customGray.700" color="white" minH="40px" px="16px" py="8px" display="flex" flexWrap="wrap" alignItems="center" justifyContent="center" fontSize="12px" fontWeight="700" textAlign="center">
                                    {compactDateLabel} {label}<Text as="span" fontSize="10px" fontWeight="500" ml="4px">({Intl.DateTimeFormat().resolvedOptions().timeZone})</Text>
                                  </Box>
                                  <Button
                                    w="100%"
                                    h="40px"
                                    bg="customGray.800"
                                    color="white"
                                    fontSize="15px"
                                    fontWeight="600"
                                    borderRadius="0"
                                    _hover={{ bg: "customGray.900" }}
                                    onClick={() => setSelectedPage(isFormPageHidden ? "Success page" : "Form page")}
                                  >
                                    Confirm
                                  </Button>
                                </Box>
                              );
                            }
                            return (
                              <Button
                                key={minutes}
                                w="100%"
                                h="36px"
                                p="0px"
                                flexShrink={0}
                                fontSize="14px"
                                fontWeight="400"
                                variant="outline"
                                borderColor="customGray.200"
                                boxShadow="0 1px 2px rgba(0,0,0,0.05)"
                                bg="white"
                                color="customGray.500"
                                _hover={{ bg: "customGray.50", borderColor: "customGray.300" }}
                                onClick={() => setPreviewTime(minutes)}
                              >
                                {label}
                              </Button>
                            );
                          })}
                        </VStack>
                      </VStack>
                    </Box>
                  ) : selectedPage === "Form page" ? (
                    <VStack spacing="16px" flex="1" align="stretch" bg="customGray.50" border="1px solid" borderColor="customGray.200" borderRadius="8px" p="24px" overflowY="auto">
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

                      <VStack spacing="16px" align="stretch" w="100%" border="1px solid" borderColor="customGray.200" borderRadius="12px" p="20px" bg="customGray.50">
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
                              <VStack spacing="2px" align="start">
                                <HStack spacing="4px">
                                  <Text fontSize="14px" color="customGray.700">{ownerName || userName}</Text>
                                  <Text fontSize="xs" fontWeight="500" bg="blue.100" color="blue.700" px="6px" py="2px" borderRadius="4px">Host</Text>
                                </HStack>
                                {ownerEmail && <Text fontSize="14px" color="customGray.600">{ownerEmail}</Text>}
                              </VStack>
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
                {selectedPage === "Form page" && (
                  <Box
                    position="absolute"
                    inset="0"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    bg="rgba(255, 255, 255, 0.5)"
                    opacity={isFormPageHidden ? 1 : 0}
                    pointerEvents="none"
                    transition="opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1)"
                  >
                    <VStack spacing="12px">
                      <svg width="63" height="63" viewBox="0 0 126 126" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="8" y="8" width="110" height="110" rx="34.9206" fill="#18181B"/>
                        <rect x="4.5" y="4.5" width="117" height="117" rx="38.4206" stroke="#27272A" strokeOpacity="0.08" strokeWidth="7"/>
                        <path d="M62.9994 88.4998C77.0829 88.4998 88.4998 77.0829 88.4998 62.9994C88.4998 48.9159 77.0829 37.499 62.9994 37.499C48.9159 37.499 37.499 48.9159 37.499 62.9994C37.499 77.0829 48.9159 88.4998 62.9994 88.4998Z" fill="#F4F4F5"/>
                        <path d="M58.749 75.0418H67.2491M63.4496 74.6877V60.875H59.8115" stroke="#18181B" strokeWidth="3.18755" strokeLinecap="round" strokeLinejoin="round"/>
                        <circle cx="62.4678" cy="52.9063" r="1.59377" fill="#18181B" stroke="#18181B" strokeWidth="2.12503"/>
                      </svg>
                      <VStack spacing="4px">
                        <Text fontSize="16px" fontWeight="600" color="customGray.800">This flow is hidden.</Text>
                        <Text fontSize="14px" color="customGray.700">Select the eye icon to show it again.</Text>
                      </VStack>
                    </VStack>
                  </Box>
                )}
              </Box>
              </VStack>
            </Box>
          </HStack>
          )}
        </VStack>
      </Box>

      <AddPage
        isOpen={isOpen}
        onClose={onClose}
        availablePages={availablePages}
        setAvailablePages={setAvailablePages}
        setSelectedPage={setSelectedPage}
      />

      <Modal isOpen={isShareOpen} onClose={onShareClose} size="lg" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent maxH="85vh">
          <ModalHeader fontSize="16px" fontWeight="600">Share this booking page</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb="24px" overflowY="auto">
            <VStack align="stretch" spacing="20px">
              <Box>
                <Text fontSize="sm" fontWeight="600" color="customGray.800" mb="4px">Widget</Text>
                <Text fontSize="xs" color="customGray.500" mb="10px">Adds a floating "Book a meeting" button to your site that opens this page in a popup.</Text>
                <Box position="relative" bg="customGray.50" border="1px solid" borderColor="customGray.200" borderRadius="8px" p="12px" pr="36px" maxH="140px" overflowY="auto">
                  <Text as="pre" fontSize="xs" fontFamily="mono" color="customGray.700" whiteSpace="pre-wrap" wordBreak="break-all">
                    {widgetEmbedCode}
                  </Text>
                  <IconButton
                    aria-label="Copy widget code"
                    icon={<CopyIcon w="12px" h="12px" />}
                    size="xs"
                    variant="ghost"
                    position="absolute"
                    top="8px"
                    right="8px"
                    color="customGray.500"
                    _hover={{ bg: "customGray.200" }}
                    onClick={() => {
                      navigator.clipboard.writeText(widgetEmbedCode);
                      toast({ title: "Widget code copied", status: "success", duration: 1500 });
                    }}
                  />
                </Box>
              </Box>

              <Box>
                <Text fontSize="sm" fontWeight="600" color="customGray.800" mb="4px">Iframe</Text>
                <Text fontSize="xs" color="customGray.500" mb="10px">Embeds this booking page directly inline, wherever you paste it.</Text>
                <Box position="relative" bg="customGray.50" border="1px solid" borderColor="customGray.200" borderRadius="8px" p="12px" pr="36px" maxH="140px" overflowY="auto">
                  <Text as="pre" fontSize="xs" fontFamily="mono" color="customGray.700" whiteSpace="pre-wrap" wordBreak="break-all">
                    {iframeEmbedCode}
                  </Text>
                  <IconButton
                    aria-label="Copy iframe code"
                    icon={<CopyIcon w="12px" h="12px" />}
                    size="xs"
                    variant="ghost"
                    position="absolute"
                    top="8px"
                    right="8px"
                    color="customGray.500"
                    _hover={{ bg: "customGray.200" }}
                    onClick={() => {
                      navigator.clipboard.writeText(iframeEmbedCode);
                      toast({ title: "Iframe code copied", status: "success", duration: 1500 });
                    }}
                  />
                </Box>
              </Box>

              <Box>
                <Text fontSize="sm" fontWeight="600" color="customGray.800" mb="4px">Webhook</Text>
                <Text fontSize="xs" color="customGray.500" mb="10px">
                  Paste this into a third-party form&apos;s webhook/POST-URL field (e.g. Framer&apos;s Webhook action) to have its submissions show up as leads on this event&apos;s Results tab. Leave any &quot;Secret&quot; field on their side blank — this URL is the only credential needed.
                </Text>
                <Box position="relative" bg="customGray.50" border="1px solid" borderColor="customGray.200" borderRadius="8px" p="12px" pr="36px" maxH="140px" overflowY="auto">
                  <Text as="pre" fontSize="xs" fontFamily="mono" color="customGray.700" whiteSpace="pre-wrap" wordBreak="break-all">
                    {webhookUrl}
                  </Text>
                  <IconButton
                    aria-label="Copy webhook URL"
                    icon={<CopyIcon w="12px" h="12px" />}
                    size="xs"
                    variant="ghost"
                    position="absolute"
                    top="8px"
                    right="8px"
                    color="customGray.500"
                    _hover={{ bg: "customGray.200" }}
                    onClick={() => {
                      navigator.clipboard.writeText(webhookUrl);
                      toast({ title: "Webhook URL copied", status: "success", duration: 1500 });
                    }}
                  />
                </Box>
              </Box>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}
