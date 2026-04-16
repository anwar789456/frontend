import { Component, OnInit, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { QuizService } from '../../services/quiz.service';
import { Quiz, QuizAttempt, StoryQuiz, StoryAttempt } from '../../models/quiz.model';

@Component({
  selector: 'app-user-quiz-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, DecimalPipe],
  templateUrl: './quiz-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    @keyframes fadeInUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
    .anim-fade-up { animation: fadeInUp 0.4s ease-out both; }
    .anim-float { animation: float 6s ease-in-out infinite; }
  `]
})
export class UserQuizListComponent implements OnInit {
  quizzes: Quiz[] = [];
  storyQuizzes: StoryQuiz[] = [];
  attempts: QuizAttempt[] = [];
  storyAttempts: StoryAttempt[] = [];
  isLoading = true;

  filterLevel = 'ALL';
  filterStatus = 'ALL';

  // Pagination
  currentPage = 0;
  readonly itemsPerPage = 3; // Show 6 quizzes per page (2 rows of 3)
  storyCurrentPage = 0;
  readonly storyItemsPerPage = 3; // Show 3 story quizzes per page

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

  get userXp(): number {
    try {
      const user = JSON.parse(localStorage.getItem('auth_user') || 'null');
      return user?.xp ?? 0;
    } catch { return 0; }
  }

  get userStreak(): number {
    try {
      const user = JSON.parse(localStorage.getItem('auth_user') || 'null');
      return user?.streak ?? 0;
    } catch { return 0; }
  }

  get totalXpEarned(): number {
    return this.attempts
      .filter(a => a.completed)
      .reduce((sum, a) => sum + (a.score ?? 0), 0);
  }

  get completedQuizCount(): number {
    return this.attempts.filter(a => a.completed).length
      + this.storyAttempts.filter(a => a.completed).length;
  }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;
    this.cdr.markForCheck();

    this.quizService.getAllQuizzes().subscribe({
      next: (quizzes) => {
        this.quizzes = [...quizzes.filter(q => q.status === 'OPEN' && !q.archived)];
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
        this.storyQuizzes = [...stories.filter(s => !s.archived)];
        this.cdr.markForCheck();
        this.loadStoryAttempts();
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

  private loadStoryAttempts(): void {
    if (!this.userId) return;

    this.quizService.getUserStoryAttempts(this.userId).subscribe({
      next: (attempts) => {
        this.storyAttempts = [...attempts];
        this.cdr.markForCheck();
      },
      error: () => {}
    });
  }

  // Reset pagination when filters change
  onFilterChange(): void {
    this.currentPage = 0;
    this.storyCurrentPage = 0;
    this.cdr.markForCheck();
  }

  getAttemptForQuiz(quizId: number | undefined): QuizAttempt | undefined {
    if (!quizId) return undefined;
    return this.attempts.find(a => a.quizId === quizId);
  }

  getStoryAttempt(storyQuizId: number | undefined): StoryAttempt | undefined {
    if (!storyQuizId) return undefined;
    return this.storyAttempts.find(a => a.storyQuizId === storyQuizId);
  }

  getQuizStatus(quiz: Quiz): 'not_started' | 'in_progress' | 'completed' {
    const attempt = this.getAttemptForQuiz(quiz.id);
    if (!attempt) return 'not_started';
    return attempt.completed ? 'completed' : 'in_progress';
  }

  getStoryQuizStatus(sq: StoryQuiz): 'not_started' | 'in_progress' | 'completed' {
    const attempt = this.getStoryAttempt(sq.id);
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

  get totalPages(): number {
    return Math.ceil(this.filteredQuizzes.length / this.itemsPerPage);
  }

  get paginatedQuizzes(): Quiz[] {
    const start = this.currentPage * this.itemsPerPage;
    return this.filteredQuizzes.slice(start, start + this.itemsPerPage);
  }

  get pageArray(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i);
  }

  prevPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.cdr.markForCheck();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.cdr.markForCheck();
    }
  }

  goToPage(page: number): void {
    this.currentPage = page;
    this.cdr.markForCheck();
  }

  get filteredStoryQuizzes(): StoryQuiz[] {
    return this.storyQuizzes.filter(sq => {
      // Filter by level (story quizzes use 'difficulty' instead of 'level')
      if (this.filterLevel !== 'ALL' && sq.difficulty !== this.filterLevel) return false;
      // Filter by status
      if (this.filterStatus !== 'ALL') {
        const status = this.getStoryQuizStatus(sq);
        if (this.filterStatus !== status) return false;
      }
      return true;
    });
  }

  get storyTotalPages(): number {
    return Math.ceil(this.filteredStoryQuizzes.length / this.storyItemsPerPage);
  }

  get paginatedStoryQuizzes(): StoryQuiz[] {
    const start = this.storyCurrentPage * this.storyItemsPerPage;
    return this.filteredStoryQuizzes.slice(start, start + this.storyItemsPerPage);
  }

  get storyPageArray(): number[] {
    return Array.from({ length: this.storyTotalPages }, (_, i) => i);
  }

  prevStoryPage(): void {
    if (this.storyCurrentPage > 0) {
      this.storyCurrentPage--;
      this.cdr.markForCheck();
    }
  }

  nextStoryPage(): void {
    if (this.storyCurrentPage < this.storyTotalPages - 1) {
      this.storyCurrentPage++;
      this.cdr.markForCheck();
    }
  }

  goToStoryPage(page: number): void {
    this.storyCurrentPage = page;
    this.cdr.markForCheck();
  }
}