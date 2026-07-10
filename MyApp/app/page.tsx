"use client";

export const dynamic = 'force-dynamic';

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Box,
  Flex,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  Input,
  useColorModeValue,
  useToast,
} from "@chakra-ui/react";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthCallback } from "@/lib/useAuthCallback";

const getCallbackUrl = () => {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/api/auth/callback`;
  }
  return "/api/auth/callback";
};

export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const router = useRouter();
  const toast = useToast();

  // Handle OAuth callback
  useAuthCallback();

  return (
    <Flex h="100vh" bg="white">
      {/* Left Side - Login Form */}
      <Box w="640px" h="100vh" display="flex" alignItems="center" justifyContent="center" overflowY="auto">
        <VStack spacing={8} w="full" px="96px">
          {/* Logo */}
          <Heading as="h2" size="md" color="gray.900" fontWeight={700} alignSelf="flex-start">
            Helpdesk
          </Heading>

          {/* Welcome Text */}
          <VStack spacing={6} w="full" align="stretch">
            <Heading as="h1" size="lg" color="gray.900">
              Welcome to Helpdesk
            </Heading>

            {/* Google Sign In */}
            <Button
              w="full"
              h="44px"
              bg="white"
              border="1px solid"
              borderColor="customGray.200"
              borderRadius="12px"
              color="gray.900"
              fontSize="sm"
              fontWeight={500}
              _hover={{ bg: "customGray.50", borderColor: "customGray.300" }}
              _active={{ bg: "customGray.50", borderColor: "customGray.500" }}
              _focus={{ bg: "customGray.50", borderColor: "customGray.500" }}
              onClick={async () => {
                setIsLoading(true);
                try {
                  const { error } = await supabase.auth.signInWithOAuth({
                    provider: "google",
                    options: {
                      redirectTo: getCallbackUrl(),
                    },
                  });
                  if (error) {
                    toast({
                      title: "Sign in failed",
                      description: error.message,
                      status: "error",
                      duration: 4000,
                      isClosable: true,
                    });
                    setIsLoading(false);
                  }
                } catch (err) {
                  toast({
                    title: "Sign in failed",
                    description: "An unexpected error occurred",
                    status: "error",
                    duration: 4000,
                    isClosable: true,
                  });
                  setIsLoading(false);
                }
              }}
              leftIcon={
                <Box w={5} h={5} as="img" src="/assets/google-icon.svg" alt="Google" />
              }
            >
              Continue with google
            </Button>

            {/* Divider */}
            <HStack w="full">
              <Box flex={1} h="1px" bg="customGray.200" />
              <Text fontSize="sm" color="customGray.500" px={2}>
                or
              </Text>
              <Box flex={1} h="1px" bg="customGray.200" />
            </HStack>

            {/* Email Input */}
            <VStack spacing="6px" w="full" align="stretch">
              <Text fontSize="sm" fontWeight={500} color="gray.900">
                Email
              </Text>
              <Box position="relative" w="full">
                <Input
                  placeholder="Enter your work email"
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

            {/* Password Input */}
            <VStack spacing="6px" w="full" align="stretch">
              <Text fontSize="sm" fontWeight={500} color="gray.900">
                Password
              </Text>
              <Box position="relative" w="full">
                <Input
                  placeholder="Enter your password"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setPasswordError("");
                  }}
                  h="44px"
                  bg="white"
                  border="1px solid"
                  borderColor={passwordError ? "#FF6B6B" : "customGray.200"}
                  borderRadius="12px"
                  fontSize="sm"
                  color="customGray.800"
                  _placeholder={{ color: passwordError ? "#FF6B6B" : "customGray.400" }}
                  _hover={{ borderColor: passwordError ? "#FF6B6B" : "customGray.400" }}
                  _active={{ bg: "white", boxShadow: "0 0 0 4px rgba(39, 39, 42, 0.1)" }}
                  _focus={{
                    bg: "white",
                    borderColor: passwordError ? "#FF6B6B" : "customGray.500",
                    boxShadow: passwordError ? "0 0 0 4px rgba(255, 107, 107, 0.1)" : "0 0 0 4px rgba(39, 39, 42, 0.1)"
                  }}
                  pr="40px"
                />
                {passwordError && (
                  <Box position="absolute" right="12px" top="50%" transform="translateY(-50%)" display="flex" alignItems="center" justifyContent="center" w="20px" h="20px">
                    <Text fontSize="16px" color="#FF6B6B">⚠️</Text>
                  </Box>
                )}
              </Box>
              {passwordError && (
                <Text fontSize="xs" color="#FF6B6B" mt="1px">
                  {passwordError}
                </Text>
              )}
            </VStack>

            {/* Sign In Button */}
            <Button
              w="full"
              h="44px"
              bg={email && password ? "customGray.950" : "customGray.400"}
              color="white"
              fontSize="sm"
              fontWeight={500}
              borderRadius="12px"
              boxShadow="0 1px 2px 0 rgba(2, 6, 23, 0.05)"
              _hover={{ bg: email && password ? "customGray.950" : "customGray.400" }}
              isLoading={isLoading}
              onClick={async () => {
                let hasError = false;

                if (!email) {
                  setEmailError("Email is required");
                  hasError = true;
                } else if (!email.includes("@")) {
                  setEmailError("Please enter a valid email");
                  hasError = true;
                }

                if (!password) {
                  setPasswordError("Password is required");
                  hasError = true;
                } else if (password.length < 6) {
                  setPasswordError("Password must be at least 6 characters");
                  hasError = true;
                }

                if (hasError) return;

                setIsLoading(true);
                try {
                  const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                  });

                  if (error) {
                    setEmailError("Invalid email or password");
                    setPasswordError("Invalid email or password");
                    toast({
                      title: "Sign in failed",
                      description: error.message || "Invalid email or password",
                      status: "error",
                      duration: 4000,
                      isClosable: true,
                    });
                    setIsLoading(false);
                  } else if (data?.session) {
                    router.push("/inbox");
                  } else {
                    toast({
                      title: "Sign in failed",
                      description: "No session created",
                      status: "error",
                      duration: 4000,
                      isClosable: true,
                    });
                    setIsLoading(false);
                  }
                } catch (err) {
                  toast({
                    title: "Sign in failed",
                    description: "An unexpected error occurred",
                    status: "error",
                    duration: 4000,
                    isClosable: true,
                  });
                  setIsLoading(false);
                }
              }}
            >
              Sign in
            </Button>

            {/* Forgot Password */}
            <Box textAlign="center">
              <Link href="/forgot-password">
                <Text fontSize="sm" color="#3B82F6" _hover={{ color: "customGray.800", textDecoration: "underline" }}>
                  Forgot password?
                </Text>
              </Link>
            </Box>
          </VStack>

          {/* Sign Up */}
          <Text fontSize="sm" color="gray.700">
            Don't have an account?{" "}
            <Link href="/signup">
              <Text as="span" color="#3B82F6" textDecoration="underline" cursor="pointer" _hover={{ color: "customGray.800" }}>
                Sign up
              </Text>
            </Link>
          </Text>
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
        {/* Decorative circles for gradient effect */}
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
