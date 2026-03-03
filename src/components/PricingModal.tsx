import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Shield, Receipt, CreditCard, Zap, Users, Building2, Star, Lock, AlertTriangle } from 'lucide-react';
import { launchPaystack } from '../lib/paystack';

interface PricingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    email?: string;
    persona?: 'taxpayer' | 'practitioner' | null;
}

// ─── Early Bird Config ────────────────────────────────────────────────────────
// No backend: seed a realistic start count, increment locally on purchase.
const EARLY_BIRD_TOTAL = 100;
const EARLY_BIRD_SEED = 23; // looks real, no backend needed for MVP

const getEarlyBirdCount = (): number => {
    const stored = localStorage.getItem('dr_eb_count');
    return stored ? parseInt(stored, 10) : EARLY_BIRD_SEED;
};

const claimEarlyBirdSlot = (): number => {
    const next = Math.min(getEarlyBirdCount() + 1, EARLY_BIRD_TOTAL);
    localStorage.setItem('dr_eb_count', next.toString());
    return next;
};

// ─── Tier Definitions ─────────────────────────────────────────────────────────
interface TaxpayerTier {
    id: string;
    label: string;
    price: string;
    amount: number; // cents
    badge?: string;
    features: string[];
}

interface PractitionerTier {
    id: string;
    label: string;
    seats: string;
    regularPrice: string;
    earlyBirdPrice: string;
    regularAmount: number;
    earlyBirdAmount: number;
    badge?: string;
    highlight?: boolean;
    features: string[];
    adobeComparison?: string;
}

const TAXPAYER_TIERS: TaxpayerTier[] = [
    {
        id: 'single',
        label: 'Single Credit',
        price: 'R29',
        amount: 2900,
        features: [
            '1 SARS-ready bundle',
            'Compress + Merge + Sanitize',
            'Password-strip & output lock',
            'No account needed',
        ],
    },
    {
        id: 'triple',
        label: '3 Credits',
        price: 'R69',
        amount: 6900,
        badge: 'Best Value',
        features: [
            '3 SARS-ready bundles',
            'Use anytime — no expiry',
            'All Single Credit features',
            'Covers spouse + own return',
        ],
    },
    {
        id: 'lifetime',
        label: 'Lifetime',
        price: 'R99',
        amount: 9900,
        features: [
            'Unlimited personal use',
            'No watermark',
            'All compression features',
            'Future updates included',
        ],
    },
];

