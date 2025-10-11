
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Chat from '@/components/chat';
import { headers } from 'next/headers';
import { getUserInfo } from '@/server/user';
import { getConversation, loadChat } from '@/lib/chat';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ChatPage({ params }: PageProps) {
  const { id } = await params;
  
  // Get the authenticated session
  const user =  await getUserInfo()

  if (!user) {
    redirect('/login');
  }

  // Validate conversation ownership
  const conversation = await getConversation(id, user.user.id);
  if (!conversation) {
    redirect('/chat');
  }

  // Load messages for this conversation (Vercel guide pattern)
  const initialMessages = await loadChat(id);

  return (
    <Chat 
      conversationId={id} 
      initialMessages={initialMessages}
      conversationTitle={conversation.title}
    />
  );
}