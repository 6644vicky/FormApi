"use client";

import { Box, Button, Grid, Text, VStack, HStack } from "@chakra-ui/react";
import { useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@chakra-ui/icons";

interface CalendarPickerProps {
  value?: Date;
  onChange?: (date: Date) => void;
  // For days with no configured availability (e.g. a fully "Unavailable"
  // weekday) — styled and blocked the same way a past date already is.
  isDateDisabled?: (date: Date) => boolean;
}

export function CalendarPicker({ value = new Date(), onChange, isDateDisabled }: CalendarPickerProps) {
  const [currentDate, setCurrentDate] = useState(new Date(value.getFullYear(), value.getMonth(), 1));

  const daysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const isPastDate = (year: number, month: number, day: number) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(year, month, day);
    targetDate.setHours(0, 0, 0, 0);
    return targetDate < today;
  };

  const canGoPrevMonth = (year: number, month: number) => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    if (year < currentYear) return false;
    if (year === currentYear && month < currentMonth) return false;
    return true;
  };

  const handlePrevMonth = () => {
    const targetYear = currentDate.getMonth() === 0 ? currentDate.getFullYear() - 1 : currentDate.getFullYear();
    const targetMonth = currentDate.getMonth() === 0 ? 11 : currentDate.getMonth() - 1;

    if (canGoPrevMonth(targetYear, targetMonth)) {
      setCurrentDate(new Date(targetYear, targetMonth, 1));
    }
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleDateClick = (day: number) => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    if (isPastDate(currentDate.getFullYear(), currentDate.getMonth(), day) || isDateDisabled?.(newDate)) {
      return;
    }
    onChange?.(newDate);
  };

  const totalDays = daysInMonth(currentDate);
  const firstDay = firstDayOfMonth(currentDate);

  const days: (number | null)[] = [];

  // Add empty cells for days before month starts
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }

  // Add days of the month
  for (let i = 1; i <= totalDays; i++) {
    days.push(i);
  }

  const isSelected = (day: number | null) => {
    if (!day || !value) return false;
    return (
      day === value.getDate() &&
      currentDate.getMonth() === value.getMonth() &&
      currentDate.getFullYear() === value.getFullYear()
    );
  };

  const isToday = (day: number | null) => {
    if (!day) return false;
    const today = new Date();
    return (
      day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    );
  };

  return (
    <VStack spacing="14px" w="100%" alignItems="center">
      {/* Header */}
      <HStack w="100%" justify="space-between" align="center">
        <Button
          size="sm"
          variant="outline"
          onClick={handlePrevMonth}
          p="6px"
          h="32px"
          minW="32px"
          borderColor="customGray.200"
          color="customGray.800"
          _hover={{ bg: "customGray.50" }}
          display="flex"
          alignItems="center"
          justifyContent="center"
          isDisabled={!canGoPrevMonth(currentDate.getFullYear(), currentDate.getMonth())}
          _disabled={{ opacity: 0.5, cursor: "not-allowed" }}
        >
          <ChevronLeftIcon />
        </Button>
        <Text fontSize="14px" fontWeight="600">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </Text>
        <Button
          size="sm"
          variant="outline"
          onClick={handleNextMonth}
          p="6px"
          h="32px"
          minW="32px"
          borderColor="customGray.200"
          color="customGray.800"
          _hover={{ bg: "customGray.50" }}
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <ChevronRightIcon />
        </Button>
      </HStack>

      {/* Weekday headers */}
      <Grid templateColumns="repeat(7, 1fr)" gap="8px" w="100%">
        {dayNames.map((day) => (
          <Text
            key={day}
            fontSize="xs"
            fontWeight="500"
            textAlign="center"
            color="customGray.600"
            py="2px"
          >
            {day.toUpperCase()}
          </Text>
        ))}
      </Grid>

      {/* Calendar days */}
      <Grid templateColumns="repeat(7, 1fr)" gap="8px" w="100%" justifyItems="center">
        {days.map((day, index) => {
          const isPast = day ? isPastDate(currentDate.getFullYear(), currentDate.getMonth(), day) : false;
          const isUnavailable = day && !isPast ? !!isDateDisabled?.(new Date(currentDate.getFullYear(), currentDate.getMonth(), day)) : false;
          const isBlocked = isPast || isUnavailable;
          return (
            <Box
              key={index}
              position="relative"
              w="100%"
              maxW="60px"
              aspectRatio="1"
              display="flex"
              alignItems="center"
              justifyContent="center"
              textAlign="center"
              fontSize="xs"
              fontWeight={isSelected(day) ? "600" : "500"}
              borderRadius="4px"
              cursor={day && !isBlocked ? "pointer" : isBlocked ? "not-allowed" : "default"}
              bg={isSelected(day) ? "customGray.800" : isBlocked || isToday(day) ? "transparent" : "customGray.100"}
              color={isSelected(day) ? "white" : isBlocked ? "customGray.400" : "customGray.900"}
              _hover={day && !isBlocked && !isSelected(day) ? { bg: "customGray.200" } : {}}
              onClick={() => day && !isBlocked && handleDateClick(day)}
              opacity={!day ? 0 : 1}
              pointerEvents={isBlocked ? "none" : "auto"}
            >
              {day}
              {isToday(day) && !isSelected(day) && (
                <Box position="absolute" bottom="4px" w="4px" h="4px" borderRadius="full" bg="customGray.800" />
              )}
            </Box>
          );
        })}
      </Grid>
    </VStack>
  );
}
