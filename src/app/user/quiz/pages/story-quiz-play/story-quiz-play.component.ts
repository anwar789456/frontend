import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { QuizService } from '../../services/quiz.service';
import { StoryQuiz, StoryBlank, StoryWordBank, StoryAttempt } from '../../models/quiz.model';

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

  constructor(
    private quizService: QuizService,
    private route: ActivatedRoute,
    private router: Router
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
    this.quizService.getStoryQuizById(this.storyQuizId).subscribe({
      next: (sq) => {
        this.storyQuiz = sq;
        this.parseStory();
        this.loadWordBank();
      },
      error: () => this.isLoading = false
    });
  }

  private loadWordBank(): void {
    this.quizService.getStoryWordBank(this.storyQuizId).subscribe({
      next: (wb) => {
        this.wordBank = this.shuffle([...wb.words]);
        this.startAttempt();
      },
      error: () => {
        // Fallback: use blank correct words if word bank not found
        this.wordBank = [];
        this.startAttempt();
      }
    });
  }

  private startAttempt(): void {
    if (!this.userId) { this.isLoading = false; return; }
    this.quizService.startOrResumeStoryAttempt(this.userId, this.storyQuizId).subscribe({
      next: (attempt) => {
        this.attempt = attempt;
        // Restore previously filled answers
        if (attempt.answers) {
          for (const [key, value] of Object.entries(attempt.answers)) {
            const idx = Number(key);
            this.filledBlanks[idx] = value;
            this.usedWords.add(value);
          }
        }
        this.isLoading = false;
      },
      error: () => this.isLoading = false
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

    // If blank is already filled, return the word to bank
    if (this.filledBlanks[blankIndex]) {
      const word = this.filledBlanks[blankIndex];
      this.usedWords.delete(word);
      delete this.filledBlanks[blankIndex];
      this.selectedBlankIndex = blankIndex;
      return;
    }

    this.selectedBlankIndex = this.selectedBlankIndex === blankIndex ? null : blankIndex;
  }

  selectWord(word: string): void {
    if (this.showResults || this.usedWords.has(word)) return;

    if (this.selectedBlankIndex !== null) {
      // Place word into selected blank
      this.filledBlanks[this.selectedBlankIndex] = word;
      this.usedWords.add(word);
      this.selectedBlankIndex = null;
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

        if (this.allCorrect) {
          this.showCompletionModal = true;
          if (this.attempt?.id) {
            this.quizService.completeStoryAttempt(this.attempt.id, this.filledBlanks).subscribe({
              next: (completed) => this.attempt = completed,
              error: () => {}
            });
          }
        }
      },
      error: (err) => console.error('Validation failed:', err)
    });
  }

  tryAgain(): void {
    this.validationResults = null;
    this.showResults = false;
    this.showCompletionModal = false;
  }

  saveAndExit(): void {
    if (this.attempt?.id && this.filledCount > 0) {
      this.quizService.saveStoryProgress(this.attempt.id, this.filledBlanks).subscribe({
        next: () => {
          this.toastMessage = 'Your progress is saved! Come back anytime.';
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
    this.router.navigate(['/quiz']);
  }

  private shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  confettiItems = Array.from({ length: 10 }, (_, i) => ({
    left: Math.random() * 100,
    delay: Math.random() * 0.8,
    color: ['#38a9f3', '#f59e0b', '#22c55e', '#8b5cf6', '#ef4444'][i % 5],
    size: 6 + Math.random() * 6
  }));
}
