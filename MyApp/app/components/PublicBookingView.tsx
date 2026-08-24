"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Box, VStack, HStack, Text, Button, IconButton, Input, Textarea, Avatar, Tabs, TabList, Tab } from "@chakra-ui/react";
import { CloseIcon, RepeatIcon } from "@chakra-ui/icons";
import { CalendarPicker } from "@/components/CalendarPicker";
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
  const [guestNotes, setGuestNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  // The gray backdrop only makes sense standing alone — inside an <iframe>
  // embed it just shows up as an unwanted margin around the card.
  const [isEmbedded, setIsEmbedded] = useState(false);

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

  const resetBooking = () => {
    setStep("main");
    setSelectedDate(new Date());
    setSelectedTime(null);
    setGuestName("");
    setGuestEmail("");
    setGuestPhone("");
    setGuestNotes("");
  };

  // Shared by the Confirm button (form page hidden — no separate form step
  // to save from) and the form step's own Schedule Event button, so a
  // booking is saved on whichever path actually reaches "success".
  const scheduleBooking = async () => {
    if (selectedTime === null) return;
    const bookingDate = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;
    const bookingTime = formatTime(Math.floor(selectedTime / 60), selectedTime % 60, true);
    // Best-effort: a guest's booking should still go through even
    // if the bookings table isn't set up yet on this instance.
    const { data: inserted, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        event_id: event.id,
        guest_name: guestName,
        guest_email: guestEmail,
        guest_phone: guestPhone || null,
        guest_notes: guestNotes || null,
        booking_date: bookingDate,
        booking_time: bookingTime,
        guest_timezone: guestTimezone,
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
          <Text flex="1" fontSize="15px" fontWeight="600" color="customGray.900">{event.ownerName}</Text>
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
    <Box minH="100vh" bg={isEmbedded ? "transparent" : "customGray.50"} display="flex" alignItems="center" justifyContent="center" p={isEmbedded ? "0px" : "24px"}>
      <Box w="fit-content" minH={step === "success" ? "465px" : "489px"} p={step === "success" ? "0px" : "12px"} maxW="100%" bg="white" borderRadius="20px" border="1px solid" borderColor="customGray.200" boxShadow="0 2px 8px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)" overflow="hidden">
        <HStack spacing="0px" align="stretch">
          {step !== "success" && (
            <VStack spacing="16px" align="start" w="280px" flexShrink={0} pl="16px" pr="24px" pt="24px" pb="24px" overflowY="auto" maxH="600px">
              <HStack spacing="12px">
                <Avatar name={event.ownerName} src={event.avatarUrl || undefined} size="sm" flexShrink={0} bg="customGray.300" color="customGray.800" />
                <Text fontSize="14px" fontWeight="600" color="customGray.800">{event.ownerName}</Text>
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
            <Box display="flex" border="1px solid" borderColor="customGray.200" borderRadius="8px" overflow="hidden">
              <Box w="440px" flexShrink={0} display="flex" alignItems="flex-start" justifyContent="center" bg="customGray.50" px="24px" pt="24px" pb="24px" overflowY="hidden">
                <CalendarPicker
                  value={selectedDate}
                  onChange={(date) => { setSelectedDate(date); setSelectedTime(null); }}
                  isDateDisabled={(date) => getDayRanges(event.availability, date).length === 0}
                />
              </Box>
              <VStack spacing="0px" w="259px" flexShrink={0} borderLeft="1px solid" borderColor="customGray.200" bg="customGray.50" p="0px">
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
                            <Box bg="customGray.700" color="white" minH="40px" px="16px" py="8px" display="flex" flexWrap="wrap" alignItems="center" justifyContent="center" fontSize="12px" fontWeight="700" textAlign="center">
                              {compactDateLabel} {label}<Text as="span" fontSize="10px" fontWeight="500" ml="4px">({guestTimezone})</Text>
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
            <VStack spacing="16px" flex="1" minW="416px" align="stretch" bg="customGray.50" border="1px solid" borderColor="customGray.200" borderRadius="8px" p="24px" overflowY="auto">
              <Text fontSize="14px" color="customGray.600">{fullDateLabel} · {selectedTimeLabel}</Text>
              <VStack spacing="8px" align="stretch">
                <Text fontSize="14px" fontWeight="600" color="customGray.800">Your name <Text as="span" color="red.500">*</Text></Text>
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
              <VStack spacing="8px" align="stretch">
                <Text fontSize="14px" fontWeight="600" color="customGray.800">Email address <Text as="span" color="red.500">*</Text></Text>
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
              <VStack spacing="8px" align="stretch">
                <Text fontSize="14px" fontWeight="600" color="customGray.800">Phone number</Text>
                <Input
                  size="sm"
                  type="tel"
                  placeholder="Your phone number"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
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
              <HStack>
                <Button variant="outline" onClick={() => setStep("main")}>Back</Button>
                <Button
                  flex="1"
                  bg="customGray.800"
                  color="white"
                  _hover={{ bg: "customGray.700" }}
                  isDisabled={guestName.trim() === "" || guestEmail.trim() === ""}
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

              <VStack spacing="16px" align="stretch" w="100%" border="1px solid" borderColor="customGray.200" borderRadius="12px" p="20px" bg="customGray.50">
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
