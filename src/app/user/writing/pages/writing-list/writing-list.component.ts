import { Component, OnInit, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { WritingService } from '../../services/writing.service';
import { WritingPrompt, WritingSubmission } from '../../models/writing.model';

@Component({
  selector: 'app-writing-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './writing-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    @keyframes fadeInUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
    .anim-fade-up { animation: fadeInUp 0.4s ease-out both; }
  `]
})
export class WritingListComponent implements OnInit {
  prompts: WritingPrompt[] = [];
  submissions: WritingSubmission[] = [];
  isLoading = true;
  filterLevel = 'ALL';

  constructor(
    private writingService: WritingService,
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

    this.writingService.getAllPrompts().subscribe({
      next: (prompts) => {
        this.prompts = prompts.filter(p => !p.archived);

        if (this.userId) {
          this.writingService.getUserSubmissions(this.userId).subscribe({
            next: (subs) => {
              this.submissions = subs;
              this.isLoading = false;
              this.cdr.markForCheck();
            },
            error: () => {
              this.isLoading = false;
              this.cdr.markForCheck();
            }
          });
        } else {
          this.isLoading = false;
          this.cdr.markForCheck();
        }
      },
      error: () => {
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  get filteredPrompts(): WritingPrompt[] {
    if (this.filterLevel === 'ALL') return this.prompts;
    return this.prompts.filter(p => p.difficulty === this.filterLevel);
  }

  getSubmissionForPrompt(promptId: number): WritingSubmission | undefined {
    return this.submissions.find(s => s.writingPromptId === promptId && s.completed);
  }

  hasDraft(promptId: number): boolean {
    return this.submissions.some(s => s.writingPromptId === promptId && !s.completed);
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
}
