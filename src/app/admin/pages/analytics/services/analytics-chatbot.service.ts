import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AnalyticsDashboard } from './analytics.service';

export interface Message {
  id: string;
  type: 'user' | 'ai' | 'system';
  text: string;
  timestamp: Date;
}

export interface ChatResponse {
  message: string;
  suggestions?: string[];
}

export interface ChatRequest {
  message: string;
  analytics?: AnalyticsDashboard | null;
  userId?: number | null;
}

@Injectable({
  providedIn: 'root'
})
export class AnalyticsChatbotService {
  private readonly apiUrl = 'https://minolingo.online/api/abonnements/analytics/chat';

  constructor(private http: HttpClient) {}

  /**
   * Send a message to the AI chatbot
   * Connects to backend with OpenRouter integration
   */
  chat(message: string, analytics?: AnalyticsDashboard | null, userId?: number | null): Observable<ChatResponse> {
    const request: ChatRequest = {
      message,
      analytics,
      userId
    };
    
    return this.http.post<ChatResponse>(this.apiUrl, request);
  }
}