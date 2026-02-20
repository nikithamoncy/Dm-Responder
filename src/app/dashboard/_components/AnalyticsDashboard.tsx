
'use client';

import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { MessageSquare, Users, Clock, X, User } from 'lucide-react';

interface AnalyticsData {
    totalMessages: number;
    totalUsers: number;
    activeUsers: Array<{
        user_id: string;
        username: string | null;
        user_name: string | null;
        profile_pic: string | null;
    }>;
    messagesLast24h: number;
    activityTimeSeries: Array<{ date: string; count: number }>;
}

export default function AnalyticsDashboard({ onNavigateToChat }: { onNavigateToChat?: (userId: string) => void }) {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [showUsersModal, setShowUsersModal] = useState(false);

    useEffect(() => {
        async function fetchData() {
            try {
                const res = await fetch('/api/analytics');
                const json = await res.json();
                if (res.ok) {
                    setData(json);
                } else {
                    console.error('Failed to fetch analytics:', json.error);
                }
            } catch (error) {
                console.error('Error fetching analytics:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    const handleUserClick = (userId: string) => {
        if (onNavigateToChat) {
            onNavigateToChat(userId);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!data) {
        return <div className="text-red-500">Failed to load analytics data.</div>;
    }

    return (
        <div className="space-y-8 relative">
            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                    title="Total Messages"
                    value={data.totalMessages}
                    icon={<MessageSquare className="w-6 h-6 text-blue-500" />}
                />
                <StatCard
                    title="Active Users"
                    value={data.totalUsers}
                    icon={<Users className="w-6 h-6 text-green-500" />}
                    onClick={() => setShowUsersModal(true)}
                    clickable
                />
                <StatCard
                    title="Msg (Last 24h)"
                    value={data.messagesLast24h}
                    icon={<Clock className="w-6 h-6 text-purple-500" />}
                />
            </div>

            {/* Chart Area */}
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-800 mb-6">Activity (Last 7 Days)</h3>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.activityTimeSeries}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis
                                dataKey="date"
                                tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { weekday: 'short' })}
                                tick={{ fontSize: 12, fill: '#6B7280' }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis
                                tick={{ fontSize: 12, fill: '#6B7280' }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                cursor={{ fill: '#F3F4F6' }}
                            />
                            <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Users Modal */}
            {showUsersModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-xl">
                            <h3 className="font-semibold text-gray-800">Active Users ({data.activeUsers?.length || 0})</h3>
                            <button
                                onClick={() => setShowUsersModal(false)}
                                className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                        <div className="overflow-y-auto p-2 space-y-1">
                            {data.activeUsers && data.activeUsers.length > 0 ? (
                                data.activeUsers.map((user) => (
                                    <div
                                        key={user.user_id}
                                        onClick={() => handleUserClick(user.user_id)}
                                        className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
                                    >
                                        {user.profile_pic ? (
                                            <img
                                                src={user.profile_pic}
                                                alt={user.user_name || 'User'}
                                                className="w-10 h-10 rounded-full object-cover border border-gray-200"
                                            />
                                        ) : (
                                            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                                                <User className="w-5 h-5 text-gray-500" />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-gray-900 truncate">
                                                {user.user_name || 'Instagram User'}
                                            </p>
                                            <p className="text-xs text-gray-500 truncate">
                                                @{user.username || user.user_id}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-8 text-center text-gray-500">No active users found.</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function StatCard({ title, value, icon, onClick, clickable }: { title: string; value: number; icon: React.ReactNode; onClick?: () => void; clickable?: boolean }) {
    return (
        <div
            onClick={onClick}
            className={`bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between ${clickable ? 'cursor-pointer hover:border-blue-300 hover:shadow-md transition-all' : ''}`}
        >
            <div>
                <p className="text-sm font-medium text-gray-500">{title}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
                {icon}
            </div>
        </div>
    );
}
