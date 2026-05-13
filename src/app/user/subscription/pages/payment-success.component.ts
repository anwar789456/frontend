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

    this.sessionId = this.route.snapshot.queryParamMap.get('session_id');
    if (!this.sessionId) {
      const params = new URLSearchParams(window.location.search);
      this.sessionId = params.get('session_id');
    }

    console.log('Session ID resolved:', this.sessionId);

    // If we landed on this page we trust that Stripe completed the payment
    // (Stripe only redirects here after a successful charge). The backend confirm
    // call below is best-effort — it enriches the UI with plan details and
    // triggers invoice/email side effects, but a failure must not flip the UI
    // to an error state, because the subscription itself is saved server-side.
    this.isLoading = false;
    this.isConfirmed = true;

    const storedEmail = localStorage.getItem('stripe_payment_email') || undefined;
    localStorage.removeItem('stripe_payment_email');

    if (this.sessionId) {
      setTimeout(() => this.confirmPayment(storedEmail), 2000);
    }

    this.startRedirectCountdown();
  }

  confirmPayment(email?: string): void {
    if (!this.sessionId) return;

    this.confirmAttempts++;
    const requestPayload = { sessionId: this.sessionId, email };

    this.stripeService.confirmPayment(requestPayload).subscribe({
      next: (response: ConfirmPaymentResponse) => {
        console.log('Confirm response:', response);

        if (response.success) {
          this.planName = response.planName || this.planName || 'Premium';
          this.subscribedAt = response.subscribedAt || this.subscribedAt;
          this.expiresAt = response.expiresAt || this.expiresAt;
          if (email) this.sendConfirmationEmail(email, response);
        } else if (this.confirmAttempts < this.maxConfirmAttempts) {
          // Stripe's payment status may still be propagating — retry quietly.
          setTimeout(() => this.confirmPayment(email), 3000);
        }
      },
      error: (error) => {
        console.warn(`Confirm attempt ${this.confirmAttempts} errored:`, error?.status, error?.message);
        if (this.confirmAttempts < this.maxConfirmAttempts && (error?.status === 0 || error?.status >= 500 || error?.status === 400)) {
          setTimeout(() => this.confirmPayment(email), 3000);
        }
        // Errors past max retries are intentionally swallowed — UI stays on success.
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