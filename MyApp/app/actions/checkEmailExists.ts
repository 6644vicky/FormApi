"use server";

import { createClient } from "@supabase/supabase-js";

export async function checkEmailExists(email: string): Promise<boolean> {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { data } = await supabaseAdmin.auth.admin.listUsers();
    const userExists = data?.users?.some((u) => u.email === email);
    return !!userExists;
  } catch (error) {
    console.error("Error checking email:", error);
    return false;
  }
}
