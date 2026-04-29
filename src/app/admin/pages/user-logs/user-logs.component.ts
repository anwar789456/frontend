import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

export interface LoginLog {
  id: number;
  userId: number | null;
  email: string | null;
  loginMethod: 'PASSWORD' | 'FACE' | 'GOOGLE' | string;
  success: boolean;
  ipAddress: string | null;
  userAgent: string | null;
  loginTime: string;
}

@Component({
  selector: 'app-user-logs',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './user-logs.component.html'
})
export class UserLogsComponent implements OnInit {
  private readonly apiUrl = '/api/users/login-logs';

  logs: LoginLog[] = [];
  isLoading = false;
  errorMessage = '';
  searchQuery = '';
  methodFilter: '' | 'PASSWORD' | 'FACE' | 'GOOGLE' = '';
  statusFilter: '' | 'success' | 'failed' = '';

  currentPage = 1;
  pageSize = 15;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.http.get<LoginLog[]>(this.apiUrl).subscribe({
      next: (data) => {
        this.logs = data;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage = 'Failed to load login logs.';
      }
    });
  }

  get filtered(): LoginLog[] {
    const q = this.searchQuery.trim().toLowerCase();
    return this.logs.filter(l => {
      if (this.methodFilter && l.loginMethod !== this.methodFilter) return false;
      if (this.statusFilter === 'success' && !l.success) return false;
      if (this.statusFilter === 'failed' && l.success) return false;
      if (!q) return true;
      return (l.email || '').toLowerCase().includes(q)
        || String(l.userId || '').includes(q)
        || (l.ipAddress || '').toLowerCase().includes(q);
    });
  }

  get paged(): LoginLog[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filtered.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filtered.length / this.pageSize));
  }

  setPage(p: number): void {
    if (p < 1 || p > this.totalPages) return;
    this.currentPage = p;
  }

  methodLabel(m: string): string {
    switch (m) {
      case 'PASSWORD': return 'Email & Password';
      case 'FACE': return 'Face ID';
      case 'GOOGLE': return 'Google';
      default: return m;
    }
  }

  methodBadgeClass(m: string): string {
    switch (m) {
      case 'PASSWORD': return 'bg-blue-100 text-blue-700';
      case 'FACE': return 'bg-purple-100 text-purple-700';
      case 'GOOGLE': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.methodFilter = '';
    this.statusFilter = '';
    this.currentPage = 1;
  }
}
