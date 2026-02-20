
'use client';

import { useState, useEffect, useRef } from 'react';
import { MessageSquare, User, Send, PauseCircle, PlayCircle, RefreshCw } from 'lucide-react';

interface ConversationState {
    user_id: string;
    is_paused: boolean;
    last_message_at: string;
    user_name?: string;
    username?: string;
    profile_pic?: string;
    analysis?: {
        sentiment: 'Positive' | 'Neutral' | 'Negative';
        topics: string[];
        summary: string;
        score: number;
    };
}

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    created_at: string;
}

export default function ConversationManager({ initialUserId }: { initialUserId?: string | null }) {
    const [conversations, setConversations] = useState<ConversationState[]>([]);
    const [selectedUser, setSelectedUser] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [msgLoading, setMsgLoading] = useState(false);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);


    // State for silent updates
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const lastConversationsRef = useRef<string>('');
    const lastMessagesRef = useRef<string>('');

    // Fetch conversations list
    const fetchConversations = async () => {
        try {
            const res = await fetch('/api/conversations');
            if (res.ok) {
                const data = await res.json();
                const conversationsData = data.conversations || [];

                // Only update if data changed (to prevent UI flicker/scroll issues)
                const currentDataString = JSON.stringify(conversationsData);
                if (currentDataString !== lastConversationsRef.current) {
                    setConversations(conversationsData);
                    lastConversationsRef.current = currentDataString;
                }
            }
        } catch (error) {
            console.error('Failed to fetch conversations', error);
        } finally {
            setLoading(false);
        }
    };

    // Fetch messages for selected user
    const fetchMessages = async (userId: string, silent = false) => {
        if (!silent) setMsgLoading(true);
        try {
            const res = await fetch(`/api/conversations/${userId}`);
            if (res.ok) {
                const data = await res.json();
                const messagesData = data.messages || [];

                // Only update if data changed
                const currentDataString = JSON.stringify(messagesData);
                if (currentDataString !== lastMessagesRef.current) {
                    setMessages(messagesData);
                    lastMessagesRef.current = currentDataString;
                }
            }
        } catch (error) {
            console.error('Failed to fetch messages', error);
        } finally {
            if (!silent) setMsgLoading(false);
        }
    };

    // Effect: Initial load + Poll conversations
    useEffect(() => {
        fetchConversations();
        const interval = setInterval(fetchConversations, 5000);
        return () => clearInterval(interval);
    }, []);

    // Effect: Poll messages when user selected
    useEffect(() => {
        if (!selectedUser) {
            setMessages([]);
            return;
        }

        // Reset last data ref on user switch to ensure fresh load
        lastMessagesRef.current = '';

        fetchMessages(selectedUser, false);
        const interval = setInterval(() => fetchMessages(selectedUser, true), 3000);
        return () => clearInterval(interval);
    }, [selectedUser]);

    // Handle initial user selection (from parent navigation)
    useEffect(() => {
        if (initialUserId && initialUserId !== selectedUser) {
            console.log("Setting initial user:", initialUserId);
            setSelectedUser(initialUserId);
        }
    }, [initialUserId]);

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);




    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedUser) return;

        setSending(true);
        try {
            const res = await fetch(`/api/conversations/${selectedUser}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'send_message', message: newMessage }),
            });

            if (res.ok) {
                setNewMessage('');
                // Optimistic update or wait for poll
                // For now, let's just wait for next poll or trigger manual fetch
                const updatedMsgs = await fetch(`/api/conversations/${selectedUser}`).then(r => r.json());
                setMessages(updatedMsgs.messages || []);
            }
        } catch (error) {
            console.error('Failed to send', error);
        } finally {
            setSending(false);
        }
    };

    const togglePause = async (currentState: boolean) => {
        if (!selectedUser) return;
        try {
            const res = await fetch(`/api/conversations/${selectedUser}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'toggle_pause', is_paused: !currentState }),
            });

            if (res.ok) {
                // Update local state
                setConversations(prev => prev.map(c =>
                    c.user_id === selectedUser ? { ...c, is_paused: !currentState } : c
                ));
            }
        } catch (error) {
            console.error('Failed to toggle pause', error);
            alert('Failed to update bot status');
        }
    };


    const selectedConversation = conversations.find(c => c.user_id === selectedUser);

    return (
        <div className="flex h-[600px] bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Sidebar */}
            <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
                <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="font-semibold text-gray-800">Conversations</h2>
                    <button
                        onClick={() => fetchConversations()}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        title="Refresh list"
                    >
                        <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {conversations.length === 0 ? (
                        <div className="p-8 text-center text-gray-400 text-sm">
                            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-20" />
                            No conversations yet
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {conversations.map((conv) => (
                                <div
                                    key={conv.user_id}
                                    onClick={() => setSelectedUser(conv.user_id)}
                                    className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${selectedUser === conv.user_id ? 'bg-blue-50 hover:bg-blue-50' : ''
                                        }`}
                                >
                                    <div className="flex items-center space-x-3">
                                        <div className="relative">
                                            {conv.profile_pic ? (
                                                <img
                                                    src={conv.profile_pic}
                                                    alt={conv.user_name || 'User'}
                                                    className="w-10 h-10 rounded-full object-cover border border-gray-200"
                                                />
                                            ) : (
                                                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                                                    <User className="w-5 h-5 text-gray-500" />
                                                </div>
                                            )}
                                            {conv.is_paused && (
                                                <div className="absolute -bottom-1 -right-1 bg-yellow-400 rounded-full p-0.5 border-2 border-white">
                                                    <PauseCircle className="w-3 h-3 text-white" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-baseline mb-1">
                                                <h3 className={`font-medium truncate ${selectedUser === conv.user_id ? 'text-blue-900' : 'text-gray-900'}`}>
                                                    {conv.user_name || conv.username || 'Instagram User'}
                                                </h3>
                                                {conv.last_message_at && (
                                                    <span className="text-xs text-gray-400 flex-shrink-0 ml-2" suppressHydrationWarning>
                                                        {new Date(conv.last_message_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-500 truncate">
                                                @{conv.username || conv.user_id}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Chat Window */}
            <div className="flex-1 flex flex-col bg-gray-50">
                {selectedUser && selectedConversation ? (
                    <>
                        {/* Header */}
                        <div className="p-4 bg-white border-b border-gray-200 shadow-sm z-10">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center space-x-3">
                                    {selectedConversation.profile_pic ? (
                                        <img
                                            src={selectedConversation.profile_pic}
                                            alt={selectedConversation.user_name || 'User'}
                                            className="w-10 h-10 rounded-full object-cover border border-gray-200"
                                        />
                                    ) : (
                                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                                            <User className="w-6 h-6 text-gray-600" />
                                        </div>
                                    )}
                                    <div>
                                        <h3 className="font-bold text-gray-800">
                                            {selectedConversation.user_name || selectedConversation.username || `User ${selectedUser}`}
                                        </h3>
                                        <div className="flex items-center space-x-2 text-xs">
                                            <span className={`w-2 h-2 rounded-full ${selectedConversation.is_paused ? 'bg-yellow-500' : 'bg-green-500'}`}></span>
                                            <span className="text-gray-500">
                                                {selectedConversation.is_paused ? 'Bot Paused' : 'Bot Active'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center space-x-2">


                                    <button
                                        onClick={() => togglePause(selectedConversation.is_paused)}
                                        className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${selectedConversation.is_paused
                                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                            : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                                            }`}
                                    >
                                        {selectedConversation.is_paused ? (
                                            <>
                                                <PlayCircle className="w-4 h-4" />
                                                <span>Resume</span>
                                            </>
                                        ) : (
                                            <>
                                                <PauseCircle className="w-4 h-4" />
                                                <span>Pause</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>


                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {msgLoading ? (
                                <div className="flex justify-center p-4">
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="text-center text-gray-400 mt-10">
                                    <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                    <p>No messages yet.</p>
                                </div>
                            ) : (
                                messages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={`flex ${msg.role === 'assistant' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div
                                            className={`max-w-[70%] p-3 rounded-2xl shadow-sm text-sm ${msg.role === 'assistant'
                                                ? 'bg-blue-600 text-white rounded-br-none'
                                                : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'
                                                }`}
                                        >
                                            <p>{msg.content}</p>
                                            <p suppressHydrationWarning className={`text-[10px] mt-1 text-right ${msg.role === 'assistant' ? 'text-blue-200' : 'text-gray-400'}`}>
                                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-4 bg-white border-t border-gray-200">
                            <form onSubmit={handleSendMessage} className="flex space-x-2">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Type a message..."
                                    className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                />
                                <button
                                    type="submit"
                                    disabled={sending || !newMessage.trim()}
                                    className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                >
                                    <Send className="w-5 h-5" />
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50">
                        <MessageSquare className="w-16 h-16 mb-4 opacity-20" />
                        <p className="text-lg">Select a conversation to start chatting</p>
                    </div>
                )}
            </div>
        </div>
    );
}
