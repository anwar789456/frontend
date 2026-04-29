import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AiAnalysisRequest {
  itemName?: string;
  description?: string;
  condition?: string;
  quantity?: number;
  type?: string;
  previousDonationItems?: string[];
}

export interface AiAnalysisResponse {
  improvedText: string;
  category: string;
  categoryLabel: string;
  impactScore: number;
  suggestions: string[];
}

export interface AiSuggestionRequest {
  userId: number;
  previousDonationItems: string[];
}

export interface AiSuggestionResponse {
  suggestions: string[];
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class AiDonationService {
  private readonly apiUrl = '/api/donations/ai';

  constructor(private http: HttpClient) {}

  analyzeDonation(request: AiAnalysisRequest): Observable<AiAnalysisResponse> {
    return this.http.post<AiAnalysisResponse>(`${this.apiUrl}/analyze-donation`, request);
  }

  getSuggestions(request: AiSuggestionRequest): Observable<AiSuggestionResponse> {
    return this.http.post<AiSuggestionResponse>(`${this.apiUrl}/suggestions`, request);
  }
}
