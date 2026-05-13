import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subject, Subscription, interval } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

const POLL_INTERVAL_MS = 30_000;
const API_BASE = 'https://minolingo.online/api/users';

@Injectable({ providedIn: 'root' })
export class SessionMonitorService implements OnDestroy {

  private conflictSubject = new Subject<void>();
  /** Emits once when another login for the same account is detected. */
  readonly sessionConflict$ = this.conflictSubject.asObservable();

  private pollSubscription?: Subscription;

  constructor(private http: HttpClient) {}

  /**
   * Start polling the server to detect a newer login on the same account.
   * Safe to call multiple times — stops the previous poll first.
   */
  startMonitoring(userId: number, sessionToken: string): void {
    this.stopMonitoring();

    this.pollSubscription = interval(POLL_INTERVAL_MS).pipe(
      switchMap(() =>
        this.http.get<{ valid: boolean; reason?: string }>(
          `${API_BASE}/session/validate?userId=${userId}&token=${encodeURIComponent(sessionToken)}`
        ).pipe(
          // Network errors or service unavailable → treat as valid to avoid false kick-outs
          catchError(() => of({ valid: true }))
        )
      )
    ).subscribe(response => {
      if (!response.valid) {
        this.stopMonitoring();
        this.conflictSubject.next();
      }
    });
  }

  stopMonitoring(): void {
    this.pollSubscription?.unsubscribe();
    this.pollSubscription = undefined;
  }

  ngOnDestroy(): void {
    this.stopMonitoring();
  }
}
