'use client';

import { useState } from 'react';
import PersonaSettings from './_components/PersonaSettings';
import KnowledgeBase from './_components/KnowledgeBase';
import AnalyticsDashboard from './_components/AnalyticsDashboard';
import ConversationManager from './_components/ConversationManager';
import Playground from './_components/Playground';
import LeadsManager from './_components/LeadsManager';
import { Settings, FileText, BarChart as BarChartIcon, MessageCircle, Bot, Users } from 'lucide-react';

export default function DashboardPage() {
    const [activeTab, setActiveTab] = useState<'persona' | 'kb' | 'analytics' | 'chat' | 'playground' | 'leads'>('analytics');
    const [selectedChatUserId, setSelectedChatUserId] = useState<string | null>(null);

    const handleNavigateToChat = (userId: string) => {
        console.log("Navigating to chat for user:", userId);
        setSelectedChatUserId(userId);
        setActiveTab('chat');
    };

    // Reset selected user when leaving chat tab (optional, but good for UX)
    // useEffect(() => {
    //     if (activeTab !== 'chat') setSelectedChatUserId(null); 
    // }, [activeTab]);

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
                <h1 className="text-2xl font-bold text-gray-800">
                    🤖 IG Auto-Responder Control Center
                </h1>
            </header>

            <main className="flex-1 max-w-5xl w-full mx-auto p-6">
                {/* Tabs */}
                <div className="flex space-x-4 mb-8 border-b border-gray-200 overflow-x-auto">
                    <button
                        onClick={() => setActiveTab('analytics')}
                        className={`pb-4 px-4 flex items-center space-x-2 font-medium transition-colors whitespace-nowrap ${activeTab === 'analytics'
                            ? 'border-b-2 border-blue-600 text-blue-600'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <BarChartIcon className="w-4 h-4" />
                        <span>Analytics</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('chat')}
                        className={`pb-4 px-4 flex items-center space-x-2 font-medium transition-colors whitespace-nowrap ${activeTab === 'chat'
                            ? 'border-b-2 border-blue-600 text-blue-600'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <MessageCircle className="w-4 h-4" />
                        <span>Live Chat</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('playground')}
                        className={`pb-4 px-4 flex items-center space-x-2 font-medium transition-colors whitespace-nowrap ${activeTab === 'playground'
                            ? 'border-b-2 border-purple-600 text-purple-600'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <Bot className="w-4 h-4" />
                        <span>Playground</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('leads')}
                        className={`pb-4 px-4 flex items-center space-x-2 font-medium transition-colors whitespace-nowrap ${activeTab === 'leads'
                            ? 'border-b-2 border-green-600 text-green-600'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <Users className="w-4 h-4" />
                        <span>Leads (CRM)</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('persona')}
                        className={`pb-4 px-4 flex items-center space-x-2 font-medium transition-colors whitespace-nowrap ${activeTab === 'persona'
                            ? 'border-b-2 border-blue-600 text-blue-600'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <Settings className="w-4 h-4" />
                        <span>Persona Settings</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('kb')}
                        className={`pb-4 px-4 flex items-center space-x-2 font-medium transition-colors whitespace-nowrap ${activeTab === 'kb'
                            ? 'border-b-2 border-blue-600 text-blue-600'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <FileText className="w-4 h-4" />
                        <span>Knowledge Base</span>
                    </button>
                </div>

                {/* Content */}
                <div className="bg-transparent">
                    {activeTab === 'analytics' && (
                        <AnalyticsDashboard onNavigateToChat={handleNavigateToChat} />
                    )}
                    {activeTab === 'chat' && (
                        <ConversationManager initialUserId={selectedChatUserId} />
                    )}

                    {activeTab === 'playground' && (
                        <div className="max-w-3xl mx-auto">
                            <Playground />
                        </div>
                    )}

                    {activeTab === 'leads' && (
                        <div className="max-w-5xl mx-auto">
                            <LeadsManager />
                        </div>
                    )}

                    {activeTab === 'persona' && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 min-h-[500px] p-6">
                            <PersonaSettings />
                        </div>
                    )}
                    {activeTab === 'kb' && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 min-h-[500px] p-6">
                            <KnowledgeBase />
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
