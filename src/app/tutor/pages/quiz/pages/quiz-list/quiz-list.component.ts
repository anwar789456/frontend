import { Component, OnInit, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TutorQuizService } from '../../services/quiz.service';
import { Quiz } from '../../models/quiz.model';

@Component({
  selector: 'app-tutor-quiz-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './quiz-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    @keyframes fadeInUp { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes scaleIn { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }
    @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
    .anim-fade-up { animation: fadeInUp 0.45s ease-out both; }
    .anim-scale-in { animation: scaleIn 0.35s ease-out both; }
    .skeleton-shimmer {
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
      background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 8px;
    }
  `]
})
export class TutorQuizListComponent implements OnInit {
  protected Math = Math;
  quizzes: Quiz[] = [];
  isLoading = true;
  errorMessage = '';
  showDeleteModal = false;
  quizToDelete: Quiz | null = null;

  // Search & Filter
  searchTerm = '';
  activeFilter: string = 'all';
  sortBy: string = 'newest';

  // Pagination
  currentPage = 1;
  pageSize = 6;

  // Stats
  stats = [
    { label: 'TOTAL QUIZZES', value: '—', sub: '', icon: 'quizzes' },
    { label: 'TOTAL QUESTIONS', value: '—', sub: '', icon: 'questions' },
    { label: 'OPEN QUIZZES', value: '—', sub: '', icon: 'open' },
  ];

  constructor(
    private quizService: TutorQuizService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadQuizzes();
  }

  loadQuizzes(): void {
    this.isLoading = true;
    this.cdr.markForCheck();

    this.quizService.getAllQuizzes().subscribe({
      next: (data) => {
        this.quizzes = data;
        this.updateStats();
        this.isLoading = false;
        this.errorMessage = '';
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to load quizzes:', err);
        this.errorMessage = 'Failed to load quizzes.';
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  private updateStats(): void {
    const totalQuestions = this.quizzes.reduce((sum, q) => sum + (q.questions?.length ?? 0), 0);
    const openCount = this.quizzes.filter(q => q.status === 'OPEN').length;
    this.stats[0].value = String(this.quizzes.length);
    this.stats[0].sub = 'Created quizzes';
    this.stats[1].value = String(totalQuestions);
    this.stats[1].sub = 'Across all quizzes';
    this.stats[2].value = String(openCount);
    this.stats[2].sub = 'Available to students';
  }

  // ── Filtering & Sorting ──

  setFilter(f: string): void {
    this.activeFilter = f;
    this.currentPage = 1;
    this.cdr.markForCheck();
  }

  private getBaseFilteredQuizzes(): Quiz[] {
    let list = [...this.quizzes];

    // Search
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      list = list.filter(q =>
        q.title?.toLowerCase().includes(term) ||
        q.description?.toLowerCase().includes(term)
      );
    }

    // Filter
    if (this.activeFilter === 'archived') list = list.filter(q => q.archived);
    else if (this.activeFilter === 'open') list = list.filter(q => q.status === 'OPEN' && !q.archived);
    else if (this.activeFilter === 'closed') list = list.filter(q => q.status === 'CLOSED' && !q.archived);
    else list = list.filter(q => !q.archived); // 'all' = only non-archived

    // Sort
    if (this.sortBy === 'title') list.sort((a, b) => (a.title ?? '').localeCompare(b.title ?? ''));
    else if (this.sortBy === 'questions') list.sort((a, b) => (b.questions?.length ?? 0) - (a.questions?.length ?? 0));
    else if (this.sortBy === 'xp') list.sort((a, b) => (b.xpReward ?? 0) - (a.xpReward ?? 0));
    // newest = default order from API

    return list;
  }

  get filteredQuizzes(): Quiz[] {
    const list = this.getBaseFilteredQuizzes();
    const total = Math.ceil(list.length / this.pageSize);
    if (this.currentPage > total && total > 0) this.currentPage = 1;
    const start = (this.currentPage - 1) * this.pageSize;
    return list.slice(start, start + this.pageSize);
  }

  get totalFilteredCount(): number {
    return this.getBaseFilteredQuizzes().length;
  }

  get totalPages(): number {
    return Math.ceil(this.totalFilteredCount / this.pageSize);
  }

  get pageNumbers(): number[] {
    const total = this.totalPages;
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: number[] = [1];
    const start = Math.max(2, this.currentPage - 1);
    const end = Math.min(total - 1, this.currentPage + 1);
    if (start > 2) pages.push(-1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < total - 1) pages.push(-1);
    pages.push(total);
    return pages;
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.cdr.markForCheck();
  }

  // ── Helpers ──

  getStatusColor(status: string): string {
    switch (status) {
      case 'OPEN':   return 'bg-[#4ade80] text-white';
      case 'CLOSED': return 'bg-red-100 text-red-700';
      default:       return 'bg-gray-100 text-gray-600';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'OPEN':   return 'PUBLISHED';
      case 'CLOSED': return 'CLOSED';
      default:       return status;
    }
  }

  getLevelColor(level: string): string {
    switch (level) {
      case 'BEGINNER':     return 'bg-emerald-50 text-emerald-600';
      case 'INTERMEDIATE': return 'bg-amber-50 text-amber-600';
      case 'ADVANCED':     return 'bg-red-50 text-red-600';
      default:             return 'bg-gray-100 text-gray-600';
    }
  }

  getLevelGradient(level: string): string {
    switch (level) {
      case 'BEGINNER':     return 'from-[#d1fae5] to-[#a7f3d0]';
      case 'INTERMEDIATE': return 'from-[#fef3c7] to-[#fde68a]';
      case 'ADVANCED':     return 'from-[#fee2e2] to-[#fecaca]';
      default:             return 'from-[#dbeafe] to-[#bfdbfe]';
    }
  }

  getLevelEmoji(level: string): string {
    switch (level) {
      case 'BEGINNER':     return '🌱';
      case 'INTERMEDIATE': return '⚡';
      case 'ADVANCED':     return '🔥';
      default:             return '📝';
    }
  }

  // ── Archive ──

  archiveQuiz(quiz: Quiz): void {
    if (!quiz.id) return;
    this.quizService.archiveQuiz(quiz.id).subscribe({
      next: () => this.loadQuizzes(),
      error: (err) => console.error('Failed to archive quiz:', err)
    });
  }

  unarchiveQuiz(quiz: Quiz): void {
    if (!quiz.id) return;
    this.quizService.unarchiveQuiz(quiz.id).subscribe({
      next: () => this.loadQuizzes(),
      error: (err) => console.error('Failed to unarchive quiz:', err)
    });
  }

  // ── Delete ──

  confirmDelete(quiz: Quiz): void {
    this.quizToDelete = quiz;
    this.showDeleteModal = true;
    this.cdr.markForCheck();
  }

  cancelDelete(): void {
    this.showDeleteModal = false;
    this.quizToDelete = null;
    this.cdr.markForCheck();
  }

  executeDelete(): void {
    if (!this.quizToDelete?.id) return;
    this.quizService.deleteQuiz(this.quizToDelete.id).subscribe({
      next: () => {
        this.showDeleteModal = false;
        this.quizToDelete = null;
        this.loadQuizzes();
      },
      error: (err) => {
        console.error('Failed to delete quiz:', err);
        this.cdr.markForCheck();
      }
    });
  }
}