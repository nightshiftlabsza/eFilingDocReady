import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Shield, Receipt, CreditCard, Lock, Users, FileCheck } from 'lucide-react';
import { apiFetchJson } from '../lib/api';
import type { PaymentInitResponse, ProductCode } from '../types/account';
import { LEGAL_OPERATOR_NAME, SUPPORT_EMAIL } from '../lib/site';

interface PricingModalProps {
    isOpen: boolean;
    onClose: () => void;
    email?: string;
    persona?: 'taxpayer' | 'practitioner' | null;
    isAuthenticated: boolean;
    onRequestMagicLink: (email: string) => Promise<void>;
}

interface PlanCard {
    productCode: ProductCode;
    label: string;
    price: string;
    audience: 'taxpayer' | 'practitioner';
    description: string;
    features: string[];
}

const PLANS: PlanCard[] = [
    {
        productCode: 'taxpayer_pass_onceoff',
        label: 'Taxpayer Pass',
        price: 'R49 once-off',
        audience: 'taxpayer',
        description: 'For one person preparing their own supporting documents.',
        features: [
            'Merge supported files into one PDF',
            'Compress toward strict upload limits',
            'Auto-split oversized outputs',
            'Optional password add and remove',
        ],
    },
    {
        productCode: 'practitioner_pass_onceoff',
        label: 'Practitioner Pass',
        price: 'R399 once-off',
        audience: 'practitioner',
        description: 'For one practitioner or one office user preparing client supporting documents.',
        features: [
            'Same document tools as Taxpayer Pass',
            'Restore access by email',
            'Private in-browser file processing',
            'No team seats or admin dashboard',
        ],
    },
];

