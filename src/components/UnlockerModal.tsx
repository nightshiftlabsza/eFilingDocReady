import React, { useState } from 'react';
import { Lock, Unlock } from 'lucide-react';

interface UnlockerModalProps {
    onUnlock: (password: string) => void;
    onCancel: () => void;
    fileName: string;
    isPremium?: boolean;
}

export const UnlockerModal: React.FC<UnlockerModalProps> = ({
    onUnlock,
    onCancel,
    fileName,
    isPremium = false,
}) => {
    const [password, setPassword] = useState('');

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl relative border border-red-100">
                <div className="flex items-center gap-3 mb-4 text-red-600">
                    <Lock className="w-6 h-6" />
                    <h2 className="text-xl font-bold text-gray-900">{isPremium ? 'Remove PDF Password' : 'Encrypted PDF'}</h2>
                </div>
                <p className="text-sm text-gray-600 mb-6">
                    The file <strong>"{fileName}"</strong> is password-protected.
                    <br /><br />
                    {isPremium
                        ? 'Enter the password below and DocReady will remove the password locally in your browser.'
                        : 'Enter the password below so DocReady can unlock the file locally in your browser.'}
                </p>
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Document Password"
                    className="w-full border border-gray-300 rounded-lg p-3 mb-6 focus:ring-2 focus:ring-green-500 focus:outline-none placeholder-gray-400 font-mono"
                />
                <div className="flex gap-3">
                    <button onClick={onCancel} className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 font-semibold rounded-xl active-scale">
                        Cancel
                    </button>
                    <button
                        onClick={() => onUnlock(password)}
                        disabled={!password}
                        className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl active-scale disabled:opacity-50 flex items-center justify-center gap-2 transition-colors disabled:cursor-not-allowed"
                    >
                        <Unlock className="w-4 h-4" /> {isPremium ? 'Remove Password' : 'Unlock File'}
                    </button>
                </div>
            </div>
        </div>
    );
};
