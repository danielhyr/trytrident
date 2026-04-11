/**
 * Chat API — business logic functions.
 *
 * Pure functions taking (admin, ...) — no cookies, no Next.js coupling.
 * Called by API routes.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export interface Conversation {
  id: string;
  tenant_id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  tool_invocations: unknown[] | null;
  created_at: string;
}

export async function createConversation(
  admin: SupabaseClient,
  tenantId: string,
  userId: string,
  title?: string
): Promise<Conversation> {
  const { data, error } = await admin
    .from("chat_conversation")
    .insert({
      tenant_id: tenantId,
      user_id: userId,
      title: title ?? "New Chat",
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create conversation: ${error.message}`);
  return data as Conversation;
}

export async function listConversations(
  admin: SupabaseClient,
  tenantId: string,
  userId: string,
  limit: number = 20
): Promise<Conversation[]> {
  const { data, error } = await admin
    .from("chat_conversation")
    .select()
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error)
    throw new Error(`Failed to list conversations: ${error.message}`);
  return (data ?? []) as Conversation[];
}

export async function getConversation(
  admin: SupabaseClient,
  conversationId: string
): Promise<Conversation> {
  const { data, error } = await admin
    .from("chat_conversation")
    .select()
    .eq("id", conversationId)
    .single();

  if (error) throw new Error(`Conversation not found: ${error.message}`);
  return data as Conversation;
}

export async function getMessages(
  admin: SupabaseClient,
  conversationId: string
): Promise<ChatMessage[]> {
  const { data, error } = await admin
    .from("chat_message")
    .select()
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Failed to get messages: ${error.message}`);
  return (data ?? []) as ChatMessage[];
}

export async function saveMessage(
  admin: SupabaseClient,
  conversationId: string,
  role: "user" | "assistant" | "system" | "tool",
  content: string,
  toolInvocations?: unknown[]
): Promise<ChatMessage> {
  const { data, error } = await admin
    .from("chat_message")
    .insert({
      conversation_id: conversationId,
      role,
      content,
      tool_invocations: toolInvocations ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to save message: ${error.message}`);

  // Touch conversation updated_at
  await admin
    .from("chat_conversation")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);

  return data as ChatMessage;
}

export async function updateConversationTitle(
  admin: SupabaseClient,
  conversationId: string,
  title: string
): Promise<void> {
  const { error } = await admin
    .from("chat_conversation")
    .update({ title })
    .eq("id", conversationId);

  if (error)
    throw new Error(`Failed to update conversation title: ${error.message}`);
}

export async function deleteConversation(
  admin: SupabaseClient,
  conversationId: string
): Promise<void> {
  const { error } = await admin
    .from("chat_conversation")
    .delete()
    .eq("id", conversationId);

  if (error)
    throw new Error(`Failed to delete conversation: ${error.message}`);
}
