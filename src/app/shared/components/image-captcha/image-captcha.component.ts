import { Component, EventEmitter, OnInit, Output, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

export interface CaptchaImage {
  index: number;
  url: string;
}

export interface CaptchaChallenge {
  challengeId: string;
  targetWord: string;
  images: CaptchaImage[];
}

export interface CaptchaResult {
  challengeId: string;
  selectedIndex: number;
}

@Component({
  selector: 'app-image-captcha',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './image-captcha.component.html'
})
export class ImageCaptchaComponent implements OnInit {
  @Output() solved = new EventEmitter<CaptchaResult>();
  @Output() cleared = new EventEmitter<void>();

  private readonly apiUrl = '/api/users/captcha';

  challenge: CaptchaChallenge | null = null;
  selectedIndex: number | null = null;
  isLoading = false;
  loadError = false;
  imageLoaded: boolean[] = [false, false, false, false];

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadChallenge();
  }

  loadChallenge(): void {
    this.isLoading = true;
    this.loadError = false;
    this.selectedIndex = null;
    this.imageLoaded = [false, false, false, false];
    this.cleared.emit();
    this.cdr.detectChanges();

    this.http.get<CaptchaChallenge>(`${this.apiUrl}/generate`).subscribe({
      next: (challenge) => {
        this.challenge = challenge;
        this.isLoading = false;
        // Force change detection immediately so images start loading
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.loadError = true;
        this.cdr.detectChanges();
      }
    });
  }

  selectImage(index: number): void {
    this.selectedIndex = index;
    if (this.challenge) {
      this.solved.emit({
        challengeId: this.challenge.challengeId,
        selectedIndex: index
      });
    }
    this.cdr.detectChanges();
  }

  onImageLoad(index: number): void {
    this.imageLoaded[index] = true;
    this.cdr.detectChanges();
  }

  onImageError(index: number): void {
    this.imageLoaded[index] = true;
    this.cdr.detectChanges();
  }

  get allImagesLoaded(): boolean {
    return this.imageLoaded.every(l => l);
  }

  refresh(): void {
    this.loadChallenge();
  }
}
