import PaystackPop from '@paystack/inline-js';
import { toast } from 'react-hot-toast';

interface PaystackOptions {
    email: string;
    amount: number;
    metadata?: any;
    onSuccess: (transaction: any) => void;
    onCancel: () => void;
}

/**
 * Centered Paystack Success/Close callback handlers.
 * Optimized for DocReady R69 Lifetime Pass.
 */
export const launchPaystack = (options: PaystackOptions) => {
    const paystack = new PaystackPop();
    const key = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;

    if (!key) {
        console.error("Paystack Public Key (VITE_PAYSTACK_PUBLIC_KEY) is missing from .env");
        toast.error("Payment configuration error. Please contact support.");
        return;
    }

    paystack.newTransaction({
        key,
        email: options.email,
        amount: options.amount,
        currency: "ZAR",
        channels: ['card', 'eft', 'qr'],
        metadata: {
            custom_fields: [
                {
                    display_name: "Service",
                    variable_name: "service",
                    value: "DocReady Premium (Lifetime)"
                }
            ],
            ...options.metadata
        },
        onSuccess: (transaction: any) => {
            options.onSuccess(transaction);
        },
        onCancel: () => {
            // Fired if the user closes the modal before completing payment
            options.onCancel();
        },
        onError: (e: any) => {
            console.error("Paystack Error:", e);
            options.onCancel();
        }
    });
};
