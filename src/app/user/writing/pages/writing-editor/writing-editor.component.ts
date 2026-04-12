import { Component, OnInit, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { WritingService } from '../../services/writing.service';
import { WritingPrompt, WritingSubmission } from '../../models/writing.model';

@Component({
  selector: 'app-writing-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './writing-editor.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    @keyframes fadeInUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
    .anim-fade-up { animation: fadeInUp 0.4s ease-out both; }
    @keyframes pulse-dot { 0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; } 40% { transform: scale(1); opacity: 1; } }
    .dot-1 { animation: pulse-dot 1.4s ease-in-out infinite; }
    .dot-2 { animation: pulse-dot 1.4s ease-in-out 0.2s infinite; }
    .dot-3 { animation: pulse-dot 1.4s ease-in-out 0.4s infinite; }
  `]
})
export class WritingEditorComponent implements OnInit {
  protected Math = Math;
  prompt: WritingPrompt | null = null;
  submission: WritingSubmission | null = null;
  isLoading = true;
  isSaving = false;
  isSubmitting = false;
  saveMessage = '';

  text = '';

  constructor(
    private writingService: WritingService,
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
    const promptId = +this.route.snapshot.paramMap.get('id')!;
    this.loadPromptAndSubmission(promptId);
  }

  private loadPromptAndSubmission(promptId: number): void {
    this.isLoading = true;
    this.cdr.markForCheck();

    this.writingService.getPromptById(promptId).subscribe({
      next: (prompt) => {
        this.prompt = prompt;

        if (this.userId) {
          this.writingService.startOrResumeSubmission(this.userId, promptId).subscribe({
            next: (sub) => {
              this.submission = sub;
              this.text = sub.submittedText || '';
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

  get wordCount(): number {
    const trimmed = this.text.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).length;
  }

  get isUnderMin(): boolean {
    return this.prompt ? this.wordCount < this.prompt.minWords : false;
  }

  get isOverMax(): boolean {
    return this.prompt ? this.wordCount > this.prompt.maxWords : false;
  }

  get canSubmit(): boolean {
    return !!this.submission && !this.isUnderMin && !this.isOverMax && this.wordCount > 0;
  }

  get wordCountColor(): string {
    if (this.isOverMax) return 'text-red-500';
    if (this.isUnderMin) return 'text-amber-500';
    return 'text-emerald-500';
  }

  saveDraft(): void {
    if (!this.submission || this.isSaving) return;
    this.isSaving = true;
    this.saveMessage = '';
    this.cdr.markForCheck();

    this.writingService.saveProgress(this.submission.id!, this.text).subscribe({
      next: (sub) => {
        this.submission = sub;
        this.isSaving = false;
        this.saveMessage = 'Draft saved!';
        this.cdr.markForCheck();
        setTimeout(() => { this.saveMessage = ''; this.cdr.markForCheck(); }, 2000);
      },
      error: () => {
        this.isSaving = false;
        this.saveMessage = 'Failed to save draft.';
        this.cdr.markForCheck();
      }
    });
  }

  submit(): void {
    if (!this.canSubmit || this.isSubmitting) return;
    this.isSubmitting = true;
    this.cdr.markForCheck();

    this.writingService.submitForEvaluation(this.submission!.id!, this.text).subscribe({
      next: (sub) => {
        this.isSubmitting = false;
        this.cdr.markForCheck();
        this.router.navigate(['/writing', this.prompt!.id, 'result', sub.id]);
      },
      error: () => {
        this.isSubmitting = false;
        this.cdr.markForCheck();
      }
    });
  }

  getDifficultyColor(difficulty: string): string {
    switch (difficulty?.toUpperCase()) {
      case 'BEGINNER': return 'bg-emerald-100 text-emerald-700';
      case 'INTERMEDIATE': return 'bg-amber-100 text-amber-700';
      case 'ADVANCED': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  }
}
