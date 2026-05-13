import { Component, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TutorQuizService } from '../../services/quiz.service';
import { Quiz, QuizLevel, QuizStatus } from '../../models/quiz.model';

type Step = 'form' | 'generating' | 'result';

@Component({
  selector: 'app-ai-quiz-generate',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './ai-quiz-generate.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    @keyframes fadeInUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
    @keyframes pulse2   { 0%,100%{opacity:1} 50%{opacity:.45} }
    @keyframes spin     { to{transform:rotate(360deg)} }
    @keyframes shimmer  { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
    .anim-fade-up { animation: fadeInUp .4s ease-out both; }
    .anim-pulse   { animation: pulse2  1.4s ease-in-out infinite; }
    .anim-spin    { animation: spin    .9s linear infinite; }
    .skeleton     { background: linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%); background-size:200% 100%; animation:shimmer 1.4s infinite; border-radius:8px; }
  `]
})
export class AiQuizGenerateComponent {
  step: Step = 'form';
  form: FormGroup;
  generatedQuiz: Quiz | null = null;
  errorMessage = '';
  expandedQuestion: number | null = null;

  readonly levels = [
    { value: QuizLevel.BEGINNER,     label: 'Beginner',     emoji: '🌱', color: 'emerald', desc: 'Basic vocabulary & grammar' },
    { value: QuizLevel.INTERMEDIATE, label: 'Intermediate', emoji: '⚡', color: 'amber',   desc: 'Everyday communication' },
    { value: QuizLevel.ADVANCED,     label: 'Advanced',     emoji: '🔥', color: 'red',     desc: 'Complex language & idioms' },
  ];

  readonly questionCounts = [5, 8, 10, 15];

  readonly statusOptions = [
    { value: QuizStatus.DRAFT, label: 'Draft', desc: 'Only visible to you' },
    { value: QuizStatus.OPEN,  label: 'Published', desc: 'Students can take it' },
  ];

  readonly generatingSteps = [
    'Crafting the quiz structure...',
    'Writing questions based on difficulty...',
    'Adding correct answers & options...',
    'Generating explanations...',
    'Finalising and saving...',
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
      title:         ['', [Validators.required, Validators.minLength(3)]],
      topic:         [''],
      level:         [QuizLevel.BEGINNER, Validators.required],
      questionCount: [10, Validators.required],
      status:        [QuizStatus.DRAFT, Validators.required],
      xpReward:      [50, [Validators.required, Validators.min(0), Validators.max(1000)]],
    });
  }

  selectLevel(value: string): void {
    this.form.patchValue({ level: value });
  }

  selectCount(count: number): void {
    this.form.patchValue({ questionCount: count });
  }

  selectStatus(value: string): void {
    this.form.patchValue({ status: value });
  }

  generate(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { title, topic, level, questionCount, status, xpReward } = this.form.value;

    // Build description that guides the AI on count and topic
    const parts: string[] = [];
    if (topic?.trim()) parts.push(topic.trim());
    parts.push(`Generate exactly ${questionCount} multiple-choice questions.`);
    const description = parts.join(' ');

    this.step = 'generating';
    this.errorMessage = '';
    this.generatingStepIndex = 0;
    this.startStepCycle();
    this.cdr.markForCheck();

    this.quizService.generateFullQuiz({ title, description, level, status, xpReward }).subscribe({
      next: (quiz) => {
        this.stopStepCycle();
        this.generatedQuiz = quiz;
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
    }, 2800);
  }

  private stopStepCycle(): void {
    if (this.stepInterval) { clearInterval(this.stepInterval); this.stepInterval = null; }
  }

  toggleQuestion(i: number): void {
    this.expandedQuestion = this.expandedQuestion === i ? null : i;
    this.cdr.markForCheck();
  }

  goToQuestions(): void {
    if (this.generatedQuiz?.id) {
      this.router.navigate(['/tutor/quiz', this.generatedQuiz.id, 'questions']);
    }
  }

  resetForm(): void {
    this.step = 'form';
    this.generatedQuiz = null;
    this.errorMessage = '';
    this.expandedQuestion = null;
    this.form.reset({
      title: '', topic: '',
      level: QuizLevel.BEGINNER,
      questionCount: 10,
      status: QuizStatus.DRAFT,
      xpReward: 50
    });
    this.cdr.markForCheck();
  }

  getLevelConfig(level: string) {
    return this.levels.find(l => l.value === level) ?? this.levels[0];
  }

  getOptionLetter(i: number): string {
    return String.fromCharCode(65 + i);
  }
}
