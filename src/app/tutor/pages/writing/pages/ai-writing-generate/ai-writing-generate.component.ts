import { Component, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TutorWritingService } from '../../services/writing.service';
import { WritingPrompt } from '../../models/writing.model';

type Step = 'form' | 'generating' | 'result';

@Component({
  selector: 'app-ai-writing-generate',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './ai-writing-generate.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    @keyframes fadeInUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
    @keyframes pulse2   { 0%,100%{opacity:1} 50%{opacity:.45} }
    @keyframes spin     { to{transform:rotate(360deg)} }
    .anim-fade-up { animation: fadeInUp .4s ease-out both; }
    .anim-pulse   { animation: pulse2  1.4s ease-in-out infinite; }
    .anim-spin    { animation: spin    .9s linear infinite; }
  `]
})
export class AiWritingGenerateComponent {
  step: Step = 'form';
  form: FormGroup;
  generatedPrompt: WritingPrompt | null = null;
  errorMessage = '';

  readonly levels = [
    { value: 'BEGINNER',     label: 'Beginner',     emoji: '🌱', color: 'emerald', desc: 'Simple sentences, short texts' },
    { value: 'INTERMEDIATE', label: 'Intermediate', emoji: '⚡', color: 'amber',   desc: 'Paragraphs & basic structure' },
    { value: 'ADVANCED',     label: 'Advanced',     emoji: '🔥', color: 'red',     desc: 'Complex arguments & essays' },
  ];

  readonly writingTypes = [
    { value: 'story',       label: 'Story',        icon: '📖' },
    { value: 'letter',      label: 'Letter',       icon: '✉️' },
    { value: 'essay',       label: 'Essay',        icon: '📝' },
    { value: 'description', label: 'Description',  icon: '🖼️' },
    { value: 'dialogue',    label: 'Dialogue',     icon: '💬' },
    { value: 'email',       label: 'Email',        icon: '📧' },
  ];

  readonly generatingSteps = [
    'Understanding your topic...',
    'Crafting the writing prompt...',
    'Setting word count guidelines...',
    'Finalising and saving...',
  ];
  generatingStepIndex = 0;
  private stepInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private fb: FormBuilder,
    private writingService: TutorWritingService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.fb.group({
      title:      ['', [Validators.required, Validators.minLength(3)]],
      type:       ['story', Validators.required],
      hints:      [''],
      difficulty: ['BEGINNER', Validators.required],
      xpReward:   [50, [Validators.required, Validators.min(0), Validators.max(1000)]],
    });
  }

  selectLevel(value: string): void { this.form.patchValue({ difficulty: value }); }
  selectType(value: string):  void { this.form.patchValue({ type: value }); }

  generate(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    const { title, type, hints, difficulty, xpReward } = this.form.value;

    this.step = 'generating';
    this.errorMessage = '';
    this.generatingStepIndex = 0;
    this.startStepCycle();
    this.cdr.markForCheck();

    this.writingService.generateWritingPrompt({ title, type, hints, difficulty, xpReward }).subscribe({
      next: (prompt) => {
        this.stopStepCycle();
        this.generatedPrompt = prompt;
        this.step = 'result';
        this.cdr.markForCheck();
      },
      error: () => {
        this.stopStepCycle();
        this.errorMessage = 'AI generation failed. Check your connection or try again.';
        this.step = 'form';
        this.cdr.markForCheck();
      }
    });
  }

  private startStepCycle(): void {
    this.stepInterval = setInterval(() => {
      if (this.generatingStepIndex < this.generatingSteps.length - 1) {
        this.generatingStepIndex++;
        this.cdr.markForCheck();
      }
    }, 2500);
  }

  private stopStepCycle(): void {
    if (this.stepInterval) { clearInterval(this.stepInterval); this.stepInterval = null; }
  }

  goToEdit(): void {
    if (this.generatedPrompt?.id) {
      this.router.navigate(['/tutor/writing/edit', this.generatedPrompt.id]);
    }
  }

  resetForm(): void {
    this.step = 'form';
    this.generatedPrompt = null;
    this.errorMessage = '';
    this.form.reset({ title: '', type: 'story', hints: '', difficulty: 'BEGINNER', xpReward: 50 });
    this.cdr.markForCheck();
  }

  getLevelConfig(level: string) {
    return this.levels.find(l => l.value === level?.toUpperCase()) ?? this.levels[0];
  }

  getDifficultyGradient(difficulty: string): string {
    switch (difficulty?.toUpperCase()) {
      case 'BEGINNER':     return 'from-emerald-400 to-teal-500';
      case 'INTERMEDIATE': return 'from-amber-400 to-orange-500';
      case 'ADVANCED':     return 'from-red-400 to-rose-500';
      default:             return 'from-gray-400 to-gray-500';
    }
  }

  getDifficultyColor(difficulty: string): string {
    switch (difficulty?.toUpperCase()) {
      case 'BEGINNER':     return 'bg-emerald-100 text-emerald-700';
      case 'INTERMEDIATE': return 'bg-amber-100 text-amber-700';
      case 'ADVANCED':     return 'bg-red-100 text-red-700';
      default:             return 'bg-gray-100 text-gray-700';
    }
  }
}
