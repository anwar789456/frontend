import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Invoice } from '../models/invoice.model';

@Injectable({
  providedIn: 'root'
})
export class InvoiceService {
  private readonly apiUrl = '/api/abonnements/invoices';

  constructor(private http: HttpClient) {}

  getInvoicesForUser(userId: number): Observable<Invoice[]> {
    return this.http.get<Invoice[]>(`${this.apiUrl}/user/${userId}`);
  }

  downloadInvoicePdf(invoiceId: number, invoiceNumber: string): void {
    this.http.get(`${this.apiUrl}/${invoiceId}/pdf`, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice-${invoiceNumber}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('Failed to download invoice PDF:', err);
      }
    });
  }
}
