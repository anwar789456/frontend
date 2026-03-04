import { Component, OnInit, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { QuizService } from '../../services/quiz.service';
import { Quiz, QuizAttempt, StoryQuiz } from '../../models/quiz.model';

@Component({
  selector: 'app-user-quiz-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './quiz-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    @keyframes fadeInUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
    .anim-fade-up { animation: fadeInUp 0.4s ease-out both; }
  `]
})
export class UserQuizListComponent implements OnInit {
  quizzes: Quiz[] = [];
  storyQuizzes: StoryQuiz[] = [];
  attempts: QuizAttempt[] = [];
  isLoading = true;

  filterLevel = 'ALL';
  filterStatus = 'ALL';

  constructor(
    private quizService: QuizService,
    private cdr: ChangeDetectorRef
  ) {}

  get userId(): number | null {
    try {
      const user = JSON.parse(localStorage.getItem('auth_user') || 'null');
      return user?.id ?? null;
    } catch { return null; }
  }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;
    this.cdr.markForCheck();

    this.quizService.getAllQuizzes().subscribe({
      next: (quizzes) => {
        this.quizzes = [...quizzes.filter(q => q.status === 'OPEN')];
        this.cdr.markForCheck(); // show quizzes while attempts load
        this.loadAttempts();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });

    this.quizService.getAllStoryQuizzes().subscribe({
      next: (stories) => {
        this.storyQuizzes = [...stories];
        this.cdr.markForCheck();
      },
      error: () => {}
    });
  }

  private loadAttempts(): void {
    if (!this.userId) {
      this.isLoading = false;
      this.cdr.markForCheck();
      return;
    }

    this.quizService.getUserAttempts(this.userId).subscribe({
      next: (attempts) => {
        this.attempts = [...attempts];
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  // filter changes come from template [(ngModel)] bindings — markForCheck needed
  onFilterChange(): void {
    this.cdr.markForCheck();
  }

  getAttemptForQuiz(quizId: number | undefined): QuizAttempt | undefined {
    if (!quizId) return undefined;
    return this.attempts.find(a => a.quizId === quizId);
  }

  getQuizStatus(quiz: Quiz): 'not_started' | 'in_progress' | 'completed' {
    const attempt = this.getAttemptForQuiz(quiz.id);
    if (!attempt) return 'not_started';
    return attempt.completed ? 'completed' : 'in_progress';
  }

  getProgress(quiz: Quiz): number {
    const attempt = this.getAttemptForQuiz(quiz.id);
    if (!attempt || attempt.totalQuestions === 0) return 0;
    return Math.round((attempt.answeredQuestions / attempt.totalQuestions) * 100);
  }

  getLevelColor(level: string): string {
    switch (level) {
      case 'BEGINNER': return 'bg-emerald-100 text-emerald-700';
      case 'INTERMEDIATE': return 'bg-yellow-100 text-yellow-700';
      case 'ADVANCED': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  }

  get filteredQuizzes(): Quiz[] {
    return this.quizzes.filter(q => {
      if (this.filterLevel !== 'ALL' && q.level !== this.filterLevel) return false;
      if (this.filterStatus !== 'ALL') {
        const status = this.getQuizStatus(q);
        if (this.filterStatus !== status) return false;
      }
      return true;
    });
  }
}