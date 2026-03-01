import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService, BanErrorInfo } from '../../../../shared/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html'
})
export class LoginComponent {
  email = '';
  password = '';
  errorMessage = '';
  successMessage = '';
  banInfo: BanErrorInfo | null = null;
  isLoading = false;
  showPassword = false;
  rememberMe = false;

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
    return emailRegex.test(this.email) && this.password.length > 0;
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

    this.authService.login(this.email, this.password).subscribe({
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
