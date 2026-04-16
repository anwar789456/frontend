import {
  Component, ElementRef, ViewChild, OnInit, OnDestroy, ChangeDetectorRef, NgZone
} from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgIf } from '@angular/common';
import { AvatarService, AvatarSuggestion } from '../../shared/services/avatar.service';
import { AuthService } from '../../shared/services/auth.service';
import { Subscription } from 'rxjs';

interface ChatMessage {
  sender: 'user' | 'lingo';
  text: string;
}

type MouthState = 'closed' | 'open1' | 'open2' | 'open3';
type AvatarMood  = 'idle' | 'speaking' | 'listening' | 'thinking';

@Component({
  selector: 'app-ai-tutor',
  standalone: true,
  imports: [FormsModule, NgIf],
  templateUrl: './ai-tutor.component.html',
  styles: [`
    @keyframes float     { 0%,100%{transform:translateY(0)}   50%{transform:translateY(-10px)} }
    @keyframes speakBob  { 0%,100%{transform:translateY(0) rotate(-1deg)} 50%{transform:translateY(-5px) rotate(1deg)} }
    @keyframes sway      { 0%,100%{transform:rotate(-2deg)}   50%{transform:rotate(2deg)} }
    @keyframes blink     { 0%,87%,100%{transform:scaleY(0)}   92%{transform:scaleY(1)} }
    @keyframes blinkR    { 0%,87%,100%{transform:scaleY(0)}   92%{transform:scaleY(1)} }
    @keyframes bubbleIn  { from{opacity:0;transform:scale(.85) translateY(6px)} to{opacity:1;transform:scale(1) translateY(0)} }
    @keyframes cursor    { 0%,100%{opacity:1} 50%{opacity:0} }
    @keyframes ripple    { 0%{transform:scale(1);opacity:.5} 100%{transform:scale(2.4);opacity:0} }
    @keyframes popIn     { from{opacity:0;transform:scale(.9)} to{opacity:1;transform:scale(1)} }

    .avatar-idle     { animation: float    3.5s ease-in-out infinite; transform-origin: center bottom; }
    .avatar-speaking { animation: speakBob 0.4s  ease-in-out infinite; transform-origin: center bottom; }
    .avatar-listening{ animation: float    2s    ease-in-out infinite; transform-origin: center bottom; }
    .avatar-thinking { animation: sway     2s    ease-in-out infinite; transform-origin: center bottom; }

    .blink-l { transform-origin:76px 84px;  animation: blink  3.8s infinite; }
    .blink-r { transform-origin:124px 84px; animation: blinkR 3.8s infinite; animation-delay:.07s; }

    .speech-bubble { animation: bubbleIn .25s ease-out; }
    .cursor-blink  { animation: cursor   .8s  ease-in-out infinite; }
    .mic-ripple    { animation: ripple   1.1s ease-out infinite; }
    .pop-in        { animation: popIn    .2s  ease-out; }
  `]
})
export class AiTutorComponent implements OnInit, OnDestroy {
  @ViewChild('historyEl')  private historyEl!:  ElementRef;
  @ViewChild('textInput')  private textInput!:  ElementRef;

  // ── State ─────────────────────────────────────────────────────────────────
  mood: AvatarMood = 'idle';
  mouthState: MouthState = 'closed';
  isSpeaking  = false;
  isListening = false;
  isStreaming = false;
  isMuted     = false;

  interimText    = '';
  displayedReply = '';
  private fullReply = '';
  userMessage = '';
  messages: ChatMessage[] = [];
  suggestions: AvatarSuggestion[] = [];
  speechSupported = false;

  // ── Pupil offsets ─────────────────────────────────────────────────────────
  pupilDx = 0;
  pupilDy = 0;

  // ── Private ───────────────────────────────────────────────────────────────
  private mouthInterval:  ReturnType<typeof setInterval> | null = null;
  private pupilInterval:  ReturnType<typeof setInterval> | null = null;
  private recognition:    any = null;
  private streamSub:      Subscription | null = null;

