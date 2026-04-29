import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { loadStripe } from '@stripe/stripe-js';
import type { Stripe } from '@stripe/stripe-js';

export interface CreateCheckoutSessionRequest {
  userId: number;
  planId: number;
  email: string;
  discountCode?: string;
}

export interface CreateCheckoutSessionResponse {
  sessionId: string;
  sessionUrl: string;
}

export interface ConfirmPaymentRequest {
  sessionId: string;
  userId: number;
  planId: number;
  email?: string;
}

export interface ConfirmPaymentResponse {
  success: boolean;
  message: string;
  subscription?: any;
}

export interface StripeConfig {
  publishableKey: string;
}

export interface SendEmailRequest {
  toEmail: string;
  subject: string;
  userName?: string;
  planName?: string;
  amount?: string;
  subscriptionDate?: string;
  expirationDate?: string;
}

export interface SendEmailResponse {
  success: boolean;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class StripePaymentService {
  private readonly apiUrl = '/api/abonnements/payments';
  private stripe: Stripe | null = null;

  constructor(private http: HttpClient) { }

  /**
   * Initialize Stripe with publishable key
   */
  async initializeStripe(): Promise<void> {
    if (!this.stripe) {
      const config = await this.getStripeConfig().toPromise();
      if (config) {
        this.stripe = await loadStripe(config.publishableKey);
      }
    }
  }

  /**
   * Get Stripe configuration (publishable key)
   */
  getStripeConfig(): Observable<StripeConfig> {
    return this.http.get<StripeConfig>(`${this.apiUrl}/config`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Create a Stripe Checkout session
   */
  createCheckoutSession(request: CreateCheckoutSessionRequest): Observable<CreateCheckoutSessionResponse> {
    const fullUrl = `/api/abonnements/payments/create-checkout-session`;

    console.log('=== StripePaymentService: Create Checkout Session ===');
    console.log('Full URL:', fullUrl);
    console.log('Request Data:', JSON.stringify(request, null, 2));
    console.log('API Base URL:', this.apiUrl);

    return this.http.post<CreateCheckoutSessionResponse>(fullUrl, request).pipe(
      catchError(error => {
        console.error('=== StripePaymentService: Create Checkout Session FAILED ===');
        console.error('Error Status:', error.status);
        console.error('Error URL:', error.url);
        console.error('Error Details:', error.error);
        console.error('Full Error:', error);
        return this.handleError(error);
      })
    );
  }

  /**
   * Redirect to Stripe Checkout using the session URL directly
   * This is simpler and more reliable than using Stripe.js redirect
   */
  async redirectToCheckout(sessionUrl: string): Promise<void> {
    // Directly navigate to Stripe Checkout URL
    window.location.href = sessionUrl;
  }

  /**
   * Confirm payment and activate subscription
   */
  confirmPayment(request: ConfirmPaymentRequest): Observable<ConfirmPaymentResponse> {
    const fullUrl = `${this.apiUrl}/confirm`;

    console.log('=== StripePaymentService: Confirm Payment ===');
    console.log('Full URL:', fullUrl);
    console.log('Request Data:', JSON.stringify(request, null, 2));
    console.log('API Base URL:', this.apiUrl);

    return this.http.post<ConfirmPaymentResponse>(fullUrl, request).pipe(
      catchError(error => {
        console.error('=== StripePaymentService: Confirm Payment FAILED ===');
        console.error('Error Status:', error.status);
        console.error('Error URL:', error.url);
        console.error('Error Details:', error.error);
        console.error('Full Error:', error);
        return this.handleError(error);
      })
    );
  }

  /**
   * Send a confirmation email via the backend
   */
  sendConfirmationEmail(request: SendEmailRequest): Observable<SendEmailResponse> {
    const fullUrl = `/api/abonnements/email/send`;

    console.log('=== StripePaymentService: Send Confirmation Email ===');
    console.log('Full URL:', fullUrl);
    console.log('Request Data:', JSON.stringify(request, null, 2));

    return this.http.post<SendEmailResponse>(fullUrl, request).pipe(
      catchError(error => {
        console.error('=== StripePaymentService: Send Email FAILED ===');
        console.error('Error:', error);
        return this.handleError(error);
      })
    );
  }

  /**
   * Check if payment service is healthy
   */
  healthCheck(): Observable<any> {
    return this.http.get(`${this.apiUrl}/health`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Standard error handler
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unexpected error occurred. Please try again.';

    if (error.status === 0) {
      errorMessage = 'Unable to connect to the server. Please check your internet connection.';
    } else if (error.status === 400) {
      errorMessage = error.error?.error || error.error?.message || 'Invalid request. Please check your input.';
    } else if (error.status === 401) {
      errorMessage = 'Unauthorized. Please log in again.';
    } else if (error.status === 403) {
      errorMessage = 'You do not have permission to perform this action.';
    } else if (error.status === 404) {
      errorMessage = 'The requested resource was not found.';
    } else if (error.status >= 500) {
      errorMessage = 'Server error. Please try again later.';
    } else if (error.error?.error) {
      errorMessage = error.error.error;
    } else if (error.error?.message) {
      errorMessage = error.error.message;
    }

    console.error('StripePaymentService error:', error);
    return throwError(() => ({ message: errorMessage, status: error.status, details: error.error }));
  }
}