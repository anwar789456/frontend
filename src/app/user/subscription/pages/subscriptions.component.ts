import { Component, OnInit, OnDestroy, ChangeDetectorRef, NgZone } from '@angular/core';
import { finalize, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SubscriptionPlan, PlanType, UserSubscription } from '../models/subscription.model';
import { SubscriptionService, ServiceError } from '../services/subscription.service';
import { AuthService } from '../../../shared/services/auth.service';
import { StripePaymentService } from '../services/stripe-payment.service';

@Component({
  selector: 'app-subscriptions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './subscriptions.component.html'
})
export class SubscriptionsComponent implements OnInit, OnDestroy {
  // UI State
  billingCycle: 'monthly' | 'yearly' = 'yearly';
  plans: SubscriptionPlan[] = [];
  isLoadingPlans = true;
  isBooking = false;
  activePlanId: number | null = null;
  
  // Active subscription (Feature 4)
  currentSubscription: UserSubscription | null = null;
  isTogglingAutoRenew = false;

  // Recommendation
  recommendedPlan: PlanType | null = null;
  recommendationReason: string | null = null;

  // Discount Code (Feature)
  discountCode: string = '';
  discountPercentage: number = 0;
  finalPrice: number = 0;
  isDiscountApplied: boolean = false;
  isApplyingDiscount: boolean = false;
  discountError: string | null = null;
  discountMessage: string | null = null;

  // Feedback
  subscriptionMessage: string | null = null;
  subscriptionError: string | null = null;
  messageTimeout?: NodeJS.Timeout;

  // Plan display configuration
  readonly planDisplayNames: Record<PlanType, string> = {
    [PlanType.FREEMIUM]: 'Basic',
    [PlanType.STANDARD]: 'Plus',
    [PlanType.PREMIUM]: 'Premium'
  };

  readonly planFeatures: Record<PlanType, string[]> = {
    [PlanType.FREEMIUM]: [
      'Access to all basic courses',
      'Daily vocabulary quiz',
      'Community forum access'
    ],
    [PlanType.STANDARD]: [
      'Everything in Basic',
      'Unlimited hearts & lives',
      'Offline mode learning',
      'Personalized mistakes review',
      'No ads'
    ],
    [PlanType.PREMIUM]: [
      'Everything in Plus',
      'Up to 6 premium accounts',
      'Family progress dashboard',
      'Parental controls'
    ]
  };

  readonly premiumBenefits = [
    { label: 'Learn 2x faster', icon: '🚀' },
    { label: 'Learn anywhere offline', icon: '📥' },
    { label: 'Exclusive challenges', icon: '🏆' },
    { label: 'Ad-free environment', icon: '🛡️' }
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private subscriptionService: SubscriptionService,
    private authService: AuthService,
    private stripeService: StripePaymentService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) { }

  ngOnInit(): void {
    this.loadPlans();
    this.loadCurrentSubscription();
    this.loadRecommendation();
  }

