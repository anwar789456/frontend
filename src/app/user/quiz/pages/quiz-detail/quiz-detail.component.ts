import { Component, OnInit, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { QuizService } from '../../services/quiz.service';
import { Quiz, QuizAttempt } from '../../models/quiz.model';

@Component({
  selector: 'app-user-quiz-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './quiz-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    @keyframes fadeInUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
    .anim-fade-up { animation: fadeInUp 0.4s ease-out both; }
  `]
})
export class UserQuizDetailComponent implements OnInit {
  quiz: Quiz | null = null;
  attempt: QuizAttempt | null = null;
  isLoading = true;
  quizId!: number;

  constructor(
    private quizService: QuizService,
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

  ngOnInit(): void {
    this.quizId = +this.route.snapshot.paramMap.get('id')!;
    this.loadQuiz();
  }

  private loadQuiz(): void {
    this.isLoading = true;
    this.cdr.markForCheck();

    this.quizService.getQuizById(this.quizId).subscribe({
      next: (quiz) => {
        this.quiz = quiz;
        this.cdr.markForCheck(); // show quiz info while attempt loads
        this.loadAttempt();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  private loadAttempt(): void {
    if (!this.userId) {
      this.isLoading = false;
      this.cdr.markForCheck();
      return;
    }

    this.quizService.getUserAttempts(this.userId).subscribe({
      next: (attempts) => {
        this.attempt = attempts.find(a => a.quizId === this.quizId) || null;
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  get questionCount(): number {
    return this.quiz?.questions?.length || 0;
  }

  get estimatedTime(): string {
    const mins = Math.max(1, Math.ceil(this.questionCount * 0.5));
    return `~${mins} min`;
  }

  get quizStatus(): 'not_started' | 'in_progress' | 'completed' {
    if (!this.attempt) return 'not_started';
    return this.attempt.completed ? 'completed' : 'in_progress';
  }

  get progress(): number {
    if (!this.attempt || this.attempt.totalQuestions === 0) return 0;
    return Math.round((this.attempt.answeredQuestions / this.attempt.totalQuestions) * 100);
  }

  getLevelColor(level: string): string {
    switch (level) {
      case 'BEGINNER': return 'bg-emerald-100 text-emerald-700';
      case 'INTERMEDIATE': return 'bg-yellow-100 text-yellow-700';
      case 'ADVANCED': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  }

  startQuiz(): void {
    if (!this.userId) return;
    this.quizService.startOrResumeAttempt(this.userId, this.quizId).subscribe({
      next: (attempt) => {
        this.attempt = attempt;
        this.cdr.markForCheck();
        this.router.navigate(['/quiz', this.quizId, 'play']);
      },
      error: (err) => console.error('Failed to start quiz:', err)
    });
  }
}