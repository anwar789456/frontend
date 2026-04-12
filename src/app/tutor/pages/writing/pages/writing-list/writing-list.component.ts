import { Component, OnInit, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TutorWritingService } from '../../services/writing.service';
import { WritingPrompt } from '../../models/writing.model';

@Component({
  selector: 'app-tutor-writing-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './writing-list.component.html',
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
export class TutorWritingListComponent implements OnInit {
  protected Math = Math;
  prompts: WritingPrompt[] = [];
  isLoading = true;
  showDeleteModal = false;
  itemToDelete: WritingPrompt | null = null;

  searchTerm = '';
  sortBy: string = 'newest';
  activeFilter: string = 'all';

  currentPage = 1;
  pageSize = 6;

  constructor(
    private writingService: TutorWritingService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading = true;
    this.cdr.markForCheck();
    this.writingService.getAllPrompts().subscribe({
      next: (data) => {
        this.prompts = data;
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  setFilter(f: string): void {
    this.activeFilter = f;
    this.currentPage = 1;
    this.cdr.markForCheck();
  }

  private getBaseFiltered(): WritingPrompt[] {
    let list = [...this.prompts];
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      list = list.filter(p => p.title?.toLowerCase().includes(term) || p.description?.toLowerCase().includes(term));
    }
    if (this.activeFilter === 'archived') {
      list = list.filter(p => p.archived);
    } else {
      list = list.filter(p => !p.archived);
    }
    return list;
  }

  private sortList(list: WritingPrompt[]): WritingPrompt[] {
    switch (this.sortBy) {
      case 'title': return list.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      case 'xp': return list.sort((a, b) => (b.xpReward || 0) - (a.xpReward || 0));
      case 'newest':
      default: return list.sort((a, b) => (b.id || 0) - (a.id || 0));
    }
  }

  get totalFilteredCount(): number {
    return this.getBaseFiltered().length;
  }

  get filteredPrompts(): WritingPrompt[] {
    const sorted = this.sortList(this.getBaseFiltered());
    const start = (this.currentPage - 1) * this.pageSize;
    return sorted.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.totalFilteredCount / this.pageSize);
  }

  get pageNumbers(): number[] {
    const pages: number[] = [];
    for (let i = 1; i <= this.totalPages; i++) pages.push(i);
    return pages;
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.cdr.markForCheck();
    }
  }

  getDifficultyColor(difficulty: string): string {
    switch (difficulty?.toUpperCase()) {
      case 'BEGINNER': return 'bg-emerald-100 text-emerald-700';
      case 'INTERMEDIATE': return 'bg-amber-100 text-amber-700';
      case 'ADVANCED': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  }

  getDifficultyGradient(difficulty: string): string {
    switch (difficulty?.toUpperCase()) {
      case 'BEGINNER': return 'from-emerald-400 to-teal-500';
      case 'INTERMEDIATE': return 'from-amber-400 to-orange-500';
      case 'ADVANCED': return 'from-red-400 to-rose-500';
      default: return 'from-gray-400 to-gray-500';
    }
  }

  archivePrompt(p: WritingPrompt): void {
    this.writingService.archivePrompt(p.id!).subscribe(() => this.load());
  }

  unarchivePrompt(p: WritingPrompt): void {
    this.writingService.unarchivePrompt(p.id!).subscribe(() => this.load());
  }

  confirmDelete(p: WritingPrompt): void {
    this.itemToDelete = p;
    this.showDeleteModal = true;
    this.cdr.markForCheck();
  }

  cancelDelete(): void {
    this.showDeleteModal = false;
    this.itemToDelete = null;
    this.cdr.markForCheck();
  }

  executeDelete(): void {
    if (this.itemToDelete?.id) {
      this.writingService.deletePrompt(this.itemToDelete.id).subscribe(() => {
        this.showDeleteModal = false;
        this.itemToDelete = null;
        this.load();
      });
    }
  }
}
