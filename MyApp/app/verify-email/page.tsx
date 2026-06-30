"use client";

export const dynamic = 'force-dynamic';

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import {
  Box,
  Flex,
  VStack,
  Heading,
  Text,
  useToast,
} from "@chakra-ui/react";
import { supabase } from "@/lib/supabase";

function VerifyEmailContent() {
  const router = useRouter();
  const toast = useToast();
  const searchParams = useSearchParams();
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    const initializeEmail = async () => {
      // Get email from query params first
      const emailParam = searchParams.get("email");
      if (emailParam) {
        setUserEmail(emailParam);
      } else {
        // Try to get from session
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.email) {
          setUserEmail(session.user.email);
        }
      }
    };

    initializeEmail();
  }, [searchParams]);

  useEffect(() => {
    if (!userEmail) return;

    // Poll for email verification every 3 seconds
    const interval = setInterval(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;

      if (user?.email_confirmed_at) {
        // Email is confirmed, redirect to login page
        clearInterval(interval);
        toast({
          title: "Email verified!",
          description: "Redirecting to login...",
          status: "success",
          duration: 2000,
          isClosable: true,
        });
        setTimeout(() => {
          router.push("/");
        }, 1000);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [userEmail, router, toast]);

  const handleResendEmail = async () => {
    if (!userEmail) {
      toast({
        title: "Error",
        description: "Email address not found",
        status: "error",
        duration: 4000,
        isClosable: true,
      });
      return;
    }

    toast({
      title: "Email resent!",
      description: `Verification email resent to ${userEmail}`,
      status: "success",
      duration: 4000,
      isClosable: true,
    });
  };

  const handleBack = () => {
    router.push("/");
  };

  return (
    <Flex h="100vh" bg="white">
      {/* Left Side - Verification Form */}
      <Box w="640px" h="100vh" display="flex" alignItems="center" justifyContent="center" overflowY="auto">
        <VStack spacing={8} w="full" px="96px" align="stretch">
          {/* Back Button */}
          <Text
            fontSize="sm"
            color="customGray.500"
            cursor="pointer"
            _hover={{ color: "customGray.800" }}
            onClick={handleBack}
            alignSelf="flex-start"
          >
            ← Back
          </Text>

          {/* Heading */}
          <VStack spacing={6} w="full" align="stretch">
            <Heading as="h1" size="lg" color="gray.900">
              Verify your email
            </Heading>

            {/* Description */}
            <Text fontSize="sm" color="customGray.500" lineHeight="1.6">
              To finish your account setup, <Text as="span" fontWeight={600}>please click on the link in the email</Text> we've just sent you to confirm your email address.
            </Text>

            {/* Resend Email */}
            <Box pt={4}>
              <Text fontSize="sm" color="customGray.500">
                Didn't get the email?{" "}
                <Text as="span" color="#3B82F6" textDecoration="underline" cursor="pointer" _hover={{ color: "customGray.800" }} onClick={handleResendEmail}>
                  Resend it.
                </Text>
              </Text>
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

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<Box>Loading...</Box>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
