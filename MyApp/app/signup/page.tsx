"use client";

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
  useToast,
} from "@chakra-ui/react";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [nameError, setNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const router = useRouter();
  const toast = useToast();

  const handleSignup = async () => {
    let hasError = false;

    if (!fullName) {
      setNameError("Enter your name");
      hasError = true;
    }

    if (!email) {
      setEmailError("Enter your email");
      hasError = true;
    } else if (!email.includes("@")) {
      setEmailError("Please enter a valid email");
      hasError = true;
    }

    if (!password) {
      setPasswordError("Enter a password");
      hasError = true;
    } else if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      hasError = true;
    }

    if (hasError) return;

    setIsLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/`,
      },
    });

    if (error) {
      if (error.message.includes("already registered")) {
        setEmailError("This email is already registered");
      } else {
        toast({
          title: "Sign up failed",
          description: error.message,
          status: "error",
          duration: 4000,
          isClosable: true,
        });
      }
      setIsLoading(false);
    } else {
      setIsLoading(false);
      toast({
        title: "Success!",
        description: `Verification email sent to ${email}`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      // Clear form
      setFullName("");
      setEmail("");
      setPassword("");
      // Redirect to verify email page with email as query param
      router.push(`/verify-email?email=${encodeURIComponent(email)}`);
    }
  };

  return (
    <Flex h="100vh" bg="white">
      {/* Left Side - Signup Form */}
      <Box w="640px" h="100vh" display="flex" alignItems="center" justifyContent="center" overflowY="auto">
        <VStack spacing={1} w="full" px="96px">
          {/* Logo */}
          <Heading as="h2" size="md" color="gray.900" fontWeight={700} alignSelf="flex-start" mb={4}>
            Helpdesk
          </Heading>

          {/* Welcome Text */}
          <VStack spacing={1} w="full" align="stretch" mb="42px">
            <Heading as="h1" size="lg" color="gray.900">
              Create an account
            </Heading>
            <HStack spacing={1}>
              <Text fontSize="sm" color="gray.600">
                Already have an account?
              </Text>
              <Link href="/">
                <Text as="span" fontSize="sm" color="#3B82F6" textDecoration="underline" cursor="pointer" _hover={{ color: "customGray.800" }}>
                  Sign in
                </Text>
              </Link>
            </HStack>
          </VStack>

          {/* Full Name Input */}
          <VStack spacing="6px" w="full" align="stretch" mb={4}>
            <Text fontSize="sm" fontWeight={500} color="gray.900">
              Your full name
            </Text>
            <Box position="relative" w="full">
              <Input
                placeholder="Enter your name"
                type="text"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  setNameError("");
                }}
                h="44px"
                bg="white"
                border="1px solid"
                borderColor={nameError ? "#FF6B6B" : "customGray.200"}
                borderRadius="12px"
                fontSize="sm"
                color="customGray.800"
                _placeholder={{ color: nameError ? "#FF6B6B" : "customGray.400" }}
                _hover={{ borderColor: nameError ? "#FF6B6B" : "customGray.400" }}
                _active={{ bg: "white", boxShadow: "0 0 0 4px rgba(39, 39, 42, 0.1)" }}
                _focus={{
                  bg: "white",
                  borderColor: nameError ? "#FF6B6B" : "customGray.500",
                  boxShadow: nameError ? "0 0 0 4px rgba(255, 107, 107, 0.1)" : "0 0 0 4px rgba(39, 39, 42, 0.1)"
                }}
                pr="40px"
              />
              {nameError && (
                <Box position="absolute" right="12px" top="50%" transform="translateY(-50%)">
                  <Text fontSize="16px" color="#FF6B6B">⚠️</Text>
                </Box>
              )}
            </Box>
            {nameError && (
              <Text fontSize="xs" color="#FF6B6B" mt="1px">
                {nameError}
              </Text>
            )}
          </VStack>

          {/* Email Input */}
          <VStack spacing="6px" w="full" align="stretch" mb={4}>
            <Text fontSize="sm" fontWeight={500} color="gray.900">
              Email address
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
                _focus={{
                  borderColor: emailError ? "#FF6B6B" : "customGray.500",
                  boxShadow: emailError ? "0 0 0 4px rgba(255, 107, 107, 0.1)" : "0 0 0 4px rgba(39, 39, 42, 0.1)"
                }}
                pr="40px"
              />
              {emailError && (
                <Box position="absolute" right="12px" top="50%" transform="translateY(-50%)">
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
          <VStack spacing="6px" w="full" align="stretch" mb="24px">
            <Text fontSize="sm" fontWeight={500} color="gray.900">
              Password
            </Text>
            <Box position="relative" w="full">
              <Input
                placeholder="Enter a password"
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
                _focus={{
                  borderColor: passwordError ? "#FF6B6B" : "customGray.500",
                  boxShadow: passwordError ? "0 0 0 4px rgba(255, 107, 107, 0.1)" : "0 0 0 4px rgba(39, 39, 42, 0.1)"
                }}
                pr="40px"
              />
              {passwordError && (
                <Box position="absolute" right="12px" top="50%" transform="translateY(-50%)">
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

          {/* Create Account Button */}
          <Button
            w="full"
            h="44px"
            bg={fullName && email && password ? "customGray.950" : "customGray.400"}
            color="white"
            fontSize="sm"
            fontWeight={500}
            borderRadius="12px"
            boxShadow="0 1px 2px 0 rgba(2, 6, 23, 0.05)"
            isLoading={isLoading}
            onClick={handleSignup}
            _hover={{ bg: fullName && email && password ? "customGray.950" : "customGray.400" }}
          >
            Create account
          </Button>

          {/* Terms Text */}
          <Text fontSize="sm" color="customGray.500" textAlign="center" mt="14px">
            By continuing, you agree to our <Text as="span" textDecoration="underline">Terms of Service</Text> and <Text as="span" textDecoration="underline">Privacy Policy</Text>.
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
