export const LEGAL_OPERATOR_NAME = 'Night Shift Labs ZA';
export const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL || 'support@example.com';

export const SUPPORTED_FILE_TYPES = ['PDF', 'JPG', 'JPEG', 'PNG'] as const;

export const LEGAL_LINKS = [
    { href: '/terms', label: 'Terms' },
    { href: '/privacy', label: 'Privacy' },
    { href: '/refunds', label: 'Refunds' },
    { href: '/contact', label: 'Contact' },
    { href: '/popia', label: 'POPIA Notice' },
    { href: '/paia', label: 'PAIA Manual' },
] as const;
