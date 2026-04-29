import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { WritingPrompt, WritingSubmission } from '../models/writing.model';

@Injectable({
  providedIn: 'root'
})
export class WritingService {
  private readonly apiUrl = '/api/cours/writing';

  constructor(private http: HttpClient) {}

  // ── Prompts ──

  getAllPrompts(): Observable<WritingPrompt[]> {
    return this.http.get<WritingPrompt[]>(`${this.apiUrl}/prompts/all`);
  }

  getPromptById(id: number): Observable<WritingPrompt> {
    return this.http.get<WritingPrompt>(`${this.apiUrl}/prompts/${id}`);
  }

  // ── Submissions ──

  startOrResumeSubmission(userId: number, promptId: number): Observable<WritingSubmission> {
    return this.http.post<WritingSubmission>(`${this.apiUrl}/submissions/start`, { userId, promptId });
  }

  saveProgress(submissionId: number, text: string): Observable<WritingSubmission> {
    return this.http.put<WritingSubmission>(`${this.apiUrl}/submissions/${submissionId}/save`, { text });
  }

  submitForEvaluation(submissionId: number, text: string): Observable<WritingSubmission> {
    return this.http.put<WritingSubmission>(`${this.apiUrl}/submissions/${submissionId}/submit`, { text });
  }

  getUserSubmissions(userId: number): Observable<WritingSubmission[]> {
    return this.http.get<WritingSubmission[]>(`${this.apiUrl}/submissions/user/${userId}`);
  }

  getSubmissionById(id: number): Observable<WritingSubmission> {
    return this.http.get<WritingSubmission>(`${this.apiUrl}/submissions/${id}`);
  }
}
