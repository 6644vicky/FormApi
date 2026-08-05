"use client";

import { VStack, Box, Text, Flex } from "@chakra-ui/react";
import { keyframes } from "@emotion/react";

const spin = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

export default function LoaderTestPage() {
  return (
    <Flex h="100vh" w="100vw" bg="rgba(36, 39, 42, 0.02)" align="center" justify="center" p="64px">
      <VStack
        data-area="workspace-container"
        flex={1}
        align="center"
        justify="center"
        spacing="24px"
        w="100%"
        bg="customGray.50"
        borderRadius="0px"
        boxShadow="none"
        p="40px"
      >
        <Box display="flex" alignItems="center" justifyContent="center">
          <Box
            as="div"
            animation={`${spin} 1s linear infinite`}
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" stroke="#E4E4E7" strokeWidth="2" opacity="0.3"/>
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" fill="#D4D4D8"/>
              <path d="M12 2C6.48 2 2 6.48 2 12" stroke="#27272A" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </Box>
        </Box>
        <Text fontSize="sm" color="customGray.600" fontWeight="medium">
          Loading workspace...
        </Text>
      </VStack>
    </Flex>
  );
}
