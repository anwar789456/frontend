import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { WritingPrompt } from '../models/writing.model';

@Injectable({
  providedIn: 'root'
})
export class TutorWritingService {
  private readonly apiUrl = 'https://minolingo.online/api/cours/writing';

  constructor(private http: HttpClient) {}

  // ── Prompts ──

  getAllPrompts(): Observable<WritingPrompt[]> {
    return this.http.get<WritingPrompt[]>(`${this.apiUrl}/prompts/all`);
  }

  getPromptById(id: number): Observable<WritingPrompt> {
    return this.http.get<WritingPrompt>(`${this.apiUrl}/prompts/${id}`);
  }

  createPrompt(prompt: WritingPrompt): Observable<WritingPrompt> {
    return this.http.post<WritingPrompt>(`${this.apiUrl}/prompts/create`, prompt);
  }

  updatePrompt(id: number, prompt: WritingPrompt): Observable<WritingPrompt> {
    return this.http.put<WritingPrompt>(`${this.apiUrl}/prompts/update/${id}`, prompt);
  }

  deletePrompt(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/prompts/delete/${id}`);
  }

  archivePrompt(id: number): Observable<WritingPrompt> {
    return this.http.put<WritingPrompt>(`${this.apiUrl}/prompts/archive/${id}`, {});
  }

  unarchivePrompt(id: number): Observable<WritingPrompt> {
    return this.http.put<WritingPrompt>(`${this.apiUrl}/prompts/unarchive/${id}`, {});
  }
}
