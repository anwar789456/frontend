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
  private readonly apiUrl = '/api/cours/ai-avatar';

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
    let match: RegExpExecArray | null;
    const seen = new Set<string>();

    // Course IDs — "course #42" or "Course 42"
    const courseIdPattern = /\bcourse[s]?\s*#?(\d+)\b/gi;
    while ((match = courseIdPattern.exec(reply)) !== null && suggestions.length < 4) {
      const id = match[1];
      const route = `/courses?open=${id}`;
      if (!seen.has(route)) { seen.add(route); suggestions.push({ label: `Open Course #${id}`, route }); }
    }

    // Quiz IDs — "quiz #5"
    const quizPattern = /\bquiz\s*#?(\d+)\b/gi;
    while ((match = quizPattern.exec(reply)) !== null && suggestions.length < 4) {
      const id = match[1];
      const route = `/quiz/${id}/play`;
      if (!seen.has(route)) { seen.add(route); suggestions.push({ label: `Start Quiz #${id}`, route }); }
    }

    // Event IDs — "event #7"
    const eventPattern = /\bevent\s*#?(\d+)\b/gi;
    while ((match = eventPattern.exec(reply)) !== null && suggestions.length < 4) {
      const id = match[1];
      const route = `/events?open=${id}`;
      if (!seen.has(route)) { seen.add(route); suggestions.push({ label: `View Event #${id}`, route }); }
    }

    // Topic-based navigation
    const lower = reply.toLowerCase();
    if (suggestions.length < 4 && (lower.includes('event') || lower.includes('workshop')) && !seen.has('/events')) {
      seen.add('/events'); suggestions.push({ label: 'Browse Events', route: '/events' });
    }
    if (suggestions.length < 4 && (lower.includes('forum') || lower.includes('discuss') || lower.includes('topic')) && !seen.has('/forums')) {
      seen.add('/forums'); suggestions.push({ label: 'Visit Forums', route: '/forums' });
    }
    if (suggestions.length < 4 && (lower.includes('donat') || lower.includes('give') || lower.includes('merci')) && !seen.has('/donations')) {
      seen.add('/donations'); suggestions.push({ label: 'Make a Donation', route: '/donations' });
    }
    if (suggestions.length < 4 && (lower.includes('subscri') || lower.includes('plan') || lower.includes('premium') || lower.includes('abonnement')) && !seen.has('/subscriptions')) {
      seen.add('/subscriptions'); suggestions.push({ label: 'View Plans', route: '/subscriptions' });
    }

    // Account-related
    if (suggestions.length < 4 && (lower.includes('register') || lower.includes('sign up') || lower.includes('create account')) && !seen.has('/register')) {
      seen.add('/register'); suggestions.push({ label: 'Create Account', route: '/register' });
    }
    if (suggestions.length < 4 && (lower.includes('log in') || lower.includes('login') || lower.includes('sign in')) && !seen.has('/login')) {
      seen.add('/login'); suggestions.push({ label: 'Go to Login', route: '/login' });
    }
    if (suggestions.length < 4 && (lower.includes('password') || lower.includes('forgot') || lower.includes('reset')) && !seen.has('/forgot-password')) {
      seen.add('/forgot-password'); suggestions.push({ label: 'Reset Password', route: '/forgot-password' });
    }
    if (suggestions.length < 4 && (lower.includes('profile') || lower.includes('account') || lower.includes('settings')) && !seen.has('/profile')) {
      seen.add('/profile'); suggestions.push({ label: 'My Profile', route: '/profile' });
    }
    if (suggestions.length < 4 && (lower.includes('face') || lower.includes('biometric')) && !seen.has('/face-setup')) {
      seen.add('/face-setup'); suggestions.push({ label: 'Face Setup', route: '/face-setup' });
    }

    return suggestions.slice(0, 4);
  }
}
