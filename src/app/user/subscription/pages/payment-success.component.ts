import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { StripePaymentService } from '../services/stripe-payment.service';

@Component({
  selector: 'app-payment-success',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './payment-success.component.html',
  styleUrl: './payment-success.component.css'
})
export class PaymentSuccessComponent implements OnInit {
  sessionId: string | null = null;
  userId: number | null = null;
  planId: number | null = null;
  isLoading = true;
  isConfirmed = false;
  errorMessage = '';
  subscription: any = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private stripeService: StripePaymentService
  ) {}

  ngOnInit(): void {
    // Get session ID from URL query parameters
    this.sessionId = this.route.snapshot.queryParamMap.get('session_id');
    
    // Get userId and planId from session storage (stored before redirect)
    const storedUserId = sessionStorage.getItem('stripe_payment_userId');
    const storedPlanId = sessionStorage.getItem('stripe_payment_planId');
    const storedEmail = sessionStorage.getItem('stripe_payment_email');

    if (storedUserId) this.userId = parseInt(storedUserId, 10);
    if (storedPlanId) this.planId = parseInt(storedPlanId, 10);

    if (!this.sessionId || !this.userId || !this.planId) {
      this.errorMessage = 'Invalid payment session. Please try again.';
      this.isLoading = false;
      return;
    }

    // Confirm payment with backend
    this.confirmPayment(storedEmail || undefined);
  }

  confirmPayment(email?: string): void {
    if (!this.sessionId || !this.userId || !this.planId) {
      return;
    }

    this.stripeService.confirmPayment({
      sessionId: this.sessionId,
      userId: this.userId,
      planId: this.planId,
      email: email
    }).subscribe({
      next: (response) => {
        this.isLoading = false;
        
        if (response.success) {
          this.isConfirmed = true;
          this.subscription = response.subscription;
          // Clear session storage
          sessionStorage.removeItem('stripe_payment_userId');
          sessionStorage.removeItem('stripe_payment_planId');
          sessionStorage.removeItem('stripe_payment_email');
        } else {
          this.errorMessage = response.message || 'Failed to confirm payment';
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.message || 'Failed to confirm payment';
        console.error('Payment confirmation error:', error);
      }
    });
  }

  goToSubscriptions(): void {
    this.router.navigate(['/user/subscription']);
  }

  goToDashboard(): void {
    this.router.navigate(['/user']);
  }
}