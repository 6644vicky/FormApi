"use client";

export const dynamic = 'force-dynamic';

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Box,
  Flex,
  VStack,
  Heading,
  Text,
  Button,
} from "@chakra-ui/react";

export default function PasswordChangedPage() {
  const router = useRouter();

  const handleContinueToSignIn = () => {
    router.push("/");
  };

  return (
    <Flex h="100vh" bg="white">
      {/* Left Side */}
      <Box w="640px" h="100vh" display="flex" alignItems="center" justifyContent="center" overflowY="auto">
        <VStack spacing={8} w="full" px="96px" align="stretch">
          {/* Logo */}
          <Heading as="h2" size="md" color="gray.900" fontWeight={700} alignSelf="flex-start">
            Helpdesk
          </Heading>

          {/* Success Section */}
          <VStack spacing={6} w="full" align="stretch">
            <Heading as="h1" size="lg" color="gray.900">
              Password has been changed
            </Heading>

            {/* Message */}
            <Text fontSize="sm" color="customGray.700" lineHeight="1.6">
              You have successfully changed your password, you can now sign in.
            </Text>

            {/* Divider */}
            <Box h="1px" bg="customGray.200" w="full" my={2} />

            {/* Continue Button */}
            <Button
              w="full"
              h="44px"
              bg="customGray.950"
              color="white"
              fontSize="sm"
              fontWeight={500}
              borderRadius="12px"
              boxShadow="0 1px 2px 0 rgba(2, 6, 23, 0.05)"
              onClick={handleContinueToSignIn}
              _hover={{ bg: "customGray.950" }}
              mt="24px"
            >
              Continue to Sign In
            </Button>
          </VStack>
        </VStack>
      </Box>

      {/* Right Side - Gradient Background */}
      <Box
        flex={1}
        h="100vh"
        display={{ base: "none", lg: "block" }}
        background="linear-gradient(135deg,
          #FFFFFF 0%,
          #FFF9E6 15%,
          #FFEB99 25%,
          #FFD966 35%,
          #FFCC00 45%,
          #87CEEB 50%,
          #6BB6D6 60%,
          #4DA6C7 70%,
          #2E8AB8 80%,
          #1E5AA3 90%,
          #0047AB 100%)"
        position="relative"
        overflow="hidden"
      >
        <Box
          position="absolute"
          width="600px"
          height="600px"
          borderRadius="full"
          bg="rgba(100, 150, 255, 0.3)"
          top="-100px"
          right="-100px"
          filter="blur(80px)"
        />
        <Box
          position="absolute"
          width="500px"
          height="500px"
          borderRadius="full"
          bg="rgba(255, 200, 0, 0.3)"
          bottom="50px"
          left="100px"
          filter="blur(80px)"
        />
      </Box>
    </Flex>
  );
}
