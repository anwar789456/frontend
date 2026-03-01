import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { SessionService } from '../../services/session.service';
import { Session, Certification, PracticeItem } from '../../models/sessionReservation.model';

@Component({
  selector: 'app-sessions',
  standalone: true,
  templateUrl: './sessions.component.html',
  styles: [`
    @keyframes fadeInUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes popIn { 0% { opacity: 0; transform: scale(0.7); } 60% { transform: scale(1.05); } 100% { opacity: 1; transform: scale(1); } }
    @keyframes bounceIn { 0% { opacity: 0; transform: scale(0.3); } 50% { transform: scale(1.08); } 70% { transform: scale(0.95); } 100% { opacity: 1; transform: scale(1); } }
    @keyframes slideInLeft { from { opacity: 0; transform: translateX(-40px); } to { opacity: 1; transform: translateX(0); } }
    @keyframes slideInRight { from { opacity: 0; transform: translateX(40px); } to { opacity: 1; transform: translateX(0); } }
    @keyframes wiggle { 0%,100% { transform: rotate(0deg); } 25% { transform: rotate(-6deg); } 75% { transform: rotate(6deg); } }
    @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
    @keyframes pulse-glow { 0%,100% { box-shadow: 0 0 0 0 rgba(56,169,243,0.3); } 50% { box-shadow: 0 0 16px 4px rgba(56,169,243,0.2); } }
    .anim-fade-up { animation: fadeInUp 0.5s ease-out both; }
    .anim-pop { animation: popIn 0.4s ease-out both; }
    .anim-bounce { animation: bounceIn 0.6s ease-out both; }
    .anim-slide-left { animation: slideInLeft 0.5s ease-out both; }
    .anim-slide-right { animation: slideInRight 0.5s ease-out both; }
    .anim-wiggle:hover { animation: wiggle 0.4s ease-in-out; }
    .anim-float { animation: float 3s ease-in-out infinite; }
    .anim-pulse-glow { animation: pulse-glow 2s ease-in-out infinite; }
    .anim-delay-1 { animation-delay: 0.1s; }
    .anim-delay-2 { animation-delay: 0.2s; }
    .anim-delay-3 { animation-delay: 0.3s; }
    .anim-delay-4 { animation-delay: 0.4s; }
    .anim-delay-5 { animation-delay: 0.5s; }
    .hover-grow { transition: transform 0.2s ease; }
    .hover-grow:hover { transform: scale(1.03); }
  `]
})
export class SessionsComponent implements OnInit {
  sessions: Session[] = [];
  certifications: Certification[] = [];
  practiceItems: PracticeItem[] = [];
  isLoading = true;
  errorMessage = '';

  constructor(
    private sessionService: SessionService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadSessions();
    this.loadCertifications();
    this.loadPracticeItems();
  }

  private loadSessions(): void {
    this.sessionService.getAllSessions().subscribe({
      next: (data) => {
        this.sessions = data;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load sessions:', err);
        this.errorMessage = 'Failed to load sessions. Please try again later.';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private loadCertifications(): void {
    this.sessionService.getAllCertifications().subscribe({
      next: (data) => {
        this.certifications = data;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load certifications:', err);
      }
    });
  }

  private loadPracticeItems(): void {
    this.sessionService.getAllPracticeItems().subscribe({
      next: (data) => {
        this.practiceItems = data;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load practice items:', err);
      }
    });
  }
}