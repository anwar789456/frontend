import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../../../shared/services/auth.service';

@Component({
  selector: 'app-verify-code',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './verify-code.component.html'
})
export class VerifyCodeComponent implements OnInit {
  email = '';
  role = '';
  code = '';
  isLoading = false;
  isResending = false;
  successMessage = '';
  errorMessage = '';
  resendMessage = '';
  resendCountdown = 0;

  // 6 individual digit inputs
  digits: string[] = ['', '', '', '', '', ''];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.email = this.route.snapshot.queryParamMap.get('email') || '';
    this.role = this.route.snapshot.queryParamMap.get('role') || '';
    if (!this.email) {
      this.router.navigate(['/register']);
    }
  }

  onDigitInput(index: number, event: any): void {
    const value = event.target.value.replace(/\D/g, '').slice(-1);
    this.digits[index] = value;
    this.errorMessage = '';

    if (value && index < 5) {
      const next = document.getElementById(`digit-${index + 1}`);
      next?.focus();
    }

    // Auto-submit when all 6 digits filled
    if (this.digits.every(d => d !== '')) {
      this.onSubmit();
    }
  }

  onDigitKeydown(index: number, event: KeyboardEvent): void {
    if (event.key === 'Backspace' && !this.digits[index] && index > 0) {
      const prev = document.getElementById(`digit-${index - 1}`);
      prev?.focus();
    }
  }

  onPaste(event: ClipboardEvent): void {
    const pasted = event.clipboardData?.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted && pasted.length === 6) {
      this.digits = pasted.split('');
      event.preventDefault();
      setTimeout(() => this.onSubmit(), 100);
    }
  }

  get fullCode(): string {
    return this.digits.join('');
  }

  onSubmit(): void {
    if (this.fullCode.length !== 6) {
      this.errorMessage = 'Please enter the complete 6-digit code.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.userService.verifyCode(this.email, this.fullCode).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.successMessage = 'Email verified successfully! Redirecting...';

        // Store user session via AuthService (uses 'auth_user' key)
        this.authService.setSessionFromVerification(response.user);
        // Use role from response, or fall back to query param from registration
        const role = response.user?.role || response.role || this.role;

        setTimeout(() => {
          const redirectUrl = this.authService.getRedirectUrlForRole(role);
          this.router.navigate([redirectUrl]);
        }, 2000);
      },
      error: (err) => {
        this.isLoading = false;
        this.digits = ['', '', '', '', '', ''];
        document.getElementById('digit-0')?.focus();
        this.errorMessage = typeof err === 'string' ? err : 'Invalid code. Please try again.';
      }
    });
  }

  resendCode(): void {
    if (this.resendCountdown > 0) return;

    this.isResending = true;
    this.resendMessage = '';
    this.errorMessage = '';

    this.userService.resendCode(this.email).subscribe({
      next: () => {
        this.isResending = false;
        this.resendMessage = 'New code sent! Check your email.';
        this.digits = ['', '', '', '', '', ''];
        this.startCountdown();
      },
      error: () => {
        this.isResending = false;
        this.errorMessage = 'Failed to resend code. Please try again.';
      }
    });
  }

  startCountdown(): void {
    this.resendCountdown = 60;
    const interval = setInterval(() => {
      this.resendCountdown--;
      if (this.resendCountdown <= 0) {
        clearInterval(interval);
      }
    }, 1000);
  }
}