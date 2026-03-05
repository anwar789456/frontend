import { Component, OnInit, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { QuizService } from '../../services/quiz.service';
import { UserService } from '../../../user/services/user.service';
import { Quiz, QuestionQuiz, QuizAttempt } from '../../models/quiz.model';
import { User } from '../../../user/models/user.model';

@Component({
  selector: 'app-user-quiz-play',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './quiz-play.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes correctFlash { 0% { background-color: #dcfce7; } 50% { background-color: #bbf7d0; } 100% { background-color: #dcfce7; } }
    @keyframes wrongFlash { 0% { background-color: #fee2e2; } 50% { background-color: #fecaca; } 100% { background-color: #fee2e2; } }
    @keyframes xpPop { 0% { opacity: 0; transform: scale(0.5) translateY(0); } 50% { opacity: 1; transform: scale(1.2) translateY(-10px); } 100% { opacity: 0; transform: scale(1) translateY(-30px); } }
    .anim-fade { animation: fadeIn 0.3s ease-out; }
    .anim-slide-up { animation: slideUp 0.4s ease-out; }
    .anim-correct { animation: correctFlash 0.6s ease-out; }
    .anim-wrong { animation: wrongFlash 0.6s ease-out; }
    .anim-xp-pop { animation: xpPop 1s ease-out forwards; }
  `]
})
export class UserQuizPlayComponent implements OnInit {
  quiz: Quiz | null = null;
  questions: QuestionQuiz[] = [];
  attempt: QuizAttempt | null = null;
  isLoading = true;
  quizId!: number;

  currentIndex = 0;
  selectedAnswer: string | null = null;
  answerSubmitted = false;
  isCorrect = false;
  showXpPop = false;
  isSaving = false;
  toastMessage = '';

  constructor(
    private quizService: QuizService,
    private userService: UserService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  get userId(): number | null {
    try {
      const user = JSON.parse(localStorage.getItem('auth_user') || 'null');
      return user?.id ?? null;
    } catch { return null; }
  }

  get currentQuestion(): QuestionQuiz | null {
    return this.questions[this.currentIndex] || null;
  }

  get progress(): number {
    if (this.questions.length === 0) return 0;
    return Math.round(((this.currentIndex + (this.answerSubmitted ? 1 : 0)) / this.questions.length) * 100);
  }

  get earnedXp(): number {
    return this.attempt?.score || 0;
  }

  ngOnInit(): void {
    this.quizId = +this.route.snapshot.paramMap.get('id')!;
    this.loadQuizAndAttempt();
  }

  private loadQuizAndAttempt(): void {
    this.isLoading = true;
    this.cdr.markForCheck();

    this.quizService.getQuizById(this.quizId).subscribe({
      next: (quiz) => {
        this.quiz = quiz;
        this.questions = [...(quiz.questions || [])];
        this.cdr.markForCheck(); // reflect quiz data while attempt loads
        this.startAttempt();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  private startAttempt(): void {
    if (!this.userId) {
      this.isLoading = false;
      this.cdr.markForCheck();
      return;
    }

    this.quizService.startOrResumeAttempt(this.userId, this.quizId).subscribe({
      next: (attempt) => {
        this.attempt = attempt;
        // Redirect if quiz is already completed (prevent retakes)
        if (attempt.completed) {
          this.router.navigate(['/quiz', this.quizId, 'result', attempt.id]);
          return;
        }
        if (attempt.answers) {
          const answeredCount = Object.keys(attempt.answers).length;
          this.currentIndex = Math.min(answeredCount, this.questions.length - 1);
        }
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  selectAnswer(answer: string): void {
    if (this.answerSubmitted) return;
    this.selectedAnswer = answer;
    this.cdr.markForCheck();
  }

  submitAnswer(): void {
    if (!this.selectedAnswer || !this.attempt?.id || !this.currentQuestion?.id || this.answerSubmitted) return;

    this.answerSubmitted = true;
    this.isCorrect = this.selectedAnswer === this.currentQuestion.correctAnswer;
    this.cdr.markForCheck();

    if (this.isCorrect) {
      this.showXpPop = true;
      this.cdr.markForCheck();
      setTimeout(() => {
        this.showXpPop = false;
        this.cdr.markForCheck();
      }, 1200);
    }

    this.quizService.submitAnswer(this.attempt.id, this.currentQuestion.id, this.selectedAnswer).subscribe({
      next: (updated) => {
        this.attempt = updated;
        this.cdr.markForCheck();
      },
      error: (err) => console.error('Failed to submit answer:', err)
    });
  }

  nextQuestion(): void {
    if (this.currentIndex < this.questions.length - 1) {
      this.currentIndex++;
      this.selectedAnswer = null;
      this.answerSubmitted = false;
      this.isCorrect = false;
      this.cdr.markForCheck();
    } else {
      this.completeQuiz();
    }
  }

  private completeQuiz(): void {
    if (!this.attempt?.id || !this.userId) return;
    this.quizService.completeAttempt(this.attempt.id).subscribe({
      next: (completed) => {
        this.attempt = completed;
        this.cdr.markForCheck();
        // Add XP to user profile
        const attemptId = completed.id || this.attempt?.id || 0;
        this.addXpToUser(completed.score || 0, attemptId);
      },
      error: (err) => console.error('Failed to complete quiz:', err)
    });
  }

  private addXpToUser(xpEarned: number, attemptId: number): void {
    if (!this.userId || xpEarned <= 0) {
      this.router.navigate(['/quiz', this.quizId, 'result', attemptId]);
      return;
    }

    this.userService.getUserById(this.userId).subscribe({
      next: (user: User) => {
        const updatedUser: User = {
          ...user,
          xp: (user.xp || 0) + xpEarned
        };
        this.userService.updateUser(this.userId!, updatedUser).subscribe({
          next: (updated) => {
            // Update localStorage with new XP
            const storedUser = JSON.parse(localStorage.getItem('auth_user') || 'null');
            if (storedUser) {
              storedUser.xp = updated.xp;
              localStorage.setItem('auth_user', JSON.stringify(storedUser));
            }
            this.router.navigate(['/quiz', this.quizId, 'result', attemptId]);
          },
          error: () => this.router.navigate(['/quiz', this.quizId, 'result', attemptId])
        });
      },
      error: () => this.router.navigate(['/quiz', this.quizId, 'result', attemptId])
    });
  }

  saveAndExit(): void {
    this.toastMessage = 'Progress saved! You can continue later.';
    this.cdr.markForCheck();
    setTimeout(() => this.router.navigate(['/quiz']), 1500);
  }

  isLastQuestion(): boolean {
    return this.currentIndex === this.questions.length - 1;
  }

  getOptionLabel(index: number): string {
    return String.fromCharCode(65 + index);
  }

  isQuestionAnswered(index: number): boolean {
    if (!this.attempt?.answers || !this.questions[index]?.id) return false;
    return this.attempt.answers[this.questions[index].id!] !== undefined;
  }

  getOptionClass(opt: string): string {
    if (this.answerSubmitted) {
      if (opt === this.currentQuestion?.correctAnswer) return 'border-green-400 bg-green-50';
      if (opt === this.selectedAnswer && opt !== this.currentQuestion?.correctAnswer) return 'border-red-400 bg-red-50';
      return 'border-gray-200 bg-white opacity-50';
    }
    if (this.selectedAnswer === opt) return 'border-[#38a9f3] bg-[#38a9f3]/5';
    return 'border-gray-200 bg-white hover:border-[#38a9f3]/50 hover:bg-[#38a9f3]/5';
  }

  getTFClass(value: string): string {
    if (this.answerSubmitted) {
      if (value === this.currentQuestion?.correctAnswer) return 'border-green-400 bg-green-50';
      if (value === this.selectedAnswer && value !== this.currentQuestion?.correctAnswer) return 'border-red-400 bg-red-50';
      return 'border-gray-200 bg-white opacity-50';
    }
    if (this.selectedAnswer === value) return 'border-[#38a9f3] bg-[#38a9f3]/5';
    return 'border-gray-200 bg-white hover:border-[#38a9f3]/50';
  }
}