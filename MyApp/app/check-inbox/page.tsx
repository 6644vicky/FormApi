"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Box,
  Flex,
  VStack,
  Heading,
  Text,
  Button,
  useToast,
} from "@chakra-ui/react";
import { useState, useEffect, Suspense } from "react";
import { supabase } from "@/lib/supabase";

function CheckInboxContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  const email = searchParams.get("email") || "";
  const [countdown, setCountdown] = useState(60);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown]);

  const handleResend = async () => {
    if (countdown > 0) return;

    setIsResending(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          status: "error",
          duration: 4000,
          isClosable: true,
        });
      } else {
        toast({
          title: "Email resent",
          description: "Check your inbox for the password reset link.",
          status: "success",
          duration: 4000,
          isClosable: true,
        });
        setCountdown(60);
      }
    } catch (error) {
      console.error("Resend error:", error);
      toast({
        title: "Error",
        description: "An error occurred. Please try again.",
        status: "error",
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setIsResending(false);
    }
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

          {/* Check Inbox Section */}
          <VStack spacing={6} w="full" align="stretch">
            <Heading as="h1" size="lg" color="gray.900">
              Check your inbox
            </Heading>

            {/* Message */}
            <Text fontSize="sm" color="customGray.700" lineHeight="1.6">
              Thanks! If <Text as="span" fontWeight={600}>{email}</Text> matches an email address we have on file, then we've sent you an email containing further instructions for resetting your password.
            </Text>

            <Text fontSize="sm" color="customGray.700" lineHeight="1.6">
              If you haven't received an email in 5 minutes, check your spam, resend, or try a different email address.
            </Text>

            {/* Resend Button */}
            <Button
              w="full"
              h="44px"
              bg={countdown > 0 ? "customGray.400" : "customGray.950"}
              color="white"
              fontSize="sm"
              fontWeight={500}
              borderRadius="12px"
              boxShadow="0 1px 2px 0 rgba(2, 6, 23, 0.05)"
              isLoading={isResending}
              isDisabled={countdown > 0}
              onClick={handleResend}
              _hover={{ bg: countdown > 0 ? "customGray.400" : "customGray.950" }}
              mt="24px"
            >
              {countdown > 0 ? `Resend (${countdown}s)` : "Resend"}
            </Button>

            {/* Return to Sign In */}
            <Box textAlign="center" pt={2}>
              <Link href="/">
                <Text fontSize="sm" color="customGray.500" _hover={{ textDecoration: "underline", color: "customGray.800" }} cursor="pointer">
                  Return to Sign In
                </Text>
              </Link>
            </Box>
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

export default function CheckInboxPage() {
  return (
    <Suspense fallback={<Box>Loading...</Box>}>
      <CheckInboxContent />
    </Suspense>
  );
}
