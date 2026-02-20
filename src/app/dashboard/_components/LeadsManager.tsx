'use client';

import { useState, useEffect } from 'react';
// import { supabase } from '@/lib/supabase';
import { Mail, Phone, ExternalLink, Download, User } from 'lucide-react';

interface Lead {
    id: string;
    user_id: string;
    email: string | null;
    phone: string | null;
    status: 'new' | 'contacted' | 'qualified' | 'lost';
    source_message: string;
    created_at: string;
    // Joined fields
    conversation_states?: {
        user_name: string | null;
        username: string | null;
        profile_pic: string | null;
    };
}

export default function LeadsManager() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLeads();
    }, []);

    const fetchLeads = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/leads');
            const data = await res.json();

            if (data.error) throw new Error(data.error);
            setLeads(data.leads || []);
        } catch (error) {
            console.error('Error fetching leads:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (id: string, newStatus: string) => {
        try {
            const res = await fetch('/api/leads', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status: newStatus }),
            });

            const data = await res.json();
            if (data.error) throw new Error(data.error);

            setLeads(leads.map(lead =>
                lead.id === id ? { ...lead, status: newStatus as any } : lead
            ));
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    const exportToCSV = () => {
        const headers = ['Name', 'Username', 'Email', 'Phone', 'Status', 'Message', 'Date'];
        const rows = leads.map(lead => [
            lead.conversation_states?.user_name || 'N/A',
            lead.conversation_states?.username || 'N/A',
            lead.email || '',
            lead.phone || '',
            lead.status,
            (lead.source_message || '').replace(/[\n\r]+/g, ' '),
            new Date(lead.created_at).toLocaleDateString()
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'instagram_leads.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'new': return 'bg-blue-100 text-blue-800';
            case 'contacted': return 'bg-yellow-100 text-yellow-800';
            case 'qualified': return 'bg-green-100 text-green-800';
            case 'lost': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[600px] flex flex-col">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">Leads & Contacts</h2>
                    <p className="text-sm text-gray-500">Auto-extracted from conversations</p>
                </div>
                <button
                    onClick={exportToCSV}
                    className="flex items-center space-x-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                >
                    <Download className="w-4 h-4" />
                    <span>Export CSV</span>
                </button>
            </div>

            <div className="overflow-x-auto flex-1">
                <table className="w-full text-left text-sm text-gray-600">
                    <thead className="bg-gray-100 text-gray-700 font-medium">
                        <tr>
                            <th className="px-6 py-4">User</th>
                            <th className="px-6 py-4">Contact Info</th>
                            <th className="px-6 py-4">Source Message</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Date</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-gray-400">Loading leads...</td>
                            </tr>
                        ) : leads.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-gray-400">No leads found yet.</td>
                            </tr>
                        ) : (
                            leads.map((lead) => (
                                <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center space-x-3">
                                            {lead.conversation_states?.profile_pic ? (
                                                <img
                                                    src={lead.conversation_states.profile_pic}
                                                    alt="User"
                                                    className="w-8 h-8 rounded-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                                                    <User className="w-4 h-4 text-gray-500" />
                                                </div>
                                            )}
                                            <div>
                                                <p className="font-medium text-gray-900">
                                                    {lead.conversation_states?.user_name || 'Instagram User'}
                                                </p>
                                                <p className="text-xs text-gray-400">
                                                    @{lead.conversation_states?.username || lead.user_id}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="space-y-1">
                                            {lead.email && (
                                                <div className="flex items-center space-x-2 text-gray-700">
                                                    <Mail className="w-3 h-3 text-gray-400" />
                                                    <span>{lead.email}</span>
                                                </div>
                                            )}
                                            {lead.phone && (
                                                <div className="flex items-center space-x-2 text-gray-700">
                                                    <Phone className="w-3 h-3 text-gray-400" />
                                                    <span>{lead.phone}</span>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 max-w-xs truncate" title={lead.source_message}>
                                        "{lead.source_message}"
                                    </td>
                                    <td className="px-6 py-4">
                                        <select
                                            value={lead.status}
                                            onChange={(e) => updateStatus(lead.id, e.target.value)}
                                            className={`px-2 py-1 rounded-full text-xs font-medium border-none focus:ring-2 focus:ring-blue-500 cursor-pointer ${getStatusColor(lead.status)}`}
                                        >
                                            <option value="new">New</option>
                                            <option value="contacted">Contacted</option>
                                            <option value="qualified">Qualified</option>
                                            <option value="lost">Lost</option>
                                        </select>
                                    </td>
                                    <td className="px-6 py-4 text-gray-400 text-xs" suppressHydrationWarning>
                                        {new Date(lead.created_at).toLocaleDateString()}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
