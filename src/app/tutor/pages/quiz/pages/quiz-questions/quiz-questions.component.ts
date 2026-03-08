import { Component, OnInit, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TutorQuizService } from '../../services/quiz.service';
import { Quiz, QuestionQuiz, QuestionType } from '../../models/quiz.model';

@Component({
  selector: 'app-tutor-quiz-questions',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './quiz-questions.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TutorQuizQuestionsComponent implements OnInit {
  quiz: Quiz | null = null;
  questions: QuestionQuiz[] = [];
  isLoading = true;
  quizId!: number;

  showForm = false;
  editingQuestion: QuestionQuiz | null = null;
  questionForm!: FormGroup;
  questionTypes = Object.values(QuestionType);
  isSaving = false;
  isGeneratingQuestions = false;
  aiQuestionCount = 3;
  aiGeneratedCount = 0;

  constructor(
    private fb: FormBuilder,
    private quizService: TutorQuizService,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.quizId = +this.route.snapshot.paramMap.get('id')!;
    this.initForm();
    this.loadQuiz();
  }

  private initForm(): void {
    this.questionForm = this.fb.group({
      question: ['', Validators.required],
      type: [QuestionType.MCQ, Validators.required],
      options: this.fb.array([
        this.fb.control(''),
        this.fb.control('')
      ]),
      correctAnswer: ['', Validators.required],
      explanation: ['']
    });

    this.applyOptionValidators(true);
  }

  private applyOptionValidators(required: boolean): void {
    this.optionsArray.controls.forEach(ctrl => {
      if (required) {
        ctrl.setValidators(Validators.required);
      } else {
        ctrl.clearValidators();
      }
      ctrl.updateValueAndValidity();
    });
    this.optionsArray.updateValueAndValidity();
  }

  get optionsArray(): FormArray {
    return this.questionForm.get('options') as FormArray;
  }

  get selectedType(): string {
    return this.questionForm.get('type')?.value;
  }

  onTypeChange(type: string): void {
    this.questionForm.patchValue({ type, correctAnswer: '' });
    this.applyOptionValidators(type !== 'TRUE_FALSE');
    this.cdr.markForCheck();
  }

  addOption(): void {
    if (this.optionsArray.length < 6) {
      this.optionsArray.push(this.fb.control('', Validators.required));
      this.cdr.markForCheck();
    }
  }

  removeOption(index: number): void {
    if (this.optionsArray.length > 2) {
      this.optionsArray.removeAt(index);
      this.cdr.markForCheck();
    }
  }

  loadQuiz(): void {
    this.isLoading = true;
    this.cdr.markForCheck();

    this.quizService.getQuizById(this.quizId).subscribe({
      next: (quiz) => {
        this.quiz = quiz;
        this.questions = [...(quiz.questions || [])]; // spread to ensure new reference
        this.isLoading = false;
        this.showForm = false;       // ← reset form here after data is fresh
        this.editingQuestion = null; // ← reset editing state here too
        this.cdr.markForCheck();     // ← single markForCheck after ALL state is updated
      },
      error: (err) => {
        console.error('Failed to load quiz:', err);
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  openAddForm(): void {
    this.editingQuestion = null;
    this.questionForm.reset({ question: '', type: QuestionType.MCQ, correctAnswer: '', explanation: '' });

    while (this.optionsArray.length > 2) this.optionsArray.removeAt(this.optionsArray.length - 1);
    while (this.optionsArray.length < 2) this.optionsArray.push(this.fb.control(''));
    this.optionsArray.controls.forEach(c => c.setValue(''));

    this.applyOptionValidators(true);

    this.showForm = true;
    this.cdr.markForCheck();
  }

  openEditForm(q: QuestionQuiz): void {
    this.editingQuestion = q;
    this.questionForm.patchValue({
      question: q.question,
      type: q.type,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation
    });

    while (this.optionsArray.length > 0) this.optionsArray.removeAt(0);
    (q.options || []).forEach(opt => this.optionsArray.push(this.fb.control(opt)));
    if (this.optionsArray.length < 2) {
      while (this.optionsArray.length < 2) this.optionsArray.push(this.fb.control(''));
    }

    this.applyOptionValidators(q.type !== 'TRUE_FALSE');

    this.showForm = true;
    this.cdr.markForCheck();
  }

  cancelForm(): void {
    this.showForm = false;
    this.editingQuestion = null;
    this.cdr.markForCheck();
  }

  setCorrectAnswer(value: string): void {
    this.questionForm.patchValue({ correctAnswer: value });
    this.cdr.markForCheck();
  }

  saveQuestion(): void {
    if (this.questionForm.invalid || this.isSaving) return;
    this.isSaving = true;
    this.cdr.markForCheck();

    const formVal = this.questionForm.value;
    const payload: QuestionQuiz = {
      question: formVal.question,
      type: formVal.type,
      options: formVal.type === 'TRUE_FALSE' ? ['True', 'False'] : formVal.options,
      correctAnswer: formVal.correctAnswer,
      explanation: formVal.explanation,
      quiz: { id: this.quizId }
    };

    const action = this.editingQuestion?.id
      ? this.quizService.updateQuestion(this.editingQuestion.id, payload)
      : this.quizService.createQuestion(payload);

    action.subscribe({
      next: () => {
        this.isSaving = false;
        // Don't touch showForm/editingQuestion here — loadQuiz() handles it
        this.loadQuiz();
      },
      error: (err) => {
        console.error('Failed to save question:', err);
        this.isSaving = false;
        this.cdr.markForCheck();
      }
    });
  }

  deleteQuestion(q: QuestionQuiz): void {
    if (!q.id || !confirm('Delete this question?')) return;
    this.quizService.deleteQuestion(q.id).subscribe({
      next: () => this.loadQuiz(),
      error: (err) => {
        console.error('Failed to delete question:', err);
        this.cdr.markForCheck();
      }
    });
  }

  // ── AI Generation (one question at a time) ──

  generateQuestionsWithAI(): void {
    if (!this.quiz?.title || this.isGeneratingQuestions) return;
    this.isGeneratingQuestions = true;
    this.aiGeneratedCount = 0;
    this.cdr.markForCheck();
    this.generateNextQuestion(1);
  }

  private generateNextQuestion(questionNumber: number): void {
    if (questionNumber > this.aiQuestionCount) {
      this.isGeneratingQuestions = false;
      this.loadQuiz();
      return;
    }

    const level = this.quiz!.level?.toString() || 'BEGINNER';
    this.quizService.generateSingleQuestion(this.quiz!.title, level, questionNumber).subscribe({
      next: (res) => {
        try {
          const q = JSON.parse(res.question);
          if (q && q.question && q.options) {
            const payload: QuestionQuiz = {
              question: q.question,
              type: 'MCQ',
              options: Array.isArray(q.options) ? q.options.slice(0, 4) : [],
              correctAnswer: q.correctAnswer || q.options?.[0] || '',
              explanation: q.explanation || '',
              quiz: { id: this.quizId }
            };
            this.quizService.createQuestion(payload).subscribe({
              next: () => {
                this.aiGeneratedCount++;
                this.cdr.markForCheck();
                this.generateNextQuestion(questionNumber + 1);
              },
              error: () => this.generateNextQuestion(questionNumber + 1)
            });
          } else {
            this.generateNextQuestion(questionNumber + 1);
          }
        } catch {
          console.error('Failed to parse AI question #' + questionNumber);
          this.generateNextQuestion(questionNumber + 1);
        }
      },
      error: (err) => {
        console.error('AI generation failed for question #' + questionNumber, err);
        this.generateNextQuestion(questionNumber + 1);
      }
    });
  }
}