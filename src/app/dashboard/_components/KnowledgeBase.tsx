'use client';

import { useEffect, useState, useRef } from 'react';
import { Upload, FileText, Trash2 } from 'lucide-react';

type KBItem = {
    id: string;
    filename: string;
    created_at: string;
};

export default function KnowledgeBase() {
    const [files, setFiles] = useState<KBItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchFiles = async () => {
        try {
            const res = await fetch('/api/upload');
            const data = await res.json();
            if (data.files) setFiles(data.files);
        } catch (err) {
            console.error('Error fetching files', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFiles();
    }, []);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return;

        setUploading(true);
        const file = e.target.files[0];
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            const text = await res.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch (e) {
                // If not JSON, it's likely an error page (500/504)
                console.error("[Upload Error] Raw response:", text);
                throw new Error(`Server returned (Status ${res.status}): ${text.slice(0, 200)}...`);
            }

            if (!res.ok) {
                throw new Error(data.error || 'Upload failed');
            }

            // Refresh list
            await fetchFiles();
            // Clear input
            if (fileInputRef.current) fileInputRef.current.value = '';

        } catch (err: any) {
            console.error(err);
            alert(`Error: ${err.message}`);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-1">Knowledge Base</h2>
                <p className="text-sm text-gray-500">
                    Upload PDF or Text documents to train the AI. It will retrieve relevant information from these files.
                </p>
            </div>

            {/* Upload Area */}
            <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900">Upload a Knowledge Document</h3>
                <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                    Drag and drop or click to upload. Supports .txt and .pdf files.
                </p>

                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleUpload}
                    accept=".txt,.pdf"
                    className="hidden"
                    id="file-upload"
                />
                <label
                    htmlFor="file-upload"
                    className={`inline-flex items-center justify-center px-6 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 cursor-pointer ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
                >
                    {uploading ? 'Processing & Embedding...' : 'Select File'}
                </label>
            </div>

            {/* File List */}
            <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    Existing Documents ({files.length})
                </h3>

                {loading ? (
                    <div className="text-sm text-gray-400">Loading...</div>
                ) : files.length === 0 ? (
                    <div className="text-sm text-gray-400 italic">No documents uploaded yet.</div>
                ) : (
                    <div className="bg-white border rounded-lg divide-y divide-gray-100 overflow-hidden">
                        {files.map((file) => (
                            <div key={file.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                                <div className="flex items-center space-x-3">
                                    <div className="p-2 bg-blue-50 rounded text-blue-600">
                                        <FileText className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">{file.filename}</p>
                                        <p className="text-xs text-gray-500">
                                            Uploaded: {new Date(file.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                {/* 
                         NOTE: Deletion not implemented in API yet, so just UI placeholder or omitted.
                         Ideally we would add a DELETE endpoint. 
                        */}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
