import { Component, OnInit, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { QuizService } from '../services/quiz.service';
import { QuizCard, QuizCategory, Quiz, QuestionQuiz, QuizLevel, QuizStatus, QuestionType } from '../models/quiz.model';
import { AuthService } from '../../../shared/services/auth.service';
import { MOCK_USER } from '../../../shared/constants/mock-data';

@Component({
  selector: 'app-quiz',
  standalone: true,
  imports: [CommonModule, DecimalPipe, ReactiveFormsModule],
  templateUrl: './quiz.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    @keyframes fadeInUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes popIn { 0% { opacity: 0; transform: scale(0.7); } 60% { transform: scale(1.05); } 100% { opacity: 1; transform: scale(1); } }
    @keyframes bounceIn { 0% { opacity: 0; transform: scale(0.3); } 50% { transform: scale(1.08); } 70% { transform: scale(0.95); } 100% { opacity: 1; transform: scale(1); } }
    @keyframes slideInLeft { from { opacity: 0; transform: translateX(-40px); } to { opacity: 1; transform: translateX(0); } }
    @keyframes slideInRight { from { opacity: 0; transform: translateX(40px); } to { opacity: 1; transform: translateX(0); } }
    @keyframes wiggle { 0%,100% { transform: rotate(0deg); } 25% { transform: rotate(-6deg); } 75% { transform: rotate(6deg); } }
    @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
    @keyframes pulse-glow { 0%,100% { box-shadow: 0 0 0 0 rgba(56,169,243,0.3); } 50% { box-shadow: 0 0 16px 4px rgba(56,169,243,0.2); } }
    @keyframes confetti { 0% { transform: translateY(0) rotate(0deg); opacity: 1; } 100% { transform: translateY(-30px) rotate(360deg); opacity: 0; } }
    .anim-fade-up { animation: fadeInUp 0.5s ease-out both; }
    .anim-pop { animation: popIn 0.4s ease-out both; }
    .anim-bounce { animation: bounceIn 0.6s ease-out both; }
    .anim-slide-left { animation: slideInLeft 0.5s ease-out both; }
    .anim-slide-right { animation: slideInRight 0.5s ease-out both; }
    .anim-wiggle:hover { animation: wiggle 0.4s ease-in-out; }
    .anim-float { animation: float 3s ease-in-out infinite; }
    .anim-pulse-glow { animation: pulse-glow 2s ease-in-out infinite; }
    .anim-delay-1 { animation-delay: 0.1s; }
    .anim-delay-2 { animation-delay: 0.2s; }
    .anim-delay-3 { animation-delay: 0.3s; }
    .anim-delay-4 { animation-delay: 0.4s; }
    .anim-delay-5 { animation-delay: 0.5s; }
    .hover-grow { transition: transform 0.2s ease; }
    .hover-grow:hover { transform: scale(1.03); }
    .hover-bounce:hover { animation: bounceIn 0.4s ease-out; }
  `]
})
export class QuizComponent implements OnInit {
  quizCards: QuizCard[] = [];
  categories: QuizCategory[] = [];
  quizzes: Quiz[] = [];
  user = MOCK_USER;
  activeTab = 'Vocabulary';
  tabs = ['Vocabulary', 'Reading', 'Grammar', 'Listening'];
  focusTags = ['New words', 'Reading speed', 'Grammar review', 'Listening'];
  isLoading = true;
  errorMessage = '';

  showQuizForm = false;
  editingQuiz: Quiz | null = null;
  quizForm!: FormGroup;

  showQuestionForm = false;
  editingQuestion: QuestionQuiz | null = null;
  questionForm!: FormGroup;
  questionParentQuizId: number | null = null;

  expandedQuizId: number | null = null;

  quizLevels = Object.values(QuizLevel);
  quizStatuses = Object.values(QuizStatus);
  questionTypes = Object.values(QuestionType);

  constructor(
    private quizService: QuizService,
    private authService: AuthService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {}

  get isTutor(): boolean {
    return this.authService.userRole === 'TUTEUR';
  }

  ngOnInit(): void {
    this.initForms();
    this.loadQuizCards();
    this.loadQuizCategories();
    this.loadQuizzes();
  }

  private initForms(): void {
    this.quizForm = this.fb.group({
      title: ['', Validators.required],
      description: ['', Validators.required],
      level: [QuizLevel.BEGINNER, Validators.required],
      dateStart: ['', Validators.required],
      dateEnd: ['', Validators.required],
      status: [QuizStatus.DRAFT, Validators.required],
      courseId: [null],
      xpReward: [0, [Validators.required, Validators.min(0)]]
    });

    this.questionForm = this.fb.group({
      question: ['', Validators.required],
      options: this.fb.array([
        this.fb.control('', Validators.required),
        this.fb.control('', Validators.required)
      ]),
      correctAnswer: ['', Validators.required],
      explanation: ['', Validators.required],
      type: [QuestionType.MCQ, Validators.required]
    });
  }

  get optionsArray(): FormArray {
    return this.questionForm.get('options') as FormArray;
  }

  addOption(): void {
    this.optionsArray.push(this.fb.control('', Validators.required));
    this.cdr.markForCheck();
  }

  removeOption(index: number): void {
    if (this.optionsArray.length > 2) {
      this.optionsArray.removeAt(index);
      this.cdr.markForCheck();
    }
  }

  // ── Data loading ──

  loadQuizCards(): void {
    this.isLoading = true;
    this.cdr.markForCheck();

    this.quizService.getAllQuizCards().subscribe({
      next: (data) => {
        this.quizCards = [...data];
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to load quiz cards:', err);
        this.errorMessage = 'Failed to load quizzes. Please try again later.';
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  loadQuizCategories(): void {
    this.quizService.getAllQuizCategories().subscribe({
      next: (data) => {
        this.categories = [...data];
        this.cdr.markForCheck();
      },
      error: (err) => console.error('Failed to load quiz categories:', err)
    });
  }

  loadQuizzes(): void {
    this.quizService.getAllQuizzes().subscribe({
      next: (data) => {
        this.quizzes = [...data]; // new reference so OnPush detects the change
        this.cdr.markForCheck();
      },
      error: (err) => console.error('Failed to load quizzes:', err)
    });
  }

  toggleQuizDetail(quizId: number): void {
    this.expandedQuizId = this.expandedQuizId === quizId ? null : quizId;
    this.cdr.markForCheck();
  }

  // ── Quiz CRUD ──

  openCreateQuiz(): void {
    this.editingQuiz = null;
    this.quizForm.reset({
      title: '', description: '', level: QuizLevel.BEGINNER,
      dateStart: '', dateEnd: '', status: QuizStatus.DRAFT,
      courseId: null, xpReward: 0
    });
    this.showQuizForm = true;
    this.cdr.markForCheck();
  }

  openEditQuiz(quiz: Quiz): void {
    this.editingQuiz = quiz;
    this.quizForm.patchValue({
      title: quiz.title, description: quiz.description, level: quiz.level,
      dateStart: quiz.dateStart, dateEnd: quiz.dateEnd, status: quiz.status,
      courseId: quiz.courseId, xpReward: quiz.xpReward
    });
    this.showQuizForm = true;
    this.cdr.markForCheck();
  }

  cancelQuizForm(): void {
    this.showQuizForm = false;
    this.editingQuiz = null;
    this.cdr.markForCheck();
  }

  saveQuiz(): void {
    if (this.quizForm.invalid) return;
    const formVal = this.quizForm.value;

    if (this.editingQuiz?.id) {
      this.quizService.updateQuiz(this.editingQuiz.id, formVal).subscribe({
        next: () => {
          this.showQuizForm = false;
          this.editingQuiz = null;
          this.loadQuizzes(); // markForCheck happens inside loadQuizzes
        },
        error: (err) => console.error('Failed to update quiz:', err)
      });
    } else {
      this.quizService.createQuiz(formVal).subscribe({
        next: () => {
          this.showQuizForm = false;
          this.loadQuizzes(); // markForCheck happens inside loadQuizzes
        },
        error: (err) => console.error('Failed to create quiz:', err)
      });
    }
  }

  deleteQuiz(quiz: Quiz): void {
    if (!quiz.id) return;
    if (!confirm(`Delete quiz "${quiz.title}"? This will also delete all its questions.`)) return;
    this.quizService.deleteQuiz(quiz.id).subscribe({
      next: () => this.loadQuizzes(),
      error: (err) => console.error('Failed to delete quiz:', err)
    });
  }

  // ── Question CRUD ──

  openAddQuestion(quizId: number): void {
    this.editingQuestion = null;
    this.questionParentQuizId = quizId;
    this.questionForm.reset({ question: '', correctAnswer: '', explanation: '', type: QuestionType.MCQ });
    while (this.optionsArray.length > 2) this.optionsArray.removeAt(this.optionsArray.length - 1);
    while (this.optionsArray.length < 2) this.optionsArray.push(this.fb.control('', Validators.required));
    this.optionsArray.controls.forEach(c => c.setValue(''));
    this.showQuestionForm = true;
    this.cdr.markForCheck();
  }

  openEditQuestion(q: QuestionQuiz, quizId: number): void {
    this.editingQuestion = q;
    this.questionParentQuizId = quizId;
    this.questionForm.patchValue({
      question: q.question, correctAnswer: q.correctAnswer,
      explanation: q.explanation, type: q.type
    });
    while (this.optionsArray.length > 0) this.optionsArray.removeAt(0);
    q.options.forEach(opt => this.optionsArray.push(this.fb.control(opt, Validators.required)));
    this.showQuestionForm = true;
    this.cdr.markForCheck();
  }

  cancelQuestionForm(): void {
    this.showQuestionForm = false;
    this.editingQuestion = null;
    this.questionParentQuizId = null;
    this.cdr.markForCheck();
  }

  saveQuestion(): void {
    if (this.questionForm.invalid || !this.questionParentQuizId) return;
    const formVal = this.questionForm.value;
    const payload: QuestionQuiz = { ...formVal, quiz: { id: this.questionParentQuizId } };

    if (this.editingQuestion?.id) {
      this.quizService.updateQuestion(this.editingQuestion.id, payload).subscribe({
        next: () => {
          this.showQuestionForm = false;
          this.editingQuestion = null;
          this.loadQuizzes(); // markForCheck happens inside loadQuizzes
        },
        error: (err) => console.error('Failed to update question:', err)
      });
    } else {
      this.quizService.createQuestion(payload).subscribe({
        next: () => {
          this.showQuestionForm = false;
          this.loadQuizzes(); // markForCheck happens inside loadQuizzes
        },
        error: (err) => console.error('Failed to create question:', err)
      });
    }
  }

  deleteQuestion(q: QuestionQuiz): void {
    if (!q.id) return;
    if (!confirm('Delete this question?')) return;
    this.quizService.deleteQuestion(q.id).subscribe({
      next: () => this.loadQuizzes(),
      error: (err) => console.error('Failed to delete question:', err)
    });
  }
}