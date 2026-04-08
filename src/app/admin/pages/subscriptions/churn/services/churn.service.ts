import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ChurnPrediction {
  userId: number | null;
  churnProbability: number;
  riskLevel: string;
  featureImportance: { [key: string]: number };
}

export interface ChurnBatchResponse {
  predictions: ChurnPrediction[];
  featureImportance: { [key: string]: number };
}

export interface ChurnHealth {
  status: string;
  model_loaded?: boolean;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ChurnService {
  private readonly apiUrl = 'http://localhost:8085/api/abonnements/churn';

  constructor(private http: HttpClient) {}

  healthCheck(): Observable<ChurnHealth> {
    return this.http.get<ChurnHealth>(`${this.apiUrl}/health`);
  }

  predictSingle(userId: number, features: { [key: string]: number }): Observable<ChurnPrediction> {
    return this.http.post<ChurnPrediction>(`${this.apiUrl}/predict`, { userId, features });
  }

  predictBatch(users: { userId: number; features: { [key: string]: number } }[]): Observable<ChurnBatchResponse> {
    return this.http.post<ChurnBatchResponse>(`${this.apiUrl}/predict-batch`, { users });
  }
}
