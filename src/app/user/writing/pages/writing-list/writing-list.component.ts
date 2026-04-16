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
    @keyframes fadeInUp  { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
    @keyframes float     { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
    @keyframes wiggle    { 0%,100%{transform:rotate(0deg)} 25%{transform:rotate(-8deg)} 75%{transform:rotate(8deg)} }
    @keyframes starPop   { 0%{transform:scale(0) rotate(0deg);opacity:0} 60%{transform:scale(1.3) rotate(20deg);opacity:1} 100%{transform:scale(1) rotate(0deg);opacity:1} }
    @keyframes shimmer   { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
    .anim-fade-up  { animation: fadeInUp 0.45s ease-out both; }
    .anim-float    { animation: float 5s ease-in-out infinite; }
    .anim-wiggle   { animation: wiggle 0.5s ease-in-out; }
    .anim-star-pop { animation: starPop 0.5s ease-out both; }
    .card-hover    { transition: transform 0.2s ease, box-shadow 0.2s ease; }
    .card-hover:hover { transform: translateY(-6px) scale(1.02); box-shadow: 0 20px 40px -8px rgba(0,0,0,0.12); }
  `]
})
export class WritingListComponent implements OnInit {
  prompts: WritingPrompt[] = [];
  submissions: WritingSubmission[] = [];
  isLoading = true;
  filterLevel = 'ALL';

  readonly cardThemes = [
    { bg: 'from-pink-400 to-rose-500',     light: 'bg-pink-50',   border: 'border-pink-200',   emoji: '✍️' },
    { bg: 'from-violet-400 to-purple-500', light: 'bg-violet-50', border: 'border-violet-200', emoji: '📝' },
    { bg: 'from-blue-400 to-cyan-500',     light: 'bg-blue-50',   border: 'border-blue-200',   emoji: '📖' },
    { bg: 'from-amber-400 to-orange-500',  light: 'bg-amber-50',  border: 'border-amber-200',  emoji: '🌟' },
    { bg: 'from-emerald-400 to-teal-500',  light: 'bg-emerald-50',border: 'border-emerald-200',emoji: '🎨' },
    { bg: 'from-red-400 to-pink-500',      light: 'bg-red-50',    border: 'border-red-200',    emoji: '🚀' },
  ];

  constructor(
    private writingService: WritingService,
    private cdr: ChangeDetectorRef
  ) {}

  get userId(): number | null {
    try {
      return JSON.parse(localStorage.getItem('auth_user') || 'null')?.id ?? null;
    } catch { return null; }
  }

  get userXp(): number {
    try {
      return JSON.parse(localStorage.getItem('auth_user') || 'null')?.xp ?? 0;
    } catch { return 0; }
  }

  get userStreak(): number {
    try {
      return JSON.parse(localStorage.getItem('auth_user') || 'null')?.streak ?? 0;
    } catch { return 0; }
  }

  get completedCount(): number {
    return this.submissions.filter(s => s.completed).length;
  }

  get totalXpEarned(): number {
    return this.submissions
      .filter(s => s.completed)
      .reduce((sum, s) => {
        const prompt = this.prompts.find(p => p.id === s.writingPromptId);
        return sum + (prompt?.xpReward ?? 0);
      }, 0);
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
            next: (subs) => { this.submissions = subs; this.isLoading = false; this.cdr.markForCheck(); },
            error: () => { this.isLoading = false; this.cdr.markForCheck(); }
          });
        } else {
          this.isLoading = false;
          this.cdr.markForCheck();
        }
      },
      error: () => { this.isLoading = false; this.cdr.markForCheck(); }
    });
  }

  get filteredPrompts(): WritingPrompt[] {
    if (this.filterLevel === 'ALL') return this.prompts;
    return this.prompts.filter(p => p.difficulty === this.filterLevel);
  }

  getTheme(idx: number) {
    return this.cardThemes[idx % this.cardThemes.length];
  }

  getSubmissionForPrompt(promptId: number): WritingSubmission | undefined {
    return this.submissions.find(s => s.writingPromptId === promptId && s.completed);
  }

  hasDraft(promptId: number): boolean {
    return this.submissions.some(s => s.writingPromptId === promptId && !s.completed);
  }

  getScoreEmoji(score: number): string {
    if (score >= 90) return '🏆';
    if (score >= 75) return '🌟';
    if (score >= 60) return '👍';
    return '💪';
  }

  getDifficultyConfig(difficulty: string): { label: string; emoji: string; bg: string; text: string } {
    switch (difficulty?.toUpperCase()) {
      case 'BEGINNER':     return { label: 'Beginner',     emoji: '🌱', bg: 'bg-emerald-100', text: 'text-emerald-700' };
      case 'INTERMEDIATE': return { label: 'Intermediate', emoji: '⚡', bg: 'bg-amber-100',   text: 'text-amber-700'   };
      case 'ADVANCED':     return { label: 'Advanced',     emoji: '🔥', bg: 'bg-red-100',     text: 'text-red-700'     };
      default:             return { label: difficulty,     emoji: '📝', bg: 'bg-gray-100',    text: 'text-gray-700'    };
    }
  }
}
