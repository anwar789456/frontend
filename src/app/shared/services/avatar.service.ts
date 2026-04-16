import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AvatarSuggestion {
  label: string;
  route: string;
}

export interface AvatarChatResponse {
  reply: string;
  suggestions: AvatarSuggestion[];
}

@Injectable({ providedIn: 'root' })
export class AvatarService {
  private readonly apiUrl = 'https://minolingo.online/api/cours/ai-avatar';

  constructor(private http: HttpClient) {}

  // ── Streaming chat (SSE) — used by the full ai-tutor page ────────────────
  streamChat(params: {
    message: string;
    userId: number | null;
    currentPage: string;
  }): Observable<string> {
    return new Observable<string>(observer => {
      const query = new URLSearchParams({
        message:     params.message,
        userId:      String(params.userId ?? 0),
        currentPage: params.currentPage
      });

      const es = new EventSource(`${this.apiUrl}/chat/stream?${query}`);

      es.onmessage = (event: MessageEvent) => {
        observer.next(event.data as string);
      };

      es.addEventListener('done', () => {
        es.close();
        observer.complete();
      });

      es.addEventListener('error', (event: Event) => {
        es.close();
        observer.error(new Error('Stream error'));
      });

      // Network-level error (readyState CLOSED)
      es.onerror = () => {
        if (es.readyState === EventSource.CLOSED) {
          es.close();
          observer.error(new Error('Connection closed'));
        }
      };

      return () => es.close();
    });
  }

  // ── Non-streaming chat — used by the floating widget ─────────────────────
  chat(params: {
    message: string;
    userId: number | null;
    currentPage: string;
  }): Observable<AvatarChatResponse> {
    return this.http.post<AvatarChatResponse>(`${this.apiUrl}/chat`, {
      message:     params.message,
      userId:      params.userId ?? null,
      currentPage: params.currentPage
    });
  }

  // ── Extract navigation suggestions from an AI reply ───────────────────────
  extractCourseSuggestions(reply: string): AvatarSuggestion[] {
    const suggestions: AvatarSuggestion[] = [];

    // Match explicit course IDs mentioned by the AI, e.g. "course #42" or "course 42"
    const courseIdPattern = /\bcourse[s]?\s*#?(\d+)\b/gi;
    let match: RegExpExecArray | null;
    const seen = new Set<string>();

    while ((match = courseIdPattern.exec(reply)) !== null) {
      const id = match[1];
      const route = `/courses?open=${id}`;
      if (!seen.has(route)) {
        seen.add(route);
        suggestions.push({ label: `Open Course #${id}`, route });
      }
      if (suggestions.length >= 3) break;
    }

    // Match quiz IDs, e.g. "quiz #5"
    if (suggestions.length < 3) {
      const quizPattern = /\bquiz\s*#?(\d+)\b/gi;
      while ((match = quizPattern.exec(reply)) !== null) {
        const id = match[1];
        const route = `/quiz/${id}/play`;
        if (!seen.has(route)) {
          seen.add(route);
          suggestions.push({ label: `Start Quiz #${id}`, route });
        }
        if (suggestions.length >= 3) break;
      }
    }

    return suggestions;
  }
}
