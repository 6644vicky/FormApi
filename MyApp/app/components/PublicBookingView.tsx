"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Box, VStack, HStack, Text, Button, IconButton, Input, Textarea, Avatar, Tabs, TabList, Tab } from "@chakra-ui/react";
import { AddIcon, CloseIcon, RepeatIcon } from "@chakra-ui/icons";
import { CalendarPicker } from "@/components/CalendarPicker";
import { PhoneNumberInput } from "@/app/components/PhoneNumberInput";
import { TruncatedText } from "@/app/components/TruncatedText";
import { findPhoneCountry, guessPhoneCountryCode } from "@/lib/phoneCountries";
import { DEFAULT_DESIGN_SETTINGS, fontStackFor, type DesignSettings } from "@/app/components/DesignCustomizePanel";
import { supabase } from "@/lib/supabase";
import { parseDurationMinutes, formatTime, buildTimeSlots, getDayRanges, type WeeklyAvailability } from "@/lib/bookingTime";
import FullPageLoader from "@/app/components/FullPageLoader";

type EventInfo = {
  id: number;
  title: string;
  description: string;
  ownerName: string;
  avatarUrl: string | null;
  meetingLink: string;
  durations: string[];
  hideFormPage: boolean;
  availability: WeeklyAvailability;
  // key -> shown, from the owner's "Booking questions" panel. A missing key
  // means the owner never touched that question, so it stays visible.
  bookingQuestions?: Record<string, boolean>;
  // The owner's Design-tab theming. Merged over defaults below, so a null or
  // partial object leaves the page looking exactly as it does untouched.
  designSettings?: Partial<DesignSettings> | null;
};

