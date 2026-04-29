import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Donation, DonationStatus } from '../models/donation.model';

@Injectable({
  providedIn: 'root'
})
export class DonationService {
  private readonly apiUrl = '/api/donations';

  constructor(private http: HttpClient) {}

  create(donation: Donation): Observable<Donation> {
    return this.http.post<Donation>(`${this.apiUrl}/create-donation`, donation);
  }

  getAll(): Observable<Donation[]> {
    return this.http.get<Donation[]>(`${this.apiUrl}/get-all-donations`);
  }

  getById(id: number): Observable<Donation> {
    return this.http.get<Donation>(`${this.apiUrl}/get-donation/${id}`);
  }

  getQrCode(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/qrcode`, { responseType: 'blob' });
  }

  update(id: number, donation: Donation): Observable<Donation> {
    return this.http.put<Donation>(`${this.apiUrl}/update-donation/${id}`, donation);
  }

  updateStatus(id: number, status: DonationStatus): Observable<Donation> {
    return this.http.patch<Donation>(`${this.apiUrl}/update-status/${id}`, null, {
      params: { status }
    });
  }

  review(id: number, payload: { moderatorId: number; decision: DonationStatus; reason?: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/review`, payload);
  }

  getReviews(id: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${id}/reviews`);
  }

  getFavorites(userId: number): Observable<Donation[]> {
    return this.http.get<Donation[]>(`${this.apiUrl}/favorites`, { params: { userId } });
  }

  addFavorite(id: number, userId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/favorite`, null, { params: { userId } });
  }

  removeFavorite(id: number, userId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}/favorite`, { params: { userId } });
  }

  addComment(id: number, payload: { userId: number; text: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/comments`, payload);
  }

  getComments(id: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${id}/comments`);
  }

  deleteComment(id: number, commentId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}/comments/${commentId}`);
  }
  uploadImage(file: File): Observable<string> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post(`${this.apiUrl}/upload-image`, form, { responseType: 'text' });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/delete-donation/${id}`);
  }

  getStats(userId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/stats/${userId}`);
  }

  getMerciPointsTotal(userId: number): Observable<{ userId: number; totalPoints: number }> {
    return this.http.get<{ userId: number; totalPoints: number }>(`${this.apiUrl}/merci-points/total/${userId}`);
  }

  getMerciPointsHistory(userId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/merci-points/history/${userId}`);
  }

  getGamification(userId: number): Observable<{
    userId: number;
    points: number;
    level: string;
    badges: string[];
    nextLevel: string;
    pointsToNext: number;
    progress: number;
  }> {
    return this.http.get<any>(`${this.apiUrl}/${userId}/gamification`);
  }
}
