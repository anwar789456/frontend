import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { EventRegistrationService } from './event-registration.service';
import { EventRegistration, RegistrationStatus } from '../models/event-registration.model';

describe('EventRegistrationService', () => {
  let service: EventRegistrationService;
  let httpMock: HttpTestingController;
  const apiUrl = 'https://minolingo.online/api/events/registrations';

  const mockRegistration: EventRegistration = {
    id: 1,
    event: { id: 10 },
    eventId: 10,
    userId: 100,
    userName: 'John Doe',
    userEmail: 'john@example.com',
    registrationDate: '2026-04-20T10:00:00',
    status: 'REGISTERED' as RegistrationStatus,
    phoneNumber: '+21612345678',
    rating: 4
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        EventRegistrationService
      ]
    });
    service = TestBed.inject(EventRegistrationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ── REGISTER ──

  it('should register for an event', () => {
    const partial = { userName: 'John', phoneNumber: '+21612345678' };

    service.register(10, partial).subscribe(reg => {
      expect(reg.id).toBe(1);
      expect(reg.status).toBe('REGISTERED');
    });

    const req = httpMock.expectOne(`${apiUrl}/create/10`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(partial);
    req.flush(mockRegistration);
  });

  // ── GET ALL ──

  it('should get all registrations', () => {
    const mockRegs = [mockRegistration, { ...mockRegistration, id: 2 }];

    service.getAll().subscribe(regs => {
      expect(regs.length).toBe(2);
    });

    const req = httpMock.expectOne(`${apiUrl}/get-all`);
    expect(req.request.method).toBe('GET');
    req.flush(mockRegs);
  });

  // ── GET BY ID ──

  it('should get registration by ID', () => {
    service.getById(1).subscribe(reg => {
      expect(reg.id).toBe(1);
      expect(reg.userName).toBe('John Doe');
    });

    const req = httpMock.expectOne(`${apiUrl}/get-by-id/1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockRegistration);
  });

  // ── GET BY EVENT ──

  it('should get registrations by event', () => {
    service.getByEvent(10).subscribe(regs => {
      expect(regs.length).toBe(1);
      expect(regs[0].eventId).toBe(10);
    });

    const req = httpMock.expectOne(`${apiUrl}/get-by-event/10`);
    expect(req.request.method).toBe('GET');
    req.flush([mockRegistration]);
  });

  // ── GET BY USER ──

  it('should get registrations by user', () => {
    service.getByUser(100).subscribe(regs => {
      expect(regs.length).toBe(1);
      expect(regs[0].userId).toBe(100);
    });

    const req = httpMock.expectOne(`${apiUrl}/get-by-user/100`);
    expect(req.request.method).toBe('GET');
    req.flush([mockRegistration]);
  });

  // ── UPDATE ──

  it('should update a registration', () => {
    const updated = { status: 'CONFIRMED' as RegistrationStatus };

    service.update(1, updated).subscribe(reg => {
      expect(reg.status).toBe('CONFIRMED');
    });

    const req = httpMock.expectOne(`${apiUrl}/update/1`);
    expect(req.request.method).toBe('PUT');
    req.flush({ ...mockRegistration, status: 'CONFIRMED' });
  });

  // ── DELETE ──

  it('should delete a registration', () => {
    service.delete(1).subscribe(response => {
      expect(response).toBeNull();
    });

    const req = httpMock.expectOne(`${apiUrl}/delete/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  // ── APPROVE / REJECT ──

  it('should approve a registration', () => {
    const approved = { ...mockRegistration, status: 'CONFIRMED' as RegistrationStatus };

    service.approve(1).subscribe(reg => {
      expect(reg.status).toBe('CONFIRMED');
    });

    const req = httpMock.expectOne(`${apiUrl}/approve/1`);
    expect(req.request.method).toBe('POST');
    req.flush(approved);
  });

  it('should reject a registration', () => {
    const rejected = { ...mockRegistration, status: 'REJECTED' as RegistrationStatus };

    service.reject(1).subscribe(reg => {
      expect(reg.status).toBe('REJECTED');
    });

    const req = httpMock.expectOne(`${apiUrl}/reject/1`);
    expect(req.request.method).toBe('POST');
    req.flush(rejected);
  });

  // ── PENDING ──

  it('should get pending registrations', () => {
    const pending = [{ ...mockRegistration, status: 'PENDING' as RegistrationStatus }];

    service.getPending().subscribe(regs => {
      expect(regs.length).toBe(1);
      expect(regs[0].status).toBe('PENDING');
    });

    const req = httpMock.expectOne(`${apiUrl}/pending`);
    expect(req.request.method).toBe('GET');
    req.flush(pending);
  });

  // ── CHECK-IN ──

  it('should check in with QR code', () => {
    const attended = { ...mockRegistration, status: 'ATTENDED' as RegistrationStatus };

    service.checkIn('ABC123').subscribe(reg => {
      expect(reg.status).toBe('ATTENDED');
    });

    const req = httpMock.expectOne(`${apiUrl}/check-in/ABC123`);
    expect(req.request.method).toBe('POST');
    req.flush(attended);
  });

  // ── RATE EVENT ──

  it('should rate an event', () => {
    const rated = { ...mockRegistration, rating: 5 };

    service.rateEvent(1, 5).subscribe(reg => {
      expect(reg.rating).toBe(5);
    });

    const req = httpMock.expectOne(`${apiUrl}/rate/1`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ rating: 5 });
    req.flush(rated);
  });

  // ── WAITLIST POSITION ──

  it('should get waitlist position', () => {
    service.getWaitlistPosition(1).subscribe(result => {
      expect(result.position).toBe(3);
    });

    const req = httpMock.expectOne(`${apiUrl}/waitlist-position/1`);
    expect(req.request.method).toBe('GET');
    req.flush({ position: 3 });
  });

  // ── ANNOUNCEMENT ──

  it('should send announcement to registrants', () => {
    service.sendAnnouncement(10, 'Update', 'Event moved to Room 202').subscribe(resp => {
      expect(resp).toBeTruthy();
    });

    const req = httpMock.expectOne(`${apiUrl}/announce/10`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ subject: 'Update', message: 'Event moved to Room 202' });
    req.flush({ success: true });
  });

  // ── AVERAGE RATING ──

  it('should get average rating for an event', () => {
    service.getAvgRating(10).subscribe(result => {
      expect(result.avg).toBe(4.5);
      expect(result.count).toBe(20);
    });

    const req = httpMock.expectOne(`${apiUrl}/avg-rating/10`);
    expect(req.request.method).toBe('GET');
    req.flush({ avg: 4.5, count: 20 });
  });

  it('should handle null average rating', () => {
    service.getAvgRating(99).subscribe(result => {
      expect(result.avg).toBeNull();
      expect(result.count).toBe(0);
    });

    const req = httpMock.expectOne(`${apiUrl}/avg-rating/99`);
    req.flush({ avg: null, count: 0 });
  });
});
