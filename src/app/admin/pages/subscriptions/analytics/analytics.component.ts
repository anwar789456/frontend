import { Component, AfterViewInit, ViewChild, ElementRef, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnalyticsService, AnalyticsDashboard, HealthScore } from './services/analytics.service';
import Chart from 'chart.js/auto';

@Component({
  selector: 'app-analytics-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './analytics.component.html'
})
export class AnalyticsDashboardComponent implements OnInit, AfterViewInit {
  @ViewChild('revenueChart') revenueChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('growthChart') growthChartRef!: ElementRef<HTMLCanvasElement>;

  dashboard: AnalyticsDashboard | null = null;
  healthScore: HealthScore | null = null;
  isLoading = true;
  isLoadingHealth = true;
  errorMessage: string | null = null;

  private revenueChart: Chart | null = null;
  private growthChart: Chart | null = null;
  private dataLoaded = false;
  private viewReady = false;

  constructor(
    private analyticsService: AnalyticsService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadDashboard();
    this.loadHealthScore();
  }

  private loadHealthScore(): void {
    this.isLoadingHealth = true;
    this.analyticsService.getHealthScore().subscribe({
      next: (data) => {
        this.healthScore = data;
        this.isLoadingHealth = false;
      },
      error: () => {
        this.healthScore = null;
        this.isLoadingHealth = false;
      }
    });
  }

  getHealthColorClasses(): string {
    if (!this.healthScore) return 'bg-gray-100 text-gray-600 border-gray-200';
    switch (this.healthScore.color) {
      case 'green': return 'bg-green-50 text-green-700 border-green-200';
      case 'blue': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'orange': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'red': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  }

  getHealthRingColor(): string {
    if (!this.healthScore) return '#9ca3af';
    switch (this.healthScore.color) {
      case 'green': return '#22c55e';
      case 'blue': return '#3b82f6';
      case 'orange': return '#f97316';
      case 'red': return '#ef4444';
      default: return '#9ca3af';
    }
  }

  getHealthRingOffset(): number {
    const score = this.healthScore?.healthScore ?? 0;
    const circumference = 2 * Math.PI * 45;
    return circumference - (score / 100) * circumference;
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    if (this.dataLoaded) {
      this.renderCharts();
    }
  }

  private loadDashboard(): void {
    this.isLoading = true;
    this.analyticsService.getDashboard().subscribe({
      next: (data) => {
        this.dashboard = data;
        this.isLoading = false;
        this.dataLoaded = true;
        // Force change detection to update view immediately
        this.cdr.detectChanges();
        if (this.viewReady) {
          setTimeout(() => this.renderCharts(), 0);
        }
      },
      error: (err) => {
        this.errorMessage = 'Failed to load analytics data.';
        this.isLoading = false;
        console.error('Analytics error:', err);
      }
    });
  }

  private renderCharts(): void {
    if (!this.dashboard) return;
    this.renderRevenueChart();
    this.renderGrowthChart();
  }

  private getMonthLabel(year: number, month: number): string {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${months[month - 1]} ${year}`;
  }

  private renderRevenueChart(): void {
    if (!this.revenueChartRef || !this.dashboard) return;
    if (this.revenueChart) this.revenueChart.destroy();

    const labels = this.dashboard.monthlyRevenue.map(r => this.getMonthLabel(r.year, r.month));
    const data = this.dashboard.monthlyRevenue.map(r => r.revenue);

    this.revenueChart = new Chart(this.revenueChartRef.nativeElement, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Revenue (USD)',
          data,
          backgroundColor: 'rgba(56, 169, 243, 0.7)',
          borderColor: 'rgba(56, 169, 243, 1)',
          borderWidth: 1,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { callback: (v: any) => '$' + v } }
        }
      }
    });
  }

  private renderGrowthChart(): void {
    if (!this.growthChartRef || !this.dashboard) return;
    if (this.growthChart) this.growthChart.destroy();

    const labels = this.dashboard.monthlyGrowth.map(g => this.getMonthLabel(g.year, g.month));
    const data = this.dashboard.monthlyGrowth.map(g => g.newSubscribers);

    this.growthChart = new Chart(this.growthChartRef.nativeElement, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'New Subscribers',
          data,
          borderColor: '#22c55e',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#22c55e',
          pointRadius: 4
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 } }
        }
      }
    });
  }
}
