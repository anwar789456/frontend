import { Component, OnInit, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TutorQuizService } from '../../services/quiz.service';
import { StoryQuiz } from '../../models/quiz.model';

@Component({
  selector: 'app-tutor-story-quiz-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './story-quiz-list.component.html',
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
export class TutorStoryQuizListComponent implements OnInit {
  protected Math = Math;
  storyQuizzes: StoryQuiz[] = [];
  isLoading = true;
  showDeleteModal = false;
  itemToDelete: StoryQuiz | null = null;

  // Search & Filter
  searchTerm = '';
  sortBy: string = 'newest';
  activeFilter: string = 'all';

  // Pagination
  currentPage = 1;
  pageSize = 3;

  constructor(
    private quizService: TutorQuizService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading = true;
    this.cdr.markForCheck();
    this.quizService.getAllStoryQuizzes().subscribe({
      next: (data) => {
        this.storyQuizzes = data;
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  // ── Filtering ──

  setFilter(f: string): void {
    this.activeFilter = f;
    this.currentPage = 1;
    this.cdr.markForCheck();
  }

  private getBaseFiltered(): StoryQuiz[] {
    let list = [...this.storyQuizzes];
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      list = list.filter(sq => sq.title?.toLowerCase().includes(term));
    }
    // Archive filter
    if (this.activeFilter === 'archived') list = list.filter(sq => sq.archived);
    else list = list.filter(sq => !sq.archived);

    if (this.sortBy === 'title') list.sort((a, b) => (a.title ?? '').localeCompare(b.title ?? ''));
    else if (this.sortBy === 'blanks') list.sort((a, b) => (b.blanks?.length ?? 0) - (a.blanks?.length ?? 0));
    else if (this.sortBy === 'xp') list.sort((a, b) => (b.xpReward ?? 0) - (a.xpReward ?? 0));
    return list;
  }

  get filteredStoryQuizzes(): StoryQuiz[] {
    const list = this.getBaseFiltered();
    const total = Math.ceil(list.length / this.pageSize);
    if (this.currentPage > total && total > 0) this.currentPage = 1;
    const start = (this.currentPage - 1) * this.pageSize;
    return list.slice(start, start + this.pageSize);
  }

  get totalFilteredCount(): number {
    return this.getBaseFiltered().length;
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

  getDifficultyColor(d: string): string {
    switch (d) {
      case 'BEGINNER':     return 'bg-emerald-50 text-emerald-600';
      case 'INTERMEDIATE': return 'bg-amber-50 text-amber-600';
      case 'ADVANCED':     return 'bg-red-50 text-red-600';
      default:             return 'bg-gray-100 text-gray-600';
    }
  }

  getDifficultyGradient(d: string): string {
    switch (d) {
      case 'BEGINNER':     return 'from-[#d1fae5] to-[#a7f3d0]';
      case 'INTERMEDIATE': return 'from-[#fef3c7] to-[#fde68a]';
      case 'ADVANCED':     return 'from-[#fee2e2] to-[#fecaca]';
      default:             return 'from-[#ede9fe] to-[#c4b5fd]';
    }
  }

  // ── Archive ──

  archiveStoryQuiz(sq: StoryQuiz): void {
    if (!sq.id) return;
    this.quizService.archiveStoryQuiz(sq.id).subscribe({
      next: () => this.load(),
      error: (err) => console.error('Failed to archive story quiz:', err)
    });
  }

  unarchiveStoryQuiz(sq: StoryQuiz): void {
    if (!sq.id) return;
    this.quizService.unarchiveStoryQuiz(sq.id).subscribe({
      next: () => this.load(),
      error: (err) => console.error('Failed to unarchive story quiz:', err)
    });
  }

  // ── Delete ──

  confirmDelete(sq: StoryQuiz): void {
    this.itemToDelete = sq;
    this.showDeleteModal = true;
    this.cdr.markForCheck();
  }

  cancelDelete(): void {
    this.showDeleteModal = false;
    this.itemToDelete = null;
    this.cdr.markForCheck();
  }

  executeDelete(): void {
    if (!this.itemToDelete?.id) return;
    this.quizService.deleteStoryQuiz(this.itemToDelete.id).subscribe({
      next: () => {
        this.showDeleteModal = false;
        this.itemToDelete = null;
        this.load();
      },
      error: (err) => {
        console.error('Delete failed:', err);
        this.cdr.markForCheck();
      }
    });
  }
}