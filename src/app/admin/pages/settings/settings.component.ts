import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.component.html'
})
export class SettingsComponent {
  settingsTabs = [
    { label: 'Profile', icon: 'profile', active: true },
    { label: 'Notifications', icon: 'notifications', active: false },
    { label: 'Security', icon: 'security', active: false },
    { label: 'General', icon: 'general', active: false }
  ];

  activeSettingsTab = 'Profile';

  profile = {
    firstName: 'Sarah',
    lastName: 'Jenkins',
    email: 'sarah.jenkins@nino.edu',
    bio: 'Senior administrator managing student affairs and event coordination.'
  };

  notifications = {
    newUserRegistrations: true,
    reportAlerts: true
  };

  selectSettingsTab(tab: string) {
    this.activeSettingsTab = tab;
  }
}
