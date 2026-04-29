import { SubscriptionPlan, UserSubscription, PlanType, SubscriptionStatus } from './subscription.model';
import { Invoice } from './invoice.model';

describe('Subscription Models', () => {

  describe('PlanType enum', () => {
    it('should have 3 values', () => {
      expect(Object.keys(PlanType).length).toBe(3);
      expect(PlanType.FREEMIUM).toBe('FREEMIUM');
      expect(PlanType.STANDARD).toBe('STANDARD');
      expect(PlanType.PREMIUM).toBe('PREMIUM');
    });
  });

  describe('SubscriptionStatus enum', () => {
    it('should have 3 values', () => {
      expect(Object.keys(SubscriptionStatus).length).toBe(3);
      expect(SubscriptionStatus.ACTIVE).toBe('ACTIVE');
      expect(SubscriptionStatus.EXPIRED).toBe('EXPIRED');
      expect(SubscriptionStatus.CANCELLED).toBe('CANCELLED');
    });
  });

  describe('SubscriptionPlan', () => {
    it('should create a valid plan', () => {
      const p: SubscriptionPlan = { name: PlanType.STANDARD, price: 9.99, durationDays: 30, description: 'Monthly' };
      expect(p.price).toBe(9.99);
      expect(p.durationDays).toBe(30);
    });

    it('should support free plan', () => {
      const p: SubscriptionPlan = { name: PlanType.FREEMIUM, price: 0, durationDays: 365, description: 'Free' };
      expect(p.price).toBe(0);
    });
  });

  describe('UserSubscription', () => {
    it('should create a valid subscription', () => {
      const s: UserSubscription = {
        userId: 10, subscribedAt: '2026-04-01', expiresAt: '2026-05-01', status: SubscriptionStatus.ACTIVE
      };
      expect(s.status).toBe('ACTIVE');
    });

    it('should support optional fields', () => {
      const s: UserSubscription = {
        userId: 10, subscribedAt: '2026-04-01', expiresAt: '2026-05-01',
        status: SubscriptionStatus.ACTIVE, autoRenew: true, reminderSent: false, stripeCustomerId: 'cus_123'
      };
      expect(s.autoRenew).toBe(true);
      expect(s.stripeCustomerId).toBe('cus_123');
    });
  });

  describe('Invoice', () => {
    it('should create a valid invoice', () => {
      const inv: Invoice = {
        id: 1, invoiceNumber: 'INV-001', planName: 'Standard',
        amount: 9.99, issuedAt: '2026-04-01', renewalDate: '2026-05-01',
        subscriptionStatus: 'ACTIVE', paid: true, stripeSessionId: 'sess_123'
      };
      expect(inv.invoiceNumber).toBe('INV-001');
      expect(inv.paid).toBe(true);
    });

    it('should support unpaid invoice', () => {
      const inv: Invoice = {
        id: 2, invoiceNumber: 'INV-002', planName: 'Premium',
        amount: 19.99, issuedAt: '2026-04-15', renewalDate: '2026-05-15',
        subscriptionStatus: 'EXPIRED', paid: false, stripeSessionId: ''
      };
      expect(inv.paid).toBe(false);
      expect(inv.subscriptionStatus).toBe('EXPIRED');
    });
  });
});
