import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TutorQuizService } from '../../services/quiz.service';
import { Quiz, QuestionQuiz, QuestionType } from '../../models/quiz.model';

@Component({
  selector: 'app-tutor-quiz-questions',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './quiz-questions.component.html'
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

  constructor(
    private fb: FormBuilder,
    private quizService: TutorQuizService,
    private route: ActivatedRoute
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
        this.fb.control('', Validators.required),
        this.fb.control('', Validators.required)
      ]),
      correctAnswer: ['', Validators.required],
      explanation: ['']
    });
  }

  get optionsArray(): FormArray {
    return this.questionForm.get('options') as FormArray;
  }

  get selectedType(): string {
    return this.questionForm.get('type')?.value;
  }

  addOption(): void {
    if (this.optionsArray.length < 6) {
      this.optionsArray.push(this.fb.control('', Validators.required));
    }
  }

  removeOption(index: number): void {
    if (this.optionsArray.length > 2) {
      this.optionsArray.removeAt(index);
    }
  }

  loadQuiz(): void {
    this.isLoading = true;
    this.quizService.getQuizById(this.quizId).subscribe({
      next: (quiz) => {
        this.quiz = quiz;
        this.questions = quiz.questions || [];
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load quiz:', err);
        this.isLoading = false;
      }
    });
  }

  openAddForm(): void {
    this.editingQuestion = null;
    this.questionForm.reset({ question: '', type: QuestionType.MCQ, correctAnswer: '', explanation: '' });
    while (this.optionsArray.length > 2) this.optionsArray.removeAt(this.optionsArray.length - 1);
    while (this.optionsArray.length < 2) this.optionsArray.push(this.fb.control('', Validators.required));
    this.optionsArray.controls.forEach(c => c.setValue(''));
    this.showForm = true;
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
    (q.options || []).forEach(opt => this.optionsArray.push(this.fb.control(opt, Validators.required)));
    if (this.optionsArray.length < 2) {
      while (this.optionsArray.length < 2) this.optionsArray.push(this.fb.control('', Validators.required));
    }
    this.showForm = true;
  }

  cancelForm(): void {
    this.showForm = false;
    this.editingQuestion = null;
  }

  setCorrectAnswer(value: string): void {
    this.questionForm.patchValue({ correctAnswer: value });
  }

  saveQuestion(): void {
    if (this.questionForm.invalid || this.isSaving) return;
    this.isSaving = true;

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
        this.showForm = false;
        this.editingQuestion = null;
        this.loadQuiz();
      },
      error: (err) => {
        console.error('Failed to save question:', err);
        this.isSaving = false;
      }
    });
  }

  deleteQuestion(q: QuestionQuiz): void {
    if (!q.id || !confirm('Delete this question?')) return;
    this.quizService.deleteQuestion(q.id).subscribe({
      next: () => this.loadQuiz(),
      error: (err) => console.error('Failed to delete question:', err)
    });
  }
}
