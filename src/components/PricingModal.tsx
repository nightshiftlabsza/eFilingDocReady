import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Shield, Receipt, CreditCard } from 'lucide-react';
import { launchPaystack } from '../lib/paystack';

interface PricingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    email?: string;
    persona?: 'taxpayer' | 'practitioner' | null;
}

export const PricingModal: React.FC<PricingModalProps> = ({ isOpen, onClose, onSuccess, email, persona }) => {
    const [userEmail, setUserEmail] = useState(email || '');
    const [loading, setLoading] = useState(false);

    const handlePay = () => {
        if (!userEmail) {
            toast.error("Receipt email required");
            return;
        }
        setLoading(true);

        // Practitioner: R499 (Solo Season Pass)
        // Taxpayer: R89 (Lifetime)
        const amount = persona === 'practitioner' ? 49900 : 8900;

        launchPaystack({
            email: userEmail,
            amount: amount,
            onSuccess: () => {
                setLoading(false);
                toast.success("License Activated! Processing PDF...");
                onSuccess();
                onClose();
            },
            onCancel: () => {
                setLoading(false);
                toast.error("Payment Cancelled");
            }
        });
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-[#0f172a]/80 backdrop-blur-md"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="w-full max-w-md glass-panel border border-white/10 shadow-3xl p-8 relative overflow-hidden"
                    >
                        {/* Decorative Gradient Background */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-[60px] rounded-full -mr-10 -mt-10" />

                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <div className="badge tooltip mb-2" data-tip="Unlimited Merges">
                                    Premium Pass
                                </div>
                                <h2 className="text-3xl font-bold text-[var(--text-color)] mb-1">Lifetime License</h2>
                                <p className="text-sm text-[var(--text-color)]/60">Unlock SARS-compliant compression forever.</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-white/5 rounded-full transition-colors active-scale"
                            >
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>

                        <div className="bg-white/5 rounded-2xl border border-white/5 p-6 mb-8">
                            <ul className="space-y-4">
                                <li className="flex items-center gap-3 text-sm text-[var(--text-color)]/80">
                                    <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center border border-primary/30">
                                        <Check className="w-3 h-3 text-primary" />
                                    </div>
                                    Unlimited {persona === 'practitioner' ? 'Batch Processing' : 'Merges'}
                                </li>
                                <li className="flex items-center gap-3 text-sm text-[var(--text-color)]/80">
                                    <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center border border-primary/30">
                                        <Check className="w-3 h-3 text-primary" />
                                    </div>
                                    Advanced JPEG/PDF Compactor (Max DPI)
                                </li>
                                <li className="flex items-center gap-3 text-sm text-[var(--text-color)]/80">
                                    <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center border border-primary/30">
                                        <Check className="w-3 h-3 text-primary" />
                                    </div>
                                    {persona === 'practitioner' ? 'Smart Naming (SARS Character Stripping)' : 'Priority Logic (Stay Under 5MB Always)'}
                                </li>
                                {persona === 'practitioner' && (
                                    <li className="flex items-center gap-3 text-sm text-[var(--text-color)]/80">
                                        <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center border border-primary/30">
                                            <Check className="w-3 h-3 text-primary" />
                                        </div>
                                        VAT Invoicing & EFT Support
                                    </li>
                                )}
                            </ul>

                            <div className="mt-8 pt-6 border-t border-white/5">
                                <div className="flex items-baseline gap-2 mb-2">
                                    <span className="text-4xl font-black text-[var(--text-color)]">R{persona === 'practitioner' ? '499' : '89'}</span>
                                    <span className="text-sm text-[var(--text-color)]/60 font-medium uppercase">{persona === 'practitioner' ? 'Season Pass' : 'Lifetime'}</span>
                                </div>
                                <p className="text-xs text-[var(--text-color)]/50 flex items-center gap-1">
                                    <Shield className="w-3 h-3 text-primary" />
                                    {persona === 'practitioner' ? 'Annual Firm-Ready License' : 'No subscriptions. No recurring charges.'}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] uppercase tracking-widest text-[#10b981] font-bold mb-2 ml-1">Receipt Tracking Email</label>
                                <div className="relative">
                                    <Receipt className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <input
                                        type="email"
                                        value={userEmail}
                                        onChange={(e) => setUserEmail(e.target.value)}
                                        placeholder="your@email.com"
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 pl-12 text-[var(--text-color)] placeholder-slate-500 focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handlePay}
                                disabled={loading}
                                className="w-full py-5 bg-primary hover:bg-primary-dark text-white font-bold rounded-2xl shadow-xl shadow-primary/20 flex items-center justify-center gap-3 active-scale disabled:opacity-50"
                            >
                                <CreditCard className="w-5 h-5" />
                                {loading ? 'Payment Securely Opening...' : 'Activate Premium License'}
                            </button>

                            <p className="text-[10px] text-center text-[var(--text-color)]/50">
                                Secured by <span className="text-primary font-bold">Paystack</span>.
                                EFT & Cards Accepted.
                            </p>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
