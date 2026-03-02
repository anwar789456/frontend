import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MOCK_USER } from '../../../shared/constants/mock-data';
import { Event, ScheduleItem, SuggestedEvent } from '../models/event.model';
import { EventRegistration } from '../models/event-registration.model';
import { EventService } from '../services/event.service';
import { EventRegistrationService } from '../services/event-registration.service';

@Component({
  selector: 'app-events',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './events.component.html'
})
export class EventsComponent implements OnInit {
  events: Event[] = [];
  user = MOCK_USER;

  isLoading = true;
  error: string | null = null;

  tabs = ['Explore', 'Going', 'Past'];
  activeTab = 'Explore';

  // Search & Sort
  searchQuery = '';
  sortBy = 'date-asc';
  showFilters = false;
  sortOptions = [
    { value: 'date-asc', label: '📅 Date (Soonest)', icon: '↑' },
    { value: 'date-desc', label: '📅 Date (Latest)', icon: '↓' },
    { value: 'attendees', label: '👥 Most Attendees', icon: '↓' }
  ];

  // Registration state
  userRegistrations: EventRegistration[] = [];
  registrationLoading: Set<number> = new Set(); // eventIds currently being processed
  readonly MOCK_USER_ID = 1; // hardcoded until auth is implemented
  // Constructor
  constructor(
    private eventService: EventService,
    private registrationService: EventRegistrationService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadEvents();
    this.loadUserRegistrations();
  }

