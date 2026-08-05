"use client";

import {
  Box,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  Button,
  Text,
  HStack,
  IconButton,
  Alert,
  AlertIcon,
  Badge,
  useToast,
} from "@chakra-ui/react";
import { CloseIcon } from "@chakra-ui/icons";
import { useState } from "react";

interface AddPageProps {
  isOpen: boolean;
  onClose: () => void;
  availablePages: string[];
  setAvailablePages: (pages: string[]) => void;
  setSelectedPage: (page: string) => void;
}

export function AddPage({
  isOpen,
  onClose,
  availablePages,
  setAvailablePages,
  setSelectedPage,
}: AddPageProps) {
  const [selectedPageTypes, setSelectedPageTypes] = useState<string[]>([]);
  const toast = useToast();

  const handleClose = () => {
    setSelectedPageTypes([]);
    onClose();
  };

  const handleAddPages = () => {
    const newPages = selectedPageTypes.filter(
      (pageType) => !availablePages.includes(pageType)
    );
    if (newPages.length > 0) {
      setAvailablePages([...availablePages, ...newPages]);
      setSelectedPage(newPages[0]);
    }
    handleClose();
    toast({
      title: `${newPages.length === 1 ? "Page" : "Pages"} added successfully`,
      status: "success",
      duration: 1500,
      isClosable: true,
      position: "top",
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="xl" isCentered>
      <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(2px)" />
      <ModalContent
        maxW="640px"
        h="480px"
        borderRadius="16px"
        p="0px"
        overflow="hidden"
        boxShadow="0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
      >
        <Box
          bg="white"
          borderBottom="1px solid"
          borderColor="customGray.200"
          pt="18px"
          px="24px"
          pb="18px"
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          w="100%"
        >
          <Text fontSize="lg" fontWeight="600" color="customGray.800">
            Create New Page
          </Text>
          <IconButton
            size="sm"
            variant="ghost"
            icon={<CloseIcon w="14px" h="14px" />}
            onClick={handleClose}
            aria-label="Close"
            color="customGray.600"
            _hover={{ bg: "customGray.100" }}
          />
        </Box>
        <Alert
          status="info"
          variant="subtle"
          bg="orange.50"
          px="24px"
          py="12px"
          mx="0px"
          my="0px"
          h="40px"
          display="flex"
          alignItems="center"
        >
          <AlertIcon />
          <Text fontSize="sm" color="customGray.800">
            Each page type can only be added once.
          </Text>
        </Alert>
        <ModalBody px="24px" py="24px" flex="1" bg="customGray.50">
          <HStack spacing="16px" justify="flex-start">
            {/* Form Page Option Card */}
            <Box
              w="200px"
              h="175px"
              border="1px solid"
              borderColor={
                availablePages.includes("Form page")
                  ? "customGray.300"
                  : selectedPageTypes.includes("Form page")
                    ? "customGray.500"
                    : "customGray.300"
              }
              borderRadius="12px"
              p="0"
              cursor={
                availablePages.includes("Form page") ? "not-allowed" : "pointer"
              }
              position="relative"
              bg="white"
              opacity={availablePages.includes("Form page") ? 0.5 : 1}
              boxShadow={
                selectedPageTypes.includes("Form page") &&
                !availablePages.includes("Form page")
                  ? "0 4px 12px rgba(0,0,0,0.08)"
                  : "none"
              }
              _hover={
                !availablePages.includes("Form page")
                  ? {
                      boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                      borderColor: selectedPageTypes.includes("Form page")
                        ? "customGray.500"
                        : "customGray.400",
                    }
                  : {}
              }
              _focus={
                !availablePages.includes("Form page")
                  ? { boxShadow: "none", outline: "none" }
                  : { outline: "none" }
              }
              tabIndex={availablePages.includes("Form page") ? -1 : 0}
              onClick={() => {
                if (!availablePages.includes("Form page")) {
                  if (selectedPageTypes.includes("Form page")) {
                    setSelectedPageTypes(
                      selectedPageTypes.filter((p) => p !== "Form page")
                    );
                  } else {
                    setSelectedPageTypes([
                      ...selectedPageTypes,
                      "Form page",
                    ]);
                  }
                }
              }}
              display="flex"
              flexDirection="column"
              alignItems="stretch"
              justifyContent="flex-start"
            >
              {selectedPageTypes.includes("Form page") && (
                <IconButton
                  position="absolute"
                  top="8px"
                  right="8px"
                  size="xs"
                  bg="customGray.800"
                  color="white"
                  borderRadius="full"
                  cursor="pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPageTypes(
                      selectedPageTypes.filter((p) => p !== "Form page")
                    );
                  }}
                  _hover={{ bg: "customGray.700" }}
                  icon={<CloseIcon w="14px" h="14px" />}
                  aria-label="Close"
                />
              )}
              <Box
                w="100%"
                display="flex"
                alignItems="center"
                justifyContent="center"
                flex="1"
                overflow="hidden"
                borderTopRadius="11px"
              >
                <Box
                  as="img"
                  src="/assets/Form-page-preview.png"
                  alt="Form Page Preview"
                  w="100%"
                  h="100%"
                  objectFit="cover"
                />
              </Box>
              <Box
                w="100%"
                display="flex"
                alignItems="center"
                justifyContent="center"
                py="12px"
              >
                <Text fontSize="sm" fontWeight="500" color="customGray.800">
                  Form Page
                </Text>
              </Box>
            </Box>

            {/* Thank You Page Option Card */}
            <Box
              w="200px"
              h="175px"
              border="1px solid"
              borderColor={
                availablePages.includes("Success page")
                  ? "customGray.300"
                  : selectedPageTypes.includes("Success page")
                    ? "customGray.500"
                    : "customGray.300"
              }
              borderRadius="12px"
              p="0"
              cursor={
                availablePages.includes("Success page")
                  ? "not-allowed"
                  : "pointer"
              }
              position="relative"
              bg="white"
              opacity={availablePages.includes("Success page") ? 0.5 : 1}
              boxShadow={
                selectedPageTypes.includes("Success page") &&
                !availablePages.includes("Success page")
                  ? "0 4px 12px rgba(0,0,0,0.08)"
                  : "none"
              }
              _hover={
                !availablePages.includes("Success page")
                  ? {
                      boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                      borderColor: selectedPageTypes.includes("Success page")
                        ? "customGray.500"
                        : "customGray.400",
                    }
                  : {}
              }
              _focus={
                !availablePages.includes("Success page")
                  ? { boxShadow: "none", outline: "none" }
                  : { outline: "none" }
              }
              tabIndex={availablePages.includes("Success page") ? -1 : 0}
              onClick={() => {
                if (!availablePages.includes("Success page")) {
                  if (selectedPageTypes.includes("Success page")) {
                    setSelectedPageTypes(
                      selectedPageTypes.filter((p) => p !== "Success page")
                    );
                  } else {
                    setSelectedPageTypes([
                      ...selectedPageTypes,
                      "Success page",
                    ]);
                  }
                }
              }}
              display="flex"
              flexDirection="column"
              alignItems="stretch"
              justifyContent="flex-start"
            >
              {selectedPageTypes.includes("Success page") && (
                <IconButton
                  position="absolute"
                  top="8px"
                  right="8px"
                  size="xs"
                  bg="customGray.800"
                  color="white"
                  borderRadius="full"
                  cursor="pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPageTypes(
                      selectedPageTypes.filter((p) => p !== "Success page")
                    );
                  }}
                  _hover={{ bg: "customGray.700" }}
                  icon={<CloseIcon w="14px" h="14px" />}
                  aria-label="Close"
                />
              )}
              <Box
                w="100%"
                display="flex"
                alignItems="center"
                justifyContent="center"
                flex="1"
                overflow="hidden"
                borderTopRadius="11px"
              >
                <Box
                  as="img"
                  src="/assets/thankyou-page-preview.png"
                  alt="Thank You Page Preview"
                  w="100%"
                  h="100%"
                  objectFit="cover"
                />
              </Box>
              <Box
                w="100%"
                display="flex"
                alignItems="center"
                justifyContent="center"
                py="12px"
              >
                <Text fontSize="sm" fontWeight="500" color="customGray.800">
                  Thank You Page
                </Text>
              </Box>
            </Box>
          </HStack>
        </ModalBody>
        <Box
          bg="white"
          borderTop="1px solid"
          borderColor="customGray.200"
          px="24px"
          py="12px"
          display="flex"
          justifyContent="flex-end"
          gap="8px"
        >
          <Button
            size="sm"
            variant="ghost"
            onClick={handleClose}
            fontWeight="500"
            bg="customGray.100"
            _hover={{ bg: "customGray.200" }}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            bg="customGray.800"
            color="white"
            _hover={{ bg: "customGray.700" }}
            isDisabled={selectedPageTypes.length === 0}
            onClick={handleAddPages}
          >
            <HStack spacing="8px">
              <Text>Add page</Text>
              {selectedPageTypes.length > 0 && (
                <Badge
                  bg="white"
                  color="customGray.800"
                  borderRadius="full"
                  fontSize="xs"
                  fontWeight="600"
                  px="6px"
                >
                  {selectedPageTypes.length}
                </Badge>
              )}
            </HStack>
          </Button>
        </Box>
      </ModalContent>
    </Modal>
  );
}
