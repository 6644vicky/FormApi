"use client";

import { useRouter } from "next/navigation";
import { Box, VStack, HStack, Text, Button, Heading, IconButton, Input, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, useToast, Tabs, TabList, Tab, TabPanels, TabPanel } from "@chakra-ui/react";
import { ArrowBackIcon } from "@chakra-ui/icons";
import { useState } from "react";
import { CalendarPicker } from "@/components/CalendarPicker";

export default function CalendarBuilderPage() {
  const router = useRouter();
  const toast = useToast();
  const [tabIndex, setTabIndex] = useState(0);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [formName, setFormName] = useState("Untitled");
  const [inputValue, setInputValue] = useState(formName);
  const [isSaving, setIsSaving] = useState(false);

  const saveFormName = async (name: string) => {
    setFormName(name || "Untitled");
  };

  return (
    <>
      <style jsx global>{`
        html, body, #__next {
          height: 100%;
          margin: 0;
          padding: 0;
          overflow: hidden;
        }
      `}</style>

      <Box h="100dvh" w="100vw" bg="customGray.100" position="relative" overflow="hidden">
        <VStack h="100%" w="100%" align="stretch" spacing={0} overflow="hidden">
      <Box minH="60px" h="60px" bg="white" pl="16px" pr="16px" display="flex" alignItems="center" justifyContent="center" position="relative" borderBottom="1px solid" borderColor="customGray.200" zIndex="20" flexShrink={0}>
        <HStack spacing="6px" position="absolute" left="16px">
          <IconButton
            size="sm"
            icon={
              <Box display="flex" alignItems="center" justifyContent="center" w="20px" h="20px">
                <ArrowBackIcon w="20px" h="20px" />
              </Box>
            }
            variant="ghost"
            color="customGray.800"
            _hover={{ bg: "customGray.100" }}
            onClick={() => router.push("/builder")}
            aria-label="Back"
          />
          <Text fontSize="sm" fontWeight="500" color="customGray.800" cursor="pointer" _hover={{ textDecoration: "underline" }} onClick={onOpen} maxW="200px" isTruncated>
            {formName}
          </Text>
        </HStack>
        <HStack spacing="24px">
          <Text
            fontSize="sm"
            color={tabIndex === 0 ? "customGray.800" : "customGray.600"}
            fontWeight={tabIndex === 0 ? "500" : "400"}
            cursor="pointer"
            onClick={() => setTabIndex(0)}
            transition="all 0.3s ease"
            pb="2px"
            borderBottom={tabIndex === 0 ? "2px solid" : "none"}
            borderBottomColor={tabIndex === 0 ? "customGray.800" : "transparent"}
          >
            Build
          </Text>
          <Text
            fontSize="sm"
            color={tabIndex === 1 ? "customGray.800" : "customGray.600"}
            fontWeight={tabIndex === 1 ? "500" : "400"}
            cursor="pointer"
            onClick={() => setTabIndex(1)}
            transition="all 0.3s ease"
            pb="2px"
            borderBottom={tabIndex === 1 ? "2px solid" : "none"}
            borderBottomColor={tabIndex === 1 ? "customGray.800" : "transparent"}
          >
            Configure
          </Text>
          <Text
            fontSize="sm"
            color={tabIndex === 2 ? "customGray.800" : "customGray.600"}
            fontWeight={tabIndex === 2 ? "500" : "400"}
            cursor="pointer"
            onClick={() => setTabIndex(2)}
            transition="all 0.3s ease"
            pb="2px"
            borderBottom={tabIndex === 2 ? "2px solid" : "none"}
            borderBottomColor={tabIndex === 2 ? "customGray.800" : "transparent"}
          >
            Workflow
          </Text>
        </HStack>
        <HStack spacing="8px" position="absolute" right="16px">
          <Box w="1px" h="16px" bg="customGray.200" />
          <Button size="sm" px="14px" bg="customGray.800" color="white" _hover={{ bg: "customGray.700" }}>
            Share
          </Button>
        </HStack>
      </Box>

      <HStack spacing="0px" flex="1" align="stretch" w="100%" overflow="hidden">
        <Box w="340px" bg="white" borderRight="1px solid" borderColor="customGray.200" p="24px" overflowY="auto" />
        <Box flex="1" bg="customGray.50" p="24px" overflowY="auto" display="flex" alignItems="center" justifyContent="center">
          <Box w="fit-content" h="460px" bg="white" borderRadius="12px" p="0px" border="1px solid" borderColor="customGray.200" boxShadow="0 1px 2px rgba(0,0,0,0.05)">
            <HStack spacing="0px" align="stretch" w="100%" h="100%">

              {/* Event Details */}
              <VStack spacing="16px" align="start" flex="0 0 280px" p="24px">
                <HStack spacing="12px">
                  <Box w="48px" h="48px" borderRadius="full" bg="customGray.200" flexShrink={0} />
                  <VStack spacing="2px" align="start">
                    <Text fontSize="sm" fontWeight="600" color="customGray.800">Vicky Vignesh</Text>
                  </VStack>
                </HStack>
                <VStack spacing="8px" align="start" w="100%">
                  <Text fontSize="lg" fontWeight="600" color="customGray.800">sfd</Text>
                  <Text fontSize="sm" color="customGray.600" lineHeight="1.5">Get to know each other and discuss your needs. A perfect opportunity to connect and explore possibilities together.</Text>
                </VStack>
                <VStack spacing="8px" align="start" w="100%" pt="8px">
                  <HStack spacing="8px" fontSize="sm" color="customGray.700">
                    <Box>🕐</Box>
                    <Text>15m</Text>
                  </HStack>
                  <HStack spacing="8px" fontSize="sm" color="customGray.700">
                    <Box>📹</Box>
                    <Text>Cal Video</Text>
                  </HStack>
                  <HStack spacing="8px" fontSize="sm" color="customGray.700">
                    <Box>🌍</Box>
                    <Text>Asia/Kolkata</Text>
                  </HStack>
                </VStack>
              </VStack>

              {/* Calendar */}
              <Box flex="0 0 440px" display="flex" alignItems="flex-start" justifyContent="center" borderLeft="1px solid" borderColor="customGray.200" px="24px" pt="24px">
                <CalendarPicker />
              </Box>

              {/* Time Slots */}
              <VStack spacing="0px" flex="0 0 260px" borderLeft="1px solid" borderColor="customGray.200" p="0px">
                <HStack w="100%" justify="space-between" px="24px" pt="24px" pb="12px">
                  <Text fontSize="sm" fontWeight="600" color="customGray.800">Thu 23</Text>
                  <Tabs variant="soft-rounded" colorScheme="gray" size="sm">
                    <TabList bg="customGray.100" borderRadius="9999px" p="4px">
                      <Tab fontSize="12px" _selected={{ bg: "white", color: "customGray.800" }}>12h</Tab>
                      <Tab fontSize="12px" _selected={{ bg: "white", color: "customGray.800" }}>24h</Tab>
                    </TabList>
                  </Tabs>
                </HStack>
                <VStack spacing="12px" w="100%" overflowY="auto" maxH="380px" align="stretch" px="24px" pt="4px" pb="16px" sx={{ "&::-webkit-scrollbar": { w: "0px" }, "&::-webkit-scrollbar-track": { bg: "transparent" }, "&::-webkit-scrollbar-thumb": { bg: "transparent" } }}>
                  {["09:00 AM", "09:15 AM", "09:30 AM", "09:45 AM", "10:00 AM", "10:15 AM", "10:30 AM", "10:45 AM", "11:00 AM"].map((time) => (
                    <Button
                      key={time}
                      w="100%"
                      h="36px"
                      p="0px"
                      flexShrink={0}
                      fontSize="14px"
                      fontWeight="400"
                      variant="outline"
                      borderColor="customGray.200"
                      boxShadow="0 1px 2px rgba(0,0,0,0.05)"
                      bg={time === "09:30 AM" ? "customGray.800" : "white"}
                      color={time === "09:30 AM" ? "white" : "customGray.500"}
                      _hover={{ bg: time === "09:30 AM" ? "customGray.700" : "customGray.50", borderColor: "customGray.300" }}>
                      {time}
                    </Button>
                  ))}
                </VStack>
              </VStack>
            </HStack>
          </Box>
        </Box>
        <Box flex="1" bg="white" borderLeft="1px solid" borderColor="customGray.200" p="24px" overflowY="auto" display="none" />
      </HStack>

      <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay bg="rgba(0, 0, 0, 0.5)" />
        <ModalContent bg="white" borderRadius="lg" boxShadow="0 10px 40px rgba(0, 0, 0, 0.1)">
          <ModalHeader pb={0} pt="24px" px="24px">
            <Heading fontSize="lg" fontWeight="500" color="customGray.800">
              Rename this webforms
            </Heading>
          </ModalHeader>
          <ModalBody pt="24px" px="24px">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="New form"
              fontSize="sm"
              border="1px solid"
              borderColor="customGray.300"
              color="customGray.800"
              _placeholder={{ color: "customGray.500" }}
              _focus={{
                borderColor: "customGray.500",
                boxShadow: "0 0 0 3px rgba(39, 39, 42, 0.1)",
              }}
              borderRadius="base"
              autoFocus
              onFocus={(e) => e.target.select()}
            />
          </ModalBody>
          <ModalFooter px="24px" pb="24px" gap="12px">
            <Button
              size="sm"
              variant="ghost"
              color="customGray.600"
              _hover={{ bg: "customGray.50" }}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              bg="customGray.800"
              color="white"
              _hover={{ bg: "customGray.700" }}
              isLoading={isSaving}
              isDisabled={!inputValue || inputValue.toLowerCase() === "untitled"}
              _disabled={{ opacity: 0.5, cursor: "not-allowed" }}
              onClick={async () => {
                if (!inputValue || inputValue.toLowerCase() === "untitled") {
                  toast({
                    title: "Error",
                    description: "Please enter a name for the form",
                    status: "error",
                    duration: 3,
                    isClosable: true,
                    position: "top",
                  });
                  return;
                }
                await saveFormName(inputValue);
                onClose();
              }}
            >
              Save
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
        </VStack>
      </Box>
    </>
  );
}