  // ── Beak paths ────────────────────────────────────────────────────────────
  private readonly BEAK: Record<MouthState, string> = {
    closed: 'M 88 108 L 100 114 L 112 108 Z',
    open1:  'M 88 108 L 100 121 L 112 108 Z',
    open2:  'M 88 108 L 100 129 L 112 108 Z',
    open3:  'M 88 108 L 100 137 L 112 108 Z',
  };

  constructor(
    private avatarService: AvatarService,
    private authService:   AuthService,
    private router:        Router,
    private cdr:           ChangeDetectorRef,
    private ngZone:        NgZone
  ) {}

  // ── Getters ───────────────────────────────────────────────────────────────
  get lowerBeakD(): string  { return this.BEAK[this.mouthState]; }
  get mouthOpen():  boolean { return this.mouthState !== 'closed'; }
  get mouthInnerRy(): number { return ({closed:0,open1:4,open2:8,open3:12} as any)[this.mouthState]; }
  get mouthInnerY():  number { return ({closed:0,open1:115,open2:119,open3:123} as any)[this.mouthState]; }
  get leftPupilX():  number  { return 76  + this.pupilDx; }
  get leftPupilY():  number  { return 84  + this.pupilDy; }
  get rightPupilX(): number  { return 124 + this.pupilDx; }
  get rightPupilY(): number  { return 84  + this.pupilDy; }
  get leftBrowD():  string {
    if (this.mood === 'thinking') return 'M 57 62 Q 76 55 89 63';
    if (this.mood === 'speaking') return 'M 57 67 Q 76 62 89 67';
    return 'M 57 66 Q 76 59 89 66';
  }
  get rightBrowD(): string {
    if (this.mood === 'thinking') return 'M 111 63 Q 124 55 143 62';
    if (this.mood === 'speaking') return 'M 111 67 Q 124 62 143 67';
    return 'M 111 66 Q 124 59 143 66';
  }
  get avatarClass(): string { return `avatar-${this.mood}`; }
  get glowColor():   string {
    if (this.isListening)  return '#6366f1';
    if (this.isSpeaking || this.isStreaming) return '#8b5cf6';
    return '#a78bfa';
  }

  // ── Session persistence ───────────────────────────────────────────────────
  private readonly SESSION_KEY = 'lingo_chat_history';

