import { Component, EventEmitter, OnInit, Output } from '@angular/core';
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

  private readonly apiUrl = 'https://minolingo.online/api/users/captcha';

  challenge: CaptchaChallenge | null = null;
  selectedIndex: number | null = null;
  isLoading = false;
  loadError = false;
  imageLoaded: boolean[] = [false, false, false, false];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadChallenge();
  }

  loadChallenge(): void {
    this.isLoading = true;
    this.loadError = false;
    this.selectedIndex = null;
    this.imageLoaded = [false, false, false, false];
    this.cleared.emit();

    this.http.get<CaptchaChallenge>(`${this.apiUrl}/generate`).subscribe({
      next: (challenge) => {
        this.challenge = challenge;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.loadError = true;
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
  }

  onImageLoad(index: number): void {
    this.imageLoaded[index] = true;
  }

  onImageError(index: number): void {
    this.imageLoaded[index] = true;
  }

  get allImagesLoaded(): boolean {
    return this.imageLoaded.every(l => l);
  }

  refresh(): void {
    this.loadChallenge();
  }
}
