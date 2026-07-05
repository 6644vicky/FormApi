"use client";

import { Avatar, Menu, MenuButton, MenuList, MenuItem, Box } from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface AvatarBadgeProps {
  userEmail?: string;
  avatarUrl?: string;
  onDelete?: () => void;
}

export default function AvatarBadge({ userEmail = "", avatarUrl = "", onDelete }: AvatarBadgeProps) {
  const router = useRouter();

  return (
    <Menu>
      <MenuButton as="div" p={0} cursor="pointer">
        <Avatar
          src={avatarUrl || undefined}
          name={userEmail ? userEmail.charAt(0).toUpperCase() : "U"}
          bg="brand.primary"
          color="white"
          size="sm"
          _hover={{ bg: "brand.primaryHover" }}
        />
      </MenuButton>
      <MenuList bg="white" borderColor="light.border">
        {onDelete && (
          <MenuItem onClick={onDelete} color="red.500">
            Delete Account
          </MenuItem>
        )}
        <MenuItem onClick={() => supabase.auth.signOut().then(() => router.push("/"))}>
          Sign Out
        </MenuItem>
      </MenuList>
    </Menu>
  );
}