// Renders the public booking flow for a resolved event. Used by both
// /book/[id] (looks up by numeric id) and /[username]/[slug] (looks up by
// vanity URL) — each just points this at a different resolver endpoint.
export function PublicBookingView({ fetchUrl }: { fetchUrl: string }) {
  const searchParams = useSearchParams();
  const isWidget = searchParams.get("mode") === "widget";
  const [event, setEvent] = useState<EventInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [step, setStep] = useState<"main" | "form" | "success">("main");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState<number | null>(null);
  const [is24Hour, setIs24Hour] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  // Guessed from the browser locale on mount rather than at init, so the
  // server-rendered markup and the first client render agree.
  const [guestPhoneCountry, setGuestPhoneCountry] = useState("IN");
  const [guestNotes, setGuestNotes] = useState("");
  const [extraGuestEmails, setExtraGuestEmails] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const MAX_EXTRA_GUESTS = 10;
  // The gray backdrop only makes sense standing alone — inside an <iframe>
  // embed it just shows up as an unwanted margin around the card.
  const [isEmbedded, setIsEmbedded] = useState(false);

  useEffect(() => {
    setGuestPhoneCountry(guessPhoneCountryCode());
  }, []);

  useEffect(() => {
    const embedded = window.self !== window.top;
    setIsEmbedded(embedded);
    if (embedded) {
      // globals.css paints html/body #FAFAFA with !important — a transparent
      // Box here would otherwise still show that gray through underneath.
      document.documentElement.style.setProperty("background-color", "transparent", "important");
      document.body.style.setProperty("background-color", "transparent", "important");
    }
  }, []);

  // Lets a third-party site pre-fill the guest form via URL params, e.g.
  // /vignesh/demo-call?name=Jane&email=jane@co.com&phone=555-0100 — the same
  // pattern Calendly uses for pre-filled fields.
  useEffect(() => {
    const nameParam = searchParams.get("name");
    const emailParam = searchParams.get("email");
    const phoneParam = searchParams.get("phone");
    if (nameParam) setGuestName(nameParam);
    if (emailParam) setGuestEmail(emailParam);
    if (phoneParam) setGuestPhone(phoneParam);
  }, [searchParams]);

  useEffect(() => {
    fetch(fetchUrl, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error("not found");
        return res.json();
      })
      .then((data) => setEvent(data))
      .catch(() => setNotFound(true))
      .finally(() => setIsLoading(false));
  }, [fetchUrl]);

  if (isLoading) {
    return <FullPageLoader />;
  }

  if (notFound || !event) {
    return (
      <Box h="100vh" display="flex" alignItems="center" justifyContent="center">
        <Text fontSize="sm" color="customGray.500">This booking page couldn't be found.</Text>
      </Box>
    );
  }

  const durationMinutes = parseDurationMinutes(event.durations[0]);
  const dayRanges = getDayRanges(event.availability, selectedDate);
  const timeSlots = buildTimeSlots(durationMinutes, dayRanges);
  const dateLabel = selectedDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const fullDateLabel = selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const selectedTimeLabel = selectedTime !== null ? formatTime(Math.floor(selectedTime / 60), selectedTime % 60, is24Hour) : "";
  const compactDateLabel = selectedDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const guestTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  // Unknown keys default to shown, so an event saved before a question
  // existed never silently loses a field.
  const showQuestion = (key: string) => event.bookingQuestions?.[key] ?? true;
  const showEmail = showQuestion("email");
  const showPhone = showQuestion("phone");
  const showNotes = showQuestion("notes");
  const showGuests = showQuestion("guests");
  const design: DesignSettings = { ...DEFAULT_DESIGN_SETTINGS, ...(event.designSettings || {}) };

  const resetBooking = () => {
    setStep("main");
    setSelectedDate(new Date());
    setSelectedTime(null);
    setGuestName("");
    setGuestEmail("");
    setGuestPhone("");
    setGuestNotes("");
    setExtraGuestEmails([]);
  };

  const addExtraGuestEmail = () => {
    setExtraGuestEmails((prev) => (prev.length >= MAX_EXTRA_GUESTS ? prev : [...prev, ""]));
  };
  const removeExtraGuestEmail = (index: number) => {
    setExtraGuestEmails((prev) => prev.filter((_, i) => i !== index));
  };
  const updateExtraGuestEmail = (index: number, value: string) => {
    setExtraGuestEmails((prev) => prev.map((email, i) => (i === index ? value : email)));
  };

  // Shared by the Confirm button (form page hidden — no separate form step
  // to save from) and the form step's own Schedule Event button, so a
  // booking is saved on whichever path actually reaches "success".
  const scheduleBooking = async () => {
    if (selectedTime === null) return;
    const bookingDate = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;
    const bookingTime = formatTime(Math.floor(selectedTime / 60), selectedTime % 60, true);
    // Stored with the dial code so the host can actually call the number back
    // without having to guess where the guest is.
    const trimmedPhone = guestPhone.trim();
    const fullPhone = trimmedPhone ? `${findPhoneCountry(guestPhoneCountry).dial} ${trimmedPhone}` : null;
    const validExtraGuestEmails = extraGuestEmails.map((email) => email.trim()).filter(Boolean);
    const extraFields = validExtraGuestEmails.length > 0
      ? { attendees: [{ name: guestName, email: guestEmail }, ...validExtraGuestEmails.map((email) => ({ name: "", email }))] }
      : null;
    // Best-effort: a guest's booking should still go through even
    // if the bookings table isn't set up yet on this instance.
    const { data: inserted, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        event_id: event.id,
        guest_name: guestName,
        guest_email: guestEmail,
        guest_phone: fullPhone,
        guest_notes: guestNotes || null,
        booking_date: bookingDate,
        booking_time: bookingTime,
        guest_timezone: guestTimezone,
        extra_fields: extraFields,
      })
      .select("id")
      .single();
    if (bookingError) {
      console.error("Couldn't save booking:", bookingError.message);
      return;
    }
    // Fire-and-forget: a real Google Meet link is a nice-to-have, not
    // something worth making the guest wait on or fail their booking over.
    fetch("/api/bookings/generate-meet-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId: inserted.id }),
    }).catch(() => {});
  };

  if (isWidget && step === "main") {
    return (
      <Box h="100vh" bg="white" display="flex" flexDirection="column" overflow="hidden">
        <HStack px="20px" py="14px" minH="64px" borderBottom="1px solid" borderColor="customGray.200" spacing="10px">
          <Avatar name={event.ownerName} src={event.avatarUrl || undefined} boxSize="32px" bg="customGray.300" color="customGray.800" />
          <TruncatedText flex="1" minW="0" fontSize="15px" fontWeight="600" color="customGray.900">{event.ownerName}</TruncatedText>
          <IconButton aria-label="Reset booking" icon={<RepeatIcon boxSize="17px" />} size="sm" variant="ghost" color="customGray.500" _hover={{ bg: "customGray.100" }} onClick={resetBooking} />
          <IconButton aria-label="Close booking widget" icon={<CloseIcon boxSize="13px" />} size="sm" variant="ghost" color="customGray.500" _hover={{ bg: "customGray.100" }} onClick={() => window.parent.postMessage({ type: "booking-widget-close" }, "*")} />
        </HStack>

        <Box flex="1" overflowY="auto" px="20px" pt="22px">
          <Text fontSize="19px" lineHeight="1.3" fontWeight="700" color="customGray.900">{event.title}</Text>
          {event.description && <Text mt="12px" fontSize="15px" lineHeight="1.5" color="customGray.700">{event.description}</Text>}

          <Text mt="22px" fontSize="15px" fontWeight="700" color="customGray.800">Booking Details</Text>
          <VStack mt="10px" align="stretch" spacing="10px">
            <HStack spacing="8px" color="customGray.600"><Text aria-hidden="true">◷</Text><Text fontSize="15px">{event.durations[0] || "15 min"}</Text></HStack>
            <HStack spacing="8px" color="customGray.600"><Text aria-hidden="true">📹</Text><Text fontSize="15px">{event.meetingLink}</Text></HStack>
            <HStack spacing="8px" color="customGray.600"><Text aria-hidden="true">◎</Text><Text fontSize="15px">{guestTimezone}</Text></HStack>
          </VStack>

          <Box mt="20px" bg="customGray.50" borderRadius="14px" px="14px" py="16px">
            <CalendarPicker value={selectedDate} onChange={(date) => { setSelectedDate(date); setSelectedTime(null); }} isDateDisabled={(date) => getDayRanges(event.availability, date).length === 0} />
          </Box>

          <VStack mt="14px" spacing="8px" align="stretch" pb="20px">
            {dayRanges.length === 0 && <Text fontSize="13px" color="customGray.500" textAlign="center">No availability this day.</Text>}
            {timeSlots.map((minutes) => {
              const label = formatTime(Math.floor(minutes / 60), minutes % 60, is24Hour);
              return (
                <Button key={minutes} h="38px" variant="outline" borderColor="customGray.200" bg="white" fontSize="14px" fontWeight="500" _hover={{ bg: "customGray.50" }} onClick={() => { setSelectedTime(minutes); if (!event.hideFormPage) setStep("form"); }}>
                  {label}
                </Button>
              );
            })}
          </VStack>
        </Box>

        <Text px="20px" py="11px" fontSize="12px" color="customGray.500" textAlign="center" borderTop="1px solid" borderColor="customGray.100">
          Optional footer text. Links to <Text as="span" textDecoration="underline">privacy</Text> and <Text as="span" textDecoration="underline">terms</Text>.
        </Text>
        <HStack justify="center" py="12px" bg="customGray.50" spacing="7px">
          <Text fontSize="13px" fontWeight="700">▧</Text>
          <Text fontSize="13px" color="customGray.800">Powered by Webforms</Text>
        </HStack>
      </Box>
    );
  }

  return (
    <Box minH="100vh" bg={isEmbedded ? "transparent" : design.backgroundColor} display="flex" alignItems="center" justifyContent="center" p={isEmbedded ? "0px" : "24px"}>
      <Box
        w="fit-content"
        h={step === "main" ? "485px" : undefined}
        // The form step sizes itself to however many questions the owner left
        // on: never below the baseline (so hiding fields can't shrink the
        // card), growing with the content, and scrolling inside past the cap.
        maxH={step === "form" ? "720px" : undefined}
        minH={step === "success" ? "465px" : step === "form" ? "560px" : undefined}
        display={step === "success" ? undefined : "flex"}
        flexDirection={step === "success" ? undefined : "column"}
        p={step === "success" ? "0px" : "12px"}
        maxW="100%"
        bg={design.contentAreaColor}
        fontFamily={fontStackFor(design.fontFamily)}
        /* Re-point the token the card's text uses, so Text color reaches every
           heading and label. Buttons and the calendar accent set their colours
           explicitly, so they don't inherit this. */
        sx={{ "--chakra-colors-customGray-800": design.textColor }}
        borderRadius="20px"
        border="1px solid"
        borderColor="customGray.200"
        boxShadow="0 2px 8px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)"
        overflow="hidden"
      >
        <HStack spacing="0px" align="stretch" flex={step === "success" ? undefined : "1"} minH={step === "success" ? undefined : "0"}>
          {step !== "success" && (
            <VStack spacing="16px" align="start" w="280px" flexShrink={0} pl="16px" pr="24px" pt="24px" pb="13px" overflowY="auto" maxH="600px">
              {/* minW=0 lets the name shrink so it can ellipsise instead of
                  wrapping onto a second line. */}
              <HStack spacing="12px" w="100%" minW="0">
                <Avatar name={event.ownerName} src={event.avatarUrl || undefined} size="sm" flexShrink={0} bg="customGray.300" color="customGray.800" />
                <TruncatedText flex="1" minW="0" fontSize="14px" fontWeight="600" color="customGray.800">
                  {event.ownerName}
                </TruncatedText>
              </HStack>
              <VStack spacing="8px" align="start" w="100%">
                <Text fontSize="lg" fontWeight="600" color="customGray.800">{event.title}</Text>
                <Text fontSize="14px" color="customGray.600" lineHeight="1.5">{event.description}</Text>
              </VStack>
              <VStack spacing="8px" align="start" w="100%" pt="8px">
                <HStack spacing="8px" fontSize="14px" color="customGray.700">
                  <Box>🕐</Box>
                  <Text>{event.durations[0] || "15 min"}</Text>
                </HStack>
                <HStack spacing="8px" fontSize="14px" color="customGray.700">
                  <Box>📹</Box>
                  <Text>{event.meetingLink}</Text>
                </HStack>
              </VStack>
            </VStack>
          )}

          {step === "main" && (
            <Box display="flex" alignItems="stretch" border="1px solid" borderColor="customGray.200" borderRadius="8px" overflow="hidden">
              <Box w="440px" flexShrink={0} display="flex" alignItems="flex-start" justifyContent="center" bg={design.contentAreaColor} backgroundImage="linear-gradient(rgba(0,0,0,0.03), rgba(0,0,0,0.03))" px="24px" pt="24px" pb="24px" overflowY="hidden">
                <CalendarPicker
                  value={selectedDate}
                  onChange={(date) => { setSelectedDate(date); setSelectedTime(null); }}
                  isDateDisabled={(date) => getDayRanges(event.availability, date).length === 0}
                  accentColor={design.uiElementsColor}
                />
              </Box>
              <VStack spacing="0px" w="259px" flexShrink={0} align="stretch" borderLeft="1px solid" borderColor="customGray.200" bg={design.contentAreaColor} backgroundImage="linear-gradient(rgba(0,0,0,0.03), rgba(0,0,0,0.03))" p="0px">
                <HStack w="100%" justify="space-between" px="20px" pt="24px" pb="12px">
                  <Text fontSize="14px" fontWeight="600" color="customGray.800">{dateLabel}</Text>
                  <Tabs
                    variant="soft-rounded"
                    colorScheme="gray"
                    size="sm"
                    index={is24Hour ? 1 : 0}
                    onChange={(index) => setIs24Hour(index === 1)}
                  >
                    <TabList bg="customGray.100" borderRadius="9999px" p="4px">
                      <Tab fontSize="12px" _selected={{ bg: "white", color: "customGray.800" }}>12h</Tab>
                      <Tab fontSize="12px" _selected={{ bg: "white", color: "customGray.800" }}>24h</Tab>
                    </TabList>
                  </Tabs>
                </HStack>
                <VStack spacing="10px" w="100%" overflowY="auto" maxH="450px" align="stretch" px="20px" pb="16px">
                  {dayRanges.length === 0 && (
                    <Text fontSize="13px" color="customGray.500" textAlign="center" pt="16px">No availability this day.</Text>
                  )}
                  {timeSlots.map((minutes) => {
                    const label = formatTime(Math.floor(minutes / 60), minutes % 60, is24Hour);
                    const isSelected = minutes === selectedTime;
                    return (
                      <Box
                        key={minutes}
                        w="100%"
                        flexShrink={0}
                        borderRadius="8px"
                        overflow="hidden"
                        maxH={isSelected ? "110px" : "36px"}
                        transition="max-height 0.35s cubic-bezier(0.4, 0, 0.2, 1)"
                      >
                        {isSelected ? (
                          <Box>
                            <Box bg={design.uiElementsColor} color="white" minH="40px" px="16px" py="8px" display="flex" flexWrap="wrap" alignItems="center" justifyContent="center" fontSize="12px" fontWeight="700" textAlign="center">
                              {compactDateLabel} {label}<Text as="span" fontSize="10px" fontWeight="500" ml="4px">({guestTimezone})</Text>
                            </Box>
                            <Button
                              w="100%"
                              h="40px"
                              bg={design.buttonsColor}
                              color="white"
                              fontSize="15px"
                              fontWeight="600"
                              borderRadius="0"
                              _hover={{ bg: "customGray.900" }}
                              isLoading={isSaving}
                              onClick={async () => {
                                if (!event.hideFormPage) {
                                  setStep("form");
                                  return;
                                }
                                setIsSaving(true);
                                await scheduleBooking();
                                setIsSaving(false);
                                setStep("success");
                              }}
                            >
                              Confirm
                            </Button>
                          </Box>
                        ) : (
                          <Button
                            w="100%"
                            h="36px"
                            fontSize="14px"
                            fontWeight="400"
                            variant="outline"
                            borderColor="customGray.200"
                            borderRadius="8px"
                            bg="white"
                            color="customGray.700"
                            _hover={{ bg: "customGray.50" }}
                            onClick={() => setSelectedTime(minutes)}
                          >
                            {label}
                          </Button>
                        )}
                      </Box>
                    );
                  })}
                </VStack>
              </VStack>
            </Box>
          )}

          {step === "form" && (
            <VStack
              spacing="16px"
              flex="1"
              minW="416px"
              align="stretch"
              bg={design.contentAreaColor} backgroundImage="linear-gradient(rgba(0,0,0,0.03), rgba(0,0,0,0.03))"
              border="1px solid"
              borderColor="customGray.200"
              borderRadius="8px"
              p="24px"
              overflowY="auto"
              sx={{
                "&::-webkit-scrollbar": { width: "6px" },
                "&::-webkit-scrollbar-track": { bg: "transparent" },
                "&::-webkit-scrollbar-thumb": { bg: "customGray.300", borderRadius: "3px" },
                "&::-webkit-scrollbar-thumb:hover": { bg: "customGray.400" },
              }}
            >
              <Text fontSize="14px" color="customGray.600">{fullDateLabel} · {selectedTimeLabel}</Text>
              <VStack spacing="8px" align="stretch">
                <Text fontSize="14px" fontWeight="600" color="customGray.800">Your name <Text as="span" color={design.alertsColor}>*</Text></Text>
                <Input
                  size="sm"
                  placeholder="Your name"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
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
              {showEmail && (
              <VStack spacing="8px" align="stretch">
                <Text fontSize="14px" fontWeight="600" color="customGray.800">Email address <Text as="span" color={design.alertsColor}>*</Text></Text>
                <Input
                  size="sm"
                  type="email"
                  placeholder="your@email.com"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
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
              )}
              {showPhone && (
              <VStack spacing="8px" align="stretch">
                <Text fontSize="14px" fontWeight="600" color="customGray.800">Phone number</Text>
                <PhoneNumberInput
                  countryCode={guestPhoneCountry}
                  onCountryCodeChange={setGuestPhoneCountry}
                  value={guestPhone}
                  onChange={setGuestPhone}
                />
              </VStack>
              )}
              {showNotes && (
              <VStack spacing="8px" align="stretch">
                <Text fontSize="14px" fontWeight="600" color="customGray.800">Additional notes</Text>
                <Textarea
                  size="sm"
                  placeholder="Anything that will help prepare for the meeting"
                  value={guestNotes}
                  onChange={(e) => setGuestNotes(e.target.value)}
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
              )}
              {!showGuests ? null : extraGuestEmails.length === 0 ? (
                <Button
                  variant="link"
                  alignSelf="start"
                  fontSize="14px"
                  fontWeight="medium"
                  color={design.buttonsColor}
                  _hover={{ textDecoration: "underline" }}
                  leftIcon={<AddIcon w="10px" h="10px" />}
                  onClick={addExtraGuestEmail}
                >
                  Add guests
                </Button>
              ) : (
                <VStack spacing="8px" align="stretch">
                  <Text fontSize="14px" fontWeight="medium" color="customGray.800">Add guests</Text>
                  {extraGuestEmails.map((email, index) => (
                    <HStack key={index} spacing="8px">
                      <Input
                        size="sm"
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => updateExtraGuestEmail(index, e.target.value)}
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
                      <IconButton
                        aria-label="Remove this guest"
                        icon={<CloseIcon w="10px" h="10px" />}
                        size="sm"
                        variant="ghost"
                        color="customGray.500"
                        onClick={() => removeExtraGuestEmail(index)}
                      />
                    </HStack>
                  ))}
                  {extraGuestEmails.length < MAX_EXTRA_GUESTS ? (
                    <Button
                      variant="link"
                      alignSelf="start"
                      fontSize="14px"
                      fontWeight="medium"
                      color={design.buttonsColor}
                      _hover={{ textDecoration: "underline" }}
                      leftIcon={
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M6 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke="currentColor" strokeWidth="1.3" />
                          <path d="M1 14c0-2.5 2-4.2 5-4.2s5 1.7 5 4.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                          <path d="M12.5 5v4M10.5 7h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                        </svg>
                      }
                      onClick={addExtraGuestEmail}
                    >
                      Add another
                    </Button>
                  ) : (
                    <Text fontSize="xs" color="customGray.500">You can add up to {MAX_EXTRA_GUESTS} guests.</Text>
                  )}
                </VStack>
              )}
              <HStack>
                <Button fontSize="14px" variant="outline" onClick={() => setStep("main")}>Back</Button>
                <Button
                  flex="1"
                  fontSize="14px"
                  bg={design.buttonsColor}
                  color="white"
                  _hover={{ filter: "brightness(0.9)" }}
                  isDisabled={guestName.trim() === "" || (showEmail && guestEmail.trim() === "")}
                  isLoading={isSaving}
                  onClick={async () => {
                    setIsSaving(true);
                    await scheduleBooking();
                    setIsSaving(false);
                    setStep("success");
                  }}
                >
                  Schedule Event
                </Button>
              </HStack>
              {design.footerEnabled && design.footerText.trim() && (
                <Text fontSize="xs" color="customGray.500" pt="4px">{design.footerText}</Text>
              )}
            </VStack>
          )}

          {step === "success" && (
            <VStack spacing="20px" flex="1" minW="420px" align="center" p="32px" overflowY="auto">
              <VStack spacing="16px" align="center" pt="8px">
                <Box w="64px" h="64px" borderRadius="full" bg="green.100" display="flex" alignItems="center" justifyContent="center" flexShrink={0}>
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8 16L12 20L24 8" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </Box>
                <VStack spacing="8px" align="center">
                  <Text fontSize="lg" fontWeight="600" color="customGray.800">This meeting is scheduled</Text>
                  {guestEmail && (
                    <Text fontSize="14px" color="customGray.600" textAlign="center">A confirmation would normally be emailed to {guestEmail}.</Text>
                  )}
                </VStack>
              </VStack>

              <VStack spacing="16px" align="stretch" w="100%" border="1px solid" borderColor="customGray.200" borderRadius="12px" p="20px" bg={design.contentAreaColor} backgroundImage="linear-gradient(rgba(0,0,0,0.03), rgba(0,0,0,0.03))">
                <VStack spacing="4px" align="start">
                  <Text fontSize="14px" fontWeight="600" color="customGray.800">What</Text>
                  <Text fontSize="14px" color="customGray.700">
                    {guestName ? `${event.title} between ${event.ownerName} and ${guestName}` : `${event.title} with ${event.ownerName}`}
                  </Text>
                </VStack>
                <VStack spacing="4px" align="start">
                  <Text fontSize="14px" fontWeight="600" color="customGray.800">When</Text>
                  <Text fontSize="14px" color="customGray.700">{fullDateLabel}, {selectedTimeLabel}</Text>
                </VStack>
                <VStack spacing="4px" align="start">
                  <Text fontSize="14px" fontWeight="600" color="customGray.800">Where</Text>
                  <Text fontSize="14px" color="customGray.700" bg="customGray.100" px="8px" py="4px" borderRadius="4px" display="inline-block">{event.meetingLink}</Text>
                </VStack>
              </VStack>
            </VStack>
          )}
        </HStack>
      </Box>
    </Box>
  );
}