  private saveSession(): void {
    sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(this.messages));
  }

  private restoreSession(): boolean {
    try {
      const raw = sessionStorage.getItem(this.SESSION_KEY);
      if (!raw) return false;
      const saved: ChatMessage[] = JSON.parse(raw);
      if (!Array.isArray(saved) || saved.length === 0) return false;
      this.messages = saved;
      // Restore the speech bubble to the last Lingo message
      const lastLingo = [...saved].reverse().find(m => m.sender === 'lingo');
      if (lastLingo) { this.displayedReply = lastLingo.text; this.fullReply = lastLingo.text; }
      return true;
    } catch {
      return false;
    }
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.initSTT();
    this.startPupilDrift();
    const hadHistory = this.restoreSession();
    if (!hadHistory) {
      setTimeout(() => this.receiveReply(
        `Hi! I'm Mino, your English buddy! Ask me about English, courses, or quizzes!`
      ), 700);
    } else {
      setTimeout(() => this.scrollHistory(), 50);
    }
  }

  ngOnDestroy(): void {
    this.stopMouth();
    this.streamSub?.unsubscribe();
    if (this.pupilInterval) clearInterval(this.pupilInterval);
    try { this.recognition?.abort(); } catch {}
    window.speechSynthesis?.cancel();
  }

  // ── STT ───────────────────────────────────────────────────────────────────
  private initSTT(): void {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    this.speechSupported = !!SR;
    if (!SR) return;
    this.recognition = new SR();
    this.recognition.lang = 'en-US';
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 1;
    this.recognition.continuous = false;

    this.recognition.onresult = (e: any) => {
      this.ngZone.run(() => {
        let interim = '', final = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const t = e.results[i][0].transcript;
          e.results[i].isFinal ? (final += t) : (interim += t);
        }
        if (final.trim()) {
          this.interimText = '';
          this.isListening = false;
          this.mood = 'thinking';
          this.sendMessage(final.trim());
        } else {
          this.interimText = interim;
        }
      });
    };
    this.recognition.onerror = this.recognition.onend = () => {
      this.ngZone.run(() => {
        this.isListening = false;
        this.interimText = '';
        if (this.mood === 'listening') this.mood = 'idle';
      });
    };
  }

  toggleListening(): void {
    if (!this.speechSupported || !this.recognition) return;
    if (this.isListening) {
      this.recognition.stop();
      this.isListening = false;
      this.interimText = '';
      this.mood = 'idle';
    } else {
      window.speechSynthesis?.cancel();
      this.stopMouth();
      this.isSpeaking = false;
      this.streamSub?.unsubscribe();
      this.isStreaming = false;
      this.isListening = true;
      this.mood = 'listening';
      this.recognition.start();
    }
    this.cdr.detectChanges();
  }

  // ── Send message ──────────────────────────────────────────────────────────
  sendMessage(text: string): void {
    if (!text.trim() || this.isStreaming) return;
    const trimmed = text.trim();
    this.userMessage = '';
    this.suggestions = [];
    this.messages.push({ sender: 'user', text: trimmed });
    this.saveSession();
    this.displayedReply = '';
    this.fullReply = '';
    this.isStreaming = true;
    this.mood = 'thinking';
    this.lookAt('up');
    this.scrollHistory();

    this.streamSub = this.avatarService.streamChat({
      message: trimmed,
      userId:  this.authService.currentUser?.id ?? null,
      currentPage: this.router.url
    }).subscribe({
      next: (token) => {
        // First token — switch mood to speaking
        if (this.fullReply === '') {
          this.mood = 'speaking';
          this.startMouth();
        }
        this.displayedReply += token;
        this.fullReply      += token;
        this.cdr.detectChanges();
        this.scrollHistory();
      },
      complete: () => {
        this.isStreaming = false;
        this.stopMouth();
        this.mood = 'idle';
        this.lookAt('forward');
        this.messages.push({ sender: 'lingo', text: this.fullReply });
        this.saveSession();
        this.suggestions = this.buildSuggestions(this.fullReply);
        this.scrollHistory();
        if (!this.isMuted && this.fullReply) this.speak(this.fullReply);
        this.cdr.detectChanges();
      },
      error: () => {
        this.isStreaming = false;
        this.stopMouth();
        this.mood = 'idle';
        this.receiveReply(`Oops! I had a little trouble. Try asking me again!`);
      }
    });
  }

  // Initial greeting (non-streaming, instant)
  private receiveReply(text: string): void {
    this.displayedReply = text;
    this.fullReply = text;
    this.messages.push({ sender: 'lingo', text });
    this.saveSession();
    this.scrollHistory();
    if (!this.isMuted) this.speak(text);
  }

  // ── TTS ───────────────────────────────────────────────────────────────────
  private speak(text: string): void {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang  = 'en-US';
    utter.rate  = 0.88;
    utter.pitch = 1.15;
    const voices = window.speechSynthesis.getVoices();
    const v = voices.find(v => v.lang.startsWith('en') && v.name.includes('Google'))
           || voices.find(v => v.lang.startsWith('en'));
    if (v) utter.voice = v;
    utter.onstart = () => { this.isSpeaking = true; this.mood = 'speaking'; this.startMouth(); this.cdr.detectChanges(); };
    utter.onboundary = (e: SpeechSynthesisEvent) => {
      if (e.name === 'word') {
        const shapes: MouthState[] = ['open2','open3','open1','open2'];
        this.mouthState = shapes[Math.floor(Math.random() * shapes.length)];
        this.cdr.detectChanges();
      }
    };
    utter.onend = utter.onerror = () => {
      this.isSpeaking = false;
      this.mood = 'idle';
      this.stopMouth();
      this.lookAt('forward');
      this.cdr.detectChanges();
    };
    window.speechSynthesis.speak(utter);
  }

  toggleMute(): void {
    this.isMuted = !this.isMuted;
    if (this.isMuted) { window.speechSynthesis?.cancel(); this.stopMouth(); this.isSpeaking = false; this.mood = 'idle'; }
  }

  // ── Mouth animation ───────────────────────────────────────────────────────
  private startMouth(): void {
    this.stopMouth();
    const seq: MouthState[] = ['open1','open2','open3','open2','open1','closed','open2','open3'];
    let i = 0;
    this.mouthInterval = setInterval(() => {
      this.mouthState = seq[i++ % seq.length];
      this.cdr.detectChanges();
    }, 110);
  }

  private stopMouth(): void {
    if (this.mouthInterval) { clearInterval(this.mouthInterval); this.mouthInterval = null; }
    this.mouthState = 'closed';
  }

  // ── Pupil drift ───────────────────────────────────────────────────────────
  private startPupilDrift(): void {
    const dirs = [{x:0,y:0},{x:3,y:-2},{x:-3,y:-2},{x:4,y:0},{x:-4,y:0},{x:0,y:-4},{x:2,y:2}];
    let i = 0;
    this.pupilInterval = setInterval(() => {
      if (this.mood === 'thinking') { this.pupilDx = -3; this.pupilDy = -4; }
      else if (this.mood === 'speaking' || this.isSpeaking) { this.pupilDx = 0; this.pupilDy = 0; }
      else { const d = dirs[i++ % dirs.length]; this.pupilDx = d.x; this.pupilDy = d.y; }
      this.cdr.detectChanges();
    }, 1800);
  }

  private lookAt(dir: 'forward' | 'up' | 'left' | 'right'): void {
    const m = { forward:{x:0,y:0}, up:{x:0,y:-4}, left:{x:-4,y:0}, right:{x:4,y:0} };
    const d = m[dir]; this.pupilDx = d.x; this.pupilDy = d.y;
  }

  // ── Suggestion builder ────────────────────────────────────────────────────
  private buildSuggestions(reply: string): AvatarSuggestion[] {
    const list: AvatarSuggestion[] = [];
    const l = reply.toLowerCase();
    const p = this.router.url;

    // Specific course buttons take priority — direct-open links
    list.push(...this.avatarService.extractCourseSuggestions(reply));

    // Generic navigation hints (only if no specific course was matched)
    if (list.length === 0 && (l.includes('course') || l.includes('lesson') || l.includes('learn')) && !p.includes('/courses'))
      list.push({ label: 'Browse Courses', route: '/courses' });
    if ((l.includes('quiz') || l.includes('test') || l.includes('practice')) && !p.includes('/quiz'))
      list.push({ label: 'Take a Quiz', route: '/quiz' });
    if ((l.includes('session') || l.includes('tutor') || l.includes('teacher')) && !p.includes('/sessions'))
      list.push({ label: 'Book a Session', route: '/sessions' });
    if ((l.includes('forum') || l.includes('discuss')) && !p.includes('/forums'))
      list.push({ label: 'Visit Forums', route: '/forums' });

    return list.slice(0, 3);
  }

  navigateTo(route: string): void {
    this.suggestions = [];
    this.router.navigateByUrl(route);
  }
  goBack(): void { this.router.navigate(['/courses']); }

  private scrollHistory(): void {
    setTimeout(() => {
      const el = this.historyEl?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    }, 40);
  }
}