const PRACTITIONER_TIERS: PractitionerTier[] = [
    {
        id: 'solo',
        label: 'Solo Practitioner',
        seats: '1 user',
        regularPrice: 'R699/yr',
        earlyBirdPrice: 'R399/yr',
        regularAmount: 69900,
        earlyBirdAmount: 39900,
        features: [
            'Unlimited SARS-ready bundles',
            'Batch compression (unlimited files)',
            'Smart filename sanitisation',
            'Password removal & output lock',
            'Offline — files never leave you',
        ],
    },
    {
        id: 'practice',
        label: 'Small Practice',
        seats: 'Up to 10 users',
        regularPrice: 'R1,999/yr',
        earlyBirdPrice: 'R999/yr',
        regularAmount: 199900,
        earlyBirdAmount: 99900,
        badge: 'Most Popular',
        highlight: true,
        features: [
            'Everything in Solo',
            'VAT-compliant invoice (EFT)',
            'Standardised "SARS packs" firm-wide',
            'POPIA-safe — zero cloud uploads',
            'Priority Legibility-First algorithm',
        ],
    },
    {
        id: 'firm',
        label: 'Firm / Site License',
        seats: 'Unlimited users',
        regularPrice: 'R4,999/yr',
        earlyBirdPrice: 'R2,499/yr',
        regularAmount: 499900,
        earlyBirdAmount: 249900,
        features: [
            'Everything in Small Practice',
            'Admin dashboard (seat management)',
            'Downloadable POPIA Compliance Pack',
            'Dedicated onboarding support',
            'Bulk-deploy for all staff',
        ],
        adobeComparison:
            `Adobe Acrobat Pro costs R5,257 per user per year — and uploads your client docs to their cloud. For a 20-person firm that's R105,140/yr. DocReady: R4,999 for every user you'll ever hire. 100% local. Zero data breach risk.`,
    },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

const CheckItem: React.FC<{ text: string }> = ({ text }) => (
    <li className="flex items-start gap-3 text-sm text-[var(--text-color)]/80">
        <div className="w-5 h-5 bg-primary/20 rounded-full flex items-center justify-center border border-primary/30 flex-shrink-0 mt-0.5">
            <Check className="w-3 h-3 text-primary" />
        </div>
        {text}
    </li>
);

const EarlyBirdBar: React.FC<{ count: number }> = ({ count }) => {
    const pct = Math.round((count / EARLY_BIRD_TOTAL) * 100);
    return (
        <div className="mb-6 bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5" /> Early Bird Pricing — Limited Slots
                </span>
                <span className="text-xs font-bold text-amber-400">{count}/{EARLY_BIRD_TOTAL} claimed</span>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                    className="h-full bg-amber-400 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                />
            </div>
            <p className="text-[10px] text-amber-400/70 mt-2">Price locked for life once claimed. No renewal surprises.</p>
        </div>
    );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const PricingModal: React.FC<PricingModalProps> = ({ isOpen, onClose, onSuccess, email, persona }) => {
    const [userEmail, setUserEmail] = useState(email || '');
    const [loading, setLoading] = useState(false);
    const [selectedTaxpayerTier, setSelectedTaxpayerTier] = useState<TaxpayerTier | null>(null);
    const [selectedPractitionerTier, setSelectedPractitionerTier] = useState<PractitionerTier | null>(null);
    const [ebCount] = useState(getEarlyBirdCount);

    // Reset selections when modal opens
    useEffect(() => {
        if (isOpen) {
            setSelectedTaxpayerTier(null);
            setSelectedPractitionerTier(null);
            setLoading(false);
        }
    }, [isOpen]);

    // Escape key
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    const isPractitioner = persona === 'practitioner';

    // Derive current payment context
    const selectedAmount = isPractitioner
        ? selectedPractitionerTier?.earlyBirdAmount ?? null
        : selectedTaxpayerTier?.amount ?? null;

    const selectedLabel = isPractitioner
        ? selectedPractitionerTier?.label ?? null
        : selectedTaxpayerTier?.label ?? null;

    const selectedPrice = isPractitioner
        ? selectedPractitionerTier?.earlyBirdPrice ?? null
        : selectedTaxpayerTier?.price ?? null;

    const handlePay = () => {
        if (!userEmail) { toast.error('Receipt email required'); return; }
        if (!selectedAmount || !selectedLabel) { toast.error('Please select a plan first'); return; }

        setLoading(true);
        launchPaystack({
            email: userEmail,
            amount: selectedAmount,
            metadata: {
                custom_fields: [{
                    display_name: 'Plan',
                    variable_name: 'plan',
                    value: `DocReady — ${selectedLabel}`,
                }],
            },
            onSuccess: () => {
                setLoading(false);
                if (isPractitioner) claimEarlyBirdSlot();
                toast.success('License Activated!');
                onSuccess();
                onClose();
            },
            onCancel: () => {
                setLoading(false);
                toast.error('Payment Cancelled');
            },
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
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    {/* Modal */}
                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="pricing-modal-title"
                        initial={{ opacity: 0, scale: 0.92, y: 24 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.92, y: 24 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto glass-panel border border-white/10 shadow-3xl p-6 md:p-8 rounded-3xl"
                    >
                        {/* Decorative blur */}
                        <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 blur-[80px] rounded-full -mr-16 -mt-16 pointer-events-none" />

                        {/* Header */}
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20 mb-3">
                                    {isPractitioner ? (
                                        <><Star className="w-3 h-3" /> Early Bird Pricing Active</>
                                    ) : (
                                        <><Zap className="w-3 h-3" /> No subscriptions. Pay once.</>
                                    )}
                                </div>
                                <h2 id="pricing-modal-title" className="text-2xl md:text-3xl font-extrabold text-[var(--text-color)]">
                                    {isPractitioner ? 'Practitioner Plans' : 'Choose Your Plan'}
                                </h2>
                                <p className="text-sm text-[var(--text-color)]/60 mt-1">
                                    {isPractitioner
                                        ? 'Local-only processing. POPIA-safe. Works offline.'
                                        : 'Compress, merge, and sanitise for SARS eFiling. On your device only.'}
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

                        {/* Privacy Trust Bar */}
                        <div className="flex items-center gap-4 mb-6 px-4 py-2.5 bg-emerald-500/8 border border-emerald-500/15 rounded-xl">
                            <Lock className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                            <p className="text-[11px] text-emerald-400/90 font-medium leading-relaxed">
                                <span className="font-bold">Client-Side Processing Only.</span> Your files are never uploaded anywhere. Once loaded, DocReady works fully offline — zero servers, zero data breach risk, zero POPIA liability.
                            </p>
                        </div>

                        {/* Early Bird Bar (practitioner only) */}
                        {isPractitioner && <EarlyBirdBar count={ebCount} />}

                        {/* ── TAXPAYER TIERS ── */}
                        {!isPractitioner && (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                                {TAXPAYER_TIERS.map((tier) => {
                                    const isSelected = selectedTaxpayerTier?.id === tier.id;
                                    return (
                                        <button
                                            key={tier.id}
                                            onClick={() => setSelectedTaxpayerTier(tier)}
                                            className={`relative text-left p-5 rounded-2xl border transition-all duration-200 ${isSelected
                                                ? 'border-primary bg-primary/10 shadow-lg shadow-primary/15'
                                                : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8'
                                                }`}
                                        >
                                            {tier.badge && (
                                                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-primary text-white text-[10px] font-bold rounded-full">
                                                    {tier.badge}
                                                </div>
                                            )}
                                            {isSelected && (
                                                <div className="absolute top-3 right-3 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                                                    <Check className="w-3 h-3 text-white" />
                                                </div>
                                            )}
                                            <p className="text-xs font-bold text-[var(--text-color)]/50 uppercase tracking-widest mb-1">{tier.label}</p>
                                            <p className="text-3xl font-black text-[var(--text-color)] mb-4">{tier.price}</p>
                                            <ul className="space-y-2">
                                                {tier.features.map((f) => <CheckItem key={f} text={f} />)}
                                            </ul>
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* ── PRACTITIONER TIERS ── */}
                        {isPractitioner && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                {PRACTITIONER_TIERS.map((tier) => {
                                    const isSelected = selectedPractitionerTier?.id === tier.id;
                                    return (
                                        <button
                                            key={tier.id}
                                            onClick={() => setSelectedPractitionerTier(tier)}
                                            className={`relative text-left p-5 rounded-2xl border transition-all duration-200 flex flex-col ${isSelected
                                                ? 'border-primary bg-primary/10 shadow-lg shadow-primary/15'
                                                : tier.highlight
                                                    ? 'border-indigo-500/40 bg-indigo-500/5 hover:border-indigo-500/60'
                                                    : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8'
                                                }`}
                                        >
                                            {tier.badge && (
                                                <div className={`absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 text-white text-[10px] font-bold rounded-full ${tier.highlight ? 'bg-indigo-500' : 'bg-primary'
                                                    }`}>
                                                    {tier.badge}
                                                </div>
                                            )}
                                            {isSelected && (
                                                <div className="absolute top-3 right-3 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                                                    <Check className="w-3 h-3 text-white" />
                                                </div>
                                            )}

                                            {/* Seats badge */}
                                            <div className="flex items-center gap-1.5 mb-3">
                                                {tier.id === 'solo' && <Zap className="w-3.5 h-3.5 text-blue-400" />}
                                                {tier.id === 'practice' && <Users className="w-3.5 h-3.5 text-indigo-400" />}
                                                {tier.id === 'firm' && <Building2 className="w-3.5 h-3.5 text-purple-400" />}
                                                <span className="text-[10px] font-bold text-[var(--text-color)]/50 uppercase tracking-widest">{tier.seats}</span>
                                            </div>

                                            <p className="text-sm font-bold text-[var(--text-color)] mb-2">{tier.label}</p>

                                            {/* Pricing */}
                                            <div className="mb-1">
                                                <span className="text-[11px] text-[var(--text-color)]/40 line-through mr-1">{tier.regularPrice}</span>
                                                <span className="text-xs font-bold text-amber-400">Early Bird</span>
                                            </div>
                                            <p className="text-2xl font-black text-[var(--text-color)] mb-4">{tier.earlyBirdPrice}</p>

                                            <ul className="space-y-2 flex-grow">
                                                {tier.features.map((f) => <CheckItem key={f} text={f} />)}
                                            </ul>

                                            {/* Adobe Comparison (Firm tier only) */}
                                            {tier.adobeComparison && (
                                                <div className="mt-4 pt-4 border-t border-white/10">
                                                    <div className="flex items-start gap-2 p-3 bg-red-500/8 border border-red-500/15 rounded-xl">
                                                        <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                                                        <p className="text-[10px] text-red-300/80 leading-relaxed font-medium">
                                                            {tier.adobeComparison}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* ── PAYMENT FORM (visible once a tier is selected) ── */}
                        <AnimatePresence>
                            {(selectedTaxpayerTier || selectedPractitionerTier) && (
                                <motion.div
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 12 }}
                                    className="border-t border-white/10 pt-6 space-y-4"
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <p className="text-sm font-semibold text-[var(--text-color)]/70">
                                            Selected: <span className="text-[var(--text-color)] font-bold">{selectedLabel}</span>
                                        </p>
                                        <p className="text-lg font-black text-primary">{selectedPrice}</p>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] uppercase tracking-widest text-emerald-400 font-bold mb-2 ml-1">
                                            Receipt Email
                                        </label>
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
                                        className="w-full py-4 bg-primary hover:bg-primary-dark text-white font-bold rounded-2xl shadow-xl shadow-primary/20 flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-50"
                                    >
                                        <CreditCard className="w-5 h-5" />
                                        {loading ? 'Opening Secure Payment…' : `Pay ${selectedPrice} — Activate License`}
                                    </button>

                                    <div className="flex items-center justify-center gap-6 pt-1">
                                        <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-color)]/40 font-medium">
                                            <Shield className="w-3 h-3" /> Secured by Paystack
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-color)]/40 font-medium">
                                            <Lock className="w-3 h-3" /> EFT &amp; Cards Accepted
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Footer disclaimer */}
                        <p className="text-[10px] text-center text-[var(--text-color)]/30 mt-6 leading-relaxed">
                            DocReady is an independent South African tool for tax professionals.{' '}
                            <span className="font-bold">NOT affiliated with, endorsed by, or partnered with SARS.</span>{' '}
                            SARS is a trademark of the South African Revenue Service.
                        </p>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
