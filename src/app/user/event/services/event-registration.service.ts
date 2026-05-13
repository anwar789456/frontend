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

    /** Register for an eventt */
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

    /** Approve a pending registration (admin) */
    approve(id: number): Observable<EventRegistration> {
        return this.http.post<EventRegistration>(`${this.apiUrl}/approve/${id}`, {});
    }

    /** Reject a pending registration (admin) */
    reject(id: number): Observable<EventRegistration> {
        return this.http.post<EventRegistration>(`${this.apiUrl}/reject/${id}`, {});
    }

    /** Get all pending registrations (admin) */
    getPending(): Observable<EventRegistration[]> {
        return this.http.get<EventRegistration[]>(`${this.apiUrl}/pending`);
    }

    /** QR Check-in */
    checkIn(code: string): Observable<EventRegistration> {
        return this.http.post<EventRegistration>(`${this.apiUrl}/check-in/${code}`, {});
    }

    /** Rate an event (1-5 stars) */
    rateEvent(registrationId: number, rating: number): Observable<EventRegistration> {
        return this.http.post<EventRegistration>(`${this.apiUrl}/rate/${registrationId}`, { rating });
    }

    /** Get waitlist position for a registration */
    getWaitlistPosition(registrationId: number): Observable<{ position: number }> {
        return this.http.get<{ position: number }>(`${this.apiUrl}/waitlist-position/${registrationId}`);
    }

    /** Send announcement to all registrants */
    sendAnnouncement(eventId: number, subject: string, message: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/announce/${eventId}`, { subject, message });
    }

    /** Get average rating for an event */
    getAvgRating(eventId: number): Observable<{ avg: number | null; count: number }> {
        return this.http.get<{ avg: number | null; count: number }>(`${this.apiUrl}/avg-rating/${eventId}`);
    }
}
