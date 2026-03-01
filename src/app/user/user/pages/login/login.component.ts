import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService, BanErrorInfo } from '../../../../shared/services/auth.service';
import { ImageCaptchaComponent, CaptchaResult } from '../../../../shared/components/image-captcha/image-captcha.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ImageCaptchaComponent],
  templateUrl: './login.component.html'
})
export class LoginComponent {
  @ViewChild('captchaRef') captchaRef!: ImageCaptchaComponent;

  email = '';
  password = '';
  errorMessage = '';
  successMessage = '';
  banInfo: BanErrorInfo | null = null;
  isLoading = false;
  showPassword = false;
  rememberMe = false;
  captchaResult: CaptchaResult | null = null;

  emailTouched = false;
  passwordTouched = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  get emailError(): string {
    if (!this.emailTouched) return '';
    if (!this.email.trim()) return 'Email is required.';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email)) return 'Please enter a valid email address.';
    return '';
  }

  get passwordError(): string {
    if (!this.passwordTouched) return '';
    if (!this.password) return 'Password is required.';
    return '';
  }

  get isFormValid(): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(this.email) && this.password.length > 0 && this.captchaResult !== null;
  }

  onCaptchaSolved(result: CaptchaResult): void {
    this.captchaResult = result;
  }

  onCaptchaCleared(): void {
    this.captchaResult = null;
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(): void {
    this.emailTouched = true;
    this.passwordTouched = true;

    if (!this.isFormValid) return;

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.banInfo = null;

    this.authService.login(
      this.email,
      this.password,
      this.captchaResult!.challengeId,
      this.captchaResult!.selectedIndex
    ).subscribe({
      next: (user) => {
        this.isLoading = false;
        this.successMessage = 'Login successful! Redirecting...';
        const redirectUrl = this.authService.getRedirectUrlForRole(user.role);
        setTimeout(() => {
          this.router.navigate([redirectUrl]);
        }, 1200);
      },
      error: (err: any) => {
        this.isLoading = false;
        // Refresh captcha on any error (challenge is consumed)
        this.captchaResult = null;
        if (this.captchaRef) this.captchaRef.refresh();

        if (err?.type === 'ban') {
          this.banInfo = err as BanErrorInfo;
          this.errorMessage = '';
        } else {
          this.banInfo = null;
          this.errorMessage = typeof err === 'string' ? err : (err?.message || 'An unexpected error occurred.');
        }
      }
    });
  }
}
