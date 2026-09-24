"use client";

import { Box, HStack, Input, Menu, MenuButton, MenuItem, MenuList, Text } from "@chakra-ui/react";
import { ChevronDownIcon } from "@chakra-ui/icons";
import { PHONE_COUNTRIES, findPhoneCountry } from "@/lib/phoneCountries";

// The booking form's phone field: a dial-code picker joined to a number
// input. Shared by the live booking page and the calendar-builder preview so
// the two can't drift apart visually.
export function PhoneNumberInput({
  countryCode,
  onCountryCodeChange,
  value,
  onChange,
  placeholder = "Your phone number",
}: {
  countryCode: string;
  onCountryCodeChange: (code: string) => void;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const country = findPhoneCountry(countryCode);

  return (
    <HStack
      spacing="0px"
      align="stretch"
      bg="white"
      border="1px solid"
      borderColor="customGray.300"
      borderRadius="md"
      overflow="hidden"
      _hover={{ borderColor: "customGray.400" }}
      _focusWithin={{ borderColor: "customGray.500", boxShadow: "0 0 0 3px rgba(39, 39, 42, 0.1)" }}
    >
      <Menu placement="bottom-start">
        <MenuButton
          as={Box}
          flexShrink={0}
          display="flex"
          alignItems="center"
          gap="4px"
          pl="12px"
          pr="8px"
          cursor="pointer"
          fontSize="14px"
          color="customGray.800"
          _hover={{ bg: "customGray.50" }}
        >
          <Text as="span" fontSize="14px" lineHeight="1">{country.flag}</Text>
          <Text as="span" fontSize="14px">{country.dial}</Text>
          <ChevronDownIcon w="14px" h="14px" color="customGray.500" />
        </MenuButton>
        <MenuList maxH="240px" overflowY="auto" fontSize="14px" zIndex={20}>
          {PHONE_COUNTRIES.map((option) => (
            <MenuItem key={option.code} onClick={() => onCountryCodeChange(option.code)}>
              <HStack spacing="8px" w="100%">
                <Text as="span">{option.flag}</Text>
                <Text as="span" flex="1" isTruncated>{option.name}</Text>
                <Text as="span" color="customGray.500">{option.dial}</Text>
              </HStack>
            </MenuItem>
          ))}
        </MenuList>
      </Menu>
      <Box w="1px" bg="customGray.200" flexShrink={0} />
      <Input
        size="sm"
        type="tel"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        border="none"
        borderRadius="0"
        bg="transparent"
        fontSize="14px"
        fontWeight="400"
        color="customGray.800"
        px="12px"
        py="8px"
        _focus={{ boxShadow: "none" }}
        _focusVisible={{ boxShadow: "none" }}
      />
    </HStack>
  );
}
