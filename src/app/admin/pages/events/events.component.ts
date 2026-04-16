import { Component, OnInit, ChangeDetectorRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Event, EventStatus, TargetLevel } from '../../../user/event/models/event.model';
import { EventRegistration } from '../../../user/event/models/event-registration.model';
import { EventService } from '../../../user/event/services/event.service';
import { EventRegistrationService } from '../../../user/event/services/event-registration.service';
import { UserService } from '../../../user/user/services/user.service';
import { User } from '../../../user/user/models/user.model';
import * as L from 'leaflet';

@Component({
  selector: 'app-admin-events',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './events.component.html'
})
export class AdminEventsComponent implements OnInit, AfterViewChecked {
  events: Event[] = [];
  isLoading = true;
  error: string | null = null;

  tabs = ['All Events', 'Upcoming', 'Past', 'Drafts', 'Approvals'];
  activeTab = 'All Events';

  selectedEvent: Event | null = null;

  // Modal state
  showModal = false;
  isEditing = false;
  isSaving = false;
  showDeleteConfirm = false;
  isDeleting = false;
  isGeneratingDescription = false;

  // Map state
  private map: L.Map | null = null;
  private marker: L.Marker | null = null;
  private mapInitialized = false;
  mapSearchQuery = '';

  // Form model
  formData: Partial<Event> = {};
  formErrors: { [key: string]: string } = {};
  formSubmitted = false;

  get errorCount(): number {
    return Object.keys(this.formErrors).length;
  }


  eventStatuses: EventStatus[] = ['DRAFT', 'UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED'];
  targetLevels: TargetLevel[] = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ALL_LEVELS'];

  // Admin users for host dropdown
  adminUsers: User[] = [];

  // Approval state
  pendingRegistrations: EventRegistration[] = [];
  pendingLoading = false;
  approvalActionLoading: Set<number> = new Set();

  // Bulk selection
  selectedIds: Set<number> = new Set();
  isBulkLoading = false;

  // Announcement modal
  showAnnouncementModal = false;
  announcementSubject = '';
  announcementMessage = '';
  isSendingAnnouncement = false;

  // Rating state
  selectedEventAvgRating: number | null = null;
  selectedEventRatingCount = 0;

  // QR Check-in state
  showCheckInModal = false;
  checkInCode = '';
  checkInLoading = false;
  checkInResult: { success: boolean; message: string } | null = null;

  constructor(
    private eventService: EventService,
    private registrationService: EventRegistrationService,
    private userService: UserService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadEvents();
    this.loadPendingRegistrations();
    this.loadAdminUsers();
    this.fixLeafletIcons();
  }

  loadAdminUsers(): void {
    this.userService.getAllUsers().subscribe({
      next: (users: User[]) => {
        this.adminUsers = users.filter(u => u.role === 'ADMIN');
        this.cdr.markForCheck();
      },
      error: () => { /* silently fail — dropdown just stays empty */ }
    });
  }

  ngAfterViewChecked(): void {
    if (this.showModal && !this.mapInitialized) {
      const container = document.getElementById('locationMap');
      if (container) {
        this.initMap(container);
        this.mapInitialized = true;
      }
    }
  }

  private fixLeafletIcons(): void {
    const iconDefault = L.icon({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });
    L.Marker.prototype.options.icon = iconDefault;
  }

