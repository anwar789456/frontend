import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SessionService } from '../../../user/sessionreservation/services/session.service';
import { Session, SessionStatus } from '../../../user/sessionreservation/models/sessionReservation.model';

@Component({
  selector: 'app-admin-sessions',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './sessions.component.html'
})
export class AdminSessionsComponent implements OnInit {
  stats = [
    { label: 'Active Exams', value: '—', sub: 'Loading...', valueColor: 'text-[#38a9f3]' },
    { label: 'Certificates Issued', value: '—', sub: '', valueColor: 'text-[#0f1419]' },
    { label: 'Avg Pass Rate', value: '—', sub: '', valueColor: 'text-[#0f1419]' },
    { label: 'Total Sessions', value: '—', sub: '', valueColor: 'text-[#0f1419]' }
  ];

  tabs = ['All Sessions', 'Upcoming', 'Completed', 'Missed'];
  activeTab = 'All Sessions';

  sessions: Session[] = [];
  filteredSessions: Session[] = [];
  selectedSession: Session | null = null;
  isLoading = true;
  errorMessage = '';

  // CRUD state
  showSessionForm = false;
  editingSession: Session | null = null;
  sessionForm!: FormGroup;
  sessionStatuses = Object.values(SessionStatus);

  constructor(
    private sessionService: SessionService,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadSessions();
  }

  private initForm(): void {
    this.sessionForm = this.fb.group({
      title: ['', Validators.required],
      level: [''],
      date: ['', Validators.required],
      time: ['', Validators.required],
      duration: ['', Validators.required],
      readinessScore: [0, [Validators.min(0), Validators.max(100)]],
      status: [SessionStatus.UPCOMING, Validators.required],
      image: [''],
      tip: ['']
    });
  }

  loadSessions(): void {
    this.isLoading = true;
    this.sessionService.getAllSessions().subscribe({
      next: (data) => {
        this.sessions = data;
        this.filterSessions();
        this.updateStats();
        if (data.length > 0) this.selectedSession = data[0];
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load sessions:', err);
        this.errorMessage = 'Failed to load sessions.';
        this.isLoading = false;
      }
    });
  }

  filterSessions(): void {
    if (this.activeTab === 'All Sessions') {
      this.filteredSessions = this.sessions;
    } else {
      const statusMap: Record<string, string> = {
        'Upcoming': 'UPCOMING', 'Completed': 'COMPLETED', 'Missed': 'MISSED'
      };
      this.filteredSessions = this.sessions.filter(s => s.status === statusMap[this.activeTab]);
    }
  }

  setTab(tab: string): void {
    this.activeTab = tab;
    this.filterSessions();
  }

  updateStats(): void {
    const upcoming = this.sessions.filter(s => s.status === 'UPCOMING').length;
    const completed = this.sessions.filter(s => s.status === 'COMPLETED').length;
    this.stats = [
      { label: 'Upcoming', value: String(upcoming), sub: 'Scheduled sessions', valueColor: 'text-[#38a9f3]' },
      { label: 'Completed', value: String(completed), sub: 'Finished sessions', valueColor: 'text-[#0f1419]' },
      { label: 'Missed', value: String(this.sessions.filter(s => s.status === 'MISSED').length), sub: '', valueColor: 'text-[#0f1419]' },
      { label: 'Total Sessions', value: String(this.sessions.length), sub: '', valueColor: 'text-[#0f1419]' }
    ];
  }

  selectSession(session: Session): void {
    this.selectedSession = session;
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'UPCOMING': return 'bg-blue-100 text-blue-600';
      case 'COMPLETED': return 'bg-green-100 text-green-600';
      case 'MISSED': return 'bg-red-100 text-red-500';
      default: return 'bg-gray-100 text-gray-500';
    }
  }

  // ── CRUD ──

  openCreateSession(): void {
    this.editingSession = null;
    this.sessionForm.reset({
      title: '', level: '', date: '', time: '', duration: '',
      readinessScore: 0, status: SessionStatus.UPCOMING, image: '', tip: ''
    });
    this.showSessionForm = true;
  }

  openEditSession(session: Session): void {
    this.editingSession = session;
    this.sessionForm.patchValue({
      title: session.title, level: session.level,
      date: session.date, time: session.time, duration: session.duration,
      readinessScore: session.readinessScore, status: session.status,
      image: session.image, tip: session.tip
    });
    this.showSessionForm = true;
  }

  cancelSessionForm(): void {
    this.showSessionForm = false;
    this.editingSession = null;
  }

  saveSession(): void {
    if (this.sessionForm.invalid) return;
    const formVal = this.sessionForm.value;

    if (this.editingSession && this.editingSession.id) {
      this.sessionService.updateSession(this.editingSession.id, formVal).subscribe({
        next: () => { this.showSessionForm = false; this.editingSession = null; this.loadSessions(); },
        error: (err) => console.error('Failed to update session:', err)
      });
    } else {
      this.sessionService.createSession(formVal).subscribe({
        next: () => { this.showSessionForm = false; this.loadSessions(); },
        error: (err) => console.error('Failed to create session:', err)
      });
    }
  }

  deleteSession(session: Session): void {
    if (!session.id) return;
    if (!confirm(`Delete session "${session.title}"?`)) return;
    this.sessionService.deleteSession(session.id).subscribe({
      next: () => {
        if (this.selectedSession?.id === session.id) this.selectedSession = null;
        this.loadSessions();
      },
      error: (err) => console.error('Failed to delete session:', err)
    });
  }
}