  private loadRecommendation(): void {
    const user = this.authService.currentUser;
    if (!user) return;
    this.subscriptionService.getRecommendation(user.id).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (rec) => {
        this.ngZone.run(() => {
          this.recommendedPlan = rec.recommendedPlan;
          this.recommendationReason = rec.reason;
          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.ngZone.run(() => {
          this.recommendedPlan = null;
          this.recommendationReason = null;
          this.cdr.detectChanges();
        });
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.clearMessageTimeout();
  }

  /**
   * Load all available subscription plans
   */
  private loadPlans(): void {
    this.isLoadingPlans = true;
    this.subscriptionError = null;

    this.subscriptionService.getAllPlans().pipe(
      takeUntil(this.destroy$),
      finalize(() => {
        this.ngZone.run(() => {
          this.isLoadingPlans = false;
          this.cdr.detectChanges();
        });
      })
    ).subscribe({
      next: (plans) => {
        this.ngZone.run(() => {
          this.plans = plans;
          this.cdr.detectChanges();
        });
      },
      error: (err: ServiceError) => {
        this.ngZone.run(() => {
          this.subscriptionError = err.message || 'Failed to load subscription plans.';
          this.cdr.detectChanges();
        });
        console.error('Failed to load plans:', err);
      }
    });
  }

  /**
   * Load current user's active subscription (Feature 4)
   */
  private loadCurrentSubscription(): void {
    const user = this.authService.currentUser;
    if (!user) return;
    this.subscriptionService.getCurrentSubscription(user.id).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (sub) => {
        this.ngZone.run(() => {
          this.currentSubscription = sub;
          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.ngZone.run(() => {
          this.currentSubscription = null;
          this.cdr.detectChanges();
        });
      }
    });
  }

  /**
   * Toggle auto-renew for the current subscription (Feature 4)
   */
  onAutoRenewToggle(): void {
    if (!this.currentSubscription?.id) return;
    this.isTogglingAutoRenew = true;
    const newValue = !this.currentSubscription.autoRenew;
    this.subscriptionService.toggleAutoRenew(this.currentSubscription.id, newValue).pipe(
      takeUntil(this.destroy$),
      finalize(() => {
        this.ngZone.run(() => {
          this.isTogglingAutoRenew = false;
          this.cdr.detectChanges();
        });
      })
    ).subscribe({
      next: (updated: UserSubscription) => {
        this.ngZone.run(() => {
          this.currentSubscription = updated;
          this.subscriptionMessage = newValue
            ? 'Auto-renew enabled. Your subscription will renew automatically.'
            : 'Auto-renew disabled.';
          this.setMessageTimeout();
          this.cdr.detectChanges();
        });
      },
      error: (err: ServiceError) => {
        this.ngZone.run(() => {
          this.subscriptionError = err.message || 'Failed to update auto-renew setting.';
          this.setMessageTimeout();
          this.cdr.detectChanges();
        });
      }
    });
  }

  /**
   * Handle plan selection and subscription
   */
  selectPlan(plan: SubscriptionPlan): void {
    // Clear previous messages
    this.clearMessageTimeout();
    this.subscriptionMessage = null;
    this.subscriptionError = null;

    // Check if user is authenticated
    const user = this.authService.currentUser;
    if (!user) {
      this.subscriptionError = 'You must be logged in to subscribe.';
      this.setMessageTimeout();
      return;
    }

    // Validate plan
    if (!plan.id) {
      this.subscriptionError = 'Invalid plan selected. Please try again.';
      this.setMessageTimeout();
      return;
    }

    // Proceed with booking
    this.bookPlan(user.id, plan.id, plan);
  }

  /**
   * Book/subscribe to a plan
   * For free plans: Direct booking
   * For paid plans: Redirect to Stripe Checkout
   */
  private bookPlan(userId: number, planId: number, plan: SubscriptionPlan): void {
    this.isBooking = true;
    this.activePlanId = planId;

    // Check if plan is free
    if (plan.price === 0 || this.subscriptionService.isFreePlan(plan)) {
      // Direct booking for free plans
      this.subscriptionService.bookPlan(userId, planId).pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isBooking = false;
          this.activePlanId = null;
        })
      ).subscribe({
        next: (subscription) => {
          this.subscriptionMessage = `Successfully subscribed to ${this.planDisplayNames[plan.name]}!`;
          this.setMessageTimeout();
          
          // Force refresh plans cache
          this.subscriptionService.clearCache();
        },
        error: (err: ServiceError) => {
          console.error('Booking failed:', err);
          this.subscriptionError = err.message || 'Failed to subscribe. Please try again.';
          this.setMessageTimeout();
        }
      });
    } else {
      // Paid plan - redirect to Stripe Checkout
      this.initiateStripePayment(userId, planId, plan);
    }
  }

