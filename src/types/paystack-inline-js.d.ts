declare module "@paystack/inline-js" {
  export interface PaystackSuccessResponse {
    id: number;
    reference: string;
    message: string;
  }

  export interface PaystackLoadResponse {
    id: number;
    customer: Record<string, unknown>;
    accessCode: string;
  }

  export interface PaystackNewTransactionOptions {
    key: string;
    email: string;
    amount: number;
    currency?: string;
    plan?: string;
    reference?: string;
    metadata?: Record<string, unknown>;
    onSuccess?: (response: PaystackSuccessResponse) => void;
    onCancel?: () => void;
    onLoad?: (response: PaystackLoadResponse) => void;
    onError?: (error: { message: string }) => void;
  }

  export default class PaystackPop {
    constructor();
    newTransaction(options: PaystackNewTransactionOptions): unknown;
  }
}