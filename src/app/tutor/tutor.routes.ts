import { Routes } from '@angular/router';
import { TutorLayoutComponent } from './layout/tutor-layout.component';

export const TUTOR_ROUTES: Routes = [
  {
    path: '',
    component: TutorLayoutComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.TutorDashboardComponent)
      },
      {
        path: 'courses',
        loadComponent: () => import('./pages/courses/courses.component').then(m => m.TutorCoursesComponent)
      },
      {
        path: 'live-classes',
        loadComponent: () => import('./pages/live-classes/live-classes.component').then(m => m.LiveClassesComponent)
      },
      {
        path: 'quiz',
        loadComponent: () => import('./pages/quiz/pages/quiz-list/quiz-list.component').then(m => m.TutorQuizListComponent)
      },
      {
        path: 'quiz/create',
        loadComponent: () => import('./pages/quiz/pages/quiz-form/quiz-form.component').then(m => m.TutorQuizFormComponent)
      },
      {
        path: 'quiz/edit/:id',
        loadComponent: () => import('./pages/quiz/pages/quiz-form/quiz-form.component').then(m => m.TutorQuizFormComponent)
      },
      {
        path: 'quiz/:id/questions',
        loadComponent: () => import('./pages/quiz/pages/quiz-questions/quiz-questions.component').then(m => m.TutorQuizQuestionsComponent)
      },
      {
        path: 'quiz/story',
        loadComponent: () => import('./pages/quiz/pages/story-quiz/story-quiz-list.component').then(m => m.TutorStoryQuizListComponent)
      },
      {
        path: 'quiz/story/create',
        loadComponent: () => import('./pages/quiz/pages/story-quiz/story-quiz-form.component').then(m => m.TutorStoryQuizFormComponent)
      },
      {
        path: 'quiz/story/edit/:id',
        loadComponent: () => import('./pages/quiz/pages/story-quiz/story-quiz-form.component').then(m => m.TutorStoryQuizFormComponent)
      },
      {
        path: 'forums',
        loadComponent: () => import('./pages/forums/forums.component').then(m => m.TutorForumsComponent)
      },
      {
        path: 'students',
        loadComponent: () => import('./pages/students/students.component').then(m => m.TutorStudentsComponent)
      },
      {
        path: 'profile',
        loadComponent: () => import('./pages/profile/profile.component').then(m => m.TutorProfileComponent)
      }
    ]
  }
];
