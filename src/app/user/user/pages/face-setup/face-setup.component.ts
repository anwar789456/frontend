import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService, AuthUser } from '../../../../shared/services/auth.service';
import { FaceRecognitionComponent, FaceResult } from '../../../../shared/components/face-recognition/face-recognition.component';

@Component({
  selector: 'app-face-setup',
  standalone: true,
  imports: [CommonModule, FaceRecognitionComponent],
  templateUrl: './face-setup.component.html'
})
export class FaceSetupComponent implements OnInit {
  user: AuthUser | null = null;
  registered = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.user = this.authService.currentUser;
    if (!this.user) {
      this.router.navigate(['/login']);
    }
  }

  onFaceResult(result: FaceResult): void {
    if (result.success) {
      this.registered = true;
      setTimeout(() => this.continue(), 2000);
    }
  }

  continue(): void {
    const role = this.user?.role || 'ETUDIANT';
    this.router.navigate([this.authService.getRedirectUrlForRole(role)]);
  }
}
