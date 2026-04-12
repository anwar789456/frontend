import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface MonthlyRevenue {
  year: number;
  month: number;
  revenue: number;
}

export interface MonthlyGrowth {
  year: number;
  month: number;
  newSubscribers: number;
}

export interface AnalyticsDashboard {
  totalSubscribers: number;
  activeSubscribers: number;
  expiredSubscribers: number;
  cancelledSubscribers: number;
  monthlyRevenue: MonthlyRevenue[];
  monthlyGrowth: MonthlyGrowth[];
  growthRatePercent: number;
}

export interface HealthScore {
  healthScore: number | null;
  grade: string;
  status: string;
  color: string;
  alerts: string[];
  breakdown: { [key: string]: number };
}

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private readonly apiUrl = 'https://minolingo.online/api/abonnements/analytics';

  constructor(private http: HttpClient) {}

  getDashboard(): Observable<AnalyticsDashboard> {
    return this.http.get<AnalyticsDashboard>(`${this.apiUrl}/dashboard`);
  }

  getHealthScore(): Observable<HealthScore> {
    return this.http.get<HealthScore>(`${this.apiUrl}/health-score`);
  }
}
