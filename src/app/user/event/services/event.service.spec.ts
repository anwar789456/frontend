import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { EventService } from './event.service';
import { Event, EventStatus } from '../models/event.model';

describe('EventService', () => {
  let service: EventService;
  let httpMock: HttpTestingController;
  const apiUrl = '/api/events';

  const mockEvent: Event = {
    id: 1,
    title: 'English Workshop',
    description: 'A workshop for beginners',
    startDate: '2026-05-01T10:00:00',
    status: 'UPCOMING' as EventStatus,
    category: 'Workshop',
    targetLevel: 'BEGINNER',
    maxAttendees: 50,
    currentAttendees: 10,
    hostName: 'John Doe',
    location: 'Room 101'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        EventService
      ]
    });
    service = TestBed.inject(EventService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ── CREATE ──

  it('should create an event', () => {
    service.create(mockEvent).subscribe(event => {
      expect(event).toEqual(mockEvent);
    });

    const req = httpMock.expectOne(`${apiUrl}/create-event`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(mockEvent);
    req.flush(mockEvent);
  });

  // ── GET ALL ──

  it('should get all events', () => {
    const mockEvents: Event[] = [mockEvent, { ...mockEvent, id: 2, title: 'Grammar Class' }];

    service.getAll().subscribe(events => {
      expect(events.length).toBe(2);
      expect(events[0].title).toBe('English Workshop');
      expect(events[1].title).toBe('Grammar Class');
    });

    const req = httpMock.expectOne(`${apiUrl}/get-all-events`);
    expect(req.request.method).toBe('GET');
    req.flush(mockEvents);
  });

  it('should return empty array when no events exist', () => {
    service.getAll().subscribe(events => {
      expect(events).toEqual([]);
      expect(events.length).toBe(0);
    });

    const req = httpMock.expectOne(`${apiUrl}/get-all-events`);
    req.flush([]);
  });

  // ── GET BY ID ──

  it('should get event by ID', () => {
    service.getById(1).subscribe(event => {
      expect(event.id).toBe(1);
      expect(event.title).toBe('English Workshop');
    });

    const req = httpMock.expectOne(`${apiUrl}/get-event-by-id/1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockEvent);
  });

  // ── UPDATE ──

  it('should update an event', () => {
    const updatedEvent = { ...mockEvent, title: 'Updated Workshop' };

    service.update(1, updatedEvent).subscribe(event => {
      expect(event.title).toBe('Updated Workshop');
    });

    const req = httpMock.expectOne(`${apiUrl}/update-event/1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(updatedEvent);
    req.flush(updatedEvent);
  });

  // ── DELETE ──

  it('should delete an event', () => {
    service.delete(1).subscribe(response => {
      expect(response).toBeNull();
    });

    const req = httpMock.expectOne(`${apiUrl}/delete-event/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  // ── DRAFT / UNDRAFT ──

  it('should draft an event', () => {
    const draftedEvent = { ...mockEvent, status: 'DRAFT' as EventStatus };

    service.draft(1).subscribe(event => {
      expect(event.status).toBe('DRAFT');
    });

    const req = httpMock.expectOne(`${apiUrl}/draft-event/1`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush(draftedEvent);
  });

  it('should undraft an event', () => {
    const undraftedEvent = { ...mockEvent, status: 'UPCOMING' as EventStatus };

    service.undraft(1).subscribe(event => {
      expect(event.status).toBe('UPCOMING');
    });

    const req = httpMock.expectOne(`${apiUrl}/undraft-event/1`);
    expect(req.request.method).toBe('POST');
    req.flush(undraftedEvent);
  });

  // ── UNCANCEL ──

  it('should uncancel an event', () => {
    service.uncancel(1).subscribe(event => {
      expect(event).toBeTruthy();
    });

    const req = httpMock.expectOne(`${apiUrl}/uncancel-event/1`);
    expect(req.request.method).toBe('POST');
    req.flush(mockEvent);
  });

  // ── DUPLICATE ──

  it('should duplicate an event', () => {
    const duplicatedEvent = { ...mockEvent, id: 2 };

    service.duplicate(1).subscribe(event => {
      expect(event.id).toBe(2);
    });

    const req = httpMock.expectOne(`${apiUrl}/duplicate-event/1`);
    expect(req.request.method).toBe('POST');
    req.flush(duplicatedEvent);
  });

  // ── BULK OPERATIONS ──

  it('should bulk draft events', () => {
    const ids = [1, 2, 3];

    service.bulkDraft(ids).subscribe(response => {
      expect(response).toBeNull();
    });

    const req = httpMock.expectOne(`${apiUrl}/bulk-draft`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(ids);
    req.flush(null);
  });

  it('should bulk cancel events', () => {
    const ids = [4, 5];

    service.bulkCancel(ids).subscribe(response => {
      expect(response).toBeNull();
    });

    const req = httpMock.expectOne(`${apiUrl}/bulk-cancel`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(ids);
    req.flush(null);
  });
});
