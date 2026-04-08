import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChurnService, ChurnPrediction } from './services/churn.service';

@Component({
  selector: 'app-churn',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './churn.component.html'
})
export class ChurnComponent implements OnInit {
  serviceOnline = false;
  isLoading = false;
  errorMessage: string | null = null;
  prediction: ChurnPrediction | null = null;
  userId: number | null = null;

  features: { [key: string]: number } = {
    login_frequency: 5.0,
    last_login_days: 3,
    courses_completed: 5,
    active_courses: 2,
    payment_success_rate: 0.9,
    failed_payments_count: 0,
    subscription_duration_days: 180,
    email_open_rate: 0.5,
    email_click_rate: 0.2
  };

  featureFields = [
    { key: 'login_frequency', label: 'Login Frequency (per week)', step: 0.5 },
    { key: 'last_login_days', label: 'Days Since Last Login', step: 1 },
    { key: 'courses_completed', label: 'Courses Completed', step: 1 },
    { key: 'active_courses', label: 'Active Courses', step: 1 },
    { key: 'payment_success_rate', label: 'Payment Success Rate (0-1)', step: 0.05 },
    { key: 'failed_payments_count', label: 'Failed Payments Count', step: 1 },
    { key: 'subscription_duration_days', label: 'Subscription Duration (days)', step: 1 },
    { key: 'email_open_rate', label: 'Email Open Rate (0-1)', step: 0.05 },
    { key: 'email_click_rate', label: 'Email Click Rate (0-1)', step: 0.05 }
  ];

  sortedImportance: { key: string; value: number }[] = [];
  maxImportance = 1;

  constructor(private churnService: ChurnService) {}

  ngOnInit(): void {
    this.checkHealth();
  }

  checkHealth(): void {
    this.churnService.healthCheck().subscribe({
      next: (res) => {
        this.serviceOnline = res.status === 'ok';
      },
      error: () => {
        this.serviceOnline = false;
      }
    });
  }

  onFeatureChange(key: string, event: Event): void {
    const value = parseFloat((event.target as HTMLInputElement).value);
    if (!isNaN(value)) {
      this.features[key] = value;
    }
  }

  onUserIdChange(event: Event): void {
    const value = parseInt((event.target as HTMLInputElement).value, 10);
    this.userId = isNaN(value) ? null : value;
  }

  predict(): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.prediction = null;

    this.churnService.predictSingle(this.userId || 0, this.features).subscribe({
      next: (result) => {
        this.prediction = result;
        this.isLoading = false;
        if (result.featureImportance) {
          const entries = Object.entries(result.featureImportance)
            .map(([key, value]) => ({ key, value }))
            .sort((a, b) => b.value - a.value);
          this.sortedImportance = entries;
          this.maxImportance = entries.length > 0 ? entries[0].value : 1;
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = 'Failed to get prediction. Make sure both Spring Boot and Flask services are running.';
        console.error('Churn prediction error:', err);
      }
    });
  }

  getRiskBgClass(risk: string): string {
    switch (risk) {
      case 'HIGH': return 'bg-red-100';
      case 'MEDIUM': return 'bg-amber-100';
      case 'LOW': return 'bg-green-100';
      default: return 'bg-gray-100';
    }
  }

  getRiskTextClass(risk: string): string {
    switch (risk) {
      case 'HIGH': return 'text-red-600';
      case 'MEDIUM': return 'text-amber-600';
      case 'LOW': return 'text-green-600';
      default: return 'text-gray-600';
    }
  }

  getRiskBarClass(risk: string): string {
    switch (risk) {
      case 'HIGH': return 'bg-red-500';
      case 'MEDIUM': return 'bg-amber-500';
      case 'LOW': return 'bg-green-500';
      default: return 'bg-gray-400';
    }
  }

  formatFeatureName(key: string): string {
    return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
}
