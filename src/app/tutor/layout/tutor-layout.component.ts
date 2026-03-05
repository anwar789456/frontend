import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../shared/services/auth.service';

@Component({
  selector: 'app-tutor-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './tutor-layout.component.html'
})
export class TutorLayoutComponent {
  constructor(private authService: AuthService) {}

  logout(): void {
    this.authService.logout();
  }
  sidebarItems = [
    {
      section: 'TEACH',
      items: [
        { label: 'Dashboard', icon: 'dashboard', route: '/tutor/dashboard' },
        { label: 'My Courses', icon: 'courses', route: '/tutor/courses' },
        { label: 'Quizzes', icon: 'quiz', route: '/tutor/quiz' },
        // { label: 'Live Classes', icon: 'live', route: '/tutor/live-classes' }
      ]
    },
    {
      section: 'COMMUNITY',
      items: [
        { label: 'Forums', icon: 'forums', route: '/tutor/forums' },
        { label: 'Students', icon: 'students', route: '/tutor/students' },
        { label: 'Profile', icon: 'profile', route: '/tutor/profile' }
      ]
    }
  ];
}
