import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, throwError, BehaviorSubject, of } from 'rxjs';
import { catchError, tap, switchMap } from 'rxjs/operators';

export interface BanErrorInfo {
  type: 'ban';
  message: string;
  reason?: string;
  banReason?: string;
  permanent?: boolean;
  banExpiresAt?: string;
}

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: 'ADMIN' | 'ETUDIANT' | 'TUTEUR';
  [key: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiUrl = 'https://minolingo.online/api/users';
  private readonly STORAGE_KEY = 'auth_user';

  private currentUserSubject = new BehaviorSubject<AuthUser | null>(this.getStoredUser());
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  login(email: string, pwd: string, challengeId: string, selectedIndex: number): Observable<AuthUser> {
    return this.http.post<AuthUser>(`${this.apiUrl}/login`, { email, pwd, challengeId, selectedIndex }).pipe(
      switchMap((user: AuthUser) => {
        // Fetch full profile to check banned status
        return this.http.get<AuthUser>(`${this.apiUrl}/get-user-by-id/${user.id}`).pipe(
          switchMap((fullUser: AuthUser) => {
            if (fullUser['banned']) {
              const reason = fullUser['banReason'] ? ` Reason: ${fullUser['banReason']}` : '';
              return throwError(() => `Your account has been banned.${reason} Please contact support for assistance.`);
            }
            this.setSession(fullUser);
            return of(fullUser);
          })
        );
      }),
      catchError(this.handleError)
    );
  }

  logout(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  get isLoggedIn(): boolean {
    return !!this.currentUser;
  }

  get currentUser(): AuthUser | null {
    return this.currentUserSubject.value;
  }

  get userRole(): string {
    return this.currentUser?.role || '';
  }

  getRedirectUrlForRole(role: string): string {
    switch (role) {
      case 'ADMIN':
        return '/admin';
      case 'TUTEUR':
        return '/tutor';
      case 'ETUDIANT':
      default:
        return '/courses';
    }
  }

  setSessionFromVerification(user: AuthUser): void {
    this.setSession(user);
  }

  private setSession(user: AuthUser): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  private getStoredUser(): AuthUser | null {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let message = 'An unexpected error occurred. Please try again.';
    if (error.status === 0) {
      message = 'Unable to connect to the server. Please check your internet connection.';
    } else if (error.status === 401) {
      message = error.error?.message || 'Invalid email or password.';
    } else if (error.status === 400) {
      message = error.error?.message || 'Invalid request. Please check your input.';
    } else if (error.status >= 500) {
      message = 'Server error. Please try again later.';
    }
    return throwError(() => message);
  }
}
