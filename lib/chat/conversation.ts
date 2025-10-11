import { db } from "@/db/drizzle";
import {  conversation, message } from "@/db/schema";
import { UIMessage } from "ai";
import { desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";

export const createConversation = async (userId: string, title?: string) => {
    const conversationId = nanoid();
  await db.insert(conversation).values({
    id: conversationId,
    userId,
    title: title || "New Conversation",
  })
  return conversationId;
};

export async function getUserConversations(userId: string) {
  return await db
    .select()
    .from(conversation)
    .where(eq(conversation.userId, userId))
    .orderBy(desc(conversation.updatedAt));
}

export async function getConversation(conversationId: string, userId: string) {
  const result = await db
    .select()
    .from(conversation)
    .where(eq(conversation.id, conversationId))
    .limit(1);

  const conv = result[0];
  if (!conv || conv.userId !== userId) {
    return null;
  }

  return conv;
}

export async function loadChat(conversationId: string): Promise<UIMessage[]> {
  const messages = await db
    .select()
    .from(message)
    .where(eq(message.conversationId, conversationId))
    .orderBy(message.createdAt);

  return messages.map(msg => ({
    id: msg.id,
    role: msg.role as 'user' | 'assistant',
    parts: [{ type: 'text' as const, text: msg.content }],
  }));
}