"use client";

import { VStack, Box, Button, Text, Menu, MenuButton, MenuList, MenuItem, Avatar } from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface SidebarProps {
  selectedNav: string;
  onNavClick: (label: string) => void;
  userEmail?: string;
  avatarUrl?: string;
}

const navItems = [
  { label: "Home", icon: "home" },
  { label: "Messages", icon: "messages" },
  { label: "Settings", icon: "settings" },
  { label: "Help", icon: "help" },
];

export default function Sidebar({ selectedNav, onNavClick, userEmail = "", avatarUrl = "" }: SidebarProps) {
  const router = useRouter();

  const renderSvgIcon = (icon: string, strokeColor: string) => {
    if (icon === "home") {
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M21 12H15.6L13.8 14.7H10.2L8.4 12H3M3 12L6.105 5.79905C6.25402 5.49916 6.48374 5.24678 6.76834 5.0703C7.05294 4.89382 7.38112 4.80023 7.716 4.80005H16.284C16.6189 4.80023 16.9471 4.89382 17.2317 5.0703C17.5163 5.24678 17.746 5.49916 17.895 5.79905L21 12V17.4C21 17.8774 20.8104 18.3353 20.4728 18.6728C20.1352 19.0104 19.6774 19.2 19.2 19.2H4.8C4.32261 19.2 3.86477 19.0104 3.52721 18.6728C3.18964 18.3353 3 17.8774 3 17.4V12Z" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    }

    if (icon === "messages") {
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15.6 17.4001L21 12.0001L15.6 6.6001M8.4 6.6001L3 12.0001L8.4 17.4001" stroke={strokeColor} strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    }

    if (icon === "settings") {
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20.3255 15.4911C19.7516 16.8486 18.8541 18.0448 17.7113 18.9752C16.5685 19.9056 15.2153 20.5417 13.7699 20.8281C12.3245 21.1144 10.8311 21.0422 9.42004 20.6178C8.00901 20.1934 6.72339 19.4298 5.67559 18.3935C4.62778 17.3573 3.84969 16.0801 3.40933 14.6736C2.96898 13.2671 2.87977 11.7741 3.14951 10.3251C3.41926 8.87611 4.03973 7.51529 4.95669 6.3616C5.87365 5.20791 7.05918 4.29648 8.40963 3.70699M20.136 11.9811C20.634 11.9811 21.0426 11.576 20.993 11.0806C20.785 9.0091 19.8673 7.07323 18.3954 5.60122C16.9235 4.12921 14.988 3.21165 12.9171 3.00409C12.421 2.95446 12.0169 3.36321 12.0169 3.86128V11.0797C12.0169 11.319 12.1119 11.5486 12.2811 11.7178C12.4502 11.887 12.6797 11.982 12.9189 11.982L20.136 11.9811Z" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    }

    if (icon === "help") {
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 7H11M14 17H5M14 17C14 18.6569 15.3431 20 17 20C18.6569 20 20 18.6569 20 17C20 15.3431 18.6569 14 17 14C15.3431 14 14 15.3431 14 17ZM10 7C10 8.65685 8.65685 10 7 10C5.34315 10 4 8.65685 4 7C4 5.34315 5.34315 4 7 4C8.65685 4 10 5.34315 10 7Z" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    }
  };

  return (
    <VStack
      w="64px"
      h="100%"
      bg="customGray.100"
      borderRight="1px solid"
      borderColor="light.border"
      spacing={0}
      align="stretch"
      p="12px"
      overflow="hidden"
    >
      {/* Logo */}
      <Box
        w="36px"
        h="36px"
        bg="brand.primary"
        borderRadius="base"
        display="flex"
        alignItems="center"
        justifyContent="center"
        mb="xl"
        cursor="pointer"
        onClick={() => router.push("/inbox")}
      >
        <Text fontSize="lg" fontWeight="bold" color="white">W</Text>
      </Box>

      {/* Nav Items */}
      <VStack spacing="16px" flex={1}>
        {navItems.map((item) => {
          const strokeColor = selectedNav === item.label ? "#ffffff" : "#27272a";

          return (
            <Button
              key={item.label}
              variant="unstyled"
              w="36px"
              h="36px"
              display="flex"
              alignItems="center"
              justifyContent="center"
              bg="transparent"
              _hover={{ bg: "transparent" }}
              onClick={() => {
                onNavClick(item.label);
                if (item.label === "Messages") {
                  router.push("/builder");
                }
              }}
              borderRadius="base"
              p={0}
            >
              <Box
                w="36px"
                h="36px"
                display="flex"
                alignItems="center"
                justifyContent="center"
                bg={selectedNav === item.label ? "customGray.800" : "customGray.100"}
                borderRadius="base"
                transition="all 0.2s"
                _hover={selectedNav === item.label ? {} : { bg: "customGray.200" }}
              >
                {renderSvgIcon(item.icon, strokeColor)}
              </Box>
            </Button>
          );
        })}
      </VStack>

      {/* Chat Icon and Account Avatar */}
      <VStack spacing="12px">
        {/* Chat Icon */}
        <Box
          w="36px"
          h="36px"
          display="flex"
          alignItems="center"
          justifyContent="center"
          bg="customGray.100"
          borderRadius="base"
          cursor="pointer"
          _hover={{ bg: "customGray.200" }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 7V9M12 13H12.01M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="#27272A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </Box>

        {/* Account Menu */}
        <Menu>
          <MenuButton as="div" p={0}>
            <Avatar
              src={avatarUrl || undefined}
              name={userEmail ? userEmail.charAt(0).toUpperCase() : "U"}
              bg="brand.primary"
              color="white"
              size="sm"
              cursor="pointer"
              _hover={{ bg: "brand.primaryHover" }}
            />
          </MenuButton>
          <MenuList bg="white" borderColor="light.border">
            <MenuItem onClick={() => supabase.auth.signOut().then(() => router.push("/"))}>
              Sign Out
            </MenuItem>
          </MenuList>
        </Menu>
      </VStack>
    </VStack>
  );
}
