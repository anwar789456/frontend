import {
  Component, OnInit, OnDestroy, ChangeDetectorRef
} from '@angular/core';
import { NgIf, NgFor } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AvatarService, AvatarSuggestion } from '../../services/avatar.service';
import { AuthService } from '../../services/auth.service';
import { Subscription } from 'rxjs';

interface MiniMessage {
  sender: 'user' | 'lingo';
  text: string;
}

@Component({
  selector: 'app-ai-avatar',
  standalone: true,
  imports: [NgIf, NgFor, FormsModule],
  styles: [`
    @keyframes floatBob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
    @keyframes pulse    { 0%,100%{opacity:1} 50%{opacity:.55} }
    @keyframes slideUp  { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
    .lingo-float { animation: floatBob 3s ease-in-out infinite; }
    .lingo-pulse { animation: pulse   1.8s ease-in-out infinite; }
    .slide-up    { animation: slideUp  .22s ease-out; }
  `],
  template: `
    <!-- Floating trigger button -->
    <div class="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">

      <!-- Mini chat panel -->
      @if (open) {
        <div class="slide-up w-80 bg-white rounded-3xl shadow-2xl border border-violet-200 overflow-hidden flex flex-col"
          style="max-height:420px;">

          <!-- Panel header -->
          <div class="flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-violet-600 to-indigo-600">
            <svg viewBox="0 0 64 64" width="28" height="28">
              <circle cx="32" cy="32" r="30" fill="#7C3AED"/>
              <circle cx="22" cy="28" r="7"   fill="white"/>
              <circle cx="22" cy="28" r="3.5" fill="#1E1B4B"/>
              <circle cx="42" cy="28" r="7"   fill="white"/>
              <circle cx="42" cy="28" r="3.5" fill="#1E1B4B"/>
              <path d="M 26 40 Q 32 36 38 40" stroke="#F59E0B" stroke-width="2.5" fill="none" stroke-linecap="round"/>
            </svg>
            <div class="flex-1 min-w-0">
              <p class="text-white font-bold text-sm leading-none">Mino</p>
              <p class="text-violet-200 text-xs">Your English tutor</p>
            </div>
            <button (click)="openFullTutor()"
              class="text-violet-200 hover:text-white text-xs font-semibold px-2 py-1 rounded-lg hover:bg-white/15 transition-colors flex items-center gap-1">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 3 21 3 21 9"/><path d="M10 14L21 3"/><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/></svg>
              Full
            </button>
            <button (click)="open = false"
              class="text-violet-200 hover:text-white w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/15 transition-colors ml-1">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <!-- Messages -->
          <div class="flex-1 overflow-y-auto px-3 py-3 space-y-2" style="min-height:120px;">
            @for (msg of messages; track $index) {
              @if (msg.sender === 'user') {
                <div class="flex justify-end">
                  <div class="max-w-[80%] bg-violet-600 text-white rounded-2xl rounded-tr-sm px-3 py-2 text-xs leading-relaxed shadow-sm">
                    {{ msg.text }}
                  </div>
                </div>
              } @else {
                <div class="flex items-start gap-1.5">
                  <div class="w-5 h-5 rounded-full bg-violet-200 flex-shrink-0 flex items-center justify-center mt-0.5">
                    <svg viewBox="0 0 64 64" width="13" height="13">
                      <circle cx="22" cy="26" r="6"   fill="#1E1B4B"/>
                      <circle cx="42" cy="26" r="6"   fill="#1E1B4B"/>
                      <polygon points="32,34 26,41 38,41" fill="#F59E0B"/>
                    </svg>
                  </div>
                  <div class="max-w-[80%] bg-violet-50 text-violet-900 rounded-2xl rounded-tl-sm px-3 py-2 text-xs leading-relaxed border border-violet-100">
                    {{ msg.text }}
                    @if (isTyping && $index === messages.length - 1 && msg.sender === 'lingo') {
                      <span class="inline-block w-1 h-3 bg-violet-400 align-middle ml-0.5 animate-pulse"></span>
                    }
                  </div>
                </div>
              }
            }
            @if (isLoading) {
              <div class="flex items-center gap-1.5">
                <div class="w-5 h-5 rounded-full bg-violet-200 flex-shrink-0 flex items-center justify-center">
                  <svg viewBox="0 0 64 64" width="13" height="13">
                    <circle cx="22" cy="26" r="6" fill="#1E1B4B"/>
                    <circle cx="42" cy="26" r="6" fill="#1E1B4B"/>
                    <polygon points="32,34 26,41 38,41" fill="#F59E0B"/>
                  </svg>
                </div>
                <div class="bg-violet-50 rounded-2xl rounded-tl-sm px-3 py-2 border border-violet-100 flex gap-1">
                  <span class="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style="animation-delay:0ms"></span>
                  <span class="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style="animation-delay:100ms"></span>
                  <span class="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style="animation-delay:200ms"></span>
                </div>
              </div>
            }
          </div>

          <!-- Suggestion chips -->
          @if (suggestions.length > 0) {
            <div class="px-3 pb-2 flex flex-wrap gap-1.5">
              @for (s of suggestions; track s.route) {
                <button (click)="navigateTo(s.route)"
                  class="px-2.5 py-1 rounded-full text-xs font-bold border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors flex items-center gap-1">
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                  {{ s.label }}
                </button>
              }
            </div>
          }

          <!-- Input -->
          <div class="px-3 pb-3 pt-2 border-t border-violet-100 flex gap-2">
            <input
              [(ngModel)]="userMessage"
              (keyup.enter)="sendMessage()"
              [disabled]="isLoading"
              placeholder="Ask Mino..."
              class="flex-1 bg-violet-50 border border-violet-200 text-violet-900 placeholder-violet-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-violet-400 transition-colors"/>
            <button (click)="sendMessage()"
              [disabled]="isLoading || !userMessage.trim()"
              class="w-8 h-8 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-40 flex items-center justify-center transition-colors flex-shrink-0">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
        </div>
      }

      <!-- Floating owl button -->
      <button (click)="toggleOpen()"
        class="relative w-14 h-14 rounded-full shadow-2xl border-2 border-violet-300 bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
        [class.lingo-float]="!open"
        title="Chat with Mino">

        <!-- Notification dot when there's a new message -->
        @if (!open && unreadCount > 0) {
          <span class="lingo-pulse absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center border border-white">
            {{ unreadCount > 9 ? '9+' : unreadCount }}
          </span>
        }

        <svg viewBox="0 0 64 64" width="34" height="34">
          <!-- Ear tufts -->
          <polygon points="18,14 12,2  24,12" fill="#5B21B6"/>
          <polygon points="18,13 14,4  22,11" fill="#8B5CF6"/>
          <polygon points="46,14 52,2  40,12" fill="#5B21B6"/>
          <polygon points="46,13 50,4  42,11" fill="#8B5CF6"/>
          <!-- Head -->
          <circle cx="32" cy="30" r="22" fill="#7C3AED"/>
          <!-- Eye whites -->
          <circle cx="22" cy="28" r="8" fill="white"/>
          <circle cx="42" cy="28" r="8" fill="white"/>
          <!-- Pupils -->
          <circle cx="22" cy="28" r="4" fill="#1E1B4B"/>
          <circle cx="42" cy="28" r="4" fill="#1E1B4B"/>
          <!-- Eye shine -->
          <circle cx="20" cy="26" r="1.5" fill="white"/>
          <circle cx="40" cy="26" r="1.5" fill="white"/>
          <!-- Beak -->
          <path d="M 26 38 L 32 34 L 38 38 Z" fill="#F59E0B"/>
        </svg>
      </button>
    </div>
  `
})
export class AiAvatarComponent implements OnInit, OnDestroy {
  open        = false;
  userMessage = '';
  isLoading   = false;
  isTyping    = false;
  unreadCount = 0;
  messages:    MiniMessage[] = [];
  suggestions: AvatarSuggestion[] = [];

