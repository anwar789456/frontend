import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

export interface DiscountCode {
  id: number;
  code: string;
  discountPercentage: number;
  maxUses: number | null;
  usesCount: number;
  isActive: boolean;
  createdAt: string;
}

@Component({
  selector: 'app-discounts',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './discounts.component.html',
  styleUrls: ['./discounts.component.css']
})
export class DiscountsComponent implements OnInit {
  discounts: DiscountCode[] = [];
  isLoading = false;
  isListLoading = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  newCode = {
    code: '',
    discountPercentage: 20,
    maxUses: null as number | null
  };

  private readonly apiUrl = '/api/abonnements';

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit() {
    this.loadDiscounts();
  }

  loadDiscounts() {
    this.isListLoading = true;
    this.errorMessage = null;

    this.http.get<DiscountCode[]>(this.apiUrl + '/discounts')
      .subscribe({
        next: (data) => {
          this.ngZone.run(() => {
            this.discounts = data;
            this.isListLoading = false;
            this.cdr.detectChanges();
          });
        },
        error: (err) => {
          this.ngZone.run(() => {
            this.errorMessage = 'Failed to load discount codes.';
            this.isListLoading = false;
            this.cdr.detectChanges();
          });
          console.error('Error loading discounts:', err);
        }
      });
  }

  createDiscount() {
    if (!this.newCode.code || !this.newCode.discountPercentage) {
      this.errorMessage = 'Please fill in required fields (Code and Discount %)';
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;
    this.successMessage = null;

    const payload = {
      code: this.newCode.code.toUpperCase(),
      discountPercentage: this.newCode.discountPercentage,
      maxUses: this.newCode.maxUses || null
    };

    this.http.post<DiscountCode>(this.apiUrl + '/discounts', payload)
      .subscribe({
        next: (response) => {
          this.ngZone.run(() => {
            this.successMessage = `Discount code "${this.newCode.code}" created successfully!`;
            this.isLoading = false;
            this.resetForm();
            this.loadDiscounts();
            this.cdr.detectChanges();
          });
        },
        error: (err) => {
          this.ngZone.run(() => {
            this.errorMessage = err.error?.message || 'Failed to create discount code. The code might already exist.';
            this.isLoading = false;
            this.cdr.detectChanges();
          });
          console.error('Error creating discount:', err);
        }
      });
  }

  deactivateCode(id: number, code: string) {
    if (!confirm(`Are you sure you want to deactivate discount code "${code}"?`)) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;
    this.successMessage = null;

    this.http.delete(this.apiUrl + `/discounts/${id}`)
      .subscribe({
        next: () => {
          this.ngZone.run(() => {
            this.successMessage = `Discount code "${code}" deactivated successfully!`;
            this.isLoading = false;
            this.loadDiscounts();
            this.cdr.detectChanges();
          });
        },
        error: (err) => {
          this.ngZone.run(() => {
            this.errorMessage = 'Failed to deactivate discount code.';
            this.isLoading = false;
            this.cdr.detectChanges();
          });
          console.error('Error deactivating discount:', err);
        }
      });
  }

  resetForm() {
    this.newCode = {
      code: '',
      discountPercentage: 20,
      maxUses: null
    };
    this.isLoading = false;
  }

  formatDate(dateString: string | null): string {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  }

  clearMessages() {
    this.errorMessage = null;
    this.successMessage = null;
  }

  // Helper methods for template
  getUsagePercentage(discount: DiscountCode): number {
    if (!discount.maxUses || discount.maxUses === 0) return 0;
    return Math.round((discount.usesCount / discount.maxUses) * 100);
  }

  getUsageClass(discount: DiscountCode): string {
    if (!discount.maxUses) return 'unlimited';
    const percentage = this.getUsagePercentage(discount);
    if (percentage >= 100) return 'full';
    if (percentage >= 80) return 'warning';
    return 'ok';
  }
}
