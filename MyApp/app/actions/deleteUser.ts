"use server";

import { createClient } from "@supabase/supabase-js";

export async function deleteUserAccount(userId: string) {
  try {
    // Use the service_role key ONLY on the server
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Delete the user from auth.users
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (error) {
      console.error("Delete user error:", error);
      throw new Error(error.message || "Failed to delete account");
    }

    return { success: true, message: "Account deleted successfully" };
  } catch (error) {
    console.error("Delete account error:", error);
    throw error;
  }
}
