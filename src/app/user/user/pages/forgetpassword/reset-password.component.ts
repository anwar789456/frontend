import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './reset-password.component.html'
})
export class ResetPasswordComponent implements OnInit {
  token = '';
  newPassword = '';
  confirmPassword = '';
  showPassword = false;
  showConfirmPassword = false;

  newPasswordTouched = false;
  confirmPasswordTouched = false;

  isLoading = false;
  successMessage = '';
  errorMessage = '';
  tokenInvalid = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
    if (!this.token) {
      this.tokenInvalid = true;
      this.errorMessage = 'Invalid or missing reset token. Please request a new password reset.';
    }
  }

  get newPasswordError(): string {
    if (!this.newPasswordTouched) return '';
    if (!this.newPassword) return 'Password is required.';
    if (this.newPassword.length < 6) return 'Password must be at least 6 characters.';
    return '';
  }

  get confirmPasswordError(): string {
    if (!this.confirmPasswordTouched) return '';
    if (!this.confirmPassword) return 'Please confirm your password.';
    if (this.confirmPassword !== this.newPassword) return 'Passwords do not match.';
    return '';
  }

  get isFormValid(): boolean {
    return (
      this.newPassword.length >= 6 &&
      this.confirmPassword === this.newPassword
    );
  }

  onSubmit(): void {
    this.newPasswordTouched = true;
    this.confirmPasswordTouched = true;
    if (!this.isFormValid || this.tokenInvalid) return;

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.userService.resetPassword(this.token, this.newPassword).subscribe({
      next: () => {
        this.isLoading = false;
        this.successMessage = 'Your password has been reset successfully!';
        setTimeout(() => this.router.navigate(['/login']), 2500);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = typeof err === 'string' ? err : 'Reset failed. The link may have expired. Please request a new one.';
      }
    });
  }
}