import { db } from "@/db/drizzle";
import {  conversation } from "@/db/schema";
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