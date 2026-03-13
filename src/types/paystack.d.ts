declare module '@paystack/inline-js' {
    export interface PaystackResponse {
        reference: string;
        status: string;
        trans: string;
        transaction: string;
        message: string;
        trxref: string;
    }
    export interface PaystackError {
        message: string;
    }
    export default class PaystackPop {
        newTransaction(options: {
            key: string;
            email: string;
            amount: number;
            currency?: string;
            ref?: string;
            channels?: string[];
            metadata?: Record<string, unknown>;
            onSuccess?: (response: PaystackResponse) => void;
            onCancel?: () => void;
            onError?: (error: PaystackError) => void;
        }): void;
    }
}
