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
  capturedImage?: string;
}

@Component({
  selector: 'app-face-recognition',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './face-recognition.component.html'
})
export class FaceRecognitionComponent implements AfterViewInit, OnDestroy {
  /** 'register' to enroll a face, 'verify' to verify identity, 'login' to capture and emit image for external identification */
  @Input() mode: 'register' | 'verify' | 'login' = 'register';
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

    // navigator.mediaDevices is undefined on insecure HTTP origins (non-localhost).
    if (!navigator.mediaDevices?.getUserMedia) {
      this.cameraError = 'Camera API is not available. Make sure the page is opened over HTTPS (or localhost) and that your browser supports camera access.';
      this.cdr.detectChanges();
      return;
    }

    // Try with preferred constraints first, fall back to bare video if the
    // device doesn't support the requested resolution or facing mode.
    const constraints: MediaStreamConstraints[] = [
      { video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: { ideal: 'user' } } },
      { video: true }
    ];

    let lastError: any;
    for (const constraint of constraints) {
      try {
        this.stream = await navigator.mediaDevices.getUserMedia(constraint);
        const video = this.videoRef.nativeElement;
        video.srcObject = this.stream;
        await video.play();
        this.cameraReady = true;
        this.cdr.detectChanges();
        return;
      } catch (err: any) {
        lastError = err;
        // Don't retry on permission denial or missing device — those won't be
        // fixed by relaxing constraints.
        if (err.name === 'NotAllowedError' || err.name === 'NotFoundError') break;
      }
    }

    // Map the real error name to a helpful message.
    const name: string = lastError?.name ?? '';
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
      this.cameraError = 'Camera access denied. Click the camera icon in your browser\'s address bar and allow access, then try again.';
    } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
      this.cameraError = 'No camera found on this device. Please connect a webcam and try again.';
    } else if (name === 'NotReadableError' || name === 'TrackStartError') {
      this.cameraError = 'Camera is already in use by another app (Teams, Zoom, etc.). Close it and try again.';
    } else if (name === 'OverconstrainedError') {
      this.cameraError = 'Your camera does not support the required settings. Try a different browser or device.';
    } else if (name === 'SecurityError') {
      this.cameraError = 'Camera access is blocked. The page must be served over HTTPS or localhost.';
    } else {
      this.cameraError = `Could not start camera (${name || 'unknown error'}). Try refreshing the page.`;
    }
    this.cdr.detectChanges();
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

    // In login mode, emit the image immediately for external identification (no userId needed)
    if (this.mode === 'login') {
      this.result.emit({ success: true, message: 'Image captured', capturedImage: this.capturedImage });
    }

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
