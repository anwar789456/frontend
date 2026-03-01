import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SubscriptionPlan, UserSubscription } from '../models/subscription.model';

@Injectable({
  providedIn: 'root'
})
export class SubscriptionService {
  private readonly apiUrl = 'https://minolingo.online/api/abonnements';

  constructor(private http: HttpClient) {}

  // ── Subscription Plans ──

  createPlan(plan: SubscriptionPlan): Observable<SubscriptionPlan> {
    return this.http.post<SubscriptionPlan>(`${this.apiUrl}/create-abonnement`, plan);
  }

  getAllPlans(): Observable<SubscriptionPlan[]> {
    return this.http.get<SubscriptionPlan[]>(`${this.apiUrl}/get-all-abonnements`);
  }

  getPlanById(id: number): Observable<SubscriptionPlan> {
    return this.http.get<SubscriptionPlan>(`${this.apiUrl}/get-abonnement/${id}`);
  }

  updatePlan(id: number, plan: SubscriptionPlan): Observable<SubscriptionPlan> {
    return this.http.put<SubscriptionPlan>(`${this.apiUrl}/update-abonnement/${id}`, plan);
  }

  deletePlan(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/delete-abonnement/${id}`);
  }

  // ── User Subscriptions ──

  createSubscription(subscription: UserSubscription): Observable<UserSubscription> {
    return this.http.post<UserSubscription>(`${this.apiUrl}/create-subscription`, subscription);
  }

  getAllSubscriptions(): Observable<UserSubscription[]> {
    return this.http.get<UserSubscription[]>(`${this.apiUrl}/get-all-subscriptions`);
  }

  getSubscriptionById(id: number): Observable<UserSubscription> {
    return this.http.get<UserSubscription>(`${this.apiUrl}/get-subscription/${id}`);
  }

  updateSubscription(id: number, subscription: UserSubscription): Observable<UserSubscription> {
    return this.http.put<UserSubscription>(`${this.apiUrl}/update-subscription/${id}`, subscription);
  }

  deleteSubscription(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/delete-subscription/${id}`);
  }
}
