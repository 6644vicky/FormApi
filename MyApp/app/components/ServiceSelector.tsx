"use client";

import { Box, HStack, Tag, TagLabel } from "@chakra-ui/react";

const SERVICES = [
  { key: "form", label: "Form", dotColor: "#60A5FA" },
  { key: "review", label: "Review", dotColor: "#4ADE80" },
  { key: "calendar", label: "Calendar", dotColor: "#F472B6" },
];

interface ServiceSelectorProps {
  selected: string[];
  onToggle: (service: string) => void;
}

// The Form/Review/Calendar multi-select, shared by the "Create workspace"
// modal (app/builder/page.tsx) and the mandatory onboarding modal — same
// workspace-service concept, same picker.
export default function ServiceSelector({ selected, onToggle }: ServiceSelectorProps) {
  return (
    <HStack spacing="8px">
      {SERVICES.map((service) => {
        const isSelected = selected.includes(service.key);
        return (
          <Tag
            key={service.key}
            h="36px"
            px="8px"
            py="6px"
            bg={isSelected ? "customGray.50" : "white"}
            border="1px solid"
            borderColor={isSelected ? "customGray.500" : "customGray.300"}
            cursor="pointer"
            borderRadius="full"
            _hover={{ bg: "customGray.50" }}
            display="flex"
            alignItems="center"
            gap="6px"
            onClick={() => onToggle(service.key)}
          >
            <Box w="8px" h="8px" borderRadius="full" bg={service.dotColor} flexShrink={0} />
            <TagLabel fontSize="sm" color="customGray.800" m={0}>{service.label}</TagLabel>
            {isSelected ? (
              <svg width="20" height="20" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" clipRule="evenodd" d="M2.25 9C2.25 12.7274 5.27258 15.75 9 15.75C12.7274 15.75 15.75 12.7274 15.75 9C15.75 5.27258 12.7274 2.25 9 2.25C5.27258 2.25 2.25 5.27258 2.25 9ZM6.25282 11.7472C5.97823 11.4726 5.97823 11.0274 6.25282 10.7528L8.00563 9L6.25282 7.24718C5.97823 6.9726 5.97823 6.5274 6.25282 6.25282C6.5274 5.97823 6.9726 5.97823 7.24718 6.25282L9 8.00563L10.7528 6.25282C11.0274 5.97823 11.4726 5.97823 11.7472 6.25282C12.0218 6.5274 12.0218 6.9726 11.7472 7.24718L9.99437 9L11.7472 10.7528C12.0218 11.0274 12.0218 11.4726 11.7472 11.7472C11.4726 12.0218 11.0274 12.0218 10.7528 11.7472L9 9.99437L7.24718 11.7472C6.9726 12.0218 6.5274 12.0218 6.25282 11.7472Z" fill="#71717A"/>
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </Tag>
        );
      })}
    </HStack>
  );
}
