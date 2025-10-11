
import { createConversation } from '@/lib/chat';
import { getUserInfo } from '@/server/user';
import { redirect } from 'next/navigation';

export default async function NewChatPage() {
  // Get the authenticated session
  const user = await getUserInfo()



  if (!user) {
   
    redirect('/signin');
  }

  // Create a new conversation and redirect to it
  const conversationId = await createConversation(user.user.id);
  redirect(`/chat/${conversationId}`);
}