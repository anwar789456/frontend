import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { TutorQuizService } from '../../services/quiz.service';
import { Quiz, QuizLevel, QuizStatus } from '../../models/quiz.model';

@Component({
  selector: 'app-tutor-quiz-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './quiz-list.component.html'
})
export class TutorQuizListComponent implements OnInit {
  quizzes: Quiz[] = [];
  isLoading = true;
  errorMessage = '';
  showDeleteModal = false;
  quizToDelete: Quiz | null = null;

  constructor(private quizService: TutorQuizService, private router: Router) {}

  ngOnInit(): void {
    this.loadQuizzes();
  }

  loadQuizzes(): void {
    this.isLoading = true;
    this.quizService.getAllQuizzes().subscribe({
      next: (data) => {
        this.quizzes = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load quizzes:', err);
        this.errorMessage = 'Failed to load quizzes.';
        this.isLoading = false;
      }
    });
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'OPEN': return 'bg-green-100 text-green-700';
      case 'CLOSED': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  }

  getLevelColor(level: string): string {
    switch (level) {
      case 'BEGINNER': return 'bg-emerald-100 text-emerald-700';
      case 'INTERMEDIATE': return 'bg-yellow-100 text-yellow-700';
      case 'ADVANCED': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  }

  confirmDelete(quiz: Quiz): void {
    this.quizToDelete = quiz;
    this.showDeleteModal = true;
  }

  cancelDelete(): void {
    this.showDeleteModal = false;
    this.quizToDelete = null;
  }

  executeDelete(): void {
    if (!this.quizToDelete?.id) return;
    this.quizService.deleteQuiz(this.quizToDelete.id).subscribe({
      next: () => {
        this.showDeleteModal = false;
        this.quizToDelete = null;
        this.loadQuizzes();
      },
      error: (err) => console.error('Failed to delete quiz:', err)
    });
  }
}
