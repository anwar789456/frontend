import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Reclamation } from '../models/reclamation.model';

@Injectable({
  providedIn: 'root'
})
export class ReclamationService {
  private readonly apiUrl = 'https://minolingo.online/api/reclamations';

  constructor(private http: HttpClient) {}

  create(reclamation: Partial<Reclamation>): Observable<Reclamation> {
    return this.http.post<Reclamation>(`${this.apiUrl}/create-reclamation`, reclamation).pipe(
      catchError(this.handleError)
    );
  }

  getAll(): Observable<Reclamation[]> {
    return this.http.get<Reclamation[]>(`${this.apiUrl}/get-all-reclamations`).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: number): Observable<Reclamation> {
    return this.http.get<Reclamation>(`${this.apiUrl}/get-reclamation-by-id/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  getByUserId(userId: number): Observable<Reclamation[]> {
    return this.http.get<Reclamation[]>(`${this.apiUrl}/get-reclamations-by-user/${userId}`).pipe(
      catchError(this.handleError)
    );
  }

  update(id: number, reclamation: Reclamation): Observable<Reclamation> {
    return this.http.put<Reclamation>(`${this.apiUrl}/update-reclamation/${id}`, reclamation).pipe(
      catchError(this.handleError)
    );
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/delete-reclamation/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  private handleError = (error: HttpErrorResponse): Observable<never> => {
    let message = 'An unexpected error occurred. Please try again.';
    if (error.status === 0) {
      message = 'Unable to connect to the server. Please check your internet connection.';
    } else if (error.status === 400) {
      message = error.error?.message || 'Invalid request. Please check your input.';
    } else if (error.status === 404) {
      message = error.error?.message || 'Report not found.';
    } else if (error.status >= 500) {
      message = 'Server error. Please try again later.';
    }
    return throwError(() => message);
  };
}
