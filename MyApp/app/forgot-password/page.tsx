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
  Input,
  useToast,
} from "@chakra-ui/react";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { checkEmailExists } from "@/app/actions/checkEmailExists";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const toast = useToast();

  const handleResetPassword = async () => {
    setEmailError("");

    if (!email) {
      setEmailError("Email is required");
      return;
    }

    if (!email.includes("@")) {
      setEmailError("Please enter a valid email");
      return;
    }

    setIsLoading(true);

    try {
      // Check if the email exists in auth users
      const userExists = await checkEmailExists(email);

      if (!userExists) {
        setEmailError("This email is new. Please sign up first.");
        setIsLoading(false);
        return;
      }

      // Email exists, send reset email
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
        router.push(`/check-inbox?email=${encodeURIComponent(email)}`);
      }
    } catch (error) {
      console.error("Reset password error:", error);
      toast({
        title: "Error",
        description: "An error occurred. Please try again.",
        status: "error",
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Flex h="100vh" bg="white">
      {/* Left Side - Password Reset Form */}
      <Box w="640px" h="100vh" display="flex" alignItems="center" justifyContent="center" overflowY="auto">
        <VStack spacing={8} w="full" px="96px" align="stretch">
          {/* Logo */}
          <Heading as="h2" size="md" color="gray.900" fontWeight={700} alignSelf="flex-start">
            Helpdesk
          </Heading>

          {/* Reset Password Section */}
          <VStack spacing={6} w="full" align="stretch">
            <Heading as="h1" size="lg" color="gray.900">
              Reset your password
            </Heading>

            {/* Description */}
            <Text fontSize="sm" color="customGray.500" lineHeight="1.6">
              Enter the email address associated with your account, and we'll send you a link to reset your password.
            </Text>

            {/* Email Input */}
            <VStack spacing="6px" w="full" align="stretch">
              <Text fontSize="sm" fontWeight={500} color="gray.900">
                Email
              </Text>
              <Box position="relative" w="full">
                <Input
                  placeholder="Enter your email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailError("");
                  }}
                  h="44px"
                  bg="white"
                  border="1px solid"
                  borderColor={emailError ? "#FF6B6B" : "customGray.200"}
                  borderRadius="12px"
                  fontSize="sm"
                  color="customGray.800"
                  _placeholder={{ color: emailError ? "#FF6B6B" : "customGray.400" }}
                  _hover={{ borderColor: emailError ? "#FF6B6B" : "customGray.400" }}
                  _active={{ bg: "white", boxShadow: "0 0 0 4px rgba(39, 39, 42, 0.1)" }}
                  _focus={{
                    bg: "white",
                    borderColor: emailError ? "#FF6B6B" : "customGray.500",
                    boxShadow: emailError ? "0 0 0 4px rgba(255, 107, 107, 0.1)" : "0 0 0 4px rgba(39, 39, 42, 0.1)"
                  }}
                  pr="40px"
                />
                {emailError && (
                  <Box position="absolute" right="12px" top="50%" transform="translateY(-50%)" display="flex" alignItems="center" justifyContent="center" w="20px" h="20px">
                    <Text fontSize="16px" color="#FF6B6B">⚠️</Text>
                  </Box>
                )}
              </Box>
              {emailError && (
                <Text fontSize="xs" color="#FF6B6B" mt="1px">
                  {emailError}
                </Text>
              )}
            </VStack>

            {/* Continue Button */}
            <Button
              w="full"
              h="44px"
              bg={email ? "customGray.950" : "customGray.400"}
              color="white"
              fontSize="sm"
              fontWeight={500}
              borderRadius="12px"
              boxShadow="0 1px 2px 0 rgba(2, 6, 23, 0.05)"
              isLoading={isLoading}
              onClick={handleResetPassword}
              _hover={{ bg: email ? "customGray.950" : "customGray.400" }}
              mt="20px"
            >
              Continue
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
