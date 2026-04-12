import { Component, OnInit, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TutorWritingService } from '../../services/writing.service';
import { WritingPrompt } from '../../models/writing.model';

@Component({
  selector: 'app-tutor-writing-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './writing-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TutorWritingFormComponent implements OnInit {
  isEditMode = false;
  promptId: number | null = null;
  isLoading = false;
  isSaving = false;

  title = '';
  description = '';
  difficulty = 'BEGINNER';
  xpReward = 50;
  minWords = 30;
  maxWords = 200;

  difficulties = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];

  constructor(
    private writingService: TutorWritingService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.isEditMode = true;
      this.promptId = +idParam;
      this.loadPrompt(this.promptId);
    }
  }

  private loadPrompt(id: number): void {
    this.isLoading = true;
    this.cdr.markForCheck();
    this.writingService.getPromptById(id).subscribe({
      next: (p) => {
        this.title = p.title;
        this.description = p.description;
        this.difficulty = p.difficulty;
        this.xpReward = p.xpReward;
        this.minWords = p.minWords;
        this.maxWords = p.maxWords;
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  get canSave(): boolean {
    return this.title.trim() !== ''
      && this.description.trim() !== ''
      && this.minWords > 0
      && this.maxWords > this.minWords;
  }

  save(): void {
    if (!this.canSave || this.isSaving) return;
    this.isSaving = true;
    this.cdr.markForCheck();

    const prompt: WritingPrompt = {
      title: this.title,
      description: this.description,
      difficulty: this.difficulty as 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED',
      xpReward: this.xpReward,
      minWords: this.minWords,
      maxWords: this.maxWords,
      archived: false
    };

    const save$ = this.isEditMode && this.promptId
      ? this.writingService.updatePrompt(this.promptId, prompt)
      : this.writingService.createPrompt(prompt);

    save$.subscribe({
      next: () => {
        this.isSaving = false;
        this.cdr.markForCheck();
        this.router.navigate(['/tutor/writing']);
      },
      error: (err) => {
        console.error('Save failed:', err);
        this.isSaving = false;
        this.cdr.markForCheck();
      }
    });
  }
}