  loadEvents(): void {
    this.isLoading = true;
    this.error = null;
    this.eventService.getAll().subscribe({
      next: (data: Event[]) => {
        this.events = data;
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (err: unknown) => {
        console.error('Failed to load events:', err);
        this.error = 'Failed to load events. Please try again.';
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  loadUserRegistrations(): void {
    this.registrationService.getByUser(this.MOCK_USER_ID).subscribe({
      next: (registrations: EventRegistration[]) => {
        this.userRegistrations = registrations.filter(r => r.status !== 'CANCELLED');
        this.cdr.markForCheck();
      },
      error: (err: unknown) => {
        console.error('Failed to load registrations:', err);
      }
    });
  }

  // --- Registration Actions ---

  registerForEvent(event: Event): void {
    if (this.isRegistered(event.id) || this.isWaitlisted(event.id) || this.registrationLoading.has(event.id)) return;

    this.registrationLoading.add(event.id);
    this.cdr.markForCheck();

    const registration: Partial<EventRegistration> = {
      userId: this.MOCK_USER_ID,
      userName: this.user.name || 'User',
      userEmail: 'mahmoud.salhi@esprit.tn'
    };

    this.registrationService.register(event.id, registration).subscribe({
      next: (created: EventRegistration) => {
        // Ensure eventId is set (backend may not populate read-only FK on insert)
        created.eventId = event.id;
        this.userRegistrations.push(created);

        // Only increment attendee count if actually registered (not waitlisted)
        if (created.status !== 'WAITLISTED') {
          const ev = this.events.find(e => e.id === event.id);
          if (ev) {
            ev.currentAttendees = (ev.currentAttendees || 0) + 1;
          }
        }
        this.registrationLoading.delete(event.id);
        this.cdr.markForCheck();
      },
      error: (err: unknown) => {
        console.error('Failed to register:', err);
        this.registrationLoading.delete(event.id);
        this.cdr.markForCheck();
      }
    });
  }

  cancelRegistration(eventId: number): void {
    const registration = this.getRegistration(eventId);
    if (!registration?.id || this.registrationLoading.has(eventId)) return;

    const wasRegistered = registration.status !== 'WAITLISTED';

    this.registrationLoading.add(eventId);
    this.cdr.markForCheck();

    this.registrationService.delete(registration.id).subscribe({
      next: () => {
        this.userRegistrations = this.userRegistrations.filter(r => r.id !== registration.id);
        // Only decrement attendee count if was actually registered (not waitlisted)
        if (wasRegistered) {
          const ev = this.events.find(e => e.id === eventId);
          if (ev && ev.currentAttendees && ev.currentAttendees > 0) {
            ev.currentAttendees -= 1;
          }
        }
        this.registrationLoading.delete(eventId);
        this.cdr.markForCheck();
      },
      error: (err: unknown) => {
        console.error('Failed to cancel registration:', err);
        this.registrationLoading.delete(eventId);
        this.cdr.markForCheck();
      }
    });
  }

  // --- Registration Helpers ---

  isRegistered(eventId: number): boolean {
    return this.userRegistrations.some(r =>
      this.getEventIdFromRegistration(r) === eventId && r.status !== 'WAITLISTED' && r.status !== 'CANCELLED'
    );
  }

  isWaitlisted(eventId: number): boolean {
    return this.userRegistrations.some(r =>
      this.getEventIdFromRegistration(r) === eventId && r.status === 'WAITLISTED'
    );
  }

  getRegistration(eventId: number): EventRegistration | undefined {
    return this.userRegistrations.find(r => this.getEventIdFromRegistration(r) === eventId);
  }

  isEventFull(event: Event): boolean {
    if (!event.maxAttendees) return false;
    return (event.currentAttendees || 0) >= event.maxAttendees;
  }

  private getEventIdFromRegistration(r: EventRegistration): number | undefined {
    return r.event?.id ?? r.eventId;
  }

  // --- Search & Sort ---

  get filteredEvents(): Event[] {
    let result = this.events;
    const q = this.searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter(e =>
        e.title?.toLowerCase().includes(q) ||
        e.description?.toLowerCase().includes(q) ||
        e.category?.toLowerCase().includes(q) ||
        e.location?.toLowerCase().includes(q) ||
        e.hostName?.toLowerCase().includes(q) ||
        e.tags?.some(t => t.toLowerCase().includes(q))
      );
    }
    // Apply sort
    result = [...result].sort((a, b) => {
      switch (this.sortBy) {
        case 'date-desc':
          return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
        case 'attendees':
          return (b.currentAttendees || 0) - (a.currentAttendees || 0);
        case 'title':
          return (a.title || '').localeCompare(b.title || '');
        case 'date-asc':
        default:
          return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
      }
    });
    return result;
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.sortBy = 'date-asc';
  }

  // --- Tab-based event lists ---

  get goingEvents(): Event[] {
    const registeredEventIds = new Set(
      this.userRegistrations.map(r => this.getEventIdFromRegistration(r))
    );
    return this.filteredEvents
      .filter(e => registeredEventIds.has(e.id) && e.status !== 'COMPLETED');
  }

  get pastEvents(): Event[] {
    return this.filteredEvents
      .filter(e => e.status === 'COMPLETED');
  }

  /** Schedule: only shows ongoing/upcoming events the user is registered for */
  get schedule(): ScheduleItem[] {
    const now = new Date();
    const registeredEventIds = new Set(
      this.userRegistrations.map(r => this.getEventIdFromRegistration(r))
    );
    const relevant = this.events
      .filter(e => (e.status === 'ONGOING' || e.status === 'UPCOMING') && registeredEventIds.has(e.id))
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
      .slice(0, 3);

    return relevant.map(e => {
      const start = new Date(e.startDate);
      let time: string;
      if (e.status === 'ONGOING') {
        time = start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
      } else {
        const diffDays = Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays <= 1) {
          time = 'Tomorrow';
        } else {
          time = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
      }
      return {
        time,
        title: e.title,
        subtitle: e.status === 'ONGOING' ? undefined : start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        status: e.status
      } as ScheduleItem;
    });
  }

  /** Suggested events: upcoming, not featured, and not already registered */
  get suggestedEvents(): SuggestedEvent[] {
    const registeredEventIds = new Set(
      this.userRegistrations.map(r => this.getEventIdFromRegistration(r))
    );
    return this.events
      .filter(e => e.status === 'UPCOMING' && !e.isFeatured && !registeredEventIds.has(e.id))
      .slice(0, 4)
      .map(e => ({
        id: e.id,
        title: e.title,
        startDate: this.formatDate(e.startDate),
        isFree: true,
        image: e.image,
        category: e.category,
        targetLevel: e.targetLevel
      }));
  }

  /** Returns a live event if one is happening now, otherwise a featured or nearest upcoming event */
  get featuredEvent(): Event | undefined {
    const now = new Date();

    // 1. Check for a currently live event (now is between startDate and endDate)
    const liveEvent = this.events.find(e => {
      const start = new Date(e.startDate);
      const end = e.endDate ? new Date(e.endDate) : new Date(start.getTime() + 60 * 60000); // default 1h
      return now >= start && now <= end;
    });
    if (liveEvent) return liveEvent;

    // 2. Fall back to explicitly featured event
    const featured = this.events.find(e => e.isFeatured);
    if (featured) return featured;

    // 3. Fall back to the nearest upcoming event
    return this.events
      .filter(e => new Date(e.startDate) > now)
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())[0];
  }

  /** Check if an event is currently live based on system time */
  isEventLive(event: Event): boolean {
    const now = new Date();
    const start = new Date(event.startDate);
    const end = event.endDate ? new Date(event.endDate) : new Date(start.getTime() + 60 * 60000);
    return now >= start && now <= end;
  }

  get upcomingEvents() {
    const featured = this.featuredEvent;
    return this.filteredEvents
      .filter(e => e.status === 'UPCOMING' && (!featured || e.id !== featured.id));
  }

  get completedEvents() {
    return this.events.filter(e => e.status === 'COMPLETED');
  }

  formatDate(dateStr: string): string {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  }

  getDay(dateStr: string): number {
    try { return new Date(dateStr).getDate(); } catch { return 0; }
  }

  getMonth(dateStr: string): string {
    try { return new Date(dateStr).toLocaleDateString('en-US', { month: 'short' }).toUpperCase(); } catch { return ''; }
  }

  getDayOfWeek(dateStr: string): string {
    try { return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase(); } catch { return ''; }
  }
}
