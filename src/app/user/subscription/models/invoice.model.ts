export interface Invoice {
  id: number;
  invoiceNumber: string;
  planName: string;
  amount: number;
  issuedAt: string;
  renewalDate: string;
  subscriptionStatus: string;
  paid: boolean;
  stripeSessionId: string;
}
