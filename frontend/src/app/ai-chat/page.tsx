'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import api from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import { Send, MessageSquare, AlertCircle, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AiChatPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [conversations, setConversations] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/login');
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      api.getAiConversations().then((d) => setConversations(d.conversations || [])).catch(() => {});
    }
  }, [isAuthenticated]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const userMsg = input.trim();
    setInput('');
    setSending(true);
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }]);

    try {
      const data = await api.aiChat({ message: userMsg, conversationId });
      setConversationId(data.conversationId);
      setMessages((prev) => [...prev, { role: 'assistant', content: data.message.content }]);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'AI-svar misslyckades');
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setSending(false);
    }
  };

  const loadConversation = async (id: number) => {
    try {
      const data = await api.getAiConversation(id);
      setConversationId(id);
      setMessages(data.messages || []);
    } catch {
      toast.error('Kunde inte ladda konversation');
    }
  };

  const newConversation = () => {
    setConversationId(null);
    setMessages([]);
  };

  const deleteConversation = async (id: number) => {
    try {
      await api.deleteAiConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (conversationId === id) newConversation();
      toast.success('Konversation borttagen');
    } catch {
      toast.error('Kunde inte ta bort konversation');
    }
  };

  if (isLoading || !isAuthenticated) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Sidebar />
      <main className="lg:pl-64">
        <div className="flex h-[calc(100vh-4rem)]">
          {/* Conversations sidebar */}
          <div className="w-64 border-r border-slate-200 dark:border-slate-700 p-4 hidden md:block">
            <button onClick={newConversation} className="btn-primary w-full mb-4 text-sm">
              <MessageSquare size={16} className="mr-2" />
              Ny konversation
            </button>
            <div className="space-y-2">
              {conversations.map((c: any) => (
                <div key={c.id} className="flex items-center gap-1">
                  <button onClick={() => loadConversation(c.id)} className={`flex-1 text-left p-2 rounded-lg text-sm transition-colors ${conversationId === c.id ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                    <p className="truncate font-medium">{c.title || 'Ny konversation'}</p>
                    <p className="text-xs text-slate-400">{c.messageCount} meddelanden</p>
                  </button>
                  <button onClick={() => deleteConversation(c.id)} className="p-1 text-slate-400 hover:text-red-500"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          </div>

          {/* Chat area */}
          <div className="flex-1 flex flex-col">
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-20">
                  <MessageSquare size={48} className="mx-auto mb-4 text-slate-300 dark:text-slate-600" />
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">AI-juridisk assistent</h2>
                  <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                    Ställ frågor om dina rättigheter, be om hjälp att tolka myndighetsbeslut, eller be AI att skriva ett överklagande.
                  </p>
                  <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg inline-block">
                    <p className="text-xs text-yellow-700 dark:text-yellow-400">AI kan ha fel. Verifiera alltid med en juridisk expert.</p>
                  </div>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-4 rounded-2xl ${msg.role === 'user' ? 'bg-primary-600 text-white' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700'}`}>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex justify-start">
                  <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-700">
              <div className="flex gap-3 max-w-4xl mx-auto">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  placeholder="Skriv din fråga här..."
                  className="input-field flex-1"
                />
                <button onClick={handleSend} disabled={sending || !input.trim()} className="btn-primary">
                  <Send size={18} />
                </button>
              </div>
              <p className="text-xs text-slate-400 text-center mt-2">AI kan ha fel. Slutligt ansvar ligger hos dig.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}