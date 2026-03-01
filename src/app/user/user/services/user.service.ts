import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly apiUrl = 'https://minolingo.online/api/users';

  constructor(private http: HttpClient) { }

  login(email: string, pwd: string): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/login`, { email, pwd }).pipe(
      tap((response: User) => {
        if (response) {
          localStorage.setItem('user', JSON.stringify(response));
        }
      }),
      catchError(this.handleError)
    );
  }

  signUp(user: Partial<User>): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/sign-up`, user).pipe(
      catchError(this.handleError)
    );
  }

  getAllUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/get-users`).pipe(
      catchError(this.handleError)
    );
  }

  getUserById(id: number): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/get-user-by-id/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  updateUser(id: number, user: User): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/update-user-by-id/${id}`, user).pipe(
      catchError(this.handleError)
    );
  }

  updateProfile(id: number, name: string, username: string): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/update-profile/${id}`, { name, username }).pipe(
      catchError(this.handleError)
    );
  }

  uploadAvatar(userId: number, file: File): Observable<string> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${this.apiUrl}/upload-avatar/${userId}`, formData, {
      responseType: 'text'
    }).pipe(
      catchError(this.handleError)
    );
  }

  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/delete-user-by-id/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  uploadCV(userId: number, file: File): Observable<string> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${this.apiUrl}/upload-cv/${userId}`, formData, {
      responseType: 'text'
    }).pipe(
      catchError(this.handleError)
    );
  }

  banUser(id: number, reason: string, duration: string): Observable<User> {
    const banExpiresAt = this.calcBanExpiry(duration);
    return this.http.put<User>(`${this.apiUrl}/ban-user/${id}`, {
      reason, duration, banExpiresAt: banExpiresAt ?? ''
    }).pipe(
      catchError(this.handleError)
    );
  }

  unbanUser(id: number): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/unban-user/${id}`, {}).pipe(
      catchError(this.handleError)
    );
  }

  private calcBanExpiry(duration: string): string | null {
    if (duration === 'permanent') return null;
    const now = new Date();
    const days: Record<string, number> = { '1_day': 1, '3_days': 3, '7_days': 7, '30_days': 30 };
    const d = days[duration] || 7;
    now.setDate(now.getDate() + d);
    return now.toISOString();
  }

  getStoredUser(): User | null {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }

  getUserRole(): string {
    const user = this.getStoredUser();
    return user?.role || '';
  }

  logout(): void {
    localStorage.removeItem('user');
  }

  private handleError = (error: HttpErrorResponse): Observable<never> => {
    console.error('[UserService] HTTP Error:', error.status, error.url, error.error);
    let message = `Unexpected error (${error.status}). Please try again.`;
    if (error.status === 0) {
      message = 'Unable to connect to the server. Please check your internet connection.';
    } else if (error.status === 401) {
      message = error.error?.message || error.error || 'Invalid email or password.';
    } else if (error.status === 400) {
      message = error.error?.message || error.error || 'Invalid request. Please check your input.';
    } else if (error.status === 404) {
      message = error.error?.message || error.error || `Endpoint not found (${error.url}).`;
    } else if (error.status === 405) {
      message = `Method not allowed for this endpoint.`;
    } else if (error.status >= 500) {
      message = error.error?.message || `Server error (${error.status}). Please try again later.`;
    }
    return throwError(() => message);
  };
  forgotPassword(email: string): Observable<string> {
    return this.http.post(`${this.apiUrl}/forgot-password`, { email }, { responseType: 'text' }).pipe(
      catchError(this.handleError)
    );
  }

  resetPassword(token: string, newPassword: string): Observable<string> {
    return this.http.post(`${this.apiUrl}/reset-password`, { token, newPassword }, { responseType: 'text' }).pipe(
      catchError(this.handleError)
    );
  }
  verifyCode(email: string, code: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/verify-code`, { email, code }).pipe(
      catchError(this.handleError)
    );
  }

  resendCode(email: string): Observable<string> {
    return this.http.post(`${this.apiUrl}/resend-code`, { email }, { responseType: 'text' }).pipe(
      catchError(this.handleError)
    );
  }
}
