import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Event } from '../models/event.model';

@Injectable({
  providedIn: 'root'
})
export class EventService {
  private readonly apiUrl = 'https://minolingo.online/api/events';

  constructor(private http: HttpClient) { }

  create(event: Event): Observable<Event> {
    return this.http.post<Event>(`${this.apiUrl}/create-event`, event);
  }

  getAll(): Observable<Event[]> {
    return this.http.get<Event[]>(`${this.apiUrl}/get-all-events`);
  }

  getById(id: number): Observable<Event> {
    return this.http.get<Event>(`${this.apiUrl}/get-event-by-id/${id}`);
  }

  update(id: number, event: Event): Observable<Event> {
    return this.http.put<Event>(`${this.apiUrl}/update-event/${id}`, event);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/delete-event/${id}`);
  }
}
