"use client";
import { useSession } from '@/lib/auth-client';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, UIMessage } from 'ai';
import React, { useState, useRef, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { Bot, User, Send, AlertCircle, Plus, Image as ImageIcon } from 'lucide-react';
import { Streamdown } from 'streamdown';
import { useRouter } from 'next/navigation';

interface ChatProps {
  conversationId: string;
  initialMessages: UIMessage[];
  conversationTitle?: string;
}

const Chat = ({ conversationId, initialMessages = [], conversationTitle = "new conversation" }: ChatProps) => {
  const { data: session } = useSession();
  const router = useRouter();
  const [input, setInput] = useState<string>('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [style, setStyle] = useState<string>('photorealistic'); // example styles
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [showOptions, setShowOptions] = useState<boolean>(false); // small dropdown when clicking plus
  const [insertImageTag, setInsertImageTag] = useState<boolean>(false); // whether to show "Image" tag inside input
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);

  const { messages, sendMessage, status } = useChat({
    id: conversationId,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: '/api/chat',
      prepareSendMessagesRequest({ messages, id }) {
        return {
          body: {
            messages: messages[messages.length - 1],
            id,
          },
        };
      },
    }),
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, generatedImage]);

  // Focus main input when image tag is inserted
  useEffect(() => {
    if (insertImageTag) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [insertImageTag]);

  const handleGenerateImage = async () => {
    const prompt = input.trim();
    if (!prompt) {
      setImageError('Please describe the image.');
      return;
    }

    try {
      setIsGenerating(true);
      setImageError(null);

      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `${prompt} --style:${style}`,
          conversationId,
        }),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => 'Unknown error');
        throw new Error(text || 'Failed to generate image');
      }

      const data = await response.json();
      const url = data?.image?.image_url || data?.image_url || data?.image?.url;
      if (!url) {
        throw new Error('No image URL returned from server');
      }

      // show image in chat
      setGeneratedImage(url);

      // clear input and state
      setInput('');
      setInsertImageTag(false);
      setShowOptions(false);
      setImageError(null);

    } catch (err: any) {
      console.error('generate image error', err);
      setImageError(err?.message || 'Image generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="bg-white border-b border-rose-100 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Avatar className="h-9 w-9">
              <AvatarImage src={session?.user.image || ''} />
              <AvatarFallback className="bg-rose-500 text-white font-medium">
                {session?.user.name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                {conversationTitle || 'AI Chat'}
              </h1>
              <p className="text-sm text-rose-500">Chat with AI Assistant</p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard')}
            className="border-rose-200 text-rose-600 hover:bg-rose-50"
          >
            Back to Dashboard
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.length === 0 && (
            <div className="text-center py-20">
              <div className="w-16 h-16 mx-auto mb-6 bg-rose-100 rounded-full flex items-center justify-center">
                <Bot className="h-8 w-8 text-rose-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Start a conversation
              </h3>
              <p className="text-gray-500">
                Ask me anything! I'm here to help.
              </p>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`flex items-start space-x-3 max-w-2xl ${
                  message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                }`}
              >
                <Avatar className="h-7 w-7 flex-shrink-0">
                  {message.role === 'user' ? (
                    <>
                      <AvatarImage src={session?.user.image || ''} />
                      <AvatarFallback className="bg-rose-500 text-white text-xs">
                        <User className="h-3 w-3" />
                      </AvatarFallback>
                    </>
                  ) : (
                    <AvatarFallback className="bg-rose-100">
                      <Bot className="h-3 w-3 text-rose-500" />
                    </AvatarFallback>
                  )}
                </Avatar>

                <div
                  className={`rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-rose-500 text-white'
                      : 'bg-gray-50 text-gray-900 border border-gray-100'
                  }`}
                >
                  <div className="text-sm leading-relaxed">
                    {message.parts.map((part, i) => {
                      if (part.type === 'text') {
                        return message.role === 'assistant' ? (
                          <Streamdown
                            key={i}
                            className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900 prose-code:text-rose-600 prose-code:bg-rose-50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-gray-100 prose-pre:border prose-pre:border-gray-200"
                            parseIncompleteMarkdown={true}
                          >
                            {part.text}
                          </Streamdown>
                        ) : (
                          <span key={i} className="whitespace-pre-wrap">
                            {part.text}
                          </span>
                        );
                      }
                      return null;
                    })}

                    {/* Show generated image URL as text (for debugging) */}
                    {message.role === 'assistant' && generatedImage && (
                      <div className="text-xs text-gray-500 mt-2">
                        <span className="font-medium">Image URL:</span> {generatedImage}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Generated image preview */}
          {generatedImage && (
            <div className="flex justify-start">
              <div className="flex items-start space-x-3 max-w-2xl">
                <Avatar className="h-7 w-7 flex-shrink-0">
                  <AvatarFallback className="bg-rose-100">
                    <Bot className="h-3 w-3 text-rose-500" />
                  </AvatarFallback>
                </Avatar>
                <div className="rounded-2xl px-4 py-3 bg-gray-50 border border-gray-100">
                  <img src={generatedImage} alt="Generated" className="rounded-lg max-w-full" />
                </div>
              </div>
            </div>
          )}

          {imageError && (
            <div className="flex justify-start">
              <div className="flex items-start space-x-3 max-w-2xl">
                <Avatar className="h-7 w-7 flex-shrink-0">
                  <AvatarFallback className="bg-red-100">
                    <AlertCircle className="h-3 w-3 text-red-500" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
                  <p className="text-red-800 font-medium text-sm">Image Generation Error</p>
                  <p className="text-red-600 text-xs">{imageError}</p>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area (composer panel removed) */}
      <div className="bg-white border-t border-rose-100 p-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            // if image tag inserted, Enter should NOT send normal chat; user must click Generate.
            if (input.trim() && status === 'ready' && !insertImageTag) {
              sendMessage({ text: input });
              setInput('');
            }
          }}
          className="max-w-4xl mx-auto relative"
        >
          <div className="flex items-center space-x-3 relative">
            {/* Image chip shown when generating */}
            {insertImageTag && (
              <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-100 border text-sm text-neutral-800">
                <ImageIcon className="h-4 w-4 text-neutral-700" />
                <span>Image</span>
                <span className="ml-1 text-xs text-neutral-500">•</span>
              </span>
            )}

            <input
              ref={inputRef}
              className={`flex-1 p-3 border ${insertImageTag ? 'border-rose-500' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-colors`}
              value={input}
              placeholder={insertImageTag ? "Describe an image or type a message..." : "Type your message..."}
              onChange={(e) => setInput(e.target.value)}
              disabled={status !== 'ready'}
              aria-label="Type your message"
            />

            {/* small inline controls when image mode active (white UI) */}
            {insertImageTag && (
              <div className="flex items-center gap-2 ml-2">
                <select
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  className="text-sm rounded px-2 py-1 border bg-white"
                >
                  <option value="photorealistic">Photorealistic</option>
                  <option value="illustration">Illustration</option>
                  <option value="anime">Anime</option>
                  <option value="minimal">Minimal</option>
                </select>
                <button
                  type="button"
                  onClick={() => { setInsertImageTag(false); setImageError(null); }}
                  className="px-3 py-1 rounded-md text-sm border bg-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleGenerateImage}
                  disabled={isGenerating}
                  className="px-3 py-1 rounded-md bg-rose-500 hover:bg-rose-600 text-white text-sm disabled:opacity-60"
                >
                  {isGenerating ? 'Generating...' : 'Generate'}
                </button>
              </div>
            )}

            {/* composer toggle button (plus) */}
            <div className="relative">
              <Button
                type="button"
                onClick={() => {
                  // toggle small options menu
                  setShowOptions((s) => !s);
                }}
                className="px-4 bg-gray-800 text-white hover:bg-gray-900 rounded-xl flex items-center gap-2"
                aria-label="Options"
              >
                <Plus className="h-4 w-4" />
              </Button>

              {/* small dropdown with "Generate Image" option */}
              {showOptions && (
                <div className="absolute right-0 mt-2 w-44 bg-white text-neutral-900 rounded-lg shadow-lg border border-gray-200 z-40">
                  <button
                    type="button"
                    onClick={() => {
                      setShowOptions(false);
                      setInsertImageTag(true);
                      setTimeout(() => inputRef.current?.focus(), 50);
                    }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
                  >
                    <ImageIcon className="h-4 w-4 text-neutral-700" />
                    Generate Image
                  </button>
                </div>
              )}
            </div>

            <Button
              type="submit"
              disabled={status !== 'ready' || !input.trim() || insertImageTag}
              className="px-4 bg-rose-500 hover:bg-rose-600 text-white rounded-xl"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Chat;