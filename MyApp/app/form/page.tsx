"use client";

import { useState } from "react";
import { Box, VStack, Button, Input, Textarea, useToast } from "@chakra-ui/react";

export default function PublicFormPage() {
  const toast = useToast();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    message: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = () => {
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.message) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    toast({
      title: "Success!",
      description: "Your form has been submitted",
      status: "success",
      duration: 3000,
      isClosable: true,
    });

    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      message: "",
    });
  };

  return (
    <Box
      minH="100vh"
      bg="rgba(36, 39, 42, 0.02)"
      display="flex"
      alignItems="center"
      justifyContent="center"
      p="16px"
    >
      <Box
        bg="white"
        borderRadius="16px"
        boxShadow="0 4px 6px rgba(0, 0, 0, 0.1)"
        p="32px"
        w="100%"
        maxW="427px"
      >
        <VStack align="stretch" spacing="16px">
          {/* First Name */}
          <VStack align="stretch" spacing="8px">
            <label style={{ fontSize: "14px", fontWeight: "500", color: "#272727" }}>
              First name
            </label>
            <Input
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              placeholder="Enter your first name"
              h="44px"
              bg="white"
              border="1px solid"
              borderColor="#e5e7eb"
              borderRadius="8px"
              px="14px"
              fontSize="14px"
              _focus={{
                borderColor: "#272727",
                boxShadow: "0 0 0 4px rgba(39, 39, 42, 0.1)",
              }}
            />
          </VStack>

          {/* Last Name */}
          <VStack align="stretch" spacing="8px">
            <label style={{ fontSize: "14px", fontWeight: "500", color: "#272727" }}>
              Last name
            </label>
            <Input
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              placeholder="Enter your last name"
              h="44px"
              bg="white"
              border="1px solid"
              borderColor="#e5e7eb"
              borderRadius="8px"
              px="14px"
              fontSize="14px"
              _focus={{
                borderColor: "#272727",
                boxShadow: "0 0 0 4px rgba(39, 39, 42, 0.1)",
              }}
            />
          </VStack>

          {/* Email */}
          <VStack align="stretch" spacing="8px">
            <label style={{ fontSize: "14px", fontWeight: "500", color: "#272727" }}>
              Email
            </label>
            <Input
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              h="44px"
              bg="white"
              border="1px solid"
              borderColor="#e5e7eb"
              borderRadius="8px"
              px="14px"
              fontSize="14px"
              _focus={{
                borderColor: "#272727",
                boxShadow: "0 0 0 4px rgba(39, 39, 42, 0.1)",
              }}
            />
          </VStack>

          {/* Message */}
          <VStack align="stretch" spacing="8px">
            <label style={{ fontSize: "14px", fontWeight: "500", color: "#272727" }}>
              Message
            </label>
            <Textarea
              name="message"
              value={formData.message}
              onChange={handleChange}
              placeholder="Enter your message"
              minH="120px"
              bg="white"
              border="1px solid"
              borderColor="#e5e7eb"
              borderRadius="8px"
              p="14px"
              fontSize="14px"
              resize="none"
              _focus={{
                borderColor: "#272727",
                boxShadow: "0 0 0 4px rgba(39, 39, 42, 0.1)",
              }}
            />
          </VStack>

          {/* Submit Button */}
          <Button
            w="100%"
            h="44px"
            bg="#272727"
            color="white"
            fontSize="14px"
            fontWeight="500"
            borderRadius="8px"
            _hover={{ bg: "#1a1a1a" }}
            onClick={handleSubmit}
            mt="8px"
          >
            Submit
          </Button>
        </VStack>
      </Box>
    </Box>
  );
}