  /**
   * Initiate Stripe Checkout payment for paid plans
   */
  private initiateStripePayment(userId: number, planId: number, plan: SubscriptionPlan): void {
    const user = this.authService.currentUser;
    
    console.log('=== SubscriptionsComponent: Initiate Stripe Payment ===');
    console.log('User:', user);
    console.log('User ID:', userId);
    console.log('User Email:', user?.email);
    console.log('Plan ID:', planId);
    console.log('Plan:', plan);
    console.log('Plan Name:', this.planDisplayNames[plan.name]);
    console.log('Plan Price:', plan.price);
    
    if (!user?.email) {
      console.error('User email is missing!');
      this.subscriptionError = 'User email is required for payment. Please update your profile.';
      this.isBooking = false;
      this.activePlanId = null;
      this.setMessageTimeout();
      return;
    }

    // Store payment info in local storage for confirmation page
    localStorage.setItem('stripe_payment_userId', userId.toString());
    localStorage.setItem('stripe_payment_planId', planId.toString());
    localStorage.setItem('stripe_payment_email', user.email);
    
    console.log('Local Storage Set:', {
      userId: localStorage.getItem('stripe_payment_userId'),
      planId: localStorage.getItem('stripe_payment_planId'),
      email: localStorage.getItem('stripe_payment_email')
    });

    // Create Stripe checkout session and redirect
    const requestPayload: { userId: number; planId: number; email: string; discountCode?: string } = {
      userId: userId,
      planId: planId,
      email: user.email
    };
    if (this.isDiscountApplied && this.discountCode) {
      requestPayload.discountCode = this.discountCode.trim().toUpperCase();
    }
    
    console.log('Sending request payload:', JSON.stringify(requestPayload, null, 2));
    
    this.stripeService.createCheckoutSession(requestPayload).pipe(
      takeUntil(this.destroy$),
      finalize(() => {
        this.isBooking = false;
        this.activePlanId = null;
      })
    ).subscribe({
      next: (response) => {
        console.log('=== SubscriptionsComponent: Stripe Session Created Successfully ===');
        console.log('Session ID:', response.sessionId);
        console.log('Session URL:', response.sessionUrl);
        
        // Redirect to Stripe Checkout
        this.stripeService.redirectToCheckout(response.sessionUrl).catch(err => {
          console.error('=== SubscriptionsComponent: Stripe Redirect FAILED ===');
          console.error('Error:', err);
          this.subscriptionError = 'Failed to redirect to payment. Please try again.';
          this.setMessageTimeout();
          // Clear local storage on error
          localStorage.removeItem('stripe_payment_userId');
          localStorage.removeItem('stripe_payment_planId');
          localStorage.removeItem('stripe_payment_email');
        });
      },
      error: (err: any) => {
        console.error('=== SubscriptionsComponent: Stripe Session Creation FAILED ===');
        console.error('Error:', err);
        console.error('Error Message:', err.message);
        console.error('Error Status:', err.status);
        console.error('Error Details:', err.details);
        this.subscriptionError = err.message || 'Failed to create payment session. Please try again.';
        this.setMessageTimeout();
        // Clear local storage on error
        localStorage.removeItem('stripe_payment_userId');
        localStorage.removeItem('stripe_payment_planId');
        localStorage.removeItem('stripe_payment_email');
      }
    });
  }

  /**
   * Get current user ID
   */
  getCurrentUserId(): number | null {
    const user = this.authService.currentUser;
    return user ? user.id : null;
  }

  /**
   * Calculate plan price based on billing cycle
   */
  getPrice(plan: SubscriptionPlan): number {
    if (this.billingCycle === 'monthly' && plan.price > 0) {
      return this.subscriptionService.getMonthlyPrice(plan.price);
    }
    return plan.price;
  }

  /**
   * Get price label (per month, per year, or free)
   */
  getPriceLabel(plan: SubscriptionPlan): string {
    if (plan.price === 0) return 'Forever free';
    return this.billingCycle === 'yearly' ? 'per year' : 'per month';
  }

  /**
   * Check if a plan is currently being processed
   */
  isPlanProcessing(plan: SubscriptionPlan): boolean {
    return this.isBooking && this.activePlanId === plan.id;
  }

  /**
   * Set timeout for auto-clearing messages
   */
  private setMessageTimeout(): void {
    this.clearMessageTimeout();
    this.messageTimeout = setTimeout(() => {
      this.subscriptionMessage = null;
      this.subscriptionError = null;
    }, 5000);
  }

  /**
   * Clear message timeout
   */
  private clearMessageTimeout(): void {
    if (this.messageTimeout) {
      clearTimeout(this.messageTimeout);
      this.messageTimeout = undefined;
    }
  }

