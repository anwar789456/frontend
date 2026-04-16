import { Component, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TutorQuizService } from '../../services/quiz.service';
import { StoryQuiz } from '../../models/quiz.model';

type Step = 'form' | 'generating' | 'result';

@Component({
  selector: 'app-ai-story-quiz-generate',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './ai-story-quiz-generate.component.html',
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
export class AiStoryQuizGenerateComponent {
  step: Step = 'form';
  form: FormGroup;
  generatedStory: StoryQuiz | null = null;
  errorMessage = '';

  readonly levels = [
    { value: 'BEGINNER',     label: 'Beginner',     emoji: '🌱', color: 'emerald', desc: 'Simple words & short story' },
    { value: 'INTERMEDIATE', label: 'Intermediate', emoji: '⚡', color: 'amber',   desc: 'Richer vocabulary & plot' },
    { value: 'ADVANCED',     label: 'Advanced',     emoji: '🔥', color: 'red',     desc: 'Complex narrative & idioms' },
  ];

  readonly generatingSteps = [
    'Crafting the story...',
    'Choosing the perfect blank words...',
    'Writing hints for each blank...',
    'Building the word bank...',
    'Saving everything...',
  ];
  generatingStepIndex = 0;
  private stepInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private fb: FormBuilder,
    private quizService: TutorQuizService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.fb.group({
      title:      ['', [Validators.required, Validators.minLength(3)]],
      difficulty: ['BEGINNER', Validators.required],
      xpReward:   [50, [Validators.required, Validators.min(0), Validators.max(1000)]],
    });
  }

  selectLevel(value: string): void { this.form.patchValue({ difficulty: value }); }

  generate(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    const { title, difficulty, xpReward } = this.form.value;
    this.step = 'generating';
    this.errorMessage = '';
    this.generatingStepIndex = 0;
    this.startStepCycle();
    this.cdr.markForCheck();

    this.quizService.generateFullStoryQuiz({ title, difficulty, xpReward }).subscribe({
      next: (story) => {
        this.stopStepCycle();
        this.generatedStory = story;
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
    }, 2600);
  }

  private stopStepCycle(): void {
    if (this.stepInterval) { clearInterval(this.stepInterval); this.stepInterval = null; }
  }

  // Split story template into text/blank segments for preview
  get previewSegments(): { type: 'text' | 'blank'; value: string; index?: number }[] {
    if (!this.generatedStory?.storyTemplate) return [];
    const parts: { type: 'text' | 'blank'; value: string; index?: number }[] = [];
    const regex = /\{blank_(\d+)\}/g;
    let lastIdx = 0, match: RegExpExecArray | null;
    while ((match = regex.exec(this.generatedStory.storyTemplate)) !== null) {
      if (match.index > lastIdx) parts.push({ type: 'text', value: this.generatedStory.storyTemplate.slice(lastIdx, match.index) });
      const idx = parseInt(match[1], 10);
      const blank = this.generatedStory.blanks?.find(b => b.blankIndex === idx);
      parts.push({ type: 'blank', value: blank?.correctWord || '____', index: idx });
      lastIdx = regex.lastIndex;
    }
    if (lastIdx < this.generatedStory.storyTemplate.length) {
      parts.push({ type: 'text', value: this.generatedStory.storyTemplate.slice(lastIdx) });
    }
    return parts;
  }

  goToEdit(): void {
    if (this.generatedStory?.id) this.router.navigate(['/tutor/quiz/story/edit', this.generatedStory.id]);
  }

  resetForm(): void {
    this.step = 'form';
    this.generatedStory = null;
    this.errorMessage = '';
    this.form.reset({ title: '', difficulty: 'BEGINNER', xpReward: 50 });
    this.cdr.markForCheck();
  }

  getLevelConfig(level: string) {
    return this.levels.find(l => l.value === level?.toUpperCase()) ?? this.levels[0];
  }

  getDifficultyGradient(d: string): string {
    switch (d?.toUpperCase()) {
      case 'BEGINNER':     return 'from-emerald-400 to-teal-500';
      case 'INTERMEDIATE': return 'from-amber-400 to-orange-500';
      case 'ADVANCED':     return 'from-red-400 to-rose-500';
      default:             return 'from-purple-400 to-violet-500';
    }
  }

  getDifficultyColor(d: string): string {
    switch (d?.toUpperCase()) {
      case 'BEGINNER':     return 'bg-emerald-100 text-emerald-700';
      case 'INTERMEDIATE': return 'bg-amber-100 text-amber-700';
      case 'ADVANCED':     return 'bg-red-100 text-red-700';
      default:             return 'bg-gray-100 text-gray-700';
    }
  }
}
