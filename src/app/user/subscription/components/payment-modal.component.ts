import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SubscriptionPlan, PlanType } from '../models/subscription.model';
import { PaymentSimulationService } from '../services/payment-simulation.service';

@Component({
  selector: 'app-payment-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './payment-modal.component.html',
  styleUrl: './payment-modal.component.css'
})
export class PaymentModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() plan!: SubscriptionPlan;
  @Input() userId: number | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() paymentSuccess = new EventEmitter<void>();

  // Form data
  cardNumber = '4242 4242 4242 4242';
  cardName = '';
  cardExpiry = '12/25';
  cardCvc = '123';
  email = '';

  // UI State
  isLoading = false;
  errorMessage = '';

  constructor(private paymentService: PaymentSimulationService) {}

  /**
   * Lifecycle hook - reset form when modal opens
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && changes['isOpen'].currentValue === true) {
      this.resetForm();
    }
  }

  /**
   * Reset form to initial state
   */
  resetForm(): void {
    this.cardNumber = '4242 4242 4242 4242';
    this.cardName = '';
    this.cardExpiry = '12/25';
    this.cardCvc = '123';
    this.email = '';
    this.isLoading = false;
    this.errorMessage = '';
  }

  /**
   * Close modal
   */
  closeModal(): void {
    this.isOpen = false;
    this.close.emit();
  }

  /**
   * Simulate payment
   */
  simulatePayment(): void {
    if (!this.userId || !this.plan?.id) {
      this.errorMessage = 'Invalid payment information';
      return;
    }

    // Validate email
    if (!this.email || !this.email.trim()) {
      this.errorMessage = 'Please enter your email address';
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email)) {
      this.errorMessage = 'Please enter a valid email address';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.paymentService.simulatePayment({
      userId: this.userId,
      planId: this.plan.id,
      email: this.email
    }).subscribe({
      next: (response) => {
        this.isLoading = false;
        
        if (response.success) {
          this.closeModal();
          this.paymentSuccess.emit();
        } else {
          this.errorMessage = response.message || 'Payment failed. Please try again.';
        }
      },
      error: (err: any) => {
        this.isLoading = false;
        this.errorMessage = err.message || 'Payment failed. Please try again.';
      }
    });
  }

  /**
   * Get plan type for styling
   */
  getPlanType(): PlanType {
    return this.plan?.name || PlanType.FREEMIUM;
  }

  /**
   * Get formatted price
   */
  getFormattedPrice(): string {
    if (!this.plan) return '$0.00';
    return `$${this.plan.price.toFixed(2)}`;
  }

  /**
   * Get plan display name
   */
  getPlanDisplayName(): string {
    if (!this.plan) return 'Unknown Plan';
    
    const displayNames: Record<PlanType, string> = {
      [PlanType.FREEMIUM]: 'Basic',
      [PlanType.STANDARD]: 'Plus',
      [PlanType.PREMIUM]: 'Premium'
    };
    
    return displayNames[this.plan.name] || this.plan.name;
  }

  /**
   * Prevent clicks inside modal from closing it
   */
  stopPropagation(event: Event): void {
    event.stopPropagation();
  }
}