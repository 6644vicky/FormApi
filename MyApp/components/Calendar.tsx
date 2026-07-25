"use client";

import { Box, Button, Grid, Text, VStack, HStack } from "@chakra-ui/react";
import { useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@chakra-ui/icons";

interface CalendarProps {
  value?: Date;
  onChange?: (date: Date) => void;
  minDate?: Date;
}

export function Calendar({ value = new Date(2026, 6, 25), onChange, minDate }: CalendarProps) {
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
    if (isPastDate(currentDate.getFullYear(), currentDate.getMonth(), day)) {
      return;
    }
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    onChange?.(newDate);
  };

  const isSelected = (day: number | null) => {
    if (!day || !value) return false;
    return (
      day === value.getDate() &&
      currentDate.getMonth() === value.getMonth() &&
      currentDate.getFullYear() === value.getFullYear()
    );
  };

  const totalDays = daysInMonth(currentDate);
  const firstDay = firstDayOfMonth(currentDate);

  const days: (number | null)[] = [];

  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }

  for (let i = 1; i <= totalDays; i++) {
    days.push(i);
  }

  return (
    <VStack spacing="12px" w="fit-content" alignItems="center">
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
        <Text fontSize="sm" fontWeight="600">
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
      <Grid templateColumns="repeat(7, 1fr)" gap="8px" w="100%">
        {days.map((day, index) => {
          const isPast = day ? isPastDate(currentDate.getFullYear(), currentDate.getMonth(), day) : false;
          return (
            <Box
              key={index}
              w="40px"
              h="40px"
              display="flex"
              alignItems="center"
              justifyContent="center"
              textAlign="center"
              fontSize="sm"
              fontWeight="500"
              borderRadius="4px"
              cursor={day && !isPast ? "pointer" : isPast ? "not-allowed" : "default"}
              bg={isSelected(day) ? "#5B5FFF" : isPast ? "customGray.50" : "customGray.100"}
              color={isSelected(day) ? "white" : isPast ? "customGray.400" : "customGray.900"}
              _hover={day && !isPast ? { bg: isSelected(day) ? "#4D52F0" : "customGray.200" } : {}}
              onClick={() => day && !isPast && handleDateClick(day)}
              opacity={!day ? 0 : isPast ? 0.5 : 1}
              pointerEvents={isPast ? "none" : "auto"}
            >
              {day}
            </Box>
          );
        })}
      </Grid>
    </VStack>
  );
}
