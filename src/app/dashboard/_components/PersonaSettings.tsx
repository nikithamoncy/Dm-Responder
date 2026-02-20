'use client';

import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';

export default function PersonaSettings() {
    const [prompt, setPrompt] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Fetch initial settings
    useEffect(() => {
        async function fetchSettings() {
            try {
                const res = await fetch('/api/settings');
                const data = await res.json();
                if (data.system_prompt) {
                    setPrompt(data.system_prompt);
                }
            } catch (err) {
                console.error('Failed to fetch settings', err);
                setMessage({ type: 'error', text: 'Failed to load settings.' });
            } finally {
                setLoading(false);
            }
        }
        fetchSettings();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);
        try {
            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ system_prompt: prompt }),
            });

            if (!res.ok) throw new Error('Failed to save');

            setMessage({ type: 'success', text: 'System prompt saved successfully!' });
        } catch (err) {
            setMessage({ type: 'error', text: 'Error saving settings.' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading settings...</div>;

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-1">System Instructions</h2>
                <p className="text-sm text-gray-500">
                    Define the persona and behavior of your AI agent. This prompt will be prefixed to every conversation.
                </p>
            </div>

            <div className="relative">
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="w-full h-[500px] p-4 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm leading-relaxed resize-none"
                    placeholder="You are the Iron Haven Gym Assistant..."
                />
            </div>

            <div className="flex items-center justify-between">
                <div className="text-sm">
                    {message && (
                        <span className={message.type === 'success' ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                            {message.text}
                        </span>
                    )}
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                    <Save className="w-4 h-4" />
                    <span>{saving ? 'Saving...' : 'Save Settings'}</span>
                </button>
            </div>
        </div>
    );
}
