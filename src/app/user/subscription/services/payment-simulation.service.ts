import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface SimulatePaymentRequest {
  userId: number;
  planId: number;
  email: string;
}

export interface SimulatePaymentResponse {
  success: boolean;
  message: string;
  subscription?: any;
}

@Injectable({
  providedIn: 'root'
})
export class PaymentSimulationService {
  private readonly apiUrl = '/api/abonnements/payments';

  constructor(private http: HttpClient) { }

  /**
   * Simulate payment for a subscription plan
   * 
   * @param request SimulatePaymentRequest
   * @returns Observable<SimulatePaymentResponse>
   */
  simulatePayment(request: SimulatePaymentRequest): Observable<SimulatePaymentResponse> {
    return this.http.post<SimulatePaymentResponse>(
      `${this.apiUrl}/simulate`,
      request
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Check if payment service is healthy
   * 
   * @returns Observable<SimulatePaymentResponse>
   */
  healthCheck(): Observable<SimulatePaymentResponse> {
    return this.http.get<SimulatePaymentResponse>(
      `${this.apiUrl}/health`
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Standard error handler
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unexpected error occurred. Please try again.';

    if (error.status === 0) {
      errorMessage = 'Unable to connect to the server. Please check your internet connection.';
    } else if (error.status === 400) {
      errorMessage = error.error?.message || 'Invalid request. Please check your input.';
    } else if (error.status === 401) {
      errorMessage = 'Unauthorized. Please log in again.';
    } else if (error.status === 403) {
      errorMessage = 'You do not have permission to perform this action.';
    } else if (error.status === 404) {
      errorMessage = 'The requested resource was not found.';
    } else if (error.status >= 500) {
      errorMessage = 'Server error. Please try again later.';
    } else if (error.error?.message) {
      errorMessage = error.error.message;
    }

    console.error('PaymentSimulationService error:', error);
    return throwError(() => ({ message: errorMessage, status: error.status, details: error.error }));
  }
}