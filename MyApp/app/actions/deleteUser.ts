"use server";

import { createClient } from "@supabase/supabase-js";

export async function deleteUserAccount(userId: string) {
  try {
    // Use the service_role key ONLY on the server
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // calendar_events/workspace_agents/profiles/chatbot_agents all key off
    // this user's id, and (unlike a fresh migration-managed table) the
    // older ones weren't created with an ON DELETE CASCADE foreign key —
    // so admin.deleteUser fails with a foreign-key violation unless their
    // rows are cleared first. Errors here are swallowed per-table (e.g.
    // chatbot_agents may not exist yet) since the goal is just "no rows
    // left to block the user delete" — an already-missing table means
    // there's nothing to clear anyway.
    await Promise.all([
      supabaseAdmin.from("calendar_events").delete().eq("user_id", userId),
      supabaseAdmin.from("workspace_agents").delete().eq("user_id", userId),
      supabaseAdmin.from("chatbot_agents").delete().eq("user_id", userId),
      supabaseAdmin.from("profiles").delete().eq("id", userId),
    ]);

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
