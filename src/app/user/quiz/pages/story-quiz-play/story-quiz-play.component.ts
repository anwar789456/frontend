import { Component, OnInit, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { QuizService } from '../../services/quiz.service';
import { UserService } from '../../../user/services/user.service';
import { StoryQuiz, StoryBlank, StoryWordBank, StoryAttempt } from '../../models/quiz.model';
import { User } from '../../../user/models/user.model';

interface StorySegment {
  type: 'text' | 'blank';
  value: string;
  blankIndex?: number;
}

@Component({
  selector: 'app-story-quiz-play',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './story-quiz-play.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    @keyframes fadeInUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(139,92,246,0.3); } 50% { box-shadow: 0 0 12px 4px rgba(139,92,246,0.2); } }
    @keyframes popIn { 0% { transform: scale(0.8); opacity: 0; } 60% { transform: scale(1.05); } 100% { transform: scale(1); opacity: 1; } }
    @keyframes confettiDrop {
      0% { transform: translateY(-10px) rotate(0deg); opacity: 1; }
      100% { transform: translateY(50px) rotate(360deg); opacity: 0; }
    }
    @keyframes starBurst {
      0% { transform: scale(0) rotate(0deg); opacity: 0; }
      50% { transform: scale(1.3) rotate(180deg); opacity: 1; }
      100% { transform: scale(1) rotate(360deg); opacity: 1; }
    }
    .anim-fade-up { animation: fadeInUp 0.4s ease-out both; }
    .anim-pulse { animation: pulse 2s ease-in-out infinite; }
    .anim-pop { animation: popIn 0.3s ease-out both; }
    .anim-confetti { animation: confettiDrop 1.5s ease-out both; }
    .anim-star { animation: starBurst 0.8s ease-out both; }
  `]
})
export class StoryQuizPlayComponent implements OnInit {
  storyQuiz: StoryQuiz | null = null;
  wordBank: string[] = [];
  attempt: StoryAttempt | null = null;
  isLoading = true;
  storyQuizId!: number;

  // Interaction state
  selectedBlankIndex: number | null = null;
  filledBlanks: { [blankIndex: number]: string } = {};
  usedWords: Set<string> = new Set();

  // Validation state
  validationResults: { [blankIndex: number]: boolean } | null = null;
  showResults = false;
  showCompletionModal = false;
  toastMessage = '';

  // Parsed story segments
  segments: StorySegment[] = [];

  confettiItems = Array.from({ length: 10 }, (_, i) => ({
    left: Math.random() * 100,
    delay: Math.random() * 0.8,
    color: ['#38a9f3', '#f59e0b', '#22c55e', '#8b5cf6', '#ef4444'][i % 5],
    size: 6 + Math.random() * 6
  }));

  constructor(
    private quizService: QuizService,
    private userService: UserService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  get userId(): number | null {
    try {
      const user = JSON.parse(localStorage.getItem('auth_user') || 'null');
      return user?.id ?? null;
    } catch { return null; }
  }

  get filledCount(): number {
    return Object.keys(this.filledBlanks).length;
  }

  get totalBlanks(): number {
    return this.storyQuiz?.blanks?.length || 0;
  }

  get progress(): number {
    if (this.totalBlanks === 0) return 0;
    return Math.round((this.filledCount / this.totalBlanks) * 100);
  }

  get correctCount(): number {
    if (!this.validationResults) return 0;
    return Object.values(this.validationResults).filter(v => v).length;
  }

  get allCorrect(): boolean {
    if (!this.validationResults) return false;
    return Object.values(this.validationResults).every(v => v);
  }

  ngOnInit(): void {
    this.storyQuizId = +this.route.snapshot.paramMap.get('id')!;
    this.loadData();
  }

  private loadData(): void {
    this.isLoading = true;
    this.cdr.markForCheck();

    this.quizService.getStoryQuizById(this.storyQuizId).subscribe({
      next: (sq) => {
        this.storyQuiz = sq;
        this.parseStory();
        this.cdr.markForCheck(); // update segments + storyQuiz before word bank loads
        this.loadWordBank();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  private loadWordBank(): void {
    this.quizService.getStoryWordBank(this.storyQuizId).subscribe({
      next: (wb) => {
        this.wordBank = this.shuffle([...wb.words]);
        this.cdr.markForCheck();
        this.startAttempt();
      },
      error: () => {
        this.wordBank = [];
        this.cdr.markForCheck();
        this.startAttempt();
      }
    });
  }

  private startAttempt(): void {
    if (!this.userId) {
      this.isLoading = false;
      this.cdr.markForCheck();
      return;
    }

    this.quizService.startOrResumeStoryAttempt(this.userId, this.storyQuizId).subscribe({
      next: (attempt) => {
        this.attempt = attempt;
        // Redirect if story quiz is already completed (prevent retakes)
        if (attempt.completed) {
          this.router.navigate(['/quiz']);
          return;
        }
        // Restore previously filled answers
        if (attempt.answers) {
          for (const [key, value] of Object.entries(attempt.answers)) {
            const idx = Number(key);
            this.filledBlanks[idx] = value;
            this.usedWords.add(value);
          }
          // New object reference so OnPush detects the change
          this.filledBlanks = { ...this.filledBlanks };
          this.usedWords = new Set(this.usedWords);
        }
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  private parseStory(): void {
    if (!this.storyQuiz?.storyTemplate) return;
    const regex = /\{blank_(\d+)\}/g;
    const template = this.storyQuiz.storyTemplate;
    this.segments = [];
    let lastIdx = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(template)) !== null) {
      if (match.index > lastIdx) {
        this.segments.push({ type: 'text', value: template.slice(lastIdx, match.index) });
      }
      this.segments.push({ type: 'blank', value: '', blankIndex: parseInt(match[1], 10) });
      lastIdx = regex.lastIndex;
    }
    if (lastIdx < template.length) {
      this.segments.push({ type: 'text', value: template.slice(lastIdx) });
    }
  }

  // ── Interaction ──

  selectBlank(blankIndex: number): void {
    if (this.showResults) return;

    if (this.filledBlanks[blankIndex]) {
      const word = this.filledBlanks[blankIndex];
      this.usedWords = new Set(this.usedWords); // new reference
      this.usedWords.delete(word);
      this.filledBlanks = { ...this.filledBlanks }; // new reference
      delete this.filledBlanks[blankIndex];
      this.selectedBlankIndex = blankIndex;
    } else {
      this.selectedBlankIndex = this.selectedBlankIndex === blankIndex ? null : blankIndex;
    }

    this.cdr.markForCheck();
  }

  selectWord(word: string): void {
    if (this.showResults || this.usedWords.has(word)) return;

    if (this.selectedBlankIndex !== null) {
      this.filledBlanks = { ...this.filledBlanks, [this.selectedBlankIndex]: word }; // new reference
      this.usedWords = new Set([...this.usedWords, word]); // new reference
      this.selectedBlankIndex = null;
      this.cdr.markForCheck();
    }
  }

  isWordUsed(word: string): boolean {
    return this.usedWords.has(word);
  }

  getBlankValue(blankIndex: number): string {
    return this.filledBlanks[blankIndex] || '';
  }

  getBlankClass(blankIndex: number): string {
    if (this.showResults && this.validationResults) {
      return this.validationResults[blankIndex]
        ? 'border-green-400 bg-green-50 text-green-700'
        : 'border-red-400 bg-red-50 text-red-600';
    }
    if (this.selectedBlankIndex === blankIndex) {
      return 'border-[#8b5cf6] bg-[#8b5cf6]/5 anim-pulse';
    }
    if (this.filledBlanks[blankIndex]) {
      return 'border-[#38a9f3] bg-white text-[#0f1724] shadow-sm';
    }
    return 'border-dashed border-gray-300 bg-gray-50 text-gray-400';
  }

  getHint(blankIndex: number): string | undefined {
    return this.storyQuiz?.blanks?.find(b => b.blankIndex === blankIndex)?.hint;
  }

  // ── Actions ──

  checkAnswers(): void {
    if (this.filledCount === 0) return;

    this.quizService.validateStoryAnswers(this.storyQuizId, this.filledBlanks).subscribe({
      next: (results) => {
        this.validationResults = results;
        this.showResults = true;
        this.cdr.markForCheck();

        if (this.allCorrect) {
          this.showCompletionModal = true;
          this.cdr.markForCheck();

          if (this.attempt?.id) {
            const xpToAward = this.storyQuiz?.xpReward ?? 0;
            this.quizService.completeStoryAttempt(this.attempt.id, this.filledBlanks).subscribe({
              next: (completed) => {
                this.attempt = completed;
                this.cdr.markForCheck();
                // Add XP to user profile — use xpReward directly since allCorrect is guaranteed here
                const earnedXp = (completed.score != null && completed.score > 0) ? completed.score : xpToAward;
                this.addXpToUser(earnedXp);
              },
              error: () => {
                // Even if the complete call fails, still try to add XP since answers were all correct
                this.addXpToUser(xpToAward);
              }
            });
          } else {
            // No attempt ID but all correct — still award XP
            this.addXpToUser(this.storyQuiz?.xpReward ?? 0);
          }
        }
      },
      error: (err) => console.error('Validation failed:', err)
    });
  }

  private addXpToUser(xpEarned: number): void {
    if (!this.userId || xpEarned <= 0) return;

    this.userService.getUserById(this.userId).subscribe({
      next: (user: User) => {
        const updatedUser: User = {
          ...user,
          xp: (user.xp || 0) + xpEarned
        };
        this.userService.updateUser(this.userId!, updatedUser).subscribe({
          next: (updated) => {
            // Update localStorage with new XP
            const storedUser = JSON.parse(localStorage.getItem('auth_user') || 'null');
            if (storedUser) {
              storedUser.xp = updated.xp;
              localStorage.setItem('auth_user', JSON.stringify(storedUser));
            }
          },
          error: () => {}
        });
      },
      error: () => {}
    });
  }

  tryAgain(): void {
    this.validationResults = null;
    this.showResults = false;
    this.showCompletionModal = false;
    this.cdr.markForCheck();
  }

  saveAndExit(): void {
    if (this.attempt?.id && this.filledCount > 0) {
      this.quizService.saveStoryProgress(this.attempt.id, this.filledBlanks).subscribe({
        next: () => {
          this.toastMessage = 'Your progress is saved! Come back anytime.';
          this.cdr.markForCheck();
          setTimeout(() => this.router.navigate(['/quiz']), 1500);
        },
        error: () => this.router.navigate(['/quiz'])
      });
    } else {
      this.router.navigate(['/quiz']);
    }
  }

  closeCompletionModal(): void {
    this.showCompletionModal = false;
    this.cdr.markForCheck();
    this.router.navigate(['/quiz']);
  }

  private shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}