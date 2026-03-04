import { Component, OnInit, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { QuizService } from '../../services/quiz.service';
import { Quiz, QuestionQuiz, QuizAttempt } from '../../models/quiz.model';

@Component({
  selector: 'app-user-quiz-result',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './quiz-result.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes scaleIn { from { opacity: 0; transform: scale(0.5); } to { opacity: 1; transform: scale(1); } }
    @keyframes starBurst {
      0% { transform: scale(0) rotate(0deg); opacity: 0; }
      50% { transform: scale(1.3) rotate(180deg); opacity: 1; }
      100% { transform: scale(1) rotate(360deg); opacity: 1; }
    }
    @keyframes confettiDrop {
      0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
      100% { transform: translateY(60px) rotate(720deg); opacity: 0; }
    }
    @keyframes shimmer {
      0% { background-position: -200% center; }
      100% { background-position: 200% center; }
    }
    .anim-fade-up { animation: fadeInUp 0.5s ease-out both; }
    .anim-scale { animation: scaleIn 0.6s ease-out both; }
    .anim-star { animation: starBurst 0.8s ease-out both; }
    .anim-confetti { animation: confettiDrop 1.5s ease-out both; }
    .anim-shimmer {
      background: linear-gradient(90deg, transparent 30%, rgba(255,255,255,0.4) 50%, transparent 70%);
      background-size: 200% 100%;
      animation: shimmer 2s ease-in-out infinite;
    }
    .delay-1 { animation-delay: 0.1s; }
    .delay-2 { animation-delay: 0.2s; }
    .delay-3 { animation-delay: 0.3s; }
    .delay-4 { animation-delay: 0.4s; }
    .delay-5 { animation-delay: 0.5s; }
    .delay-6 { animation-delay: 0.6s; }
    .delay-7 { animation-delay: 0.7s; }
  `]
})
export class UserQuizResultComponent implements OnInit {
  quiz: Quiz | null = null;
  attempt: QuizAttempt | null = null;
  questions: QuestionQuiz[] = [];
  isLoading = true;
  quizId!: number;
  attemptId!: number;

  confettiItems = Array.from({ length: 12 }, (_, i) => ({
    left: Math.random() * 100,
    delay: Math.random() * 1,
    color: ['#38a9f3', '#f59e0b', '#22c55e', '#8b5cf6', '#ef4444', '#ec4899'][i % 6],
    size: 6 + Math.random() * 6
  }));

  constructor(
    private quizService: QuizService,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.quizId = +this.route.snapshot.paramMap.get('id')!;
    this.attemptId = +this.route.snapshot.paramMap.get('attemptId')!;
    this.loadData();
  }

  private loadData(): void {
    this.isLoading = true;
    this.cdr.markForCheck();

    this.quizService.getQuizById(this.quizId).subscribe({
      next: (quiz) => {
        this.quiz = quiz;
        this.questions = [...(quiz.questions || [])];
        this.cdr.markForCheck();
        this.loadAttempt();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  private loadAttempt(): void {
    this.quizService.getAttempt(this.attemptId).subscribe({
      next: (attempt) => {
        this.attempt = attempt;
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  get correctCount(): number {
    if (!this.attempt?.answers || !this.questions.length) return 0;
    let count = 0;
    for (const q of this.questions) {
      if (q.id && this.attempt.answers[q.id] === q.correctAnswer) count++;
    }
    return count;
  }

  get totalCount(): number {
    return this.questions.length;
  }

  get percentage(): number {
    if (this.totalCount === 0) return 0;
    return Math.round((this.correctCount / this.totalCount) * 100);
  }

  get circumference(): number {
    return 2 * Math.PI * 54;
  }

  get strokeDashoffset(): number {
    return this.circumference - (this.percentage / 100) * this.circumference;
  }

  get scoreColor(): string {
    if (this.percentage >= 80) return '#22c55e';
    if (this.percentage >= 50) return '#f59e0b';
    return '#ef4444';
  }

  get encouragement(): string {
    if (this.percentage === 100) return 'Perfect score! You\'re amazing!';
    if (this.percentage >= 80) return 'Great job! Almost perfect!';
    if (this.percentage >= 60) return 'Good work! Keep practicing!';
    if (this.percentage >= 40) return 'Nice try! You\'re getting there!';
    return 'Keep learning! Practice makes perfect!';
  }

  isAnswerCorrect(q: QuestionQuiz): boolean {
    if (!q.id || !this.attempt?.answers) return false;
    return this.attempt.answers[q.id] === q.correctAnswer;
  }

  getSubmittedAnswer(q: QuestionQuiz): string {
    if (!q.id || !this.attempt?.answers) return '—';
    return this.attempt.answers[q.id] || '—';
  }
}