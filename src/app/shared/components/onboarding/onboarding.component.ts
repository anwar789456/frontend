import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface OnboardingStep {
  title: string;
  description: string;
  icon: string;
  mascotMessage: string;
  highlightColor: string;
}

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Toggle button — always visible when overlay is closed -->
    @if (!isVisible) {
    <button (click)="reopen()"
            class="fixed bottom-6 right-6 z-[9998] w-12 h-12 rounded-full text-white shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-200 flex items-center justify-center"
            style="background: linear-gradient(135deg, #38a9f3, #6366f1);"
            title="Show guide">
      <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </button>
    }

    <!-- Onboarding Overlay -->
    @if (isVisible) {
    <div class="fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-opacity duration-300"
         [class.opacity-0]="!isAnimating"
         [class.pointer-events-none]="!isAnimating"
         style="background: linear-gradient(135deg, rgba(56, 169, 243, 0.95), rgba(99, 102, 241, 0.95));">

      <!-- Animated background elements -->
      <div class="absolute inset-0 overflow-hidden pointer-events-none">
        <!-- Floating circles -->
        <div class="absolute top-[10%] left-[5%] w-32 h-32 bg-white/10 rounded-full blur-xl animate-pulse"></div>
        <div class="absolute top-[60%] right-[10%] w-48 h-48 bg-white/10 rounded-full blur-2xl animate-pulse" style="animation-delay: 0.5s;"></div>
        <div class="absolute bottom-[20%] left-[15%] w-24 h-24 bg-white/10 rounded-full blur-lg animate-pulse" style="animation-delay: 1s;"></div>

        <!-- Floating stars -->
        <div class="absolute top-[15%] right-[20%] text-yellow-300/60 animate-bounce" style="animation-duration: 2s;">
          <svg class="w-8 h-8" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
        </div>
        <div class="absolute top-[45%] left-[8%] text-yellow-200/50 animate-bounce" style="animation-duration: 2.5s; animation-delay: 0.3s;">
          <svg class="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
        </div>
        <div class="absolute bottom-[30%] right-[15%] text-yellow-300/40 animate-bounce" style="animation-duration: 3s; animation-delay: 0.7s;">
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
        </div>

        <!-- Confetti particles -->
        @for (i of confettiParticles; track i) {
        <div class="absolute w-3 h-3 rounded-full animate-confetti"
             [style.left.%]="getRandomPosition(i, 'x')"
             [style.top.%]="getRandomPosition(i, 'y')"
             [style.background]="getConfettiColor(i)"
             [style.animation-delay.ms]="i * 200"
             [style.animation-duration.s]="3 + (i % 2)">
        </div>
        }
      </div>

      <!-- Main content card -->
      <div class="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden transform transition-all duration-300"
           [class.scale-100]="isAnimating" [class.opacity-100]="isAnimating"
           [class.scale-95]="!isAnimating" [class.opacity-0]="!isAnimating">

        <!-- Progress bar -->
        <div class="h-1.5 bg-gray-100">
          <div class="h-full bg-gradient-to-r from-[#38a9f3] to-[#6366f1] transition-all duration-500 ease-out"
               [style.width.%]="((currentStep + 1) / steps.length) * 100"></div>
        </div>

        <!-- Card content -->
        <div class="p-8 text-center">

          <!-- Mascot with speech bubble -->
          <div class="relative inline-block mb-6">
            <div class="relative">
              <!-- Pulse rings -->
              <div class="absolute inset-[-12px] rounded-full border-[3px] animate-ping opacity-30"
                   [style.border-color]="steps[currentStep]?.highlightColor || '#38a9f3'"
                   style="animation-duration: 2s;"></div>

              <!-- Mascot container -->
              <div class="w-32 h-32 rounded-full bg-gradient-to-br from-[#f0f9ff] to-[#e0f2fe] flex items-center justify-center shadow-xl">
                <img src="/mino_images/nino.png" alt="MinoLingo Mascot"
                     class="w-24 h-24 object-contain drop-shadow-lg animate-bounce" style="animation-duration: 2s;" />
              </div>
            </div>

            <!-- Speech bubble -->
            <div class="absolute -right-4 -top-2 bg-white rounded-2xl px-4 py-2 shadow-lg border-2 animate-pulse"
                 [style.border-color]="steps[currentStep]?.highlightColor || '#38a9f3'"
                 style="animation-duration: 2s;">
              <p class="text-sm font-bold text-gray-800 whitespace-nowrap">{{ steps[currentStep]?.mascotMessage }}</p>
              <div class="absolute -left-2 top-1/2 -translate-y-1/2 w-0 h-0 border-t-[6px] border-b-[6px] border-r-[8px] border-t-transparent border-b-transparent border-r-white"></div>
            </div>
          </div>

          <!-- Step icon -->
          <div class="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center shadow-lg transform transition-all duration-300"
               [style.background]="'linear-gradient(135deg, ' + (steps[currentStep]?.highlightColor || '#38a9f3') + ', ' + adjustColor(steps[currentStep]?.highlightColor || '#38a9f3', -20) + ')'">
            <span class="text-3xl" [innerHTML]="steps[currentStep]?.icon"></span>
          </div>

          <!-- Step title -->
          <h2 class="text-2xl font-extrabold text-gray-900 mb-3">{{ steps[currentStep]?.title }}</h2>

          <!-- Step description -->
          <p class="text-gray-600 text-[15px] leading-relaxed mb-8 max-w-sm mx-auto">{{ steps[currentStep]?.description }}</p>

          <!-- Step indicators -->
          <div class="flex items-center justify-center gap-2 mb-8">
            @for (step of steps; track $index) {
            <button (click)="goToStep($index)"
                    class="w-3 h-3 rounded-full transition-all duration-300"
                    [class.w-8]="$index === currentStep"
                    [style.background]="$index === currentStep ? steps[currentStep]?.highlightColor : '#e5e7eb'"
                    [class.opacity-60]="$index !== currentStep">
            </button>
            }
          </div>

          <!-- Navigation buttons -->
          <div class="flex items-center justify-center gap-4">
            @if (currentStep > 0) {
            <button (click)="previousStep()"
                    class="px-6 py-3 rounded-xl font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all duration-200">
              ← Back
            </button>
            }

            @if (currentStep < steps.length - 1) {
            <button (click)="nextStep()"
                    class="px-8 py-3 rounded-xl font-semibold text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                    [style.background]="'linear-gradient(135deg, ' + (steps[currentStep]?.highlightColor || '#38a9f3') + ', ' + adjustColor(steps[currentStep]?.highlightColor || '#38a9f3', -20) + ')'">
              Next →
            </button>
            } @else {
            <button (click)="complete()"
                    class="px-8 py-3 rounded-xl font-semibold text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 bg-gradient-to-r from-green-500 to-emerald-600">
              🎉 Let's Go!
            </button>
            }
          </div>

          <!-- Skip button -->
          <button (click)="skip()" class="mt-6 text-sm text-gray-400 hover:text-gray-600 transition-colors">
            Skip tutorial
          </button>
        </div>
      </div>
    </div>
    }
  `,
  styles: [`
    @keyframes confetti {
      0% { transform: translateY(0) rotate(0deg); opacity: 1; }
      100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
    }
    .animate-confetti {
      animation: confetti 4s ease-in-out infinite;
    }
  `]
})
export class OnboardingComponent implements OnInit {
  @Input() steps: OnboardingStep[] = [];
  @Input() storageKey = 'onboarding_completed';
  @Input() forceShow = false;
  @Output() completed = new EventEmitter<void>();
  @Output() skipped = new EventEmitter<void>();

  isVisible = false;
  isAnimating = false;
  currentStep = 0;
  confettiParticles = Array.from({ length: 12 }, (_, i) => i);

  ngOnInit(): void {
    if (this.forceShow || !this.hasCompletedOnboarding()) {
      setTimeout(() => {
        this.isVisible = true;
        setTimeout(() => this.isAnimating = true, 50);
      }, 500);
    }
  }

  hasCompletedOnboarding(): boolean {
    return localStorage.getItem(this.storageKey) === 'true';
  }

  reopen(): void {
    this.currentStep = 0;
    this.isVisible = true;
    setTimeout(() => this.isAnimating = true, 50);
  }

  nextStep(): void {
    if (this.currentStep < this.steps.length - 1) {
      this.isAnimating = false;
      setTimeout(() => {
        this.currentStep++;
        this.isAnimating = true;
      }, 200);
    }
  }

  previousStep(): void {
    if (this.currentStep > 0) {
      this.isAnimating = false;
      setTimeout(() => {
        this.currentStep--;
        this.isAnimating = true;
      }, 200);
    }
  }

  goToStep(index: number): void {
    if (index !== this.currentStep) {
      this.isAnimating = false;
      setTimeout(() => {
        this.currentStep = index;
        this.isAnimating = true;
      }, 200);
    }
  }

  complete(): void {
    localStorage.setItem(this.storageKey, 'true');
    this.isAnimating = false;
    setTimeout(() => {
      this.isVisible = false;
      this.completed.emit();
    }, 300);
  }

  skip(): void {
    localStorage.setItem(this.storageKey, 'true');
    this.isAnimating = false;
    setTimeout(() => {
      this.isVisible = false;
      this.skipped.emit();
    }, 300);
  }

  getRandomPosition(index: number, axis: 'x' | 'y'): number {
    const seed = index * (axis === 'x' ? 17 : 23);
    return (seed % 100);
  }

  getConfettiColor(index: number): string {
    const colors = ['#38a9f3', '#6366f1', '#22c55e', '#f59e0b', '#ec4899', '#8b5cf6'];
    return colors[index % colors.length];
  }

  adjustColor(hex: string, amount: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, Math.max(0, (num >> 16) + amount));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
    const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  }
}
