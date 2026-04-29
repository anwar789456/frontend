import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { InvoiceService } from './invoice.service';
import { Invoice } from '../models/invoice.model';

describe('InvoiceService', () => {
  let service: InvoiceService;
  let httpMock: HttpTestingController;
  const apiUrl = '/api/abonnements/invoices';

  const mockInvoice: Invoice = {
    id: 1, invoiceNumber: 'INV-001', planName: 'Standard',
    amount: 9.99, issuedAt: '2026-04-01', renewalDate: '2026-05-01',
    subscriptionStatus: 'ACTIVE', paid: true, stripeSessionId: 'sess_123'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), InvoiceService]
    });
    service = TestBed.inject(InvoiceService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => { httpMock.verify(); });

  it('should be created', () => { expect(service).toBeTruthy(); });

  it('should get invoices for user', () => {
    service.getInvoicesForUser(10).subscribe(invoices => {
      expect(invoices.length).toBe(2);
      expect(invoices[0].invoiceNumber).toBe('INV-001');
    });
    httpMock.expectOne(`${apiUrl}/user/10`).flush([mockInvoice, { ...mockInvoice, id: 2, invoiceNumber: 'INV-002' }]);
  });

  it('should return empty array when no invoices', () => {
    service.getInvoicesForUser(999).subscribe(inv => expect(inv).toEqual([]));
    httpMock.expectOne(`${apiUrl}/user/999`).flush([]);
  });

  it('should download invoice PDF', () => {
    // downloadInvoicePdf triggers an internal subscribe, so we just verify the request
    service.downloadInvoicePdf(1, 'INV-001');
    const req = httpMock.expectOne(`${apiUrl}/1/pdf`);
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob(['pdf'], { type: 'application/pdf' }));
  });
});
