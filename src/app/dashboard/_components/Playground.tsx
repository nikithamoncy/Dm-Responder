'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, RefreshCw, Trash2 } from 'lucide-react';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    metrics?: {
        duration: number;
        contextSnippet?: string;
    };
}

export default function Playground() {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'welcome',
            role: 'assistant',
            content: 'Hello! I am your Instagram Bot simulator. Test me out!'
        }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            const res = await fetch('/api/playground', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMsg.content }),
            });

            if (!res.ok) throw new Error('Failed to get response');

            const data = await res.json();

            const botMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.replyText,
                metrics: {
                    duration: data.duration,
                    contextSnippet: data.relevantContext
                }
            };

            setMessages(prev => [...prev, botMsg]);

        } catch (error) {
            console.error('Playground error:', error);
            const errorMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: '⚠️ Error: Failed to generate response. Check console/logs.'
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setLoading(false);
        }
    };

    const clearHistory = () => {
        setMessages([
            {
                id: 'welcome',
                role: 'assistant',
                content: 'History cleared. Ready for new tests!'
            }
        ]);
    };

    return (
        <div className="flex h-[600px] bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="flex-1 flex flex-col bg-gray-50">
                {/* Header */}
                <div className="p-4 bg-white border-b border-gray-200 flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-purple-100 rounded-full">
                            <Bot className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-800">Bot Playground</h3>
                            <p className="text-xs text-gray-500">Test responses without Instagram</p>
                        </div>
                    </div>
                    <button
                        onClick={clearHistory}
                        className="text-gray-400 hover:text-red-500 p-2 rounded-full hover:bg-gray-100 transition-colors"
                        title="Clear History"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.role === 'assistant' ? 'justify-start' : 'justify-end'}`}>
                            {msg.role === 'assistant' && (
                                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center mr-2 flex-shrink-0">
                                    <Bot className="w-4 h-4 text-purple-600" />
                                </div>
                            )}
                            <div
                                className={`max-w-[80%] p-3 rounded-2xl shadow-sm text-sm ${msg.role === 'assistant'
                                        ? 'bg-white text-gray-800 border border-gray-200 rounded-tl-none'
                                        : 'bg-blue-600 text-white rounded-tr-none'
                                    }`}
                            >
                                <p className="whitespace-pre-wrap">{msg.content}</p>
                                {msg.metrics && (
                                    <div className="mt-2 pt-2 border-t border-gray-100 text-[10px] text-gray-400 flex flex-col gap-1">
                                        <span>⏱️ Generated in {msg.metrics.duration}ms</span>
                                        {msg.metrics.contextSnippet && (
                                            <details className="cursor-pointer">
                                                <summary className="hover:text-purple-500">View RAG Context</summary>
                                                <div className="mt-1 p-2 bg-gray-50 rounded border border-gray-100 font-mono text-[9px] max-h-32 overflow-y-auto">
                                                    {msg.metrics.contextSnippet}
                                                </div>
                                            </details>
                                        )}
                                    </div>
                                )}
                            </div>
                            {msg.role === 'user' && (
                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center ml-2 flex-shrink-0">
                                    <User className="w-4 h-4 text-blue-600" />
                                </div>
                            )}
                        </div>
                    ))}
                    {loading && (
                        <div className="flex justify-start">
                            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center mr-2 flex-shrink-0">
                                <Bot className="w-4 h-4 text-purple-600" />
                            </div>
                            <div className="bg-white border border-gray-200 p-3 rounded-2xl rounded-tl-none shadow-sm flex items-center space-x-1">
                                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 bg-white border-t border-gray-200">
                    <form onSubmit={handleSend} className="flex space-x-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Type a message to test..."
                            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                            disabled={loading}
                        />
                        <button
                            type="submit"
                            disabled={loading || !input.trim()}
                            className="bg-purple-600 text-white p-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
