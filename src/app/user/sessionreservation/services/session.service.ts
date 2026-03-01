import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Session, Certification, PracticeItem } from '../models/sessionReservation.model';

@Injectable({
  providedIn: 'root'
})
export class SessionService {
  private readonly apiUrl = 'https://minolingo.online/api/cours';

  constructor(private http: HttpClient) {}

  // ── Sessions ──

  createSession(session: Session): Observable<Session> {
    return this.http.post<Session>(`${this.apiUrl}/sessions/create-session`, session);
  }

  getSessionById(id: number): Observable<Session> {
    return this.http.get<Session>(`${this.apiUrl}/sessions/get-session-by-id/${id}`);
  }

  getAllSessions(): Observable<Session[]> {
    return this.http.get<Session[]>(`${this.apiUrl}/sessions/get-all-sessions`);
  }

  updateSession(id: number, session: Session): Observable<Session> {
    return this.http.put<Session>(`${this.apiUrl}/sessions/update-session/${id}`, session);
  }

  deleteSession(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/sessions/delete-session/${id}`);
  }

  // ── Certifications ──

  createCertification(certification: Certification): Observable<Certification> {
    return this.http.post<Certification>(`${this.apiUrl}/certifications/create-certification`, certification);
  }

  getCertificationById(id: number): Observable<Certification> {
    return this.http.get<Certification>(`${this.apiUrl}/certifications/get-certification-by-id/${id}`);
  }

  getAllCertifications(): Observable<Certification[]> {
    return this.http.get<Certification[]>(`${this.apiUrl}/certifications/get-all-certifications`);
  }

  updateCertification(id: number, certification: Certification): Observable<Certification> {
    return this.http.put<Certification>(`${this.apiUrl}/certifications/update-certification/${id}`, certification);
  }

  deleteCertification(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/certifications/delete-certification/${id}`);
  }

  // ── Practice Items ──

  createPracticeItem(item: PracticeItem): Observable<PracticeItem> {
    return this.http.post<PracticeItem>(`${this.apiUrl}/practice-items/create-practice-item`, item);
  }

  getPracticeItemById(id: number): Observable<PracticeItem> {
    return this.http.get<PracticeItem>(`${this.apiUrl}/practice-items/get-practice-item-by-id/${id}`);
  }

  getAllPracticeItems(): Observable<PracticeItem[]> {
    return this.http.get<PracticeItem[]>(`${this.apiUrl}/practice-items/get-all-practice-items`);
  }

  updatePracticeItem(id: number, item: PracticeItem): Observable<PracticeItem> {
    return this.http.put<PracticeItem>(`${this.apiUrl}/practice-items/update-practice-item/${id}`, item);
  }

  deletePracticeItem(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/practice-items/delete-practice-item/${id}`);
  }
}
