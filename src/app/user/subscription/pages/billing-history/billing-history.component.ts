import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InvoiceService } from '../../services/invoice.service';
import { Invoice } from '../../models/invoice.model';
import { AuthService } from '../../../../shared/services/auth.service';

@Component({
  selector: 'app-billing-history',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './billing-history.component.html'
})
export class BillingHistoryComponent implements OnInit {
  invoices: Invoice[] = [];
  isLoading = true;
  errorMessage: string | null = null;

  constructor(
    private invoiceService: InvoiceService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const user = this.authService.currentUser;
    if (!user) {
      this.errorMessage = 'You must be logged in to view billing history.';
      this.isLoading = false;
      return;
    }

    this.invoiceService.getInvoicesForUser(user.id).subscribe({
      next: (data) => {
        this.invoices = data;
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = 'Failed to load billing history.';
        this.isLoading = false;
        console.error('Billing history error:', err);
      }
    });
  }

  downloadPdf(invoice: Invoice): void {
    this.invoiceService.downloadInvoicePdf(invoice.id, invoice.invoiceNumber);
  }
}
