import { Component, OnInit, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { StripePaymentService, SendEmailRequest, ConfirmPaymentResponse } from '../services/stripe-payment.service';

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
  planName = '';
  subscribedAt = '';
  expiresAt = '';
  emailSent = false;
  countdown = 3;
  redirecting = false;
  private confirmAttempts = 0;
  private readonly maxConfirmAttempts = 3;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private stripeService: StripePaymentService,
    private ngZone: NgZone
  ) { }

  ngOnInit(): void {
    console.log('=== PaymentSuccessComponent: Initialized ===');

    // Get session ID — try ActivatedRoute first, fallback to raw window.location
    this.sessionId = this.route.snapshot.queryParamMap.get('session_id');

    if (!this.sessionId) {
      // Fallback: parse session_id directly from browser URL (bypasses Angular routing quirks)
      const params = new URLSearchParams(window.location.search);
      this.sessionId = params.get('session_id');
      console.log('session_id from window.location.search:', this.sessionId);
    }

    console.log('Session ID resolved:', this.sessionId);
    console.log('Current URL:', window.location.href);

    if (!this.sessionId) {
      console.error('session_id missing from URL:', window.location.href);
      this.errorMessage = 'Invalid payment session. Please try again.';
      this.isLoading = false;
      return;
    }

    // Read optional email from localStorage (non-critical)
    const storedEmail = localStorage.getItem('stripe_payment_email') || undefined;

    // userId and planId are resolved server-side from Stripe session metadata
    // Wait 2 seconds before confirming — gives Stripe time to finalize the payment status
    console.log('Waiting 2s before confirming payment with sessionId:', this.sessionId);
    setTimeout(() => {
      this.confirmPayment(storedEmail);
    }, 2000);
  }

  confirmPayment(email?: string): void {
    console.log('=== PaymentSuccessComponent: Confirm Payment ===');

    if (!this.sessionId) {
      console.error('Missing session ID for confirmation');
      return;
    }

    const requestPayload = {
      sessionId: this.sessionId,
      email: email
    };

    console.log('Confirmation Request Payload:', JSON.stringify(requestPayload, null, 2));

    this.confirmAttempts++;

    this.stripeService.confirmPayment(requestPayload).subscribe({
      next: (response: ConfirmPaymentResponse) => {
        console.log('=== PaymentSuccessComponent: Payment Confirmed Successfully ===');
        console.log('Response:', response);

        this.isLoading = false;

        if (response.success) {
          console.log('Payment successful! Subscription created.');
          this.isConfirmed = true;
          this.planName = response.planName || 'Premium';
          this.subscribedAt = response.subscribedAt || '';
          this.expiresAt = response.expiresAt || '';

          // Send confirmation email to user
          if (email) {
            this.sendConfirmationEmail(email, response);
          }

          // Clear local storage
          localStorage.removeItem('stripe_payment_email');

          // Start countdown and auto-redirect
          this.startRedirectCountdown();
        } else {
          // Retry up to maxConfirmAttempts if payment not yet confirmed
          if (this.confirmAttempts < this.maxConfirmAttempts) {
            console.warn(`Confirmation attempt ${this.confirmAttempts} failed, retrying in 3s...`);
            setTimeout(() => this.confirmPayment(email), 3000);
          } else {
            this.errorMessage = response.message || 'Failed to confirm payment';
          }
        }
      },
      error: (error) => {
        console.error('=== PaymentSuccessComponent: Payment Confirmation FAILED ===');
        console.error('Error status:', error.status, 'Message:', error.message);

        // Retry on transient errors (not 4xx client errors except 400 = payment timing)
        if (this.confirmAttempts < this.maxConfirmAttempts && (error.status === 0 || error.status >= 500 || error.status === 400)) {
          console.warn(`Confirm error attempt ${this.confirmAttempts}, retrying in 3s...`);
          setTimeout(() => this.confirmPayment(email), 3000);
        } else {
          this.isLoading = false;
          this.errorMessage = error.message || 'Failed to confirm payment';
        }
      }
    });
  }

  /**
   * Send a confirmation email to user after successful payment.
   * This is fire-and-forget — failures are logged but don't block success UX.
   */
  private sendConfirmationEmail(userEmail: string, response: ConfirmPaymentResponse): void {
    console.log('=== PaymentSuccessComponent: Sending Confirmation Email ===');

    const planName = response.planName || 'Premium';
    const amount = '';
    const subscriptionDate = response.subscribedAt
      ? new Date(response.subscribedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const expirationDate = response.expiresAt
      ? new Date(response.expiresAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      : '';

    const emailRequest: SendEmailRequest = {
      toEmail: userEmail,
      subject: 'Your MiNoLingo Subscription is Active! 🎉',
      userName: userEmail.split('@')[0], // Use email prefix as display name
      planName: planName,
      amount: amount,
      subscriptionDate: subscriptionDate,
      expirationDate: expirationDate
    };

    console.log('Email Request:', JSON.stringify(emailRequest, null, 2));

    this.stripeService.sendConfirmationEmail(emailRequest).subscribe({
      next: (response) => {
        console.log('=== PaymentSuccessComponent: Email Sent Successfully ===');
        console.log('Email Response:', response);
        this.emailSent = true;
      },
      error: (error) => {
        console.error('=== PaymentSuccessComponent: Email Send FAILED ===');
        console.error('Email Error:', error);
        // Don't show error to user — email failure is non-critical
      }
    });
  }

  /**
   * Start countdown timer and redirect to courses page
   */
  private startRedirectCountdown(): void {
    this.ngZone.run(() => {
      const timer = setInterval(() => {
        this.countdown--;
        if (this.countdown <= 0) {
          clearInterval(timer);
          this.redirecting = true;
          this.router.navigate(['/courses']);
        }
      }, 1000);
    });
  }

  goToCourses(): void {
    this.redirecting = true;
    this.router.navigate(['/courses']);
  }

  goToSubscriptions(): void {
    this.router.navigate(['/subscriptions']);
  }

  goToDashboard(): void {
    this.router.navigate(['/courses']);
  }
}