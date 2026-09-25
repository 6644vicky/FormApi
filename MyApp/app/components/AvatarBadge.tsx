"use client";

import {
  Avatar,
  Box,
  Divider,
  HStack,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  SkeletonCircle,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { TruncatedText } from "@/app/components/TruncatedText";
import { supabase } from "@/lib/supabase";

interface AvatarBadgeProps {
  userName?: string;
  userEmail?: string;
  avatarUrl?: string;
  onAccountClick?: () => void;
  onFeedbackClick?: () => void;
  isLoading?: boolean;
}

export default function AvatarBadge({
  userName = "",
  userEmail = "",
  avatarUrl = "",
  onAccountClick,
  onFeedbackClick,
  isLoading = false,
}: AvatarBadgeProps) {
  const router = useRouter();

  if (isLoading) {
    return <SkeletonCircle size="8" />;
  }

  // Falls back to the part of the address before the @, which is what most
  // accounts here have as a display name anyway.
  const displayName = userName || userEmail.split("@")[0] || "Account";

  return (
    <Menu placement="top-start" gutter={12}>
      <MenuButton as="div" p={0} cursor="pointer">
        {avatarUrl ? (
          <Avatar src={avatarUrl} size="sm" _hover={{ opacity: 0.8 }} />
        ) : (
          <Avatar
            name={userEmail ? userEmail.charAt(0).toUpperCase() : "U"}
            bg="brand.primary"
            color="white"
            size="sm"
            _hover={{ bg: "brand.primaryHover" }}
          />
        )}
      </MenuButton>

      <MenuList
        bg="white"
        borderColor="customGray.200"
        minW="260px"
        maxW="300px"
        py="0"
        overflow="hidden"
        borderRadius="12px"
        boxShadow="0 2px 8px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)"
      >
        <HStack spacing="8px" px="16px" py="14px" minW="0">
          <Avatar src={avatarUrl || undefined} name={displayName} size="sm" flexShrink={0} bg="customGray.200" color="customGray.700" />
          {/* Both ellipsise once they run out of room, and only then offer a
              tooltip with the full value. */}
          <VStack align="start" spacing="0px" minW="0" flex="1">
            <TruncatedText w="100%" fontSize="15px" fontWeight="600" color="customGray.800">{displayName}</TruncatedText>
            <TruncatedText w="100%" fontSize="13px" color="customGray.500">{userEmail}</TruncatedText>
          </VStack>
        </HStack>

        <Divider borderColor="customGray.200" />

        <Box py="4px">
          <MenuItem fontSize="14px" onClick={onAccountClick}>My Profile</MenuItem>
          <MenuItem fontSize="14px" onClick={onAccountClick}>Settings</MenuItem>
        </Box>


        <Divider borderColor="customGray.200" />

        <Box py="4px">
          <MenuItem fontSize="14px">Help</MenuItem>
          <MenuItem fontSize="14px" onClick={onFeedbackClick}>Feedback</MenuItem>
        </Box>

        <Divider borderColor="customGray.200" />

        <Box pt="4px" pb="8px">
          <MenuItem fontSize="14px" onClick={() => supabase.auth.signOut().then(() => router.push("/"))}>
            Log Out
          </MenuItem>
        </Box>
      </MenuList>
    </Menu>
  );
}
