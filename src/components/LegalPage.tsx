import React from 'react';
import { LEGAL_OPERATOR_NAME, LEGAL_LINKS, SUPPORT_EMAIL } from '../lib/site';

interface LegalPageProps {
    page: 'terms' | 'privacy' | 'refunds' | 'contact' | 'popia' | 'paia';
    onGoHome: () => void;
}

const content: Record<LegalPageProps['page'], { title: string; intro: string; sections: Array<{ heading: string; body: string[] }> }> = {
    terms: {
        title: 'Terms of Use',
        intro: `${LEGAL_OPERATOR_NAME} provides DocReady as a paid South African document-preparation tool. These terms apply to your use of the website, payment flow, and account restore features.`,
        sections: [
            {
                heading: 'Service Scope',
                body: [
                    'DocReady helps you merge supported files into one PDF, compress towards strict upload limits, split oversized outputs, and optionally add or remove PDF passwords.',
                    'DocReady is not affiliated with SARS and does not guarantee that any upload or submission will be accepted.',
                ],
            },
            {
                heading: 'Private Processing',
                body: [
                    'Customer files are processed in your browser and are not uploaded to our servers for document handling.',
                    'Account, transaction, entitlement, and webhook records may be stored remotely to support payment verification and restore access.',
                ],
            },
            {
                heading: 'Launch Offer',
                body: [
                    'The launch offer includes one Taxpayer Pass and one Practitioner Pass. Each pass is once-off and not a subscription.',
                    'The Practitioner Pass is for one practitioner or one office user, not for a multi-seat practice platform.',
                ],
            },
        ],
    },
    privacy: {
        title: 'Privacy Notice',
        intro: 'This notice explains what DocReady stores remotely and what stays on your device.',
        sections: [
            {
                heading: 'What Stays Local',
                body: [
                    'Your PDFs, images, filenames, and document-derived metadata stay in your browser during file processing.',
                    'DocReady does not store customer document blobs server-side.',
                ],
            },
            {
                heading: 'What May Be Stored Remotely',
                body: [
                    'We may store your email address, authentication records, transaction records, entitlement records, and payment webhook records.',
                    'These records are used to verify payments, restore access, and keep the paid offer truthful.',
                ],
            },
            {
                heading: 'Third Parties',
                body: [
                    'Payments are handled through Paystack. Authentication and database records are handled through Supabase. Application hosting uses Cloudflare Pages and Railway.',
                    `Support contact is currently configured as a placeholder: ${SUPPORT_EMAIL}. Replace this before live launch if needed.`,
                ],
            },
        ],
    },
    refunds: {
        title: 'Refund Policy',
        intro: 'DocReady offers a 7-day refund policy for the launch passes.',
        sections: [
            {
                heading: 'Refund Window',
                body: [
                    'You may request a refund within 7 days of a successful payment.',
                    'Requests made after the 7-day period may be declined.',
                ],
            },
            {
                heading: 'How to Request a Refund',
                body: [
                    `Email ${SUPPORT_EMAIL} with the purchase email address, payment reference, and a short description of the problem.`,
                    'Refunds are not instant and may take time to reflect based on the payment provider.',
                ],
            },
        ],
    },
    contact: {
        title: 'Contact',
        intro: 'Use this page for support and pre-launch contact details.',
        sections: [
            {
                heading: 'Support',
                body: [
                    `Support email placeholder: ${SUPPORT_EMAIL}. This should be replaced with the final launch address before go-live.`,
                    'Please include your payment reference when asking about account restore or refunds.',
                ],
            },
            {
                heading: 'Operator',
                body: [
                    `DocReady is operated by ${LEGAL_OPERATOR_NAME}.`,
                    'DocReady is an independent tool and is not affiliated with SARS.',
                ],
            },
        ],
    },
    popia: {
        title: 'POPIA Notice',
        intro: 'DocReady is designed to keep document processing on-device and limit remote data collection.',
        sections: [
            {
                heading: 'Purpose',
                body: [
                    'Personal information is used only for sign-in, payment verification, entitlement assignment, and restore access.',
                    'Document processing happens locally in the browser.',
                ],
            },
            {
                heading: 'Your Choices',
                body: [
                    'You can use the free merge-only flow without creating an account.',
                    'Paid access and restore access require an email address so entitlements can be tied to the correct user.',
                ],
            },
        ],
    },
    paia: {
        title: 'PAIA Manual Placeholder',
        intro: 'This page is a clearly marked placeholder for the final PAIA manual replacement before launch.',
        sections: [
            {
                heading: 'Current Status',
                body: [
                    'A final PAIA manual has not yet been inserted into the app.',
                    'Replace this placeholder page with the final approved PAIA manual before public launch.',
                ],
            },
            {
                heading: 'Temporary Contact',
                body: [
                    `Until the final PAIA manual is published, use ${SUPPORT_EMAIL} for manual replacement coordination.`,
                ],
            },
        ],
    },
};

export const LegalPage: React.FC<LegalPageProps> = ({ page, onGoHome }) => {
    const pageContent = content[page];

    return (
        <div className="max-w-4xl mx-auto px-4 py-12">
            <div className="glass-panel rounded-3xl p-8 md:p-10">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
                    <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-emerald-400 font-bold mb-3">{LEGAL_OPERATOR_NAME}</p>
                        <h1 className="text-4xl font-black text-[var(--text-color)]">{pageContent.title}</h1>
                    </div>
                    <button
                        onClick={onGoHome}
                        className="px-5 py-3 rounded-2xl bg-white/10 text-[var(--text-color)] font-semibold hover:bg-white/15 transition-colors"
                    >
                        Back to DocReady
                    </button>
                </div>

                <p className="text-lg text-[var(--text-color)]/75 leading-relaxed mb-8">{pageContent.intro}</p>

                <div className="space-y-8">
                    {pageContent.sections.map((section) => (
                        <section key={section.heading}>
                            <h2 className="text-2xl font-bold text-[var(--text-color)] mb-3">{section.heading}</h2>
                            <div className="space-y-3 text-[var(--text-color)]/75">
                                {section.body.map((paragraph) => (
                                    <p key={paragraph}>{paragraph}</p>
                                ))}
                            </div>
                        </section>
                    ))}
                </div>

                <div className="mt-10 pt-6 border-t border-white/10 flex flex-wrap gap-4 text-sm">
                    {LEGAL_LINKS.map((link) => (
                        <a key={link.href} href={link.href} className="text-[var(--text-color)]/60 hover:text-[var(--text-color)] transition-colors">
                            {link.label}
                        </a>
                    ))}
                </div>
            </div>
        </div>
    );
};
