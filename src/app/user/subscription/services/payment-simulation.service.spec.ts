import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { PaymentSimulationService } from './payment-simulation.service';

describe('PaymentSimulationService', () => {
  let service: PaymentSimulationService;
  let httpMock: HttpTestingController;
  const apiUrl = 'https://minolingo.online/api/abonnements/payments';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), PaymentSimulationService]
    });
    service = TestBed.inject(PaymentSimulationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => { httpMock.verify(); });

  it('should be created', () => { expect(service).toBeTruthy(); });

  it('should simulate payment', () => {
    const req = { userId: 1, planId: 2, email: 'a@b.com' };
    service.simulatePayment(req).subscribe(r => {
      expect(r.success).toBe(true);
      expect(r.message).toContain('simulated');
    });
    const httpReq = httpMock.expectOne(`${apiUrl}/simulate`);
    expect(httpReq.request.method).toBe('POST');
    expect(httpReq.request.body).toEqual(req);
    httpReq.flush({ success: true, message: 'Payment simulated successfully' });
  });

  it('should check health', () => {
    service.healthCheck().subscribe(r => expect(r.success).toBe(true));
    httpMock.expectOne(`${apiUrl}/health`).flush({ success: true, message: 'Healthy' });
  });

  it('should handle 400 error', () => {
    service.simulatePayment({ userId: 1, planId: 999, email: 'a@b.com' }).subscribe({
      error: (err) => expect(err.message).toContain('Invalid')
    });
    httpMock.expectOne(`${apiUrl}/simulate`).flush(
      { message: 'Invalid plan' }, { status: 400, statusText: 'Bad Request' }
    );
  });

  it('should handle network error', () => {
    service.simulatePayment({ userId: 1, planId: 1, email: 'a@b.com' }).subscribe({
      error: (err) => expect(err.message).toContain('internet')
    });
    httpMock.expectOne(`${apiUrl}/simulate`).error(new ProgressEvent('error'), { status: 0, statusText: '' });
  });

  it('should handle 500 error', () => {
    service.healthCheck().subscribe({
      error: (err) => expect(err.message).toContain('Server error')
    });
    httpMock.expectOne(`${apiUrl}/health`).flush(null, { status: 500, statusText: 'Error' });
  });
});
