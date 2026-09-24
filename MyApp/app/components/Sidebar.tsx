"use client";

import { VStack, Box, Button, Text } from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import AvatarBadge from "@/app/components/AvatarBadge";

interface SidebarProps {
  selectedNav: string;
  onNavClick: (label: string) => void;
  userName?: string;
  userEmail?: string;
  avatarUrl?: string;
  onDelete?: () => void;
  onFeedbackOpen?: () => void;
  onSettingsClick?: () => void;
  isLoading?: boolean;
}

const navItems = [
  { label: "Home", icon: "home" },
  { label: "Messages", icon: "messages" },
  { label: "Agents", icon: "agents" },
  { label: "Settings", icon: "settings" },
  { label: "Help", icon: "help" },
  { label: "Contacts", icon: "contacts" },
];

export default function Sidebar({ selectedNav, onNavClick, userName = "", userEmail = "", avatarUrl = "", onDelete, onFeedbackOpen, onSettingsClick, isLoading = false }: SidebarProps) {
  const router = useRouter();
  // Settings is a page of its own now; a caller can still intercept the click
  // (the builder used to open a username modal here).
  const goToSettings = onSettingsClick ?? (() => router.push("/settings"));

  const renderSvgIcon = (icon: string, strokeColor: string) => {
    if (icon === "contacts") {
      return (
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
          <g clipPath="url(#sidebar-contacts-clip)">
            <path d="M5.10188 18.8641C5.10188 18.8641 6.50619 15.2129 11 15.2129C15.4938 15.2129 16.8981 18.8641 16.8981 18.8641M13.5277 8.75308C13.5277 9.42349 13.2614 10.0664 12.7874 10.5405C12.3133 11.0145 11.6704 11.2808 11 11.2808C10.3296 11.2808 9.68663 11.0145 9.21259 10.5405C8.73854 10.0664 8.47222 9.42349 8.47222 8.75308C8.47222 8.08268 8.73854 7.43974 9.21259 6.96569C9.68663 6.49164 10.3296 6.22533 11 6.22533C11.6704 6.22533 12.3133 6.49164 12.7874 6.96569C13.2614 7.43974 13.5277 8.08268 13.5277 8.75308ZM6.22533 19.145H15.7746C16.6685 19.145 17.5258 18.7899 18.1578 18.1578C18.7899 17.5258 19.145 16.6685 19.145 15.7746V6.22533C19.145 5.33145 18.7899 4.47419 18.1578 3.84213C17.5258 3.21007 16.6685 2.85498 15.7746 2.85498H6.22533C5.33145 2.85498 4.47419 3.21007 3.84213 3.84213C3.21007 4.47419 2.85498 5.33145 2.85498 6.22533V15.7746C2.85498 16.6685 3.21007 17.5258 3.84213 18.1578C4.47419 18.7899 5.33145 19.145 6.22533 19.145Z" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </g>
          <defs>
            <clipPath id="sidebar-contacts-clip">
              <rect width="22" height="22" fill="white"/>
            </clipPath>
          </defs>
        </svg>
      );
    }

    if (icon === "home") {
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M21 12H15.6L13.8 14.7H10.2L8.4 12H3M3 12L6.105 5.79905C6.25402 5.49916 6.48374 5.24678 6.76834 5.0703C7.05294 4.89382 7.38112 4.80023 7.716 4.80005H16.284C16.6189 4.80023 16.9471 4.89382 17.2317 5.0703C17.5163 5.24678 17.746 5.49916 17.895 5.79905L21 12V17.4C21 17.8774 20.8104 18.3353 20.4728 18.6728C20.1352 19.0104 19.6774 19.2 19.2 19.2H4.8C4.32261 19.2 3.86477 19.0104 3.52721 18.6728C3.18964 18.3353 3 17.8774 3 17.4V12Z" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    }

    if (icon === "messages") {
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 2V6M8 2V6M3 9H21M19 4H5C3.895 4 3 4.895 3 6V19C3 20.105 3.895 21 5 21H19C20.105 21 21 20.105 21 19V6C21 4.895 20.105 4 19 4Z" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M12.0132 12.729C11.8752 12.729 11.7632 12.841 11.7642 12.979C11.7642 13.117 11.8762 13.229 12.0142 13.229C12.1522 13.229 12.2642 13.117 12.2642 12.979C12.2642 12.841 12.1522 12.729 12.0132 12.729" stroke={strokeColor} strokeWidth="1.125" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M17.0132 12.729C16.8752 12.729 16.7632 12.841 16.7642 12.979C16.7642 13.117 16.8762 13.229 17.0142 13.229C17.1522 13.229 17.2642 13.117 17.2642 12.979C17.2642 12.841 17.1522 12.729 17.0132 12.729" stroke={strokeColor} strokeWidth="1.125" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M7.01316 16.729C6.87516 16.729 6.76316 16.841 6.76416 16.979C6.76416 17.117 6.87616 17.229 7.01416 17.229C7.15216 17.229 7.26416 17.117 7.26416 16.979C7.26416 16.841 7.15216 16.729 7.01316 16.729" stroke={strokeColor} strokeWidth="1.125" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M12.0132 16.729C11.8752 16.729 11.7632 16.841 11.7642 16.979C11.7642 17.117 11.8762 17.229 12.0142 17.229C12.1522 17.229 12.2642 17.117 12.2642 16.979C12.2642 16.841 12.1522 16.729 12.0132 16.729" stroke={strokeColor} strokeWidth="1.125" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    }

    if (icon === "agents") {
      return (
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
          <g clipPath="url(#sidebar-agents-clip)">
            <path d="M13.7503 4.354C13.7503 6.88531 12.3858 9.1665 9.85449 9.1665C12.3858 9.1665 13.7503 11.4477 13.7503 13.979C13.7503 11.4477 15.1149 9.1665 17.6462 9.1665C15.1149 9.1665 13.7503 6.88531 13.7503 4.354Z" fill={strokeColor} stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M7.33366 11.6875C7.33366 13.2063 5.87327 14.6667 4.35449 14.6667C5.87327 14.6667 7.33366 16.127 7.33366 17.6458C7.33366 16.127 8.79405 14.6667 10.3128 14.6667C8.79405 14.6667 7.33366 13.2063 7.33366 11.6875Z" fill={strokeColor} stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </g>
          <defs>
            <clipPath id="sidebar-agents-clip">
              <rect width="22" height="22" fill="white"/>
            </clipPath>
          </defs>
        </svg>
      );
    }

    if (icon === "settings") {
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20.3255 15.4911C19.7516 16.8486 18.8541 18.0448 17.7113 18.9752C16.5685 19.9056 15.2153 20.5417 13.7699 20.8281C12.3245 21.1144 10.8311 21.0422 9.42004 20.6178C8.00901 20.1934 6.72339 19.4298 5.67559 18.3935C4.62778 17.3573 3.84969 16.0801 3.40933 14.6736C2.96898 13.2671 2.87977 11.7741 3.14951 10.3251C3.41926 8.87611 4.03973 7.51529 4.95669 6.3616C5.87365 5.20791 7.05918 4.29648 8.40963 3.70699M20.136 11.9811C20.634 11.9811 21.0426 11.576 20.993 11.0806C20.785 9.0091 19.8673 7.07323 18.3954 5.60122C16.9235 4.12921 14.988 3.21165 12.9171 3.00409C12.421 2.95446 12.0169 3.36321 12.0169 3.86128V11.0797C12.0169 11.319 12.1119 11.5486 12.2811 11.7178C12.4502 11.887 12.6797 11.982 12.9189 11.982L20.136 11.9811Z" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    }

    if (icon === "help") {
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 7H11M14 17H5M14 17C14 18.6569 15.3431 20 17 20C18.6569 20 20 18.6569 20 17C20 15.3431 18.6569 14 17 14C15.3431 14 14 15.3431 14 17ZM10 7C10 8.65685 8.65685 10 7 10C5.34315 10 4 8.65685 4 7C4 5.34315 5.34315 4 7 4C8.65685 4 10 5.34315 10 7Z" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    }
  };

  return (
    <VStack
      w="64px"
      h="100%"
      bg="appBg"
      spacing={0}
      align="stretch"
      pt="30px"
      px="12px"
      pb="12px"
      overflow="hidden"
    >
      {/* Logo */}
      <Box
        w="36px"
        h="36px"
        bg="brand.primary"
        borderRadius="10px"
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
      <VStack spacing="10px" flex={1}>
        {navItems.map((item) => {
          // Active is a soft dark tint behind the same dark icon, not an
          // inverted tile — the glyph colour doesn't change.
          const strokeColor = "#27272a";

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
                } else if (item.label === "Home") {
                  router.push("/inbox");
                } else if (item.label === "Agents") {
                  router.push("/agents");
                } else if (item.label === "Contacts") {
                  router.push("/contacts");
                } else if (item.label === "Settings") {
                  goToSettings();
                }
              }}
              borderRadius="10px"
              p={0}
            >
              <Box
                w="36px"
                h="36px"
                display="flex"
                alignItems="center"
                justifyContent="center"
                bg={selectedNav === item.label ? "navActive" : "appBg"}
                borderRadius="10px"
                transition="all 0.2s"
                _hover={selectedNav === item.label ? {} : { bg: "customDark.5" }}
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
          bg="appBg"
          borderRadius="10px"
          cursor="pointer"
          _hover={{ bg: "customDark.5" }}
          onClick={onFeedbackOpen}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 7V9M12 13H12.01M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="#27272A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </Box>

        {/* Avatar Badge Component */}
        <AvatarBadge
          userName={userName}
          userEmail={userEmail}
          avatarUrl={avatarUrl}
          onAccountClick={goToSettings}
          onFeedbackClick={onFeedbackOpen}
          isLoading={isLoading}
        />
      </VStack>
    </VStack>
  );
}
