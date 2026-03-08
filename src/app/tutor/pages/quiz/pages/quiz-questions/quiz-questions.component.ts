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

  // Delete confirmation modal
  showDeleteModal = false;
  questionToDelete: QuestionQuiz | null = null;

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

  confirmDeleteQuestion(q: QuestionQuiz): void {
    this.questionToDelete = q;
    this.showDeleteModal = true;
    this.cdr.markForCheck();
  }

  cancelDelete(): void {
    this.showDeleteModal = false;
    this.questionToDelete = null;
    this.cdr.markForCheck();
  }

  executeDelete(): void {
    if (!this.questionToDelete?.id) return;
    this.quizService.deleteQuestion(this.questionToDelete.id).subscribe({
      next: () => {
        this.showDeleteModal = false;
        this.questionToDelete = null;
        this.loadQuiz();
      },
      error: (err) => {
        console.error('Failed to delete question:', err);
        this.showDeleteModal = false;
        this.questionToDelete = null;
        this.cdr.markForCheck();
      }
    });
  }

  // ── AI: Generate a single question (no loop, tutor clicks once per question) ──

  generateOneQuestion(): void {
    if (!this.quiz?.title || this.isGeneratingQuestions || this.questions.length >= 5) return;
    this.isGeneratingQuestions = true;
    this.cdr.markForCheck();

    const level = this.quiz.level?.toString() || 'BEGINNER';
    const qNum = this.questions.length + 1;

    this.quizService.generateSingleQuestion(this.quiz.title, level, qNum).subscribe({
      next: (res) => {
        console.log('AI raw response:', res.question);
        const q = this.tryParseAiQuestion(res.question);
        if (q) {
          const payload: QuestionQuiz = {
            question: q.question,
            type: 'MCQ',
            options: q.options,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation || '',
            quiz: { id: this.quizId }
          };
          this.quizService.createQuestion(payload).subscribe({
            next: () => { this.isGeneratingQuestions = false; this.loadQuiz(); },
            error: () => { this.isGeneratingQuestions = false; this.cdr.markForCheck(); }
          });
        } else {
          console.error('Failed to parse AI question. Raw:', res.question);
          this.isGeneratingQuestions = false;
          this.cdr.markForCheck();
        }
      },
      error: (err) => {
        console.error('AI generation failed:', err);
        this.isGeneratingQuestions = false;
        this.cdr.markForCheck();
      }
    });
  }

  private tryParseAiQuestion(raw: string): { question: string; options: string[]; correctAnswer: string; explanation: string } | null {
    if (!raw || raw === '{}') return null;

    // Try direct parse first
    try {
      const q = JSON.parse(raw);
      if (q?.question && Array.isArray(q.options) && q.options.length >= 2) {
        return {
          question: q.question,
          options: q.options.slice(0, 4),
          correctAnswer: q.correctAnswer || q.options[0] || '',
          explanation: q.explanation || ''
        };
      }
    } catch { /* not valid JSON directly */ }

    // Try to extract JSON object from messy output
    try {
      const start = raw.indexOf('{');
      const end = raw.lastIndexOf('}');
      if (start >= 0 && end > start) {
        let jsonStr = raw.substring(start, end + 1);
        jsonStr = jsonStr.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
        const q = JSON.parse(jsonStr);
        if (q?.question && Array.isArray(q.options) && q.options.length >= 2) {
          return {
            question: q.question,
            options: q.options.slice(0, 4),
            correctAnswer: q.correctAnswer || q.options[0] || '',
            explanation: q.explanation || ''
          };
        }
      }
    } catch { /* still not parseable */ }

    // Fallback: parse non-JSON formats like "Question: ... A) ... B) ... C) ... D) ..."
    return this.parseLooseFormat(raw);
  }

  private parseLooseFormat(raw: string): { question: string; options: string[]; correctAnswer: string; explanation: string } | null {
    // Extract question - look for "question": "..." or "Question:" pattern
    let question = '';
    const jsonQuestionMatch = raw.match(/"question"\s*:\s*"([^"]+)/i);
    if (jsonQuestionMatch) {
      question = jsonQuestionMatch[1];
    } else {
      const looseQuestionMatch = raw.match(/Question\s*:\s*(.+?)(?=\n[A-D]\)|$)/is);
      if (looseQuestionMatch) {
        question = looseQuestionMatch[1].trim();
      }
    }

    if (!question) return null;

    // Extract options - look for A) B) C) D) pattern or "options": [...]
    let options: string[] = [];
    const jsonOptionsMatch = raw.match(/"options"\s*:\s*\[([^\]]+)\]/i);
    if (jsonOptionsMatch) {
      const optStr = jsonOptionsMatch[1];
      options = optStr.split(',').map(o => o.replace(/["\s]/g, '').trim()).filter(o => o);
    }
    
    if (options.length < 2) {
      // Try A) B) C) D) format
      const abcdMatch = raw.match(/A\)\s*(.+?)\s*B\)\s*(.+?)\s*C\)\s*(.+?)\s*D\)\s*(.+?)(?=\n|CorrectAnswer|correctAnswer|$)/is);
      if (abcdMatch) {
        options = [abcdMatch[1].trim(), abcdMatch[2].trim(), abcdMatch[3].trim(), abcdMatch[4].trim()];
      }
    }

    if (options.length < 2) return null;

    // Extract correct answer
    let correctAnswer = '';
    const correctMatch = raw.match(/(?:correctAnswer|CorrectAnswer)\s*[:\s]*["']?([A-Da-d]|[^"'\n,}]+)/i);
    if (correctMatch) {
      const ans = correctMatch[1].trim().toUpperCase();
      if (ans === 'A' && options[0]) correctAnswer = options[0];
      else if (ans === 'B' && options[1]) correctAnswer = options[1];
      else if (ans === 'C' && options[2]) correctAnswer = options[2];
      else if (ans === 'D' && options[3]) correctAnswer = options[3];
      else correctAnswer = ans;
    }
    if (!correctAnswer) correctAnswer = options[0] || '';

    // Extract explanation
    let explanation = '';
    const explMatch = raw.match(/explanation\s*[:\s]*["']?([^"'\n}]+)/i);
    if (explMatch) explanation = explMatch[1].trim();

    return { question, options: options.slice(0, 4), correctAnswer, explanation };
  }
}