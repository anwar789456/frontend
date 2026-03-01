import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { EventRegistration } from '../models/event-registration.model';

@Injectable({
    providedIn: 'root'
})
export class EventRegistrationService {
    private readonly apiUrl = 'https://minolingo.online/api/events/registrations';

    constructor(private http: HttpClient) { }

    /** Register for an event */
    register(eventId: number, registration: Partial<EventRegistration>): Observable<EventRegistration> {
        return this.http.post<EventRegistration>(`${this.apiUrl}/create/${eventId}`, registration);
    }

    /** Get all registrations */
    getAll(): Observable<EventRegistration[]> {
        return this.http.get<EventRegistration[]>(`${this.apiUrl}/get-all`);
    }

    /** Get a single registration by ID */
    getById(id: number): Observable<EventRegistration> {
        return this.http.get<EventRegistration>(`${this.apiUrl}/get-by-id/${id}`);
    }

    /** Get all registrations for a specific event */
    getByEvent(eventId: number): Observable<EventRegistration[]> {
        return this.http.get<EventRegistration[]>(`${this.apiUrl}/get-by-event/${eventId}`);
    }

    /** Get all registrations for a specific user */
    getByUser(userId: number): Observable<EventRegistration[]> {
        return this.http.get<EventRegistration[]>(`${this.apiUrl}/get-by-user/${userId}`);
    }

    /** Update a registration */
    update(id: number, registration: Partial<EventRegistration>): Observable<EventRegistration> {
        return this.http.put<EventRegistration>(`${this.apiUrl}/update/${id}`, registration);
    }

    /** Delete / cancel a registration */
    delete(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/delete/${id}`);
    }
}