  /**
   * Get plan type for styling
   */
  getPlanClass(plan: SubscriptionPlan): string {
    switch (plan.name) {
      case PlanType.FREEMIUM:
        return 'border-gray-200 bg-gray-50';
      case PlanType.STANDARD:
        return 'border-blue-200 bg-blue-50';
      case PlanType.PREMIUM:
        return 'border-purple-200 bg-purple-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  }

  /**
   * Get button class based on plan type
   */
  getButtonClass(plan: SubscriptionPlan): string {
    if (this.isPlanProcessing(plan)) {
      return 'opacity-50 cursor-not-allowed';
    }

    switch (plan.name) {
      case PlanType.FREEMIUM:
        return 'bg-gray-200 text-gray-700 hover:bg-gray-300';
      case PlanType.STANDARD:
        return 'bg-[#38a9f3] text-white hover:bg-[#0288d1]';
      case PlanType.PREMIUM:
        return 'bg-purple-500 text-white hover:bg-purple-600';
      default:
        return 'bg-gray-200 text-gray-700 hover:bg-gray-300';
    }
  }

  /**
   * Format price for display
   */
  formatPrice(price: number): string {
    return price.toFixed(2);
  }

  /**
   * Get savings percentage when choosing yearly
   */
  getYearlySavings(plan: SubscriptionPlan): number {
    if (plan.price === 0) return 0;
    const monthlyPrice = this.subscriptionService.getMonthlyPrice(plan.price);
    const yearlyMonthlyTotal = monthlyPrice * 12;
    const savings = ((yearlyMonthlyTotal - plan.price) / yearlyMonthlyTotal) * 100;
    return Math.round(savings);
  }

  /**
   * Apply discount code
   */
  applyDiscountCode(): void {
    if (!this.discountCode || this.discountCode.trim() === '') {
      this.discountError = 'Please enter a discount code';
      return;
    }

    this.isApplyingDiscount = true;
    this.discountError = null;
    this.discountMessage = null;

    this.subscriptionService.validateDiscountCode(this.discountCode.trim().toUpperCase()).pipe(
      takeUntil(this.destroy$),
      finalize(() => {
        this.isApplyingDiscount = false;
      })
    ).subscribe({
      next: (response: { code: string; discountPercentage: number }) => {
        this.ngZone.run(() => {
          this.discountPercentage = response.discountPercentage;
          this.isDiscountApplied = true;
          this.discountMessage = `✓ ${this.discountPercentage}% discount applied!`;
          this.discountCode = this.discountCode.toUpperCase();
          this.updateFinalPrice();
          this.cdr.detectChanges();
        });
      },
      error: (err: ServiceError) => {
        this.ngZone.run(() => {
          this.discountError = err.message || 'Invalid or expired discount code';
          this.isDiscountApplied = false;
          this.discountPercentage = 0;
          this.cdr.detectChanges();
        });
      }
    });
  }

  /**
   * Update final price based on discount
   */
  updateFinalPrice(): void {
    if (this.selectedPlanId) {
      const selectedPlan = this.plans.find(p => p.id === this.selectedPlanId);
      if (selectedPlan) {
        const basePrice = this.getPrice(selectedPlan);
        this.finalPrice = basePrice * (100 - this.discountPercentage) / 100;
      }
    }
  }

  /**
   * Get final price for a plan (with discount applied)
   */
  getFinalPrice(plan: SubscriptionPlan): number {
    const basePrice = this.getPrice(plan);
    return basePrice * (100 - this.discountPercentage) / 100;
  }

  /**
   * Get savings amount from discount
   */
  getDiscountSavings(plan: SubscriptionPlan): number {
    if (!this.isDiscountApplied) return 0;
    const basePrice = this.getPrice(plan);
    return basePrice - this.getFinalPrice(plan);
  }

  /**
   * Clear discount code
   */
  clearDiscountCode(): void {
    this.discountCode = '';
    this.discountPercentage = 0;
    this.isDiscountApplied = false;
    this.discountError = null;
    this.discountMessage = null;
    this.finalPrice = 0;
  }

  /**
   * Get selected plan ID
   */
  get selectedPlanId(): number | null {
    return this.activePlanId;
  }
}
