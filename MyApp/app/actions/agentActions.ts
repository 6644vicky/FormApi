"use server";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export interface Agent {
  name: string;
  services: string[];
  website?: string;
}

export async function getAgents(userId: string): Promise<Agent[]> {
  try {
    const { data, error } = await supabase
      .from("workspace_agents")
      .select("name, services, website")
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
        website: agent.website || null,
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

export async function deleteAgent(userId: string, agentName: string): Promise<boolean> {
  try {
    // Workspaces are matched by name text, not a stable id, so calendar
    // events/chatbot agents left scoped to this workspace_name would
    // silently reattach themselves to any future workspace created with
    // the same name (e.g. duplicating always names the copy "X (Copy)") —
    // clear them out here so a deleted workspace actually stays empty.
    await Promise.all([
      supabase.from("calendar_events").delete().eq("user_id", userId).eq("workspace_name", agentName),
      supabase.from("chatbot_agents").delete().eq("user_id", userId).eq("workspace_name", agentName),
    ]);

    const { error } = await supabase
      .from("workspace_agents")
      .delete()
      .eq("user_id", userId)
      .eq("name", agentName);

    if (error) {
      console.error("Error deleting agent:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error deleting agent:", error);
    return false;
  }
}
