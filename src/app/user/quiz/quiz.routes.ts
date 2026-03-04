import { Routes } from '@angular/router';

export const QUIZ_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/quiz-list/quiz-list.component').then(m => m.UserQuizListComponent)
  },
  {
    path: 'story/:id/play',
    loadComponent: () => import('./pages/story-quiz-play/story-quiz-play.component').then(m => m.StoryQuizPlayComponent)
  },
  {
    path: ':id/play',
    loadComponent: () => import('./pages/quiz-play/quiz-play.component').then(m => m.UserQuizPlayComponent)
  },
  {
    path: ':id/result/:attemptId',
    loadComponent: () => import('./pages/quiz-result/quiz-result.component').then(m => m.UserQuizResultComponent)
  },
  {
    path: ':id',
    loadComponent: () => import('./pages/quiz-detail/quiz-detail.component').then(m => m.UserQuizDetailComponent)
  }
];
