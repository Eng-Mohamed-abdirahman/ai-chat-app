import { db } from "@/db/drizzle";
import { conversation, message } from "@/db/schema";
import { UIMessage } from "ai";
import { eq } from "drizzle-orm";

export async function saveChat({ chatId, messages }: { chatId: string; messages: UIMessage[] }): Promise<void> {
  console.log('saveChat called with:', { chatId, messagesCount: messages.length });
  
  // Get the conversation to get userId
  const conv = await db
    .select({ userId: conversation.userId })
    .from(conversation)
    .where(eq(conversation.id, chatId))
    .limit(1);

  if (conv.length === 0) {
    throw new Error('Conversation not found');
  }

  // Get existing messages to avoid duplicates
  const existingMessages = await db
    .select({ id: message.id })
    .from(message)
    .where(eq(message.conversationId, chatId));

  const existingIds = new Set(existingMessages.map(m => m.id));
  console.log('Existing message IDs:', Array.from(existingIds));

  // Insert only new messages
  const newMessages = messages.filter(msg => !existingIds.has(msg.id));
  console.log('New messages to save:', newMessages.length);
  console.log('New messages details:', newMessages.map(msg => {
    const textPart = msg.parts.find(part => part.type === 'text');
    return { id: msg.id, role: msg.role, content: textPart?.text || '' };
  }));
  
  if (newMessages.length > 0) {
    const messageData = newMessages.map(msg => {
      // Find the text part in the message (not just the first part)
      const textPart = msg.parts.find(part => part.type === 'text');
      const content = textPart?.text || '';
      
      return {
        id: msg.id,
        content,
        role: msg.role,
        conversationId: chatId,
        userId: conv[0].userId,
      };
    });

    console.log('Inserting message data:', messageData);
    await db.insert(message).values(messageData);
    console.log('Messages inserted successfully');
  } else {
    console.log('No new messages to insert');
  }

  // Update conversation timestamp
  await db
    .update(conversation)
    .set({ updatedAt: new Date() })
    .where(eq(conversation.id, chatId));
}