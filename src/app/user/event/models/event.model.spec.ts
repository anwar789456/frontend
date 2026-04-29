import { Event, EventStatus, TargetLevel, ScheduleItem, SuggestedEvent, RecommendedEvent } from './event.model';
import { EventRegistration, RegistrationStatus } from './event-registration.model';

describe('Event Models', () => {

  describe('Event interface', () => {
    it('should create a valid Event object', () => {
      const event: Event = {
        id: 1, title: 'Workshop', description: 'Test', startDate: '2026-05-01', status: 'UPCOMING'
      };
      expect(event.id).toBe(1);
      expect(event.status).toBe('UPCOMING');
    });

    it('should support all EventStatus values', () => {
      const statuses: EventStatus[] = ['DRAFT', 'UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED'];
      statuses.forEach(s => {
        const e: Event = { id: 1, title: 'T', description: 'D', startDate: '2026-01-01', status: s };
        expect(e.status).toBe(s);
      });
    });

    it('should support all TargetLevel values', () => {
      const levels: TargetLevel[] = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ALL_LEVELS'];
      levels.forEach(l => {
        const e: Event = { id: 1, title: 'T', description: 'D', startDate: '2026-01-01', status: 'UPCOMING', targetLevel: l };
        expect(e.targetLevel).toBe(l);
      });
    });

    it('should support optional fields', () => {
      const event: Event = {
        id: 1, title: 'T', description: 'D', startDate: '2026-01-01', status: 'UPCOMING',
        image: 'img.png', category: 'Workshop', tags: ['english'], endDate: '2026-01-02',
        location: 'Room 1', latitude: 36.8, longitude: 10.1, maxAttendees: 50,
        currentAttendees: 10, isRegistrationOpen: true, registrationDeadline: '2026-01-01',
        isFeatured: true, isPublic: true, hostName: 'Admin', hostId: 1,
        contactEmail: 'a@b.com', skillFocus: 'Speaking', createdAt: '2026-01-01', updatedAt: '2026-01-01'
      };
      expect(event.tags).toEqual(['english']);
      expect(event.latitude).toBe(36.8);
    });
  });

  describe('ScheduleItem', () => {
    it('should create a valid ScheduleItem', () => {
      const item: ScheduleItem = { time: '10:00', title: 'Opening', subtitle: 'Welcome', status: 'ONGOING' };
      expect(item.time).toBe('10:00');
    });
  });

  describe('SuggestedEvent', () => {
    it('should create a valid SuggestedEvent', () => {
      const se: SuggestedEvent = { id: 1, title: 'Suggested', startDate: '2026-05-01', isFree: true };
      expect(se.isFree).toBe(true);
    });
  });

  describe('RecommendedEvent', () => {
    it('should create a valid RecommendedEvent', () => {
      const re: RecommendedEvent = {
        event: { id: 1, title: 'T', description: 'D', startDate: '2026-01-01', status: 'UPCOMING' },
        score: 85, reason: 'Matches your profile'
      };
      expect(re.score).toBe(85);
      expect(re.reason).toContain('profile');
    });
  });

  describe('EventRegistration', () => {
    it('should create a valid registration', () => {
      const reg: EventRegistration = {
        id: 1, eventId: 10, userId: 100, userName: 'John', status: 'REGISTERED'
      };
      expect(reg.status).toBe('REGISTERED');
    });

    it('should support all RegistrationStatus values', () => {
      const statuses: RegistrationStatus[] = ['PENDING','REGISTERED','WAITLISTED','CONFIRMED','ATTENDED','CANCELLED','REJECTED','NO_SHOW'];
      statuses.forEach(s => {
        const r: EventRegistration = { status: s };
        expect(r.status).toBe(s);
      });
    });
  });
});
