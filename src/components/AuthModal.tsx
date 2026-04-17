import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, X } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    onRequestMagicLink: (email: string) => Promise<void>;
    initialEmail?: string | null;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onRequestMagicLink, initialEmail }) => {
    const [email, setEmail] = useState(initialEmail ?? '');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setEmail(initialEmail ?? '');
            setLoading(false);
        }
    }, [initialEmail, isOpen]);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        if (!email || !email.includes('@')) {
            toast.error('Please enter a valid email address');
            return;
        }

        setLoading(true);
        try {
            await onRequestMagicLink(email);
            toast.success('Magic link sent. Please check your email.');
            onClose();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unable to send sign-in link';
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[2100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="auth-modal-title"
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-md glass-panel border border-white/10 shadow-2xl rounded-3xl p-6"
                    >
                        <div className="flex items-start justify-between gap-4 mb-5">
                            <div>
                                <p className="text-xs uppercase tracking-widest text-primary font-bold mb-2">Restore Access</p>
                                <h2 id="auth-modal-title" className="text-2xl font-bold text-[var(--text-color)]">
                                    Email me a sign-in link
                                </h2>
                                <p className="text-sm text-[var(--text-color)]/60 mt-2">
                                    Use the same email you used for purchase. No password required.
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                aria-label="Close sign-in modal"
                                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <label className="block">
                                <span className="block text-[10px] uppercase tracking-widest text-emerald-400 font-bold mb-2 ml-1">
                                    Email Address
                                </span>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="you@example.com"
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 pl-12 text-[var(--text-color)] placeholder-slate-500 focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                                        required
                                    />
                                </div>
                            </label>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 bg-primary hover:bg-primary-dark text-white font-bold rounded-2xl transition-all disabled:opacity-50"
                            >
                                {loading ? 'Sending Sign-In Link…' : 'Email Me a Magic Link'}
                            </button>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
