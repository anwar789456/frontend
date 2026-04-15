import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Event, ScheduleItem, SuggestedEvent, RecommendedEvent } from '../models/event.model';
import { EventRegistration } from '../models/event-registration.model';
import { EventService } from '../services/event.service';
import { EventRegistrationService } from '../services/event-registration.service';
import { EventRecommendationService } from '../services/event-recommendation.service';
import { AuthService } from '../../../shared/services/auth.service';

@Component({
  selector: 'app-events',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './events.component.html',
  styleUrl: './events.component.css'
})
export class EventsComponent implements OnInit {
  events: Event[] = [];

  get user() { return this.authService.currentUser; }
  get userId(): number { return this.authService.currentUser?.id ?? 0; }

  // Typed helpers for template (avoids index-signature TS errors)
  get userName(): string { return this.authService.currentUser?.name ?? 'User'; }
  get userEmail(): string { return this.authService.currentUser?.email ?? ''; }
  get userStreak(): number { return (this.authService.currentUser?.['streak'] as number) ?? 0; }
  get userXp(): number { return (this.authService.currentUser?.['xp'] as number) ?? 0; }

  isLoading = true;
  error: string | null = null;

  // AI Recommendations
  recommendedEvents: RecommendedEvent[] = [];
  recommendationsLoading = false;

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

  // Paginationn
  currentPage: { [tab: string]: number } = { Explore: 1, Going: 1, Past: 1 };
  pageSize = 5;

  // Registration state
  userRegistrations: EventRegistration[] = [];
  registrationLoading: Set<number> = new Set(); // eventIds currently being processed
  get MOCK_USER_ID(): number { return this.userId; }

  pendingRegistrationEvent: Event | null = null;

  // Waitlist positions: eventId → position
  waitlistPositions: Map<number, number> = new Map();

  // Star rating
  hoverRating: { [eventId: number]: number } = {};
  ratingLoading: Set<number> = new Set();