  private chatSub: Subscription | null = null;

  constructor(
    private avatarService: AvatarService,
    private authService:   AuthService,
    private router:        Router,
    private cdr:           ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Show a welcome message on first open
    this.messages.push({
      sender: 'lingo',
      text: `Hi! I'm Mino 🦉 Ask me anything about English or your courses!`
    });
    this.unreadCount = 1;
  }

  ngOnDestroy(): void {
    this.chatSub?.unsubscribe();
  }

  toggleOpen(): void {
    this.open = !this.open;
    if (this.open) this.unreadCount = 0;
  }

  sendMessage(): void {
    const text = this.userMessage.trim();
    if (!text || this.isLoading) return;

    this.userMessage  = '';
    this.suggestions  = [];
    this.messages.push({ sender: 'user', text });
    this.isLoading = true;

    this.chatSub = this.avatarService.chat({
      message:     text,
      userId:      this.authService.currentUser?.id ?? null,
      currentPage: this.router.url
    }).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.messages.push({ sender: 'lingo', text: res.reply });
        if (res.suggestions?.length) this.suggestions = res.suggestions;
        if (!this.open) this.unreadCount++;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.messages.push({ sender: 'lingo', text: `Oops! I had a hiccup. Try again?` });
        this.cdr.detectChanges();
      }
    });
  }

  navigateTo(route: string): void {
    this.suggestions = [];
    this.open        = false;
    // navigateByUrl handles full paths + query strings reliably
    this.router.navigateByUrl(route);
  }

  openFullTutor(): void {
    this.open = false;
    this.router.navigate(['/ai-tutor']);
  }
}
