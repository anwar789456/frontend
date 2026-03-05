import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { UserService } from '../../services/user.service';
import { OnboardingComponent, OnboardingStep } from '../../../../shared/components/onboarding/onboarding.component';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, OnboardingComponent],
  templateUrl: './forgot-password.component.html'
})
export class ForgotPasswordComponent {
  email = '';
  emailTouched = false;
  isLoading = false;
  successMessage = '';
  errorMessage = '';

  // Onboarding steps
  forgotPasswordOnboardingSteps: OnboardingStep[] = [
    {
      title: 'Forgot Password? 🤔',
      description: 'No worries! It happens to everyone. We\'ll help you get back into your account quickly.',
      icon: '🔑',
      mascotMessage: 'No worries!',
      highlightColor: '#f59e0b'
    },
    {
      title: 'Enter Your Email 📧',
      description: 'Type the email address you used to create your account. We\'ll send you a reset link!',
      icon: '✉️',
      mascotMessage: 'Which email?',
      highlightColor: '#38a9f3'
    },
    {
      title: 'Check Your Inbox 📬',
      description: 'After submitting, check your email for a password reset link. It expires in 1 hour!',
      icon: '⏰',
      mascotMessage: 'Be quick!',
      highlightColor: '#22c55e'
    }
  ];

  constructor(private userService: UserService) {}

  get emailError(): string {
    if (!this.emailTouched) return '';
    if (!this.email.trim()) return 'Email is required.';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email)) return 'Please enter a valid email address.';
    return '';
  }

  get isFormValid(): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(this.email.trim());
  }

  onSubmit(): void {
  this.emailTouched = true;
  if (!this.isFormValid) return;

  this.isLoading = true;
  this.errorMessage = '';
  this.successMessage = '';

  this.userService.forgotPassword(this.email.trim()).subscribe({
    next: (msg) => {
      this.isLoading = false;
      this.successMessage = 'Reset link sent! Please check your email inbox.';
      this.email = '';
      this.emailTouched = false;
    },
    error: (err) => {
      this.isLoading = false;
      this.errorMessage = 'No account found with this email address.';
    }
  });
}
}
