import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

export interface DiscountCode {
  id: number;
  code: string;
  discountPercentage: number;
  maxUses: number | null;
  usesCount: number;
  expiresAt: string | null;
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
  errorMessage: string | null = null;
  successMessage: string | null = null;

  newCode = {
    code: '',
    discountPercentage: 20,
    maxUses: null as number | null,
    expiresAt: null as Date | null
  };

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadDiscounts();
  }

  loadDiscounts() {
    this.isLoading = true;
    this.errorMessage = null;
    
    this.http.get<DiscountCode[]>('/api/abonnements/discounts')
      .subscribe({
        next: (data) => {
          this.discounts = data;
          this.isLoading = false;
        },
        error: (err) => {
          this.errorMessage = 'Failed to load discount codes.';
          this.isLoading = false;
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
      maxUses: this.newCode.maxUses || null,
      expiresAt: this.newCode.expiresAt ? new Date(this.newCode.expiresAt).toISOString() : null
    };

    this.http.post<DiscountCode>('/api/abonnements/discounts', payload)
      .subscribe({
        next: () => {
          this.successMessage = `Discount code "${this.newCode.code}" created successfully!`;
          this.loadDiscounts();
          this.resetForm();
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Failed to create discount code. The code might already exist.';
          this.isLoading = false;
          console.error('Error creating discount:', err);
        }
      });
  }

  deactivateCode(id: number, code: string) {
    if (!confirm(`Are you sure you want to deactivate discount code "${code}"?`)) {
      return;
    }

    this.http.delete(`/api/abonnements/discounts/${id}`)
      .subscribe({
        next: () => {
          this.successMessage = `Discount code "${code}" deactivated successfully!`;
          this.loadDiscounts();
        },
        error: (err) => {
          this.errorMessage = 'Failed to deactivate discount code.';
          console.error('Error deactivating discount:', err);
        }
      });
  }

  resetForm() {
    this.newCode = {
      code: '',
      discountPercentage: 20,
      maxUses: null,
      expiresAt: null
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

  isExpiringSoon(expiresAt: string | null): boolean {
    if (!expiresAt) return false;
    const expiryDate = new Date(expiresAt);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 7;
  }
}
