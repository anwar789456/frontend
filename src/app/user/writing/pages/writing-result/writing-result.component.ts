import { Component, OnInit, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { WritingService } from '../../services/writing.service';
import { WritingPrompt, WritingSubmission, WritingFeedback } from '../../models/writing.model';

@Component({
  selector: 'app-writing-result',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './writing-result.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    @keyframes fadeInUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
    .anim-fade-up { animation: fadeInUp 0.4s ease-out both; }
    @keyframes scaleIn { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
    .anim-scale { animation: scaleIn 0.5s ease-out both; }
  `]
})
export class WritingResultComponent implements OnInit {
  prompt: WritingPrompt | null = null;
  submission: WritingSubmission | null = null;
  feedback: WritingFeedback | null = null;
  isLoading = true;

  constructor(
    private writingService: WritingService,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const promptId = +this.route.snapshot.paramMap.get('id')!;
    const submissionId = +this.route.snapshot.paramMap.get('submissionId')!;
    this.loadData(promptId, submissionId);
  }

  private loadData(promptId: number, submissionId: number): void {
    this.isLoading = true;
    this.cdr.markForCheck();

    this.writingService.getPromptById(promptId).subscribe({
      next: (prompt) => {
        this.prompt = prompt;

        this.writingService.getSubmissionById(submissionId).subscribe({
          next: (sub) => {
            this.submission = sub;
            if (sub.feedbackJson) {
              try { this.feedback = JSON.parse(sub.feedbackJson); } catch {}
            }
            this.isLoading = false;
            this.cdr.markForCheck();
          },
          error: () => {
            this.isLoading = false;
            this.cdr.markForCheck();
          }
        });
      },
      error: () => {
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  getScoreColor(score: number): string {
    if (score >= 80) return 'text-emerald-500';
    if (score >= 60) return 'text-amber-500';
    return 'text-red-500';
  }

  getScoreBg(score: number): string {
    if (score >= 80) return 'bg-emerald-400';
    if (score >= 60) return 'bg-amber-400';
    return 'bg-red-400';
  }

  getScoreLabel(score: number): string {
    if (score >= 90) return 'Excellent!';
    if (score >= 80) return 'Great job!';
    if (score >= 70) return 'Good work!';
    if (score >= 60) return 'Nice effort!';
    if (score >= 50) return 'Keep practicing!';
    return 'You can do better!';
  }
}
