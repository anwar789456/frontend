import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent {
  stats = [
    { label: 'Total Users', value: '24,592', change: '+12%', icon: 'users', color: 'bg-[#e6f6ff]', iconColor: 'text-[#38a9f3]' },
    { label: 'Active Sessions', value: '1,840', change: '+5%', icon: 'sessions', color: 'bg-[#e6f6ff]', iconColor: 'text-[#38a9f3]' },
    { label: 'Open Reports', value: '38', change: '+2', icon: 'reports', color: 'bg-[#fef2f2]', iconColor: 'text-red-500' },
    { label: 'Revenue (Wk)', value: '$12.4k', change: '+2', icon: 'revenue', color: 'bg-[#f0fdf4]', iconColor: 'text-green-500' }
  ];

  chartDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  chartVisitors = [45, 60, 85, 100, 70, 55, 65];
  chartSessions = [30, 40, 55, 70, 50, 35, 45];
  activeChartTab = 'Visitors';

  flaggedReports = [
    { user: 'Sarah Chen', avatar: '👩', reason: 'Inappropriate Language', time: '2 hrs ago', status: 'High Risk', statusColor: 'bg-red-100 text-red-600' },
    { user: 'Marcus Johnson', avatar: '👨', reason: 'Spamming Forum', time: '5 hrs ago', status: 'Review', statusColor: 'bg-orange-100 text-orange-600' },
    { user: 'Elena Rodriguez', avatar: '👩', reason: 'Bot Behavior', time: '1 day ago', status: 'Review', statusColor: 'bg-orange-100 text-orange-600' }
  ];

  quickActions = [
    { label: 'New Event', icon: 'event' },
    { label: 'Add Tutor', icon: 'tutor' },
    { label: 'Ban User', icon: 'ban' },
    { label: 'Export', icon: 'export' }
  ];

  getMaxChart(): number {
    return Math.max(...this.chartVisitors);
  }
}