  // Success toast
  toastVisible = false;
  toastEventTitle = '';
  toastType: 'pending' | 'registered' | 'waitlisted' | 'cancelled' | 'rejected' = 'pending';
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  showSuccessToast(title: string, type: 'pending' | 'registered' | 'waitlisted' | 'cancelled' | 'rejected'): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastEventTitle = title;
    this.toastType = type;
    this.toastVisible = true;
    this.cdr.markForCheck();
    this.toastTimer = setTimeout(() => {
      this.toastVisible = false;
      this.cdr.markForCheck();
    }, 3500);
  }

  // Calendar modal
  showCalendar = false;
  calendarDate = new Date();
  calendarDays: { date: Date; events: Event[]; isCurrentMonth: boolean; isToday: boolean }[] = [];
  selectedDayEvents: Event[] = [];
  selectedDay: Date | null = null;

  constructor(
    private eventService: EventService,
    private registrationService: EventRegistrationService,
    private recommendationService: EventRecommendationService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadEvents();
    this.loadUserRegistrations();
    this.loadRecommendations();
  }

  loadRecommendations(): void {
    this.recommendationsLoading = true;
    this.recommendationService.getRecommendations(this.MOCK_USER_ID).subscribe({
      next: (recs: RecommendedEvent[]) => {
        this.recommendedEvents = recs;
        this.recommendationsLoading = false;
        this.cdr.markForCheck();
      },
      error: (err: unknown) => {
        console.warn('AI recommendations unavailable, using fallback:', err);
        this.recommendationsLoading = false;
        this.cdr.markForCheck();
      }
    });
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
        this.loadWaitlistPositions();
        this.cdr.markForCheck();
      },
      error: (err: unknown) => {
        console.error('Failed to load registrations:', err);
      }
    });
  }

  loadWaitlistPositions(): void {
    const waitlisted = this.userRegistrations.filter(r => r.status === 'WAITLISTED' && r.id);
    waitlisted.forEach(r => {
      this.registrationService.getWaitlistPosition(r.id!).subscribe({
        next: (data) => {
          const eventId = r.event?.id ?? r.eventId;
          if (eventId) this.waitlistPositions.set(eventId, data.position);
          this.cdr.markForCheck();
        },
        error: () => {}
      });
    });
  }

  getWaitlistPosition(eventId: number): number | null {
    return this.waitlistPositions.get(eventId) ?? null;
  }

  getCapacityPercent(event: Event): number {
    if (!event.maxAttendees) return 0;
    return Math.min(100, Math.round(((event.currentAttendees || 0) / event.maxAttendees) * 100));
  }

  getCapacityColor(event: Event): string {
    const pct = this.getCapacityPercent(event);
    if (pct >= 90) return '#ef4444';
    if (pct >= 60) return '#f97316';
    return '#16a34a';
  }

  // --- Registration Actions ---

  registerForEvent(event: Event): void {
    if (this.isRegistered(event.id) || this.isWaitlisted(event.id) || this.registrationLoading.has(event.id)) return;

    this.pendingRegistrationEvent = event;
    this.confirmRegistration();
  }

  confirmRegistration(): void {
    const event = this.pendingRegistrationEvent;
    if (!event) return;

    this.registrationLoading.add(event.id);
    this.cdr.markForCheck();

    const registration: Partial<EventRegistration> = {
      userId: this.MOCK_USER_ID,
      userName: this.userName,
      userEmail: this.userEmail,
      phoneNumber: this.authService.currentUser?.['numTel'] || undefined
    };

    this.registrationService.register(event.id, registration).subscribe({
      next: (created: EventRegistration) => {
        created.eventId = event.id;

        if (created.status === 'WAITLISTED' && created.id) {
          // Fetch position first, then show badge — avoids the ⏳⏳ flash
          this.registrationService.getWaitlistPosition(created.id).subscribe({
            next: (data) => {
              this.waitlistPositions.set(event.id, data.position);
              this.userRegistrations.push(created);
              this.registrationLoading.delete(event.id);
              this.showSuccessToast(event.title, 'waitlisted');
              this.cdr.markForCheck();
            },
            error: () => {
              this.userRegistrations.push(created);
              this.registrationLoading.delete(event.id);
              this.showSuccessToast(event.title, 'waitlisted');
              this.cdr.markForCheck();
            }
          });
        } else {
          this.userRegistrations.push(created);
          this.registrationLoading.delete(event.id);
          this.showSuccessToast(event.title, 'pending');
          this.cdr.markForCheck();
        }

        // Refresh only this event to get accurate currentAttendees without full reload
        this.eventService.getById(event.id).subscribe({
          next: (updated) => {
            const idx = this.events.findIndex(e => e.id === event.id);
            if (idx !== -1) this.events[idx] = updated;
            this.cdr.markForCheck();
          },
          error: () => {}
        });
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
    const eventTitle = this.events.find(e => e.id === eventId)?.title ?? '';

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
        this.showSuccessToast(eventTitle, 'cancelled');
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
      this.getEventIdFromRegistration(r) === eventId &&
      (r.status === 'REGISTERED' || r.status === 'CONFIRMED' || r.status === 'ATTENDED')
    );
  }

  isWaitlisted(eventId: number): boolean {
    return this.userRegistrations.some(r =>
      this.getEventIdFromRegistration(r) === eventId && r.status === 'WAITLISTED'
    );
  }

  isPending(eventId: number): boolean {
    return this.userRegistrations.some(r =>
      this.getEventIdFromRegistration(r) === eventId && r.status === 'PENDING'
    );
  }

  isRejected(eventId: number): boolean {
    return this.userRegistrations.some(r =>
      this.getEventIdFromRegistration(r) === eventId && r.status === 'REJECTED'
    );
  }

  getRegistration(eventId: number): EventRegistration | undefined {
    return this.userRegistrations.find(r => this.getEventIdFromRegistration(r) === eventId);
  }

  isEventCancelled(event: Event): boolean {
    return event.status === 'CANCELLED';
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
    let result = this.events.filter(e => e.isPublic !== false);
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
    const now = new Date();
    const activeStatuses = new Set(['REGISTERED', 'CONFIRMED', 'WAITLISTED']);
    const registeredEventIds = new Set(
      this.userRegistrations
        .filter(r => activeStatuses.has(r.status ?? ''))
        .map(r => this.getEventIdFromRegistration(r))
    );
    return this.events
      .filter(e => {
        const endDate = e.endDate ? new Date(e.endDate) : new Date(e.startDate);
        // Show upcoming registered events + cancelled events user was registered for
        if (e.status === 'CANCELLED') return registeredEventIds.has(e.id);
        if (e.status === 'DRAFT') return false;
        return registeredEventIds.has(e.id) && endDate >= now;
      });
  }

  get pendingEvents(): Event[] {
    const now = new Date();
    const pendingIds = new Set(
      this.userRegistrations
        .filter(r => r.status === 'PENDING')
        .map(r => this.getEventIdFromRegistration(r))
    );
    return this.filteredEvents.filter(e => {
      const endDate = e.endDate ? new Date(e.endDate) : new Date(e.startDate);
      return pendingIds.has(e.id) && endDate >= now;
    });
  }

  get pastEvents(): Event[] {
    const now = new Date();
    return this.filteredEvents
      .filter(e => {
        const endDate = e.endDate ? new Date(e.endDate) : new Date(e.startDate);
        return e.status === 'COMPLETED' || endDate < now;
      });
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
    const isVisible = (e: Event) => e.status !== 'DRAFT' && e.status !== 'CANCELLED' && e.isPublic !== false;

    // 1. Check for a currently live event (now is between startDate and endDate)
    const liveEvent = this.events.find(e => {
      if (!isVisible(e)) return false;
      const start = new Date(e.startDate);
      const end = e.endDate ? new Date(e.endDate) : new Date(start.getTime() + 60 * 60000);
      return now >= start && now <= end;
    });
    if (liveEvent) return liveEvent;

    // 2. Fall back to explicitly featured event (must be upcoming, not past)
    const featured = this.events.find(e => isVisible(e) && e.isFeatured && new Date(e.startDate) > now);
    if (featured) return featured;

    // 3. Fall back to the nearest upcoming event
    return this.events
      .filter(e => isVisible(e) && new Date(e.startDate) > now)
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
    const now = new Date();
    return this.filteredEvents
      .filter(e => {
        if (e.status === 'DRAFT' || e.status === 'CANCELLED' || e.status === 'COMPLETED') return false;
        const endDate = e.endDate ? new Date(e.endDate) : new Date(e.startDate);
        const notPast = endDate >= now;
        return notPast && (!featured || e.id !== featured.id);
      });
  }

  get paginatedUpcomingEvents() {
    const start = (this.currentPage['Explore'] - 1) * this.pageSize;
    return this.upcomingEvents.slice(start, start + this.pageSize);
  }

  get paginatedGoingEvents() {
    const start = (this.currentPage['Going'] - 1) * this.pageSize;
    return this.goingEvents.slice(start, start + this.pageSize);
  }

  get paginatedPastEvents() {
    const start = (this.currentPage['Past'] - 1) * this.pageSize;
    return this.pastEvents.slice(start, start + this.pageSize);
  }

  getTotalPages(tab: string): number {
    let total = 0;
    if (tab === 'Explore') total = this.upcomingEvents.length;
    else if (tab === 'Going') total = this.goingEvents.length;
    else if (tab === 'Past') total = this.pastEvents.length;
    return Math.ceil(total / this.pageSize) || 1;
  }

  getPageNumbers(tab: string): number[] {
    const total = this.getTotalPages(tab);
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  goToPage(tab: string, page: number): void {
    const total = this.getTotalPages(tab);
    if (page >= 1 && page <= total) {
      this.currentPage[tab] = page;
    }
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

  formatTime(dateStr: string): string {
    try {
      return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    } catch { return ''; }
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

  // --- QR Code Modal ---

  activeQrRegistration: EventRegistration | null = null;

  showQrCode(eventId: number): void {
    const reg = this.getRegistration(eventId);
    if (reg?.checkInCode) {
      this.activeQrRegistration = reg;
      this.cdr.markForCheck();
    }
  }

  closeQrCode(): void {
    this.activeQrRegistration = null;
    this.cdr.markForCheck();
  }

  getQrCodeUrl(code: string): string {
    return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(code)}`;
  }

  getRegistrationForEvent(eventId: number): EventRegistration | undefined {
    return this.userRegistrations.find(r => r.eventId === eventId);
  }

  getRatingForEvent(eventId: number): number {
    const reg = this.getRegistrationForEvent(eventId);
    return reg?.rating || 0;
  }

  rateEvent(eventId: number, rating: number): void {
    const reg = this.getRegistrationForEvent(eventId);
    if (!reg || this.ratingLoading.has(eventId)) return;

    this.ratingLoading.add(eventId);
    this.cdr.markForCheck();

    this.registrationService.rateEvent(reg.id!, rating).subscribe({
      next: (updated) => {
        // Update the local registration
        const idx = this.userRegistrations.findIndex(r => r.id === reg.id);
        if (idx >= 0) this.userRegistrations[idx] = updated;
        this.ratingLoading.delete(eventId);
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to rate event:', err);
        this.ratingLoading.delete(eventId);
        this.cdr.markForCheck();
      }
    });
  }

  // ─── Calendar Modal ─────────────────────────────────────────────

  openCalendar(): void {
    this.calendarDate = new Date();
    this.selectedDay = null;
    this.selectedDayEvents = [];
    this.buildCalendarDays();
    this.showCalendar = true;
    this.cdr.markForCheck();
  }

  closeCalendar(): void {
    this.showCalendar = false;
    this.cdr.markForCheck();
  }

  calendarPrevMonth(): void {
    this.calendarDate = new Date(this.calendarDate.getFullYear(), this.calendarDate.getMonth() - 1, 1);
    this.selectedDay = null;
    this.selectedDayEvents = [];
    this.buildCalendarDays();
  }

  calendarNextMonth(): void {
    this.calendarDate = new Date(this.calendarDate.getFullYear(), this.calendarDate.getMonth() + 1, 1);
    this.selectedDay = null;
    this.selectedDayEvents = [];
    this.buildCalendarDays();
  }

  get calendarMonthLabel(): string {
    return this.calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  selectDay(day: { date: Date; events: Event[] }): void {
    this.selectedDay = day.date;
    this.selectedDayEvents = day.events;
    this.cdr.markForCheck();
  }

  private buildCalendarDays(): void {
    const year = this.calendarDate.getFullYear();
    const month = this.calendarDate.getMonth();
    const today = new Date();

    // Get registered event IDs
    const registeredIds = new Set(this.userRegistrations.map(r => this.getEventIdFromRegistration(r)));

    // Build a map: "YYYY-MM-DD" → Event[]
    const eventsByDate = new Map<string, Event[]>();
    for (const event of this.events) {
      if (!registeredIds.has(event.id)) continue;  // Only show events user is going to
      const startDate = event.startDate ? new Date(event.startDate) : null;
      if (!startDate) continue;
      const key = `${startDate.getFullYear()}-${startDate.getMonth()}-${startDate.getDate()}`;
      if (!eventsByDate.has(key)) eventsByDate.set(key, []);
      eventsByDate.get(key)!.push(event);
    }

    // First day of month and padding
    const firstDay = new Date(year, month, 1);
    const startPad = firstDay.getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: typeof this.calendarDays = [];

    // Previous month padding
    for (let i = startPad - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, daysInPrevMonth - i);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      days.push({
        date: d,
        events: eventsByDate.get(key) || [],
        isCurrentMonth: false,
        isToday: false
      });
    }

    // Current month
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      days.push({
        date: d,
        events: eventsByDate.get(key) || [],
        isCurrentMonth: true,
        isToday: d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()
      });
    }

    // Next month padding (fill to 42 = 6 rows)
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      days.push({
        date: d,
        events: eventsByDate.get(key) || [],
        isCurrentMonth: false,
        isToday: false
      });
    }

    this.calendarDays = days;
    this.cdr.markForCheck();
  }

  isSameDay(a: Date, b: Date): boolean {
    return a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
  }
}
