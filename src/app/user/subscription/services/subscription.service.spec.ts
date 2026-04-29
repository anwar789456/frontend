import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { SubscriptionService } from './subscription.service';
import { SubscriptionPlan, UserSubscription, PlanType, SubscriptionStatus } from '../models/subscription.model';

describe('SubscriptionService', () => {
  let service: SubscriptionService;
  let httpMock: HttpTestingController;
  const apiUrl = 'https://minolingo.online/api/abonnements';

  const mockPlan: SubscriptionPlan = {
    id: 1, name: PlanType.STANDARD, price: 9.99, durationDays: 30, description: 'Standard plan'
  };

  const mockSub: UserSubscription = {
    id: 1, userId: 10, plan: mockPlan, subscribedAt: '2026-04-01',
    expiresAt: '2026-05-01', status: SubscriptionStatus.ACTIVE, autoRenew: true
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), SubscriptionService]
    });
    service = TestBed.inject(SubscriptionService);
    httpMock = TestBed.inject(HttpTestingController);
    service.clearCache();
  });

  afterEach(() => { httpMock.verify(); });

  it('should be created', () => { expect(service).toBeTruthy(); });

  // ── Plans CRUD ──

  it('should create a plan', () => {
    service.createPlan(mockPlan).subscribe(p => expect(p.name).toBe('STANDARD'));
    const req = httpMock.expectOne(`${apiUrl}/create-abonnement`);
    expect(req.request.method).toBe('POST');
    req.flush(mockPlan);
  });

  it('should get all plans', () => {
    service.getAllPlans(true).subscribe(p => expect(p.length).toBe(3));
    httpMock.expectOne(`${apiUrl}/get-all-abonnements`).flush([
      mockPlan,
      { ...mockPlan, id: 2, name: PlanType.PREMIUM },
      { ...mockPlan, id: 3, name: PlanType.FREEMIUM, price: 0 }
    ]);
  });

  it('should cache plans on second call', () => {
    service.getAllPlans(true).subscribe();
    httpMock.expectOne(`${apiUrl}/get-all-abonnements`).flush([mockPlan]);

    // Second call should use cache — no new HTTP request
    service.getAllPlans().subscribe(p => expect(p.length).toBe(1));
    httpMock.expectNone(`${apiUrl}/get-all-abonnements`);
  });

  it('should force refresh cache', () => {
    service.getAllPlans(true).subscribe();
    httpMock.expectOne(`${apiUrl}/get-all-abonnements`).flush([mockPlan]);

    service.getAllPlans(true).subscribe();
    httpMock.expectOne(`${apiUrl}/get-all-abonnements`).flush([mockPlan]);
  });

  it('should get plan by id', () => {
    service.getPlanById(1).subscribe(p => expect(p.price).toBe(9.99));
    httpMock.expectOne(`${apiUrl}/get-abonnement/1`).flush(mockPlan);
  });

  it('should update a plan and clear cache', () => {
    const updated = { ...mockPlan, price: 12.99 };
    service.updatePlan(1, updated).subscribe(p => expect(p.price).toBe(12.99));
    httpMock.expectOne(`${apiUrl}/update-abonnement/1`).flush(updated);
  });

  it('should delete a plan', () => {
    service.deletePlan(1).subscribe();
    httpMock.expectOne(`${apiUrl}/delete-abonnement/1`).flush(null);
  });

  // ── Book Plan ──

  it('should book a plan', () => {
    service.bookPlan(10, 1).subscribe(s => expect(s.userId).toBe(10));
    const req = httpMock.expectOne(`${apiUrl}/book`);
    expect(req.request.body).toEqual({ userId: 10, planId: 1 });
    req.flush({ subscription: mockSub, message: 'Booked' });
  });

  // ── User Subscriptions ──

  it('should get all subscriptions', () => {
    service.getAllSubscriptions().subscribe(s => expect(s.length).toBe(1));
    httpMock.expectOne(`${apiUrl}/get-all-subscriptions`).flush([mockSub]);
  });

  it('should get subscription by id', () => {
    service.getSubscriptionById(1).subscribe(s => expect(s.status).toBe('ACTIVE'));
    httpMock.expectOne(`${apiUrl}/get-subscription/1`).flush(mockSub);
  });

  it('should delete subscription', () => {
    service.deleteSubscription(1).subscribe();
    httpMock.expectOne(`${apiUrl}/delete-subscription/1`).flush(null);
  });

  // ── Auto-Renew ──

  it('should toggle auto-renew', () => {
    service.toggleAutoRenew(1, false).subscribe();
    httpMock.expectOne(`${apiUrl}/1/auto-renew?enabled=false`).flush({});
  });

  // ── Current Subscription ──

  it('should get current subscription', () => {
    service.getCurrentSubscription(10).subscribe(s => expect(s.userId).toBe(10));
    httpMock.expectOne(`${apiUrl}/user/10/current-subscription`).flush(mockSub);
  });

  // ── Recommendation ──

  it('should get recommendation', () => {
    service.getRecommendation(10).subscribe(r => {
      expect(r.recommendedPlan).toBe('PREMIUM');
      expect(r.reason).toContain('usage');
    });
    httpMock.expectOne(`${apiUrl}/user/10/recommendation`).flush({
      recommendedPlan: PlanType.PREMIUM, reason: 'Based on your usage', state: 'ACTIVE'
    });
  });

  // ── Discount Codes ──

  it('should validate discount code', () => {
    service.validateDiscountCode('SAVE20').subscribe(r => {
      expect(r.code).toBe('SAVE20');
      expect(r.discountPercentage).toBe(20);
    });
    httpMock.expectOne(`${apiUrl}/discounts/validate/SAVE20`).flush({ code: 'SAVE20', discountPercentage: 20 });
  });

  // ── Helper Methods ──

  it('should identify free plan', () => {
    expect(service.isFreePlan({ id: 1, name: PlanType.FREEMIUM, price: 0, durationDays: 30, description: '' })).toBe(true);
    expect(service.isFreePlan({ id: 2, name: PlanType.STANDARD, price: 9.99, durationDays: 30, description: '' })).toBe(false);
  });

  it('should calculate monthly price', () => {
    expect(service.getMonthlyPrice(120)).toBe(10);
    expect(service.getMonthlyPrice(99.99)).toBe(8.33);
  });

  it('should check subscription active status', () => {
    expect(service.isSubscriptionActive(null)).toBe(false);
    expect(service.isSubscriptionActive(undefined)).toBe(false);

    const expired: UserSubscription = { ...mockSub, expiresAt: '2020-01-01' };
    expect(service.isSubscriptionActive(expired)).toBe(false);

    const active: UserSubscription = { ...mockSub, expiresAt: '2099-01-01' };
    expect(service.isSubscriptionActive(active)).toBe(true);

    const cancelled: UserSubscription = { ...mockSub, status: SubscriptionStatus.CANCELLED, expiresAt: '2099-01-01' };
    expect(service.isSubscriptionActive(cancelled)).toBe(false);
  });

  it('should calculate days remaining', () => {
    const future = new Date();
    future.setDate(future.getDate() + 15);
    const sub: UserSubscription = { ...mockSub, expiresAt: future.toISOString() };
    const days = service.getDaysRemaining(sub);
    expect(days).toBeGreaterThanOrEqual(14);
    expect(days).toBeLessThanOrEqual(16);
  });

  it('should return 0 days for expired subscription', () => {
    const sub: UserSubscription = { ...mockSub, expiresAt: '2020-01-01' };
    expect(service.getDaysRemaining(sub)).toBe(0);
  });

  it('should get plan by type', () => {
    service.getPlanByType(PlanType.STANDARD).subscribe(p => {
      expect(p).toBeDefined();
      expect(p!.name).toBe(PlanType.STANDARD);
    });
    httpMock.expectOne(`${apiUrl}/get-all-abonnements`).flush([mockPlan]);
  });

  it('should clear cache', () => {
    service.clearCache();
    // After clearing, next getAllPlans should trigger HTTP
    service.getAllPlans().subscribe();
    httpMock.expectOne(`${apiUrl}/get-all-abonnements`).flush([]);
  });
});
