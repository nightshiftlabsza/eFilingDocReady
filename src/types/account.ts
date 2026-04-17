export type Persona = 'taxpayer' | 'practitioner';

export type ProductCode =
    | 'taxpayer_pass_onceoff'
    | 'practitioner_pass_onceoff';

export interface ActivePlanSummary {
    code: ProductCode;
    label: string;
    persona: Persona;
    grantedAt: string | null;
}

export interface AccountResponse {
    authenticated: boolean;
    email: string | null;
    persona: Persona | null;
    activePlan: ActivePlanSummary | null;
    hasPremiumAccess: boolean;
    source: 'server' | 'guest-payment';
}

export interface PaymentStatusResponse {
    reference: string;
    transactionStatus: 'pending' | 'success' | 'failed' | 'abandoned';
    hasPremiumAccess: boolean;
    activePlan: ActivePlanSummary | null;
    entitlementReady: boolean;
}

export interface PaymentInitResponse {
    reference: string;
    authorizationUrl: string;
    accessCode: string;
    amountMinor: number;
    currency: 'ZAR';
    productCode: ProductCode;
    email: string;
}
