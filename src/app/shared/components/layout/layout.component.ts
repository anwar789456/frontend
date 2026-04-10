import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { AiAvatarComponent } from '../ai-avatar/ai-avatar.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, AiAvatarComponent],
  templateUrl: './layout.component.html'
})
export class LayoutComponent {
  constructor(private router: Router) {}

  get isForumsPage(): boolean {
    return this.router.url.startsWith('/forums');
  }

  get showFloatingAvatar(): boolean {
    return !this.router.url.startsWith('/ai-tutor');
  }
}
