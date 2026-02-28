declare module '@paystack/inline-js' {
    export default class PaystackPop {
        newTransaction(options: {
            key: string;
            email: string;
            amount: number;
            currency?: string;
            ref?: string;
            channels?: string[];
            metadata?: any;
            onSuccess?: (response: any) => void;
            onCancel?: () => void;
            onError?: (error: any) => void;
        }): void;
    }
}
