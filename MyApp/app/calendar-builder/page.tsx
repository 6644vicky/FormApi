"use client";

import { useRouter } from "next/navigation";
import { Box, VStack, HStack, Text, Button, Heading, IconButton, Input, Tabs, TabList, Tab, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, useToast } from "@chakra-ui/react";
import { ArrowBackIcon } from "@chakra-ui/icons";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function CalendarBuilderPage() {
  const router = useRouter();
  const toast = useToast();
  const [tabIndex, setTabIndex] = useState(0);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [formName, setFormName] = useState("Untitled");
  const [inputValue, setInputValue] = useState(formName);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadFormName = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          const { data } = await supabase
            .from('calendar_forms')
            .select('name')
            .eq('user_id', session.user.id)
            .single();

          if (data?.name) {
            setFormName(data.name);
            setInputValue(data.name);
          }
        }
      } catch (error) {
        console.error("Error loading form name:", error);
      }
    };

    loadFormName();
  }, []);

  const saveFormName = async (name: string) => {
    try {
      setIsSaving(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        await supabase
          .from('calendar_forms')
          .upsert({
            user_id: session.user.id,
            name: name || "Untitled"
          }, {
            onConflict: 'user_id'
          });

        setFormName(name || "Untitled");
        toast({
          title: "Success",
          description: "Form name updated successfully",
          status: "success",
          duration: 3,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error("Error saving form name:", error);
      toast({
        title: "Error",
        description: "Failed to save form name",
        status: "error",
        duration: 3,
        isClosable: true,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <VStack h="100vh" w="100vw" bg="customGray.100" align="stretch" spacing={0}>
      <Box h="56px" bg="white" pl="16px" pr="16px" display="flex" alignItems="center" justifyContent="center" position="relative" borderBottom="1px solid" borderColor="customGray.200">
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
        <Tabs index={tabIndex} onChange={setTabIndex} width="auto">
          <TabList bg="customGray.100" borderRadius="987px" p="2px" pb="4px" border="1px solid" borderColor="customGray.200" gap="6px" width="auto">
            <Tab fontSize="xs" color="customGray.600" px="8px" py="4px" borderRadius="987px" _selected={{ bg: "white", color: "customGray.800", border: "1px solid", borderColor: "customGray.300" }} display="flex" alignItems="center" gap="4px" transition="all 0.3s ease">
              <Box display="flex" alignItems="center" justifyContent="center" w="16px" h="16px">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="2" y="3" width="20" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </Box>
              Website
            </Tab>
            <Tab fontSize="xs" color="customGray.600" px="8px" py="4px" borderRadius="987px" _selected={{ bg: "white", color: "customGray.800", border: "1px solid", borderColor: "customGray.300" }} display="flex" alignItems="center" gap="4px" transition="all 0.3s ease">
              <Box display="flex" alignItems="center" justifyContent="center" w="16px" h="16px">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="5" y="2" width="14" height="20" rx="2" stroke="currentColor" strokeWidth="2"/>
                  <line x1="5" y1="5" x2="19" y2="5" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </Box>
              Mobile
            </Tab>
          </TabList>
        </Tabs>
        <HStack spacing="8px" position="absolute" right="16px">
          <IconButton size="sm" variant="ghost" color="customGray.600" _hover={{ bg: "customGray.100" }} aria-label="Undo" icon={
            <Box display="flex" alignItems="center" justifyContent="center" w="16px" h="16px">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 8.6665H2V4.6665M2 8.6665L4 6.8665C5.09924 5.88061 6.52341 5.33467 8 5.33317C9.5913 5.33317 11.1174 5.96531 12.2426 7.09053C13.3679 8.21575 14 9.74187 14 11.3332" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Box>
          } />
          <IconButton size="sm" variant="ghost" color="customGray.600" _hover={{ bg: "customGray.100" }} aria-label="Redo" icon={
            <Box display="flex" alignItems="center" justifyContent="center" w="16px" h="16px">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 8.6665H14V4.6665M14 8.6665L12 6.8665C10.9008 5.88061 9.47659 5.33467 8 5.33317C6.4087 5.33317 4.88258 5.96531 3.75736 7.09053C2.63214 8.21575 2 9.74187 2 11.3332" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Box>
          } />
          <Box w="1px" h="16px" bg="customGray.200" />
          <IconButton size="sm" variant="ghost" color="customGray.600" _hover={{ bg: "customGray.100" }} aria-label="Chart" icon={
            <Box display="flex" alignItems="center" justifyContent="center" w="16px" h="16px">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2 2V12.6667C2 13.0203 2.14048 13.3594 2.39052 13.6095C2.64057 13.8595 2.97971 14 3.33333 14H14M12 11.3333V6M8.66667 11.3333V3.33333M5.33333 11.3333V9.33333" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Box>
          } />
          <Button size="sm" px="14px" bg="customGray.800" color="white" _hover={{ bg: "customGray.700" }} leftIcon={
            <Box display="flex" alignItems="center" justifyContent="center" w="16px" h="16px">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M12 2v13M12 2l-4 4m4-4l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Box>
          }>
            Share
          </Button>
        </HStack>
      </Box>
      <Box bg="customGray.100" pl="16px" pr="16px" pb="16px" w="100%" h="100%" />

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
  );
}
