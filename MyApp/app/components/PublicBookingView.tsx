"use client";

import { useEffect, useState } from "react";
import { Box, VStack, HStack, Text, Button, Input, Textarea, Avatar } from "@chakra-ui/react";
import { CalendarPicker } from "@/components/CalendarPicker";

type EventInfo = {
  id: number;
  title: string;
  description: string;
  ownerName: string;
  avatarUrl: string | null;
  meetingLink: string;
  durations: string[];
};

// Duration strings are stored as e.g. "15 min", "30 min", "1 hour" — this
// only needs the leading number to lay out the day's slots.
function parseDurationMinutes(duration: string | undefined): number {
  if (!duration) return 30;
  const match = duration.match(/\d+/);
  const value = match ? parseInt(match[0], 10) : 30;
  return duration.toLowerCase().includes("hour") ? value * 60 : value;
}

function formatTime(hour: number, minute: number): string {
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${minute.toString().padStart(2, "0")} ${period}`;
}

function buildTimeSlots(stepMinutes: number): string[] {
  const slots: string[] = [];
  let totalMinutes = 9 * 60; // 9:00 AM
  const endMinutes = 17 * 60; // 5:00 PM
  while (totalMinutes < endMinutes) {
    slots.push(formatTime(Math.floor(totalMinutes / 60), totalMinutes % 60));
    totalMinutes += stepMinutes;
  }
  return slots;
}

// Renders the public booking flow for a resolved event. Used by both
// /book/[id] (looks up by numeric id) and /[username]/[slug] (looks up by
// vanity URL) — each just points this at a different resolver endpoint.
export function PublicBookingView({ fetchUrl }: { fetchUrl: string }) {
  const [event, setEvent] = useState<EventInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [step, setStep] = useState<"main" | "form" | "success">("main");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestNotes, setGuestNotes] = useState("");

  useEffect(() => {
    fetch(fetchUrl)
      .then((res) => {
        if (!res.ok) throw new Error("not found");
        return res.json();
      })
      .then((data) => setEvent(data))
      .catch(() => setNotFound(true))
      .finally(() => setIsLoading(false));
  }, [fetchUrl]);

  if (isLoading) {
    return (
      <Box h="100vh" display="flex" alignItems="center" justifyContent="center">
        <Text fontSize="sm" color="customGray.500">Loading...</Text>
      </Box>
    );
  }

  if (notFound || !event) {
    return (
      <Box h="100vh" display="flex" alignItems="center" justifyContent="center">
        <Text fontSize="sm" color="customGray.500">This booking page couldn't be found.</Text>
      </Box>
    );
  }

  const durationMinutes = parseDurationMinutes(event.durations[0]);
  const timeSlots = buildTimeSlots(durationMinutes);
  const dateLabel = selectedDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const fullDateLabel = selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  return (
    <Box minH="100vh" bg="customGray.50" display="flex" alignItems="center" justifyContent="center" p="24px">
      <Box w="fit-content" maxW="100%" bg="white" borderRadius="12px" border="1px solid" borderColor="customGray.200" boxShadow="0 2px 8px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)" overflow="hidden">
        <HStack spacing="0px" align="stretch">
          {step !== "success" && (
            <VStack spacing="16px" align="start" flex="0 0 280px" p="24px" overflowY="auto" maxH="600px">
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
            <>
              <Box flex="0 0 320px" display="flex" alignItems="flex-start" justifyContent="center" borderLeft="1px solid" borderColor="customGray.200" px="24px" pt="24px" pb="24px">
                <CalendarPicker value={selectedDate} onChange={(date) => { setSelectedDate(date); setSelectedTime(null); }} />
              </Box>
              <VStack spacing="0px" flex="0 0 220px" borderLeft="1px solid" borderColor="customGray.200" p="0px">
                <HStack w="100%" justify="space-between" px="20px" pt="24px" pb="12px">
                  <Text fontSize="14px" fontWeight="600" color="customGray.800">{dateLabel}</Text>
                </HStack>
                <VStack spacing="10px" w="100%" overflowY="auto" maxH="450px" align="stretch" px="20px" pb="16px">
                  {timeSlots.map((time) => (
                    <Button
                      key={time}
                      w="100%"
                      h="36px"
                      flexShrink={0}
                      fontSize="14px"
                      fontWeight="400"
                      variant="outline"
                      borderColor="customGray.200"
                      bg={time === selectedTime ? "customGray.800" : "white"}
                      color={time === selectedTime ? "white" : "customGray.700"}
                      _hover={{ bg: time === selectedTime ? "customGray.700" : "customGray.50" }}
                      onClick={() => setSelectedTime(time)}
                    >
                      {time}
                    </Button>
                  ))}
                </VStack>
                <Box w="100%" px="20px" pb="20px">
                  <Button
                    w="100%"
                    bg="customGray.800"
                    color="white"
                    _hover={{ bg: "customGray.700" }}
                    isDisabled={!selectedTime}
                    onClick={() => setStep("form")}
                  >
                    Confirm
                  </Button>
                </Box>
              </VStack>
            </>
          )}

          {step === "form" && (
            <VStack spacing="16px" flex="1" minW="360px" align="stretch" borderLeft="1px solid" borderColor="customGray.200" p="24px">
              <Text fontSize="14px" color="customGray.600">{fullDateLabel} · {selectedTime}</Text>
              <VStack spacing="8px" align="stretch">
                <Text fontSize="14px" fontWeight="600" color="customGray.800">Your name <Text as="span" color="red.500">*</Text></Text>
                <Input size="sm" placeholder="Your name" value={guestName} onChange={(e) => setGuestName(e.target.value)} borderColor="customGray.300" />
              </VStack>
              <VStack spacing="8px" align="stretch">
                <Text fontSize="14px" fontWeight="600" color="customGray.800">Email address <Text as="span" color="red.500">*</Text></Text>
                <Input size="sm" type="email" placeholder="your@email.com" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} borderColor="customGray.300" />
              </VStack>
              <VStack spacing="8px" align="stretch">
                <Text fontSize="14px" fontWeight="600" color="customGray.800">Additional notes</Text>
                <Textarea size="sm" placeholder="Anything that will help prepare for the meeting" value={guestNotes} onChange={(e) => setGuestNotes(e.target.value)} borderColor="customGray.300" rows={4} />
              </VStack>
              <HStack>
                <Button variant="outline" onClick={() => setStep("main")}>Back</Button>
                <Button
                  flex="1"
                  bg="customGray.800"
                  color="white"
                  _hover={{ bg: "customGray.700" }}
                  isDisabled={guestName.trim() === "" || guestEmail.trim() === ""}
                  onClick={() => setStep("success")}
                >
                  Schedule Event
                </Button>
              </HStack>
            </VStack>
          )}

          {step === "success" && (
            <VStack spacing="20px" flex="1" minW="420px" align="center" p="32px">
              <VStack spacing="16px" align="center" pt="8px">
                <Box w="64px" h="64px" borderRadius="full" bg="green.100" display="flex" alignItems="center" justifyContent="center" flexShrink={0}>
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8 16L12 20L24 8" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </Box>
                <VStack spacing="8px" align="center">
                  <Text fontSize="lg" fontWeight="600" color="customGray.800">This meeting is scheduled</Text>
                  <Text fontSize="14px" color="customGray.600" textAlign="center">A confirmation would normally be emailed to {guestEmail || "you"}.</Text>
                </VStack>
              </VStack>

              <VStack spacing="16px" align="stretch" w="100%" border="1px solid" borderColor="customGray.200" borderRadius="12px" p="20px" bg="customGray.50">
                <VStack spacing="4px" align="start">
                  <Text fontSize="14px" fontWeight="600" color="customGray.800">What</Text>
                  <Text fontSize="14px" color="customGray.700">{event.title} between {event.ownerName} and {guestName}</Text>
                </VStack>
                <VStack spacing="4px" align="start">
                  <Text fontSize="14px" fontWeight="600" color="customGray.800">When</Text>
                  <Text fontSize="14px" color="customGray.700">{fullDateLabel}, {selectedTime}</Text>
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
