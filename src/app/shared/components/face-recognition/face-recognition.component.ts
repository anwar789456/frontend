import {
  Component, Input, Output, EventEmitter,
  ElementRef, ViewChild, AfterViewInit, OnDestroy, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

export interface FaceResult {
  success: boolean;
  message: string;
  verified?: boolean;
  confidence?: number;
}

@Component({
  selector: 'app-face-recognition',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './face-recognition.component.html'
})
export class FaceRecognitionComponent implements AfterViewInit, OnDestroy {
  /** 'register' to enroll a face, 'verify' to verify identity */
  @Input() mode: 'register' | 'verify' = 'register';
  /** User ID for the face operation */
  @Input() userId!: number;
  /** Emitted when operation succeeds or fails */
  @Output() result = new EventEmitter<FaceResult>();

  @ViewChild('videoEl') videoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasEl') canvasRef!: ElementRef<HTMLCanvasElement>;

  private readonly apiUrl = 'https://minolingo.online/api/users/face';
  private stream: MediaStream | null = null;

  cameraReady = false;
  cameraError = '';
  isCapturing = false;
  isProcessing = false;
  capturedImage: string | null = null;
  countdown: number | null = null;
  resultMessage = '';
  resultSuccess: boolean | null = null;
  confidence: number | null = null;
  faceRegistered = false;
  statusLoaded = false;

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngAfterViewInit(): void {
    this.checkFaceStatus();
  }

  ngOnDestroy(): void {
    this.stopCamera();
  }

  // ── Camera ──────────────────────────────────────────────────

  async startCamera(): Promise<void> {
    this.cameraError = '';
    this.capturedImage = null;
    this.resultMessage = '';
    this.resultSuccess = null;
    this.confidence = null;

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      });
      const video = this.videoRef.nativeElement;
      video.srcObject = this.stream;
      await video.play();
      this.cameraReady = true;
      this.cdr.detectChanges();
    } catch (err: any) {
      this.cameraError = err.name === 'NotAllowedError'
        ? 'Camera access denied. Please allow camera access in your browser settings.'
        : 'Could not access camera. Make sure no other app is using it.';
      this.cdr.detectChanges();
    }
  }

  stopCamera(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
    this.cameraReady = false;
  }

  // ── Capture with countdown ──────────────────────────────────

  startCapture(): void {
    if (this.isCapturing) return;
    this.isCapturing = true;
    this.countdown = 3;
    this.cdr.detectChanges();

    const tick = () => {
      if (this.countdown! > 1) {
        this.countdown!--;
        this.cdr.detectChanges();
        setTimeout(tick, 1000);
      } else {
        this.countdown = null;
        this.capture();
        this.isCapturing = false;
        this.cdr.detectChanges();
      }
    };
    setTimeout(tick, 1000);
  }

  private capture(): void {
    const video = this.videoRef.nativeElement;
    const canvas = this.canvasRef.nativeElement;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d')!;
    // Mirror the image (webcam is mirrored)
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    this.capturedImage = canvas.toDataURL('image/jpeg', 0.85);
    this.stopCamera();
    this.cdr.detectChanges();
  }

  // ── Submit to API ───────────────────────────────────────────

  submitFace(): void {
    if (!this.capturedImage || !this.userId) return;
    this.isProcessing = true;
    this.resultMessage = '';
    this.resultSuccess = null;
    this.cdr.detectChanges();

    const endpoint = this.mode === 'register'
      ? `${this.apiUrl}/register/${this.userId}`
      : `${this.apiUrl}/verify/${this.userId}`;

    this.http.post<any>(endpoint, { image: this.capturedImage }).subscribe({
      next: (res) => {
        this.isProcessing = false;
        if (this.mode === 'register') {
          this.resultSuccess = !!res.success;
          this.resultMessage = res.success
            ? 'Face registered successfully! ✅'
            : (res.error || 'Registration failed.');
          if (res.success) this.faceRegistered = true;
        } else {
          this.resultSuccess = !!res.verified;
          this.confidence = res.confidence;
          this.resultMessage = res.verified
            ? `Identity verified! Confidence: ${(res.confidence * 100).toFixed(1)}%`
            : `Verification failed. Confidence: ${((res.confidence || 0) * 100).toFixed(1)}%`;
        }
        this.result.emit({
          success: this.resultSuccess,
          message: this.resultMessage,
          verified: res.verified,
          confidence: res.confidence
        });
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isProcessing = false;
        const msg = err.error?.error || 'An error occurred. Please try again.';
        this.resultSuccess = false;
        this.resultMessage = msg;
        this.result.emit({ success: false, message: msg });
        this.cdr.detectChanges();
      }
    });
  }

  // ── Status ──────────────────────────────────────────────────

  checkFaceStatus(): void {
    if (!this.userId) return;
    this.http.get<any>(`${this.apiUrl}/status/${this.userId}`).subscribe({
      next: (res) => {
        this.faceRegistered = !!res.registered;
        this.statusLoaded = true;
        this.cdr.detectChanges();
      },
      error: () => {
        this.statusLoaded = true;
        this.cdr.detectChanges();
      }
    });
  }

  deleteFece(): void {
    if (!this.userId) return;
    this.isProcessing = true;
    this.http.delete<any>(`${this.apiUrl}/delete/${this.userId}`).subscribe({
      next: () => {
        this.faceRegistered = false;
        this.isProcessing = false;
        this.resultMessage = 'Face data removed.';
        this.resultSuccess = true;
        this.capturedImage = null;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isProcessing = false;
        this.cdr.detectChanges();
      }
    });
  }

  // ── Retry ───────────────────────────────────────────────────

  retake(): void {
    this.capturedImage = null;
    this.resultMessage = '';
    this.resultSuccess = null;
    this.confidence = null;
    this.startCamera();
  }
}
