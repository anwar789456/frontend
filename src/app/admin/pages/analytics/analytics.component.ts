import { Component, AfterViewInit, ViewChild, ElementRef, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnalyticsService, AnalyticsDashboard } from './services/analytics.service';
import { AnalyticsChatbotComponent } from './components/analytics-chatbot/analytics-chatbot.component';
import Chart from 'chart.js/auto';

@Component({
  selector: 'app-analytics-dashboard',
  standalone: true,
  imports: [CommonModule, AnalyticsChatbotComponent],
  templateUrl: './analytics.component.html'
})
export class AnalyticsDashboardComponent implements OnInit, AfterViewInit {
  @ViewChild('revenueChart') revenueChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('growthChart') growthChartRef!: ElementRef<HTMLCanvasElement>;

  dashboard: AnalyticsDashboard | null = null;
  isLoading = true;
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
