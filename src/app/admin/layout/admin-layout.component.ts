import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../shared/services/auth.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './admin-layout.component.html'
})
export class AdminLayoutComponent {
  constructor(private authService: AuthService) { }

  logout(): void {
    this.authService.logout();
  }
  sidebarItems = [
    {
      section: 'MAIN',
      items: [
        { label: 'Dashboard', icon: 'dashboard', route: '/admin/dashboard' },
        { label: 'Events', icon: 'events', route: '/admin/events' },
        { label: 'Sessions', icon: 'sessions', route: '/admin/sessions' }
      ]
    },
    {
      section: 'MANAGEMENT',
      items: [
        { label: 'Users', icon: 'users', route: '/admin/users' },
        { label: 'Reports', icon: 'reports', route: '/admin/reports', badge: 3 },
        { label: 'Forums', icon: 'forums', route: '/admin/forums' },
        { label: 'Donations', icon: 'donations', route: '/admin/donations' },
        { label: 'Subscriptions', icon: 'subscriptions', route: '/admin/subscriptions' }
      ]
    }
  ];

  settingsRoute = '/admin/settings';
}
