import { Routes } from '@angular/router';

export const WRITING_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/writing-list/writing-list.component').then(m => m.WritingListComponent)
  },
  {
    path: ':id/result/:submissionId',
    loadComponent: () => import('./pages/writing-result/writing-result.component').then(m => m.WritingResultComponent)
  },
  {
    path: ':id',
    loadComponent: () => import('./pages/writing-editor/writing-editor.component').then(m => m.WritingEditorComponent)
  }
];
