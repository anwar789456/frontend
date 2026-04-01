import { Component, OnInit, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TutorQuizService } from '../../services/quiz.service';
import { Quiz, QuizCategory, QuizLevel, QuizStatus } from '../../models/quiz.model';

@Component({
  selector: 'app-tutor-quiz-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './quiz-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TutorQuizFormComponent implements OnInit {
  quizForm!: FormGroup;
  categories: QuizCategory[] = [];
  isEditMode = false;
  quizId: number | null = null;
  isLoading = false;
  isSaving = false;
  toastMessage = '';

  quizLevels = Object.values(QuizLevel);
  quizStatuses = Object.values(QuizStatus);
  isGeneratingDescription = false;

  constructor(
    private fb: FormBuilder,
    private quizService: TutorQuizService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.quizForm = this.fb.group({
      title: ['', Validators.required],
      description: [''],
      level: [QuizLevel.BEGINNER, Validators.required],
      status: [QuizStatus.DRAFT, Validators.required],
      xpReward: [0, [Validators.required, Validators.min(0)]],
      courseId: [null]
    });

    this.loadCategories();

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.isEditMode = true;
      this.quizId = +idParam;
      this.loadQuiz(this.quizId);
    }
  }

  private loadCategories(): void {
    this.quizService.getAllCategories().subscribe({
      next: (data) => {
        this.categories = data;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to load categories:', err);
        this.cdr.markForCheck();
      }
    });
  }

  private loadQuiz(id: number): void {
    this.isLoading = true;
    this.cdr.markForCheck();

    this.quizService.getQuizById(id).subscribe({
      next: (quiz) => {
        this.quizForm.patchValue({
          title: quiz.title,
          description: quiz.description,
          level: quiz.level,
          status: quiz.status,
          xpReward: quiz.xpReward,
          courseId: quiz.courseId
        });
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to load quiz:', err);
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  generateDescription(): void {
    const title = this.quizForm.get('title')?.value;
    if (!title?.trim()) return;
    this.isGeneratingDescription = true;
    this.cdr.markForCheck();

    const level = this.quizForm.get('level')?.value || '';
    this.quizService.generateQuizDescription(title, level).subscribe({
      next: (res) => {
        this.quizForm.patchValue({ description: res.description });
        this.isGeneratingDescription = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isGeneratingDescription = false;
        this.cdr.markForCheck();
      }
    });
  }

  save(): void {
    if (this.quizForm.invalid || this.isSaving) return;
    this.isSaving = true;
    this.cdr.markForCheck();

    const formVal = this.quizForm.value;

    const action = this.isEditMode && this.quizId
      ? this.quizService.updateQuiz(this.quizId, formVal)
      : this.quizService.createQuiz(formVal);

    action.subscribe({
      next: () => {
        this.isSaving = false;
        this.cdr.markForCheck();
        this.router.navigate(['/tutor/quiz']);
      },
      error: (err) => {
        console.error('Failed to save quiz:', err);
        this.isSaving = false;
        this.cdr.markForCheck();
      }
    });
  }
}