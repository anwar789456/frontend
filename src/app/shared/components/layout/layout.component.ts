import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { AuthService } from '../../services/auth.service';
import { SessionMonitorService } from '../../services/session-monitor.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, CommonModule],
  templateUrl: './layout.component.html'
})
export class LayoutComponent implements OnInit, OnDestroy {
  showConflictDialog = false;

  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private authService: AuthService,
    private sessionMonitor: SessionMonitorService
  ) {}

  ngOnInit(): void {
    const user = this.authService.currentUser;
    if (user?.sessionToken) {
      this.sessionMonitor.startMonitoring(user.id, user.sessionToken);
      this.sessionMonitor.sessionConflict$
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          this.showConflictDialog = true;
        });
    }
  }

  onConflictAcknowledged(): void {
    this.showConflictDialog = false;
    this.authService.logout();
  }

  get isForumsPage(): boolean {
    return this.router.url.startsWith('/forums');
  }

  ngOnDestroy(): void {
    this.sessionMonitor.stopMonitoring();
    this.destroy$.next();
    this.destroy$.complete();
  }
}
