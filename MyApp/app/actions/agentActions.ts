"use server";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export interface Agent {
  name: string;
  services: string[];
}

export async function getAgents(userId: string): Promise<Agent[]> {
  try {
    const { data, error } = await supabase
      .from("workspace_agents")
      .select("name, services")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching agents:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error fetching agents:", error);
    return [];
  }
}

export async function createAgent(userId: string, agent: Agent): Promise<boolean> {
  try {
    const { error } = await supabase.from("workspace_agents").insert([
      {
        user_id: userId,
        name: agent.name,
        services: agent.services,
      },
    ]);

    if (error) {
      console.error("Error creating agent:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error creating agent:", error);
    return false;
  }
}
