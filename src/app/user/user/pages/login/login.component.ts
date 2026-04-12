import { Component, ViewChild, ElementRef, ChangeDetectorRef, ChangeDetectionStrategy, OnInit, AfterViewInit, OnDestroy } from '@angular/core';

declare var google: any;
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService, AuthUser, BanErrorInfo } from '../../../../shared/services/auth.service';
import { ImageCaptchaComponent, CaptchaResult } from '../../../../shared/components/image-captcha/image-captcha.component';
import { OnboardingComponent, OnboardingStep } from '../../../../shared/components/onboarding/onboarding.component';
import { FaceRecognitionComponent, FaceResult } from '../../../../shared/components/face-recognition/face-recognition.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ImageCaptchaComponent, OnboardingComponent, FaceRecognitionComponent],
  templateUrl: './login.component.html',
  changeDetection: ChangeDetectionStrategy.Default
})
export class LoginComponent implements OnInit, AfterViewInit, OnDestroy {
  private destroyed = false;
  private static googleInitialized = false;
  @ViewChild('captchaRef') captchaRef!: ImageCaptchaComponent;
  @ViewChild('googleBtnRef') googleBtnRef!: ElementRef<HTMLDivElement>;

  private readonly GOOGLE_CLIENT_ID = '123823672043-vs1f3hv4qts4j48rq0sst9rh46i8v3uf.apps.googleusercontent.com';

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

  // Face login
  showFaceLogin = false;
  isFaceProcessing = false;
  faceCheckDone = false;
  faceLoginAvailable = false;
  googleLoading = false;

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
      setTimeout(() => {
        this.captchaRef.refresh();
        this.cdr.markForCheck();
      }, 100);
    }

    // Initialize Google Sign-In button — wait for GSI script to be ready
    this.initGoogleSignIn();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    LoginComponent.googleInitialized = false;
  }

  private initGoogleSignIn(): void {
    const tryInit = () => {
      if (this.destroyed) return;
      if (typeof google !== 'undefined' && google?.accounts?.id) {
        if (!LoginComponent.googleInitialized) {
          LoginComponent.googleInitialized = true;
          google.accounts.id.initialize({
            client_id: this.GOOGLE_CLIENT_ID,
            callback: (response: any) => this.handleGoogleCredential(response)
          });
        }
        google.accounts.id.renderButton(
          this.googleBtnRef.nativeElement,
          { theme: 'outline', size: 'large', width: 320, text: 'signin_with', shape: 'rectangular' }
        );
        this.cdr.markForCheck();
      } else {
        setTimeout(tryInit, 200);
      }
    };
    tryInit();
  }

  private handleGoogleCredential(response: any): void {
    const idToken = response?.credential;
    if (!idToken) return;

    this.googleLoading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.banInfo = null;
    this.cdr.markForCheck();

    this.authService.googleLogin(idToken).subscribe({
      next: (user: AuthUser) => {
        this.googleLoading = false;
        this.successMessage = 'Signed in with Google! Redirecting...';
        this.cdr.markForCheck();
        const redirectUrl = this.authService.getRedirectUrlForRole(user.role);
        setTimeout(() => this.router.navigate([redirectUrl]), 1200);
      },
      error: (err: any) => {
        this.googleLoading = false;
        if (err?.type === 'ban') {
          this.banInfo = err as BanErrorInfo;
          this.errorMessage = '';
        } else {
          this.banInfo = null;
          this.errorMessage = typeof err === 'string' ? err : (err?.message || 'Google sign-in failed. Please try again.');
        }
        this.cdr.markForCheck();
      }
    });
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

  // ── Face Login ─────────────────────────────────────────────

  toggleFaceLogin(): void {
    this.showFaceLogin = !this.showFaceLogin;
    this.errorMessage = '';
    this.successMessage = '';
    this.banInfo = null;

    if (this.showFaceLogin) {
      // Reset check state and query whether this email has face registered
      this.faceCheckDone = false;
      this.faceLoginAvailable = false;
      this.cdr.markForCheck();

      this.authService.checkFaceStatus(this.email).subscribe({
        next: (res) => {
          this.faceCheckDone = true;
          this.faceLoginAvailable = !!res.faceRegistered;
          this.cdr.markForCheck();
        },
        error: () => {
          this.faceCheckDone = true;
          this.faceLoginAvailable = false;
          this.cdr.markForCheck();
        }
      });
    } else {
      // Reset when panel is closed so next open starts fresh
      this.faceCheckDone = false;
      this.faceLoginAvailable = false;
      this.cdr.markForCheck();
    }
  }

  onFaceCapture(result: FaceResult): void {
    if (result.capturedImage) {
      this.submitFaceLogin(result.capturedImage);
    }
  }

  submitFaceLogin(base64Image: string): void {
    if (!base64Image) return;

    this.isFaceProcessing = true;
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.banInfo = null;
    this.cdr.markForCheck();

    this.authService.faceIdentifyLogin(base64Image).subscribe({
      next: (user: AuthUser) => {
        this.isFaceProcessing = false;
        this.isLoading = false;
        this.successMessage = 'Face recognized! Redirecting...';
        this.cdr.markForCheck();
        const redirectUrl = this.authService.getRedirectUrlForRole(user.role);
        setTimeout(() => this.router.navigate([redirectUrl]), 1200);
      },
      error: (err: any) => {
        this.isFaceProcessing = false;
        this.isLoading = false;
        if (err?.type === 'ban') {
          this.banInfo = err as BanErrorInfo;
          this.errorMessage = '';
        } else {
          this.banInfo = null;
          this.errorMessage = typeof err === 'string' ? err : (err?.message || 'Face not recognized. Please try again or use password login.');
        }
        this.cdr.markForCheck();
      }
    });
  }
}