export const PricingModal: React.FC<PricingModalProps> = ({
    isOpen,
    onClose,
    email,
    persona,
    isAuthenticated,
    onRequestMagicLink,
}) => {
    const [userEmail, setUserEmail] = useState(email || '');
    const [loading, setLoading] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<ProductCode>('taxpayer_pass_onceoff');
    const [restoreEmail, setRestoreEmail] = useState(email || '');
    const [restoreLoading, setRestoreLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setLoading(false);
            setUserEmail(email || '');
            setRestoreEmail(email || '');
            setSelectedPlan(persona === 'practitioner' ? 'practitioner_pass_onceoff' : 'taxpayer_pass_onceoff');
        }
    }, [email, isOpen, persona]);

    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    const selected = useMemo(
        () => PLANS.find((plan) => plan.productCode === selectedPlan) ?? PLANS[0],
        [selectedPlan],
    );

    const handlePay = async () => {
        const checkoutEmail = userEmail.trim().toLowerCase();
        if (!checkoutEmail || !checkoutEmail.includes('@')) {
            toast.error('A valid email is required');
            return;
        }

        try {
            setLoading(true);
            const payment = await apiFetchJson<PaymentInitResponse>('/api/payments/initiate', {
                method: 'POST',
                body: JSON.stringify({
                    productCode: selected.productCode,
                    email: isAuthenticated ? undefined : checkoutEmail,
                    personaHint: selected.audience,
                }),
            });

            window.location.assign(payment.authorizationUrl);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unable to start payment';
            toast.error(message);
            setLoading(false);
        }
    };

    const handleRestore = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!restoreEmail || !restoreEmail.includes('@')) {
            toast.error('Please enter a valid email address');
            return;
        }

        try {
            setRestoreLoading(true);
            await onRequestMagicLink(restoreEmail.trim().toLowerCase());
            toast.success('Sign-in link sent');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unable to send sign-in link';
            toast.error(message);
        } finally {
            setRestoreLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
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
                        aria-labelledby="pricing-modal-title"
                        initial={{ opacity: 0, scale: 0.92, y: 24 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.92, y: 24 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto glass-panel border border-white/10 shadow-3xl p-6 md:p-8 rounded-3xl"
                    >
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20 mb-3">
                                    <Shield className="w-3 h-3" />
                                    Paid launch passes
                                </div>
                                <h2 id="pricing-modal-title" className="text-2xl md:text-3xl font-extrabold text-[var(--text-color)]">
                                    Choose one truthful paid pass
                                </h2>
                                <p className="text-sm text-[var(--text-color)]/60 mt-1">
                                    No subscriptions, no fake discounts, and no unsupported team packaging.
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                aria-label="Close pricing modal"
                                className="p-2 hover:bg-white/5 rounded-full transition-colors flex-shrink-0"
                            >
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>

                        <div className="flex items-center gap-4 mb-6 px-4 py-3 bg-emerald-500/8 border border-emerald-500/15 rounded-xl">
                            <Lock className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                            <p className="text-[11px] text-emerald-400/90 font-medium leading-relaxed">
                                Files are processed in your browser. Payment and restore access use secure third-party services.
                            </p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4 mb-6">
                            {PLANS.map((plan) => {
                                const isSelected = selectedPlan === plan.productCode;
                                return (
                                    <button
                                        key={plan.productCode}
                                        onClick={() => setSelectedPlan(plan.productCode)}
                                        className={`relative text-left p-5 rounded-2xl border transition-all duration-200 ${
                                            isSelected
                                                ? 'border-primary bg-primary/10 shadow-lg shadow-primary/15'
                                                : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8'
                                        }`}
                                    >
                                        {isSelected && (
                                            <div className="absolute top-3 right-3 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                                                <Check className="w-3 h-3 text-white" />
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2 mb-3 text-xs uppercase tracking-[0.18em] text-[var(--text-color)]/50 font-bold">
                                            {plan.audience === 'taxpayer' ? <FileCheck className="w-3.5 h-3.5" /> : <Users className="w-3.5 h-3.5" />}
                                            {plan.audience}
                                        </div>
                                        <p className="text-xl font-black text-[var(--text-color)] mb-1">{plan.label}</p>
                                        <p className="text-sm text-primary font-bold mb-3">{plan.price}</p>
                                        <p className="text-sm text-[var(--text-color)]/70 mb-4">{plan.description}</p>
                                        <ul className="space-y-2">
                                            {plan.features.map((feature) => (
                                                <li key={feature} className="flex items-start gap-3 text-sm text-[var(--text-color)]/80">
                                                    <div className="w-5 h-5 bg-primary/20 rounded-full flex items-center justify-center border border-primary/30 flex-shrink-0 mt-0.5">
                                                        <Check className="w-3 h-3 text-primary" />
                                                    </div>
                                                    {feature}
                                                </li>
                                            ))}
                                        </ul>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="border-t border-white/10 pt-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-semibold text-[var(--text-color)]/70">
                                    Selected: <span className="text-[var(--text-color)] font-bold">{selected.label}</span>
                                </p>
                                <p className="text-lg font-black text-primary">{selected.price}</p>
                            </div>

                            <div>
                                <label className="block text-[10px] uppercase tracking-widest text-emerald-400 font-bold mb-2 ml-1">
                                    {isAuthenticated ? 'Signed-in account email' : 'Purchase email'}
                                </label>
                                <div className="relative">
                                    <Receipt className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <input
                                        type="email"
                                        value={userEmail}
                                        onChange={(e) => setUserEmail(e.target.value)}
                                        placeholder="you@example.com"
                                        readOnly={isAuthenticated}
                                        disabled={isAuthenticated}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 pl-12 text-[var(--text-color)] placeholder-slate-500 focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                                    />
                                </div>
                                <p className="text-[10px] text-[var(--text-color)]/45 mt-2 ml-1">
                                    Use the same email later if you need to restore access on another device.
                                </p>
                            </div>

                            <button
                                onClick={handlePay}
                                disabled={loading}
                                className="w-full py-4 bg-primary hover:bg-primary-dark text-white font-bold rounded-2xl shadow-xl shadow-primary/20 flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-50"
                            >
                                <CreditCard className="w-5 h-5" />
                                {loading ? 'Opening secure checkout…' : `Continue to Paystack for ${selected.price}`}
                            </button>

                            <p className="text-xs text-[var(--text-color)]/55 leading-relaxed">
                                Secure checkout by Paystack. Payments may appear under {LEGAL_OPERATOR_NAME}. Refund policy: 7 days. Support: {SUPPORT_EMAIL}. DocReady is not affiliated with SARS.
                            </p>
                        </div>

                        {!isAuthenticated && (
                            <div className="mt-8 pt-6 border-t border-white/5">
                                <h3 className="text-sm font-bold text-[var(--text-color)] mb-2">Already purchased?</h3>
                                <p className="text-xs text-[var(--text-color)]/60 mb-4">
                                    Enter the purchase email address and we’ll send a sign-in link so you can restore access.
                                </p>
                                <form onSubmit={handleRestore} className="space-y-3">
                                    <input
                                        type="email"
                                        value={restoreEmail}
                                        onChange={(e) => setRestoreEmail(e.target.value)}
                                        placeholder="you@example.com"
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-[var(--text-color)] placeholder-slate-500 focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                                    />
                                    <button
                                        type="submit"
                                        disabled={restoreLoading}
                                        className="w-full py-3 bg-white/10 hover:bg-white/15 text-[var(--text-color)] font-semibold rounded-2xl transition-colors disabled:opacity-50"
                                    >
                                        {restoreLoading ? 'Sending sign-in link…' : 'Send restore link'}
                                    </button>
                                </form>
                            </div>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
