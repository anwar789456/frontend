import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, AuthUser } from '../../../../shared/services/auth.service';

@Component({
  selector: 'app-google-setup',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen flex items-center justify-center p-4"
         style="background: linear-gradient(135deg, #f0f9ff, #ecfdf5 50%, #fef3f2);">
      <div class="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">

        <!-- Header -->
        <div class="p-6 text-center" style="background: linear-gradient(135deg, #38a9f3, #6366f1);">
          <div class="w-20 h-20 mx-auto mb-3 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <img src="/mino_images/nino.png" alt="Mino" class="w-16 h-16 object-contain" />
          </div>
          <h1 class="text-2xl font-extrabold text-white mb-1">Welcome, {{ user?.name }}! 🎉</h1>
          <p class="text-white/90 text-sm">Let's finish setting up your account</p>
        </div>

        <!-- Form -->
        <form (ngSubmit)="onSubmit()" class="p-8 space-y-5" #form="ngForm">

          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1.5">Username</label>
            <input type="text" [(ngModel)]="username" name="username" required minlength="3" maxlength="20"
                   placeholder="Choose a username"
                   class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#38a9f3] focus:border-transparent text-[15px]" />
            @if (usernameError) {
              <p class="text-xs text-red-500 mt-1">{{ usernameError }}</p>
            }
          </div>

          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
            <div class="relative">
              <input [type]="showPassword ? 'text' : 'password'" [(ngModel)]="password" name="password" required minlength="6"
                     placeholder="At least 6 characters"
                     class="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#38a9f3] focus:border-transparent text-[15px]" />
              <button type="button" (click)="showPassword = !showPassword"
                      class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm">
                {{ showPassword ? '🙈' : '👁️' }}
              </button>
            </div>
            @if (passwordError) {
              <p class="text-xs text-red-500 mt-1">{{ passwordError }}</p>
            }
          </div>

          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1.5">
              Parental Email <span class="text-gray-400 font-normal">(optional)</span>
            </label>
            <input type="email" [(ngModel)]="parentalEmail" name="parentalEmail"
                   placeholder="parent@example.com"
                   class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#38a9f3] focus:border-transparent text-[15px]" />
            <p class="text-xs text-gray-500 mt-1">We'll notify them that you've joined MiNoLingo.</p>
          </div>

          @if (errorMessage) {
            <div class="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">{{ errorMessage }}</div>
          }

          <button type="submit" [disabled]="isLoading || !form.valid"
                  class="w-full py-3.5 rounded-xl font-semibold text-white shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl hover:scale-[1.02]"
                  style="background: linear-gradient(135deg, #38a9f3, #6366f1);">
            @if (isLoading) {
              <span>Setting up...</span>
            } @else {
              <span>Next →</span>
            }
          </button>
        </form>
      </div>
    </div>
  `
})
export class GoogleSetupComponent {
  user: AuthUser | null;
  username = '';
  password = '';
  parentalEmail = '';
  showPassword = false;
  isLoading = false;
  errorMessage = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.user = this.authService.currentUser;
    if (!this.user) {
      this.router.navigate(['/login']);
      return;
    }
    if (!this.user.needsSetup) {
      this.router.navigate([this.authService.getRedirectUrlForRole(this.user.role)]);
    }
  }

  get usernameError(): string {
    if (!this.username) return '';
    if (this.username.length < 3) return 'Username must be at least 3 characters.';
    return '';
  }

  get passwordError(): string {
    if (!this.password) return '';
    if (this.password.length < 6) return 'Password must be at least 6 characters.';
    return '';
  }

  onSubmit(): void {
    if (!this.user || this.usernameError || this.passwordError || !this.username || !this.password) return;

    const parental = this.parentalEmail.trim();
    if (parental && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parental)) {
      this.errorMessage = 'Please enter a valid parental email address.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    this.authService.completeGoogleSignup(this.user.id, {
      username: this.username.trim(),
      password: this.password,
      parentalEmail: parental || undefined
    }).subscribe({
      next: (user: AuthUser) => {
        this.isLoading = false;
        this.router.navigate(['/courses']);
      },
      error: (err: any) => {
        this.isLoading = false;
        this.errorMessage = typeof err === 'string' ? err : (err?.message || 'Failed to complete setup.');
        this.cdr.markForCheck();
      }
    });
  }
}
