import { Component, ViewChild, ChangeDetectorRef, ChangeDetectionStrategy, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService, BanErrorInfo } from '../../../../shared/services/auth.service';
import { ImageCaptchaComponent, CaptchaResult } from '../../../../shared/components/image-captcha/image-captcha.component';
import { OnboardingComponent, OnboardingStep } from '../../../../shared/components/onboarding/onboarding.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ImageCaptchaComponent, OnboardingComponent],
  templateUrl: './login.component.html',
  changeDetection: ChangeDetectionStrategy.Default
})
export class LoginComponent implements OnInit, AfterViewInit {
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
  showCaptcha = false;

  emailTouched = false;
  passwordTouched = false;

  // Onboarding steps for login page
  loginOnboardingSteps: OnboardingStep[] = [
    {
      title: 'Welcome to MinoLingo! 🎉',
      description: 'Your fun and interactive English learning adventure starts here. Let\'s show you around!',
      icon: '👋',
      mascotMessage: 'Hi there!',
      highlightColor: '#38a9f3'
    },
    {
      title: 'Enter Your Email 📧',
      description: 'Type in the email address you used when creating your account. We\'ll use this to find your profile.',
      icon: '✉️',
      mascotMessage: 'Easy peasy!',
      highlightColor: '#6366f1'
    },
    {
      title: 'Your Secret Password 🔐',
      description: 'Enter your password to securely access your account. Click the eye icon to show or hide it!',
      icon: '🔑',
      mascotMessage: 'Keep it safe!',
      highlightColor: '#8b5cf6'
    },
    {
      title: 'Ready to Learn! 🚀',
      description: 'Click "Sign in" and continue your learning journey. Earn XP, maintain streaks, and have fun!',
      icon: '🎯',
      mascotMessage: 'Let\'s go!',
      highlightColor: '#22c55e'
    }
  ];

  constructor(
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    // Initialize component and ensure UI updates
    this.cdr.markForCheck();
    
    // Start with captcha hidden (user needs to click to show)
    this.showCaptcha = false;
    this.cdr.markForCheck();
  }

  ngAfterViewInit(): void {
    // Pre-load captcha component in background (but keep it hidden)
    if (this.captchaRef) {
      // Auto-refresh captcha to ensure images are loaded when shown
      setTimeout(() => {
        this.captchaRef.refresh();
        this.cdr.markForCheck();
      }, 100);
    }
  }

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

  get formattedBanExpiry(): string {
    if (!this.banInfo?.banExpiresAt) return '';
    try {
      const date = new Date(this.banInfo.banExpiresAt);
      return date.toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch {
      return this.banInfo.banExpiresAt;
    }
  }

  onCaptchaSolved(result: CaptchaResult): void {
    this.captchaResult = result;
    this.cdr.markForCheck(); // Ensure UI updates immediately
  }

  onCaptchaCleared(): void {
    this.captchaResult = null;
    this.cdr.markForCheck(); // Ensure UI updates immediately
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
    this.cdr.markForCheck(); // Ensure UI updates immediately
  }

  toggleCaptcha(): void {
    // If already solved, don't toggle — the captcha stays completed
    if (this.captchaResult) return;

    this.showCaptcha = !this.showCaptcha;

    // Force immediate change detection
    this.cdr.detectChanges();

    if (this.showCaptcha) {
      // Use requestAnimationFrame to ensure DOM is ready, then refresh captcha
      requestAnimationFrame(() => {
        if (this.captchaRef) {
          this.captchaRef.refresh();
          this.cdr.detectChanges();
        }
      });
    } else {
      // Captcha is being hidden — clear the result
      this.captchaResult = null;
      this.cdr.detectChanges();
    }
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
      this.captchaResult?.challengeId ?? '',
      this.captchaResult?.selectedIndex ?? -1
    ).subscribe({
      next: (user) => {
        this.isLoading = false;
        this.successMessage = 'Login successful! Redirecting...';
        this.cdr.markForCheck();
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
        this.cdr.markForCheck();
      }
    });
  }
}