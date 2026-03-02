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
    console.log('=== PaymentSuccessComponent: Initialized ===');
    
    // Get session ID from URL query parameters
    this.sessionId = this.route.snapshot.queryParamMap.get('session_id');
    
    console.log('Session ID from URL:', this.sessionId);
    console.log('Full URL Query Params:', this.route.snapshot.queryParamMap);
    
    // Get userId and planId from session storage (stored before redirect)
    const storedUserId = sessionStorage.getItem('stripe_payment_userId');
    const storedPlanId = sessionStorage.getItem('stripe_payment_planId');
    const storedEmail = sessionStorage.getItem('stripe_payment_email');

    console.log('Session Storage Data:', {
      userId: storedUserId,
      planId: storedPlanId,
      email: storedEmail
    });

    if (storedUserId) this.userId = parseInt(storedUserId, 10);
    if (storedPlanId) this.planId = parseInt(storedPlanId, 10);

    console.log('Parsed Values:', {
      userId: this.userId,
      planId: this.planId,
      email: storedEmail
    });

    if (!this.sessionId || !this.userId || !this.planId) {
      console.error('Missing required data!');
      console.error('Session ID:', this.sessionId);
      console.error('User ID:', this.userId);
      console.error('Plan ID:', this.planId);
      this.errorMessage = 'Invalid payment session. Please try again.';
      this.isLoading = false;
      return;
    }

    // Confirm payment with backend
    console.log('Proceeding to confirm payment...');
    this.confirmPayment(storedEmail || undefined);
  }

  confirmPayment(email?: string): void {
    console.log('=== PaymentSuccessComponent: Confirm Payment ===');
    
    if (!this.sessionId || !this.userId || !this.planId) {
      console.error('Missing required parameters for confirmation');
      return;
    }

    const requestPayload = {
      sessionId: this.sessionId,
      userId: this.userId,
      planId: this.planId,
      email: email
    };

    console.log('Confirmation Request Payload:', JSON.stringify(requestPayload, null, 2));

    this.stripeService.confirmPayment(requestPayload).subscribe({
      next: (response) => {
        console.log('=== PaymentSuccessComponent: Payment Confirmed Successfully ===');
        console.log('Response:', response);
        
        this.isLoading = false;
        
        if (response.success) {
          console.log('Payment successful! Subscription created.');
          this.isConfirmed = true;
          this.subscription = response.subscription;
          console.log('Subscription Details:', this.subscription);
          // Clear session storage
          sessionStorage.removeItem('stripe_payment_userId');
          sessionStorage.removeItem('stripe_payment_planId');
          sessionStorage.removeItem('stripe_payment_email');
        } else {
          console.error('Payment confirmation returned unsuccessful');
          console.error('Response message:', response.message);
          this.errorMessage = response.message || 'Failed to confirm payment';
        }
      },
      error: (error) => {
        console.error('=== PaymentSuccessComponent: Payment Confirmation FAILED ===');
        console.error('Error:', error);
        console.error('Error Message:', error.message);
        console.error('Error Status:', error.status);
        console.error('Error Details:', error.details);
        this.isLoading = false;
        this.errorMessage = error.message || 'Failed to confirm payment';
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