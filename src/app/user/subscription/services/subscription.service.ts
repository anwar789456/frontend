import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, of } from 'rxjs';
import { catchError, tap, shareReplay, retry, map, finalize } from 'rxjs/operators';
import { SubscriptionPlan, UserSubscription, PlanType, SubscriptionStatus } from '../models/subscription.model';

export interface BookingResponse {
  subscription?: UserSubscription;
  message?: string;
}

export interface ServiceError {
  message: string;
  status: number;
  details?: any;
}

@Injectable({
  providedIn: 'root'
})
export class SubscriptionService {
  private readonly apiUrl = 'https://minolingo.online/api/abonnements';
  private plansCache$?: Observable<SubscriptionPlan[]>;
  private readonly maxRetries = 3;

  constructor(private http: HttpClient) { }

  // ── Subscription Plans ──

  createPlan(plan: SubscriptionPlan): Observable<SubscriptionPlan> {
    return this.http.post<SubscriptionPlan>(`${this.apiUrl}/create-abonnement`, plan).pipe(
      retry(this.maxRetries),
      catchError(this.handleError)
    );
  }

  getAllPlans(forceRefresh = false): Observable<SubscriptionPlan[]> {
    if (!forceRefresh && this.plansCache$) {
      return this.plansCache$;
    }

    this.plansCache$ = this.http.get<SubscriptionPlan[]>(`${this.apiUrl}/get-all-abonnements`).pipe(
      retry(this.maxRetries),
      catchError(this.handleError),
      shareReplay(1)
    );

    return this.plansCache$;
  }

  getPlanById(id: number): Observable<SubscriptionPlan> {
    return this.http.get<SubscriptionPlan>(`${this.apiUrl}/get-abonnement/${id}`).pipe(
      retry(this.maxRetries),
      catchError(this.handleError)
    );
  }

  updatePlan(id: number, plan: SubscriptionPlan): Observable<SubscriptionPlan> {
    // Clear cache when updating
    this.clearCache();
    return this.http.put<SubscriptionPlan>(`${this.apiUrl}/update-abonnement/${id}`, plan).pipe(
      retry(this.maxRetries),
      catchError(this.handleError)
    );
  }

  deletePlan(id: number): Observable<void> {
    // Clear cache when deleting
    this.clearCache();
    return this.http.delete<void>(`${this.apiUrl}/delete-abonnement/${id}`).pipe(
      retry(this.maxRetries),
      catchError(this.handleError)
    );
  }

  // ── Book a Plan ──

  bookPlan(userId: number, planId: number): Observable<UserSubscription> {
    return this.http.post<{ subscription: UserSubscription; message: string }>(
      `${this.apiUrl}/book`,
      { userId, planId }
    ).pipe(
      retry(this.maxRetries),
      map(response => response.subscription || response as any),
      catchError(this.handleError)
    );
  }

  // ── User Subscriptions ──

  createSubscription(subscription: Omit<UserSubscription, 'id'>): Observable<UserSubscription> {
    return this.http.post<UserSubscription>(`${this.apiUrl}/create-subscription`, subscription).pipe(
      retry(this.maxRetries),
      catchError(this.handleError)
    );
  }

  getAllSubscriptions(): Observable<UserSubscription[]> {
    return this.http.get<UserSubscription[]>(`${this.apiUrl}/get-all-subscriptions`).pipe(
      retry(this.maxRetries),
      catchError(this.handleError)
    );
  }

  getSubscriptionById(id: number): Observable<UserSubscription> {
    return this.http.get<UserSubscription>(`${this.apiUrl}/get-subscription/${id}`).pipe(
      retry(this.maxRetries),
      catchError(this.handleError)
    );
  }

  updateSubscription(id: number, subscription: UserSubscription): Observable<UserSubscription> {
    return this.http.put<UserSubscription>(`${this.apiUrl}/update-subscription/${id}`, subscription).pipe(
      retry(this.maxRetries),
      catchError(this.handleError)
    );
  }

  deleteSubscription(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/delete-subscription/${id}`).pipe(
      retry(this.maxRetries),
      catchError(this.handleError)
    );
  }

  // ── Helper Methods ──

  /**
   * Clear the plans cache
   */
  clearCache(): void {
    this.plansCache$ = undefined;
  }

  /**
   * Get plan by type from cached plans
   */
  getPlanByType(type: PlanType): Observable<SubscriptionPlan | undefined> {
    return this.getAllPlans().pipe(
      map(plans => plans.find(plan => plan.name === type))
    );
  }

  /**
   * Get plans filtered by type
   */
  getPlansByType(type: PlanType): Observable<SubscriptionPlan[]> {
    return this.getAllPlans().pipe(
      map(plans => plans.filter(plan => plan.name === type))
    );
  }

  /**
   * Check if a plan is free
   */
  isFreePlan(plan: SubscriptionPlan): boolean {
    return plan.price === 0 || plan.name === PlanType.FREEMIUM;
  }

  /**
   * Calculate monthly price from yearly price
   */
  getMonthlyPrice(yearlyPrice: number): number {
    return Math.round((yearlyPrice / 12) * 100) / 100;
  }

  /**
   * Check if subscription is active
   */
  isSubscriptionActive(subscription: UserSubscription | null | undefined): boolean {
    if (!subscription) return false;
    if (subscription.status !== SubscriptionStatus.ACTIVE) return false;
    
    const now = new Date();
    const expiry = new Date(subscription.expiresAt);
    return expiry > now;
  }

  /**
   * Get days remaining in subscription
   */
  getDaysRemaining(subscription: UserSubscription): number {
    const now = new Date();
    const expiry = new Date(subscription.expiresAt);
    const diff = expiry.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  /**
   * Standard error handler
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unexpected error occurred. Please try again.';

    if (error.status === 0) {
      errorMessage = 'Unable to connect to the server. Please check your internet connection.';
    } else if (error.status === 400) {
      errorMessage = error.error?.message || 'Invalid request. Please check your input.';
    } else if (error.status === 401) {
      errorMessage = 'Unauthorized. Please log in again.';
    } else if (error.status === 403) {
      errorMessage = 'You do not have permission to perform this action.';
    } else if (error.status === 404) {
      errorMessage = 'The requested resource was not found.';
    } else if (error.status >= 500) {
      errorMessage = 'Server error. Please try again later.';
    } else if (error.error?.message) {
      errorMessage = error.error.message;
    }

    console.error('SubscriptionService error:', error);
    return throwError(() => ({ message: errorMessage, status: error.status, details: error.error }));
  }
}
