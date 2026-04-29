import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { StripePaymentService } from './stripe-payment.service';

describe('StripePaymentService', () => {
  let service: StripePaymentService;
  let httpMock: HttpTestingController;
  const apiUrl = '/api/abonnements/payments';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), StripePaymentService]
    });
    service = TestBed.inject(StripePaymentService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => { httpMock.verify(); });

  it('should be created', () => { expect(service).toBeTruthy(); });

  it('should get stripe config', () => {
    service.getStripeConfig().subscribe(c => {
      expect(c.publishableKey).toBe('pk_test_123');
    });
    httpMock.expectOne(`${apiUrl}/config`).flush({ publishableKey: 'pk_test_123' });
  });

  it('should create checkout session', () => {
    const req = { userId: 1, planId: 2, email: 'a@b.com' };
    service.createCheckoutSession(req).subscribe(r => {
      expect(r.sessionId).toBe('sess_123');
      expect(r.sessionUrl).toContain('checkout');
    });
    httpMock.expectOne(`${apiUrl}/create-checkout-session`).flush({
      sessionId: 'sess_123', sessionUrl: 'https://checkout.stripe.com/sess_123'
    });
  });

  it('should confirm payment', () => {
    const req = { sessionId: 'sess_123', userId: 1, planId: 2 };
    service.confirmPayment(req).subscribe(r => {
      expect(r.success).toBe(true);
    });
    httpMock.expectOne(`${apiUrl}/confirm`).flush({ success: true, message: 'Payment confirmed' });
  });

  it('should send confirmation email', () => {
    const req = { toEmail: 'a@b.com', subject: 'Confirmation', userName: 'John', planName: 'Standard' };
    service.sendConfirmationEmail(req).subscribe(r => {
      expect(r.success).toBe(true);
    });
    httpMock.expectOne('/api/abonnements/email/send').flush({ success: true, message: 'Email sent' });
  });

  it('should check health', () => {
    service.healthCheck().subscribe(r => expect(r.status).toBe('ok'));
    httpMock.expectOne(`${apiUrl}/health`).flush({ status: 'ok' });
  });

  it('should handle 400 error in createCheckoutSession', () => {
    service.createCheckoutSession({ userId: 1, planId: 999, email: 'a@b.com' }).subscribe({
      error: (err) => expect(err.message).toContain('Invalid')
    });
    httpMock.expectOne(`${apiUrl}/create-checkout-session`).flush(
      { error: 'Invalid plan' }, { status: 400, statusText: 'Bad Request' }
    );
  });

  it('should handle 500 error in confirmPayment', () => {
    service.confirmPayment({ sessionId: 'x', userId: 1, planId: 1 }).subscribe({
      error: (err) => expect(err.message).toContain('Server error')
    });
    httpMock.expectOne(`${apiUrl}/confirm`).flush(null, { status: 500, statusText: 'Server Error' });
  });
});
