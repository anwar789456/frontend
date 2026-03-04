import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TutorQuizService } from '../../services/quiz.service';
import { StoryQuiz } from '../../models/quiz.model';

@Component({
  selector: 'app-tutor-story-quiz-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './story-quiz-list.component.html'
})
export class TutorStoryQuizListComponent implements OnInit {
  storyQuizzes: StoryQuiz[] = [];
  isLoading = true;
  showDeleteModal = false;
  itemToDelete: StoryQuiz | null = null;

  constructor(private quizService: TutorQuizService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading = true;
    this.quizService.getAllStoryQuizzes().subscribe({
      next: (data) => { this.storyQuizzes = data; this.isLoading = false; },
      error: () => this.isLoading = false
    });
  }

  getDifficultyColor(d: string): string {
    switch (d) {
      case 'BEGINNER': return 'bg-emerald-100 text-emerald-700';
      case 'INTERMEDIATE': return 'bg-yellow-100 text-yellow-700';
      case 'ADVANCED': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  }

  confirmDelete(sq: StoryQuiz): void {
    this.itemToDelete = sq;
    this.showDeleteModal = true;
  }

  cancelDelete(): void {
    this.showDeleteModal = false;
    this.itemToDelete = null;
  }

  executeDelete(): void {
    if (!this.itemToDelete?.id) return;
    this.quizService.deleteStoryQuiz(this.itemToDelete.id).subscribe({
      next: () => { this.showDeleteModal = false; this.itemToDelete = null; this.load(); },
      error: (err) => console.error('Delete failed:', err)
    });
  }
}
