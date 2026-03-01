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

  update(id: number, donation: Donation): Observable<Donation> {
    return this.http.put<Donation>(`${this.apiUrl}/update-donation/${id}`, donation);
  }

  updateStatus(id: number, status: DonationStatus): Observable<Donation> {
    return this.http.patch<Donation>(`${this.apiUrl}/update-status/${id}`, null, {
      params: { status }
    });
  }

  uploadImage(file: File): Observable<string> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post(`${this.apiUrl}/upload-image`, form, { responseType: 'text' });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/delete-donation/${id}`);
  }
}
