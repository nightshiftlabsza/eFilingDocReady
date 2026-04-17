import type { Persona, ProductCode } from '../types/account';

export interface ProductConfig {
    code: ProductCode;
    label: string;
    persona: Persona;
    amountMinor: number;
    currency: 'ZAR';
    paystackPlanCode: string | null;
}

export const PRODUCT_CATALOG: Record<ProductCode, ProductConfig> = {
    taxpayer_pass_onceoff: {
        code: 'taxpayer_pass_onceoff',
        label: 'Taxpayer Pass',
        persona: 'taxpayer',
        amountMinor: 4900,
        currency: 'ZAR',
        paystackPlanCode: null,
    },
    practitioner_pass_onceoff: {
        code: 'practitioner_pass_onceoff',
        label: 'Practitioner Pass',
        persona: 'practitioner',
        amountMinor: 39900,
        currency: 'ZAR',
        paystackPlanCode: null,
    },
};

export function isProductCode(value: string): value is ProductCode {
    return value in PRODUCT_CATALOG;
}

export function getProductConfig(productCode: ProductCode): ProductConfig {
    return PRODUCT_CATALOG[productCode];
}
