import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { EventRecommendationService } from './event-recommendation.service';
import { Event, RecommendedEvent } from '../models/event.model';
import { firstValueFrom } from 'rxjs';

describe('EventRecommendationService', () => {
  let service: EventRecommendationService;
  let httpMock: HttpTestingController;
  const apiUrl = '/api/events';
  const ollamaUrl = 'https://minolingo.online/ollama/v1/completions';

  const mockEvent: Event = {
    id: 1, title: 'Grammar Workshop', description: 'Learn basic grammar',
    startDate: '2026-05-10T10:00:00', status: 'UPCOMING', category: 'Grammar',
    targetLevel: 'BEGINNER', skillFocus: 'Writing'
  };

  const mkEvents = (): Event[] => [
    mockEvent,
    { ...mockEvent, id: 2, title: 'Speaking Club', category: 'Speaking', status: 'UPCOMING' },
    { ...mockEvent, id: 3, title: 'Reading Circle', category: 'Reading', status: 'UPCOMING' },
    { ...mockEvent, id: 4, title: 'Past Event', status: 'COMPLETED' }
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), EventRecommendationService]
    });
    service = TestBed.inject(EventRecommendationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('should be created', () => { expect(service).toBeTruthy(); });

  // ── Pure unit tests (no HTTP) ──

  it('should calculate limit correctly', () => {
    const cl = (service as any).calculateLimit.bind(service);
    expect(cl(1)).toBe(1); expect(cl(2)).toBe(1);
    expect(cl(3)).toBe(2); expect(cl(5)).toBe(2);
    expect(cl(6)).toBe(3); expect(cl(9)).toBe(3);
    expect(cl(10)).toBe(4); expect(cl(50)).toBe(4);
  });

  it('should produce fallback with score 0', () => {
    const fb = (service as any).fallback.bind(service);
    const r: RecommendedEvent[] = fb([mockEvent, { ...mockEvent, id: 2 }], 2);
    expect(r.length).toBe(2);
    expect(r[0].score).toBe(0);
    expect(r[0].reason).toBe('Upcoming event you might enjoy!');
  });

  it('should limit fallback to specified count', () => {
    const fb = (service as any).fallback.bind(service);
    const candidates = Array.from({ length: 10 }, (_, i) => ({ ...mockEvent, id: i + 1 }));
    expect(fb(candidates, 3).length).toBe(3);
    expect(fb(candidates, 1).length).toBe(1);
  });

  // ── Async tests using firstValueFrom ──

  it('should return empty when no upcoming events', async () => {
    const promise = firstValueFrom(service.getRecommendations(1));

    // Flush the two data-fetching requests
    httpMock.expectOne(`${apiUrl}/registrations/get-by-user/1`).flush([]);
    httpMock.expectOne(`${apiUrl}/get-all-events`).flush([{ ...mockEvent, status: 'COMPLETED' }]);

    const result = await promise;
    expect(result).toEqual([]);
    httpMock.verify();
  });

  it('should return AI recommendations on success', async () => {
    const promise = firstValueFrom(service.getRecommendations(1));

    httpMock.expectOne(`${apiUrl}/registrations/get-by-user/1`).flush([]);
    httpMock.expectOne(`${apiUrl}/get-all-events`).flush(mkEvents());

    // Wait a microtask for Promise.all to resolve before Ollama request appears
    await new Promise(r => setTimeout(r, 0));

    const oReq = httpMock.expectOne(ollamaUrl);
    expect(oReq.request.body.model).toBe('qwen2.5:3b');
    expect(oReq.request.body.temperature).toBe(0.2);
    oReq.flush({ choices: [{ text: JSON.stringify([
      { eventId: 1, score: 90, reason: 'Great for beginners' },
      { eventId: 2, score: 85, reason: 'Speaking practice' }
    ])}]});

    const result = await promise;
    expect(result.length).toBe(2);
    expect(result[0].event.id).toBe(1);
    expect(result[0].score).toBe(90);
    httpMock.verify();
  });

  it('should fall back when Ollama fails', async () => {
    const promise = firstValueFrom(service.getRecommendations(1));

    httpMock.expectOne(`${apiUrl}/registrations/get-by-user/1`).flush([]);
    httpMock.expectOne(`${apiUrl}/get-all-events`).flush(mkEvents());
    await new Promise(r => setTimeout(r, 0));

    httpMock.expectOne(ollamaUrl).error(new ProgressEvent('error'), { status: 500, statusText: 'Error' });

    const result = await promise;
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].score).toBe(0); // Fallback
    httpMock.verify();
  });

  it('should deduplicate AI results', async () => {
    const promise = firstValueFrom(service.getRecommendations(1));

    httpMock.expectOne(`${apiUrl}/registrations/get-by-user/1`).flush([]);
    httpMock.expectOne(`${apiUrl}/get-all-events`).flush(mkEvents());
    await new Promise(r => setTimeout(r, 0));

    httpMock.expectOne(ollamaUrl).flush({ choices: [{ text: JSON.stringify([
      { eventId: 1, score: 90, reason: 'First' },
      { eventId: 1, score: 85, reason: 'Dup' },
      { eventId: 2, score: 80, reason: 'Speaking' }
    ])}]});

    const result = await promise;
    const ids = result.map(r => r.event.id);
    expect(ids.length).toBe(new Set(ids).size);
    httpMock.verify();
  });

  it('should filter scores below 70', async () => {
    const promise = firstValueFrom(service.getRecommendations(1));

    httpMock.expectOne(`${apiUrl}/registrations/get-by-user/1`).flush([]);
    httpMock.expectOne(`${apiUrl}/get-all-events`).flush(mkEvents());
    await new Promise(r => setTimeout(r, 0));

    httpMock.expectOne(ollamaUrl).flush({ choices: [{ text: JSON.stringify([
      { eventId: 1, score: 50, reason: 'Low' },
      { eventId: 2, score: 85, reason: 'High' }
    ])}]});

    const result = await promise;
    expect(result.some(r => r.event.id === 1)).toBe(false);
    expect(result.some(r => r.event.id === 2)).toBe(true);
    httpMock.verify();
  });

  it('should exclude registered events from candidates', async () => {
    const promise = firstValueFrom(service.getRecommendations(1));

    // User is registered for event 1
    httpMock.expectOne(`${apiUrl}/registrations/get-by-user/1`).flush([
      { id: 1, eventId: 1, status: 'REGISTERED' }
    ]);
    httpMock.expectOne(`${apiUrl}/get-all-events`).flush(mkEvents());
    await new Promise(r => setTimeout(r, 0));

    // Should still make Ollama request since events 2 & 3 are candidates
    const oReq = httpMock.expectOne(ollamaUrl);
    oReq.flush({ choices: [{ text: JSON.stringify([
      { eventId: 2, score: 80, reason: 'Speaking' }
    ])}]});

    const result = await promise;
    expect(result.every(r => r.event.id !== 1)).toBe(true);
    httpMock.verify();
  });

  it('should clamp scores to 0-100 range', async () => {
    const promise = firstValueFrom(service.getRecommendations(1));

    httpMock.expectOne(`${apiUrl}/registrations/get-by-user/1`).flush([]);
    httpMock.expectOne(`${apiUrl}/get-all-events`).flush(mkEvents());
    await new Promise(r => setTimeout(r, 0));

    httpMock.expectOne(ollamaUrl).flush({ choices: [{ text: JSON.stringify([
      { eventId: 1, score: 150, reason: 'Over 100' },
      { eventId: 2, score: 75, reason: 'Normal' }
    ])}]});

    const result = await promise;
    expect(result[0].score).toBeLessThanOrEqual(100);
    httpMock.verify();
  });
});
