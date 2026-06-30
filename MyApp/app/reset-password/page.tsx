"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Box,
  Flex,
  VStack,
  Heading,
  Text,
  Button,
  Input,
  useToast,
  HStack,
  Icon,
} from "@chakra-ui/react";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { ViewIcon, ViewOffIcon } from "@chakra-ui/icons";

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const toast = useToast();

  // Password validation checks
  const hasMinLength = newPassword.length >= 8;
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword);
  const passwordsMatch = newPassword === confirmPassword && newPassword.length > 0;

  const isFormValid = hasMinLength && hasNumber && hasSpecialChar && passwordsMatch;

  const handleResetPassword = async () => {
    setPasswordError("");
    setConfirmPasswordError("");

    if (!newPassword) {
      setPasswordError("Password is required");
      return;
    }

    if (!hasMinLength) {
      setPasswordError("Password must be at least 8 characters");
      return;
    }

    if (!hasNumber) {
      setPasswordError("Password must contain at least one number");
      return;
    }

    if (!hasSpecialChar) {
      setPasswordError("Password must contain at least one special character");
      return;
    }

    if (!confirmPassword) {
      setConfirmPasswordError("Please confirm your password");
      return;
    }

    if (!passwordsMatch) {
      setConfirmPasswordError("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
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
        router.push("/password-changed");
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
      {/* Left Side - Reset Password Form */}
      <Box w="640px" h="100vh" display="flex" alignItems="center" justifyContent="center" overflowY="auto">
        <VStack spacing={8} w="full" px="96px" align="stretch">
          {/* Logo */}
          <Heading as="h2" size="md" color="gray.900" fontWeight={700} alignSelf="flex-start">
            Helpdesk
          </Heading>

          {/* Reset Password Section */}
          <VStack spacing={6} w="full" align="stretch">
            <Heading as="h1" size="lg" color="gray.900">
              Please enter your new password
            </Heading>

            {/* New Password Input */}
            <VStack spacing="6px" w="full" align="stretch">
              <Text fontSize="sm" fontWeight={500} color="gray.900">
                Your new password
              </Text>
              <Box position="relative" w="full">
                <Input
                  placeholder="Enter new password"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
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
                <Box
                  position="absolute"
                  right="12px"
                  top="50%"
                  transform="translateY(-50%)"
                  cursor="pointer"
                  onClick={() => setShowPassword(!showPassword)}
                  color={passwordError ? "#FF6B6B" : "customGray.400"}
                >
                  {passwordError ? "⚠️" : (showPassword ? <ViewOffIcon /> : <ViewIcon />)}
                </Box>
              </Box>
              {passwordError && (
                <Text fontSize="xs" color="#FF6B6B" mt="1px">
                  {passwordError}
                </Text>
              )}
            </VStack>

            {/* Repeat Password Input */}
            <VStack spacing="6px" w="full" align="stretch">
              <Text fontSize="sm" fontWeight={500} color="gray.900">
                Repeat new password
              </Text>
              <Box position="relative" w="full">
                <Input
                  placeholder="Confirm password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    // Show error if passwords don't match
                    if (e.target.value && e.target.value !== newPassword) {
                      setConfirmPasswordError("Passwords do not match");
                    } else {
                      setConfirmPasswordError("");
                    }
                  }}
                  h="44px"
                  bg="white"
                  border="1px solid"
                  borderColor={confirmPasswordError ? "#FF6B6B" : "customGray.200"}
                  borderRadius="12px"
                  fontSize="sm"
                  color="customGray.800"
                  _placeholder={{ color: confirmPasswordError ? "#FF6B6B" : "customGray.400" }}
                  _hover={{ borderColor: confirmPasswordError ? "#FF6B6B" : "customGray.400" }}
                  _active={{ bg: "white", boxShadow: "0 0 0 4px rgba(39, 39, 42, 0.1)" }}
                  _focus={{
                    bg: "white",
                    borderColor: confirmPasswordError ? "#FF6B6B" : "customGray.500",
                    boxShadow: confirmPasswordError ? "0 0 0 4px rgba(255, 107, 107, 0.1)" : "0 0 0 4px rgba(39, 39, 42, 0.1)"
                  }}
                  pr="40px"
                />
                <Box
                  position="absolute"
                  right="12px"
                  top="50%"
                  transform="translateY(-50%)"
                  cursor="pointer"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  color={confirmPasswordError ? "#FF6B6B" : "customGray.400"}
                >
                  {confirmPasswordError ? "⚠️" : (showConfirmPassword ? <ViewOffIcon /> : <ViewIcon />)}
                </Box>
              </Box>
              {confirmPasswordError && (
                <Text fontSize="xs" color="#FF6B6B" mt="1px">
                  {confirmPasswordError}
                </Text>
              )}
            </VStack>

            {/* Change Password Button */}
            <Button
              w="full"
              h="44px"
              bg={isFormValid ? "customGray.950" : "customGray.400"}
              color="white"
              fontSize="sm"
              fontWeight={500}
              borderRadius="12px"
              boxShadow="0 1px 2px 0 rgba(2, 6, 23, 0.05)"
              isLoading={isLoading}
              onClick={handleResetPassword}
              _hover={{ bg: isFormValid ? "customGray.950" : "customGray.400" }}
              mt="24px"
            >
              Change Password
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