  loadEvents(): void {
    this.isLoading = true;
    this.error = null;
    this.eventService.getAll().subscribe({
      next: (data: Event[]) => {
        this.events = data.sort((a, b) =>
          new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
        );
        if (this.events.length > 0 && !this.selectedEvent) {
          this.selectedEvent = this.events[0];
        }
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (err: unknown) => {
        console.error('Failed to load events:', err);
        this.error = 'Failed to load events.';
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  // --- Approval Methods ---

  loadPendingRegistrations(): void {
    this.pendingLoading = true;
    this.registrationService.getPending().subscribe({
      next: (data) => {
        this.pendingRegistrations = data;
        this.pendingLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.pendingLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  approveRegistration(id: number): void {
    if (this.approvalActionLoading.has(id)) return;
    this.approvalActionLoading.add(id);
    this.cdr.markForCheck();
    this.registrationService.approve(id).subscribe({
      next: () => {
        this.pendingRegistrations = this.pendingRegistrations.filter(r => r.id !== id);
        this.approvalActionLoading.delete(id);
        this.cdr.markForCheck();
      },
      error: () => {
        this.approvalActionLoading.delete(id);
        this.cdr.markForCheck();
      }
    });
  }

  rejectRegistration(id: number): void {
    if (this.approvalActionLoading.has(id)) return;
    this.approvalActionLoading.add(id);
    this.cdr.markForCheck();
    this.registrationService.reject(id).subscribe({
      next: () => {
        this.pendingRegistrations = this.pendingRegistrations.filter(r => r.id !== id);
        this.approvalActionLoading.delete(id);
        this.cdr.markForCheck();
      },
      error: () => {
        this.approvalActionLoading.delete(id);
        this.cdr.markForCheck();
      }
    });
  }

  getEventTitleForRegistration(reg: EventRegistration): string {
    return this.events.find(e => e.id === reg.eventId)?.title ?? `Event #${reg.eventId}`;
  }

  // --- Stats ---
  get stats() {
    const now = new Date();
    const upcoming = this.events.filter(e => e.status === 'UPCOMING' || new Date(e.startDate) > now);
    const totalAttendees = this.events.reduce((sum, e) => sum + (e.currentAttendees || 0), 0);
    const totalCapacity = this.events.reduce((sum, e) => sum + (e.maxAttendees || 0), 0);
    const avgAttendance = totalCapacity > 0 ? Math.round((totalAttendees / totalCapacity) * 100) : 0;

    return [
      { label: 'Upcoming Events', value: `${upcoming.length}`, sub: upcoming.length > 0 ? 'Active' : 'None planned', valueColor: 'text-[#38a9f3]' },
      { label: 'Total Registrations', value: `${totalAttendees.toLocaleString()}`, sub: `Across ${this.events.length} events`, valueColor: 'text-[#0f1419]' },
      { label: 'Avg Attendance', value: `${avgAttendance}%`, sub: avgAttendance >= 70 ? '⊘ Very High' : avgAttendance >= 40 ? '⊘ Moderate' : '⊘ Low', valueColor: 'text-[#0f1419]' },
      { label: 'Total Events', value: `${this.events.length}`, sub: 'All time', valueColor: 'text-[#0f1419]' }
    ];
  }

  // --- Tab filtering ---
  get filteredEvents(): Event[] {
    const now = new Date();
    switch (this.activeTab) {
      case 'Upcoming':
        return this.events.filter(e => e.status === 'UPCOMING' || (e.status !== 'COMPLETED' && e.status !== 'CANCELLED' && e.status !== 'DRAFT' && new Date(e.startDate) > now));
      case 'Past':
        return this.events.filter(e => e.status === 'COMPLETED' || (e.status !== 'DRAFT' && new Date(e.endDate || e.startDate) < now));
      case 'Drafts':
        return this.events.filter(e => e.status === 'DRAFT');
      default:
        return this.events;
    }
  }

  // --- Status helpers ---
  getStatusLabel(event: Event): string {
    const now = new Date();
    const start = new Date(event.startDate);
    const end = event.endDate ? new Date(event.endDate) : new Date(start.getTime() + 60 * 60000);

    if (event.status === 'DRAFT') return 'Draft';
    if (event.status === 'CANCELLED') return 'Cancelled';
    if (now >= start && now <= end) return 'Ongoing';
    if (now > end || event.status === 'COMPLETED') return 'Past';
    return 'Upcoming';
  }

  getStatusColor(event: Event): string {
    const label = this.getStatusLabel(event);
    switch (label) {
      case 'Live Now': return 'bg-blue-100 text-blue-600';
      case 'Upcoming': return 'bg-green-100 text-green-600';
      case 'Past': return 'bg-gray-100 text-gray-500';
      case 'Draft': return 'bg-yellow-100 text-yellow-600';
      case 'Cancelled': return 'bg-red-100 text-red-500';
      default: return 'bg-gray-100 text-gray-500';
    }
  }

  getEventIcon(_event: Event): string {
    return '📍'; // Always outdoor
  }

  // --- Selection ---
  selectEvent(event: Event): void {
    this.selectedEvent = event;
    this.selectedEventAvgRating = null;
    this.selectedEventRatingCount = 0;
    this.registrationService.getAvgRating(event.id).subscribe({
      next: (data) => {
        this.selectedEventAvgRating = data.avg;
        this.selectedEventRatingCount = data.count;
        this.cdr.markForCheck();
      },
      error: () => {}
    });
  }

  // --- CRUD: Create ---
  openCreateModal(): void {
    this.isEditing = false;
    this.formData = {
      title: '',
      description: '',
      image: '',
      category: '',
      startDate: '',
      endDate: '',
      location: '',
      maxAttendees: 100,
      isFeatured: false,
      isPublic: true,
      hostName: '',
      contactEmail: '',
      targetLevel: 'ALL_LEVELS',
      skillFocus: '',
      isRegistrationOpen: true,
      tags: []
    };
    this.formErrors = {};
    this.formSubmitted = false;
    this.mapSearchQuery = '';
    this.mapInitialized = false;
    this.showModal = true;
  }

  // --- CRUD: Edit ---
  openEditModal(event: Event): void {
    this.isEditing = true;
    const { currentAttendees, ...rest } = event as any;
    this.formData = { ...rest, tags: event.tags ? [...event.tags] : [] };
    this.formErrors = {};
    this.formSubmitted = false;
    this.mapSearchQuery = '';
    this.mapInitialized = false;
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.formData = {};
    this.formErrors = {};
    this.formSubmitted = false;
    this.mapSearchQuery = '';
    this.destroyMap();
  }

  validateForm(): boolean {
    this.formErrors = {};

    // Title
    if (!this.formData.title || !this.formData.title.trim()) {
      this.formErrors['title'] = 'Title is required.';
    } else if (this.formData.title.trim().length < 3) {
      this.formErrors['title'] = 'Title must be at least 3 characters.';
    }

    // Description
    if (!this.formData.description || !this.formData.description.trim()) {
      this.formErrors['description'] = 'Description is required.';
    } else if (this.formData.description.trim().length < 10) {
      this.formErrors['description'] = 'Description must be at least 10 characters.';
    }

    // Start date
    if (!this.formData.startDate) {
      this.formErrors['startDate'] = 'Start date is required.';
    } else if (!this.isEditing && new Date(this.formData.startDate) < new Date()) {
      this.formErrors['startDate'] = 'Start date cannot be in the past.';
    }

    // End date required
    if (!this.formData.endDate) {
      this.formErrors['endDate'] = 'End date is required.';
    } else if (this.formData.startDate && new Date(this.formData.endDate) <= new Date(this.formData.startDate)) {
      this.formErrors['endDate'] = 'End date must be after start date.';
    }

    // Max attendees
    if (this.formData.maxAttendees != null && this.formData.maxAttendees < 1) {
      this.formErrors['maxAttendees'] = 'Max attendees must be at least 1.';
    }

    // Location required
    if (!this.formData.location || !this.formData.location.trim()) {
      this.formErrors['location'] = 'Location is required.';
    }

    // Contact email format
    if (this.formData.contactEmail && this.formData.contactEmail.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(this.formData.contactEmail.trim())) {
        this.formErrors['contactEmail'] = 'Invalid email format.';
      }
    }

    this.cdr.markForCheck();
    return Object.keys(this.formErrors).length === 0;
  }

  saveEvent(): void {
    this.formSubmitted = true;
    if (!this.validateForm()) return;

    this.isSaving = true;
    const eventData = { ...this.formData } as Event;

    // Auto-calculate status from dates
    const now = new Date();
    const startDt = new Date(eventData.startDate);
    const endDt = eventData.endDate ? new Date(eventData.endDate) : null;
    if (now >= startDt && endDt && now <= endDt) {
      eventData.status = 'ONGOING';
    } else if (endDt && now > endDt) {
      eventData.status = 'COMPLETED';
    } else {
      eventData.status = 'UPCOMING';
    }

    const obs = this.isEditing
      ? this.eventService.update(eventData.id, eventData)
      : this.eventService.create(eventData);

    obs.subscribe({
      next: () => {
        this.showModal = false;
        this.isSaving = false;
        this.formData = {};
        this.selectedEvent = null;
        this.loadEvents();
        this.cdr.markForCheck();
      },
      error: (err: unknown) => {
        console.error('Failed to save event:', err);
        this.isSaving = false;
        this.cdr.markForCheck();
      }
    });
  }

  // --- Bulk Actions ---
  toggleSelection(id: number): void {
    this.selectedIds.has(id) ? this.selectedIds.delete(id) : this.selectedIds.add(id);
    this.cdr.markForCheck();
  }

  toggleSelectAll(): void {
    if (this.selectedIds.size === this.filteredEvents.length) {
      this.selectedIds.clear();
    } else {
      this.filteredEvents.forEach(e => this.selectedIds.add(e.id));
    }
    this.cdr.markForCheck();
  }

  bulkDraft(): void {
    if (!this.selectedIds.size || this.isBulkLoading) return;
    this.isBulkLoading = true;
    this.eventService.bulkDraft(Array.from(this.selectedIds)).subscribe({
      next: () => { this.selectedIds.clear(); this.isBulkLoading = false; this.loadEvents(); this.cdr.markForCheck(); },
      error: () => { this.isBulkLoading = false; this.cdr.markForCheck(); }
    });
  }

  bulkCancel(): void {
    if (!this.selectedIds.size || this.isBulkLoading) return;
    this.isBulkLoading = true;
    this.eventService.bulkCancel(Array.from(this.selectedIds)).subscribe({
      next: () => { this.selectedIds.clear(); this.isBulkLoading = false; this.loadEvents(); this.cdr.markForCheck(); },
      error: () => { this.isBulkLoading = false; this.cdr.markForCheck(); }
    });
  }

  // --- Export CSV ---
  exportAttendeesCSV(): void {
    if (!this.selectedEvent) return;
    this.registrationService.getByEvent(this.selectedEvent.id).subscribe({
      next: (regs) => {
        const rows = [
          ['Name', 'Email', 'Status', 'Phone', 'Registered At'],
          ...regs.map(r => [
            r.userName || '', r.userEmail || '', r.status || '',
            r.phoneNumber || '', r.registrationDate || ''
          ])
        ];
        const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.selectedEvent!.title}-attendees.csv`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: (err: unknown) => console.error('Failed to export:', err)
    });
  }

  // --- Announcement ---
  openAnnouncementModal(): void {
    this.announcementSubject = '';
    this.announcementMessage = '';
    this.showAnnouncementModal = true;
  }

  closeAnnouncementModal(): void {
    this.showAnnouncementModal = false;
  }

  sendAnnouncement(): void {
    if (!this.selectedEvent || !this.announcementSubject.trim() || !this.announcementMessage.trim()) return;
    this.isSendingAnnouncement = true;
    this.registrationService.sendAnnouncement(this.selectedEvent.id, this.announcementSubject, this.announcementMessage).subscribe({
      next: () => { this.isSendingAnnouncement = false; this.showAnnouncementModal = false; this.cdr.markForCheck(); },
      error: () => { this.isSendingAnnouncement = false; this.cdr.markForCheck(); }
    });
  }

  // --- CRUD: Undraft ---
  undraftEvent(): void {
    if (!this.selectedEvent) return;
    this.eventService.undraft(this.selectedEvent.id).subscribe({
      next: () => {
        this.selectedEvent = null;
        this.loadEvents();
        this.cdr.markForCheck();
      },
      error: (err: unknown) => {
        console.error('Failed to publish event:', err);
        this.cdr.markForCheck();
      }
    });
  }

  uncancelEvent(): void {
    if (!this.selectedEvent) return;
    this.eventService.uncancel(this.selectedEvent.id).subscribe({
      next: () => {
        this.selectedEvent = null;
        this.loadEvents();
        this.cdr.markForCheck();
      },
      error: (err: unknown) => {
        console.error('Failed to uncancel event:', err);
        this.cdr.markForCheck();
      }
    });
  }

  // --- CRUD: Draft (soft-delete) ---
  confirmDelete(): void {
    this.showDeleteConfirm = true;
  }

  cancelDelete(): void {
    this.showDeleteConfirm = false;
  }

  deleteEvent(): void {
    if (!this.selectedEvent) return;
    this.isDeleting = true;
    this.eventService.draft(this.selectedEvent.id).subscribe({
      next: () => {
        this.showDeleteConfirm = false;
        this.isDeleting = false;
        this.selectedEvent = null;
        this.loadEvents();
        this.cdr.markForCheck();
      },
      error: (err: unknown) => {
        console.error('Failed to move event to drafts:', err);
        this.isDeleting = false;
        this.cdr.markForCheck();
      }
    });
  }

  // --- Map Methods ---
  private initMap(container: HTMLElement): void {
    // Default center: Tunisia
    const defaultLat = this.formData.latitude || 36.8;
    const defaultLng = this.formData.longitude || 10.18;
    const defaultZoom = this.formData.latitude ? 15 : 7;

    this.map = L.map(container).setView([defaultLat, defaultLng], defaultZoom);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(this.map);

    // If editing and has coordinates, place marker
    if (this.formData.latitude && this.formData.longitude) {
      this.marker = L.marker([this.formData.latitude, this.formData.longitude]).addTo(this.map);
      if (this.formData.location) {
        this.marker.bindPopup(this.formData.location).openPopup();
      }
    }

    this.map.on('click', (e: L.LeafletMouseEvent) => this.onMapClick(e));

    // Fix map rendering in modal
    setTimeout(() => this.map?.invalidateSize(), 200);
  }

  private onMapClick(e: L.LeafletMouseEvent): void {
    const { lat, lng } = e.latlng;

    if (this.marker) {
      this.marker.setLatLng([lat, lng]);
    } else if (this.map) {
      this.marker = L.marker([lat, lng]).addTo(this.map);
    }

    this.formData.latitude = lat;
    this.formData.longitude = lng;
    this.reverseGeocode(lat, lng);
  }

  private reverseGeocode(lat: number, lng: number): void {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;

    fetch(url, { headers: { 'Accept-Language': 'en' } })
      .then(res => res.json())
      .then((data: any) => {
        const address = data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        this.formData.location = address;
        if (this.marker) {
          this.marker.bindPopup(address).openPopup();
        }
        if (this.formErrors['location']) {
          delete this.formErrors['location'];
        }
        this.cdr.markForCheck();
      })
      .catch(() => {
        this.formData.location = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        this.cdr.markForCheck();
      });
  }

  searchLocation(): void {
    const query = this.mapSearchQuery?.trim();
    if (!query) return;

    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;

    fetch(url, { headers: { 'Accept-Language': 'en' } })
      .then(res => res.json())
      .then((results: any[]) => {
        if (results.length > 0) {
          const result = results[0];
          const lat = parseFloat(result.lat);
          const lng = parseFloat(result.lon);

          this.map?.setView([lat, lng], 16);

          if (this.marker) {
            this.marker.setLatLng([lat, lng]);
          } else if (this.map) {
            this.marker = L.marker([lat, lng]).addTo(this.map);
          }

          this.formData.latitude = lat;
          this.formData.longitude = lng;
          this.formData.location = result.display_name;

          if (this.marker) {
            this.marker.bindPopup(result.display_name).openPopup();
          }
          if (this.formErrors['location']) {
            delete this.formErrors['location'];
          }
          this.cdr.markForCheck();
        }
      })
      .catch(() => { });
  }

  clearLocation(): void {
    this.formData.location = '';
    this.formData.latitude = undefined;
    this.formData.longitude = undefined;
    if (this.marker && this.map) {
      this.map.removeLayer(this.marker);
      this.marker = null;
    }
    this.cdr.markForCheck();
  }

  private destroyMap(): void {
    if (this.map) {
      this.map.remove();
      this.map = null;
      this.marker = null;
      this.mapInitialized = false;
    }
  }

  // --- Helpers ---
  formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
      });
    } catch { return dateStr; }
  }

  getCapacityPercent(event: Event): number {
    if (!event.maxAttendees) return 0;
    return Math.round(((event.currentAttendees || 0) / event.maxAttendees) * 100);
  }

  // --- Auto-generate description from title ---
  generateDescription(): void {
    const title = this.formData.title?.trim();
    if (!title) return;

    this.isGeneratingDescription = true;

    const eventType = 'OUTDOOR';
    const level = this.formData.targetLevel || 'ALL_LEVELS';
    const skillFocus = this.formData.skillFocus?.trim();

    const levelMap: Record<string, string> = {
      'BEGINNER': 'beginners',
      'INTERMEDIATE': 'intermediate learners',
      'ADVANCED': 'advanced learners',
      'ALL_LEVELS': 'learners of all levels'
    };
    const levelText = levelMap[level] || 'learners of all levels';

    const typeText = 'in-person outdoor';

    const skillText = skillFocus ? ` focusing on ${skillFocus.toLowerCase()}` : '';

    const templates = [
      `Join us for "${title}", a ${typeText} event designed for ${levelText}${skillText}. This interactive session will help you improve your English skills in an engaging and supportive environment. Don't miss this opportunity to learn and connect!`,
      `"${title}" is an exciting ${typeText} event crafted for ${levelText}${skillText}. Whether you're looking to practice, learn new techniques, or simply connect with fellow learners, this event has something for everyone.`,
      `We're thrilled to announce "${title}" — a ${typeText} experience for ${levelText}${skillText}. Come ready to participate, engage, and grow your English proficiency in a fun and welcoming atmosphere.`
    ];

    const description = templates[Math.floor(Math.random() * templates.length)];

    // Simulate a brief delay for UX feel
    setTimeout(() => {
      this.formData.description = description;
      this.isGeneratingDescription = false;
      // Clear description error if it existed
      if (this.formErrors['description']) {
        delete this.formErrors['description'];
      }
      this.cdr.markForCheck();
    }, 400);
  }

  // Tags helper for form
  get tagsString(): string {
    return Array.isArray(this.formData.tags) ? this.formData.tags.join(', ') : '';
  }

  set tagsString(val: string) {
    this.formData.tags = val.split(',').map(t => t.trim()).filter(t => t);
  }

  // --- QR Check-in ---

  openCheckInModal(): void {
    this.showCheckInModal = true;
    this.checkInCode = '';
    this.checkInResult = null;
    this.checkInLoading = false;
  }

  closeCheckInModal(): void {
    this.showCheckInModal = false;
    this.checkInCode = '';
    this.checkInResult = null;
  }

  processCheckIn(): void {
    const code = this.checkInCode.trim();
    if (!code) return;

    this.checkInLoading = true;
    this.checkInResult = null;
    this.cdr.markForCheck();

    this.registrationService.checkIn(code).subscribe({
      next: (reg) => {
        this.checkInResult = {
          success: true,
          message: `✅ ${reg.userName || 'User'} checked in successfully!`
        };
        this.checkInLoading = false;
        this.checkInCode = '';
        // Refresh events to update attendee counts
        this.loadEvents();
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        const msg = err?.error?.error || 'Invalid or expired check-in code';
        this.checkInResult = {
          success: false,
          message: `❌ ${msg}`
        };
        this.checkInLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  onHostChange(hostName: string): void {
    const host = this.adminUsers.find(u => u.name === hostName);
    this.formData.contactEmail = host?.email ?? '';
  }
}
