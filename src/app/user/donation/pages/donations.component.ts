import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Donation, DonationStatus, DonationType, ItemCondition } from '../models/donation.model';
import { DonationService } from '../services/donation.service';
import { AiDonationService, AiAnalysisResponse, AiSuggestionResponse } from '../services/ai-donation.service';
import { Html5QrcodeScanner } from 'html5-qrcode';

@Component({
  selector: 'app-donations',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './donations.component.html'
})
export class DonationsComponent implements OnInit, OnDestroy {
  tabs = ['All', 'Accepted', 'Pending', 'Rejected'];
  activeTab = 'All';
  searchQuery = '';
  sortKey: 'date' | 'quantity' | 'name' = 'date';
  sortDir: 'asc' | 'desc' = 'desc';
  isDarkMode = false;
  userId = 1;
  favoriteIds = new Set<number>();
  viewingCommentsFor: number | null = null;
  comments: any[] = [];
  loadingComments = false;
  merciPoints = 0;
  gamification: {
    points: number;
    level: string;
    badges: string[];
    nextLevel: string;
    pointsToNext: number;
    progress: number;
  } | null = null;
  pointsAnimating = false;
  gamificationLoading = true;
  gamificationError = false;
  currentPage = 1;
  pageSize = 5;
  stats: any = null;

  showModal = false;
  submitting = false;
  loading = true;
  editingDonationId: number | null = null;
  showDeleteConfirm = false;
  deletingDonationId: number | null = null;
  deleting = false;
  errorMessage: string | null = null;
  formSubmitted = false;
  formErrors: { itemName?: string; quantity?: string; description?: string } = {};

  showQrModal = false;
  qrDonationId: number | null = null;
  qrImageUrl: string | null = null;

  showScanModal = false;
  private qrScanner: Html5QrcodeScanner | null = null;
  scannedDonation: Donation | null = null;
  scanError: string | null = null;
  formData: {
    type: DonationType;
    itemName: string;
    description: string;
    quantity: number | null;
    condition: ItemCondition;
    anonymous: boolean;
    imageFile?: File | null;
    imageUrl?: string;
  } = {
    type: DonationType.VETEMENT,
    itemName: '',
    description: '',
    quantity: 1,
    condition: ItemCondition.BON_ETAT,
    anonymous: false,
    imageFile: null,
    imageUrl: undefined
  };

  // AI Assistant state
  aiAnalyzing = false;
  aiResult: AiAnalysisResponse | null = null;
  showAiPanel = false;
  aiError: string | null = null;

  // AI Dashboard suggestions
  aiSuggestions: string[] = [];
  aiSuggestionsMessage = '';
  loadingAiSuggestions = false;

  constructor(
    private donationService: DonationService,
    private aiDonationService: AiDonationService,
    private cdr: ChangeDetectorRef
  ) {}

  donations: Donation[] = [];

  // --- Local Storage for temporary status persistence ---
  private readonly STORAGE_KEY = 'donation_status_updates';

  ngOnInit(): void {
    this.loadDonations();
    this.loadFavorites();
    this.loadMerciPoints();
    this.loadGamification();
    this.loadStats();
    this.loadAiSuggestions();
    try {
      const saved = localStorage.getItem('darkMode');
      this.isDarkMode = saved === '1';
      this.applyDarkClass();
    } catch {}
    try { document.body.classList.add('donations-bg'); } catch {}
  }

  ngOnDestroy(): void {
    try { document.body.classList.remove('donations-bg'); } catch {}
  }

  openQrModal(donation: Donation): void {
    if (!donation.id) return;
    this.qrDonationId = donation.id;
    this.qrImageUrl = null;
    this.showQrModal = true;
    this.donationService.getQrCode(donation.id).subscribe({
      next: (blob) => {
        this.qrImageUrl = URL.createObjectURL(blob);
        this.cdr.markForCheck();
      },
      error: () => {
        this.qrImageUrl = null;
      }
    });
  }

  closeQrModal(): void {
    this.showQrModal = false;
    if (this.qrImageUrl) {
      try { URL.revokeObjectURL(this.qrImageUrl); } catch {}
    }
    this.qrDonationId = null;
    this.qrImageUrl = null;
  }

  openScanModal(): void {
    this.showScanModal = true;
    this.scannedDonation = null;
    this.scanError = null;

    setTimeout(() => {
      try {
        if (this.qrScanner) {
          this.qrScanner.clear();
          this.qrScanner = null;
        }
        this.qrScanner = new Html5QrcodeScanner(
          'qr-scanner-region',
          { fps: 10, qrbox: 250 },
          false
        );
        this.qrScanner.render(
          (decodedText: string) => this.onQrDecoded(decodedText),
          () => {}
        );
      } catch (e: any) {
        this.scanError = e?.message || 'Impossible de démarrer le scanner.';
        this.cdr.markForCheck();
      }
    }, 0);
  }

  closeScanModal(): void {
    this.showScanModal = false;
    try {
      this.qrScanner?.clear();
    } catch {}
    this.qrScanner = null;
  }

  private onQrDecoded(decodedText: string): void {
    // Expected payload is JSON: { donationId, type, status, date }
    let donationId: number | null = null;
    try {
      const obj = JSON.parse(decodedText);
      donationId = Number(obj?.donationId);
    } catch {
      // fallback: allow plain number
      const n = Number(decodedText);
      donationId = Number.isFinite(n) ? n : null;
    }

    if (!donationId) {
      this.scanError = 'QR Code invalide.';
      this.cdr.markForCheck();
      return;
    }

    try {
      this.qrScanner?.clear();
    } catch {}
    this.qrScanner = null;

    this.donationService.getById(donationId).subscribe({
      next: (d) => {
        this.scannedDonation = d;
        this.cdr.markForCheck();
      },
      error: () => {
        this.scanError = 'Donation introuvable.';
        this.cdr.markForCheck();
      }
    });
  }
  loadDonations(): void {
    this.loading = true;
    this.donationService.getAll().subscribe({
      next: (data) => {
        this.donations = data;
        // Apply stored status updates after loading
        this.applyStoredStatusUpdates();
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  loadStats(): void {
    this.donationService.getStats(this.userId).subscribe({
      next: (data) => {
        this.stats = data;
        this.cdr.markForCheck();
      },
      error: () => {
        this.stats = null;
      }
    });
  }

  get statsByTypeEntries(): { label: string; count: number; percent: number; color: string }[] {
    if (!this.stats?.byType) return [];
    const colors: Record<string, string> = { VETEMENT: '#38a9f3', JEU: '#f59e0b' };
    const total = Object.values(this.stats.byType as Record<string, number>).reduce((a: number, b: number) => a + b, 0);
    return Object.entries(this.stats.byType as Record<string, number>).map(([key, val]) => ({
      label: key,
      count: val,
      percent: total > 0 ? Math.round((val / total) * 100) : 0,
      color: colors[key] || '#94a3b8'
    }));
  }

  get statsByMonthEntries(): { month: string; count: number; percent: number }[] {
    if (!this.stats?.byMonth) return [];
    const entries = Object.entries(this.stats.byMonth as Record<string, number>);
    const max = Math.max(...entries.map(([, v]) => v), 1);
    return entries.slice(0, 6).map(([key, val]) => ({
      month: key,
      count: val,
      percent: Math.round((val / max) * 100)
    }));
  }

  loadMerciPoints(): void {
    this.donationService.getMerciPointsTotal(this.userId).subscribe({
      next: (data) => {
        this.merciPoints = data.totalPoints || 0;
        this.cdr.markForCheck();
      },
      error: () => {
        this.merciPoints = 0;
      }
    });
  }

  loadGamification(): void {
    this.gamificationLoading = true;
    this.gamificationError = false;
    this.donationService.getGamification(this.userId).subscribe({
      next: (data) => {
        const prev = this.gamification?.points ?? 0;
        if (data.points > prev) {
          this.pointsAnimating = true;
          setTimeout(() => { this.pointsAnimating = false; this.cdr.markForCheck(); }, 1200);
        }
        this.gamification = data;
        this.gamificationLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.gamificationLoading = false;
        this.gamificationError = true;
        this.cdr.markForCheck();
      }
    });
  }

  get levelColor(): string {
    switch (this.gamification?.level) {
      case 'Active':     return '#38a9f3';
      case 'Expert':     return '#8b5cf6';
      case 'Ambassador': return '#f59e0b';
      default:           return '#56c416';
    }
  }

  get levelBg(): string {
    switch (this.gamification?.level) {
      case 'Active':     return '#e0f2fe';
      case 'Expert':     return '#ede9fe';
      case 'Ambassador': return '#fef3c7';
      default:           return '#f0fdf4';
    }
  }

  get badgeIcon(): Record<string, string> {
    return {
      'Premier Don':    '🎁',
      'Donateur Actif': '⭐',
      'Héros du Don':   '🦸',
      'Don Accepté':    '✅',
      'Ambassadeur':    '🏅'
    };
  }

  loadFavorites(): void {
    this.donationService.getFavorites(this.userId).subscribe({
      next: (list) => {
        this.favoriteIds = new Set((list || []).map(d => d.id).filter(Boolean) as number[]);
      }
    });
  }

  // --- Local Storage for temporary status persistence ---
  private saveStatusUpdate(donationId: number, status: DonationStatus): void {
    const updates = this.getStatusUpdates();
    updates[donationId] = { status, timestamp: Date.now() };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updates));
  }

  private getStatusUpdates(): { [key: number]: { status: DonationStatus; timestamp: number } } {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  }

  private applyStoredStatusUpdates(): void {
    const updates = this.getStatusUpdates();
    Object.keys(updates).forEach(id => {
      const donationId = parseInt(id);
      const update = updates[donationId];
      const donation = this.donations.find(d => d.id === donationId);
      if (donation) {
        donation.status = update.status;
      }
    });
  }

  get totalItems(): number {
    return this.donations.reduce((sum, d) => sum + (d.quantity || 0), 0);
  }

  get acceptedCount(): number {
    return this.donations.filter(d => d.status === DonationStatus.ACCEPTED).length;
  }

  get pendingCount(): number {
    return this.donations.filter(d => d.status === DonationStatus.PENDING).length;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredDonations.length / this.pageSize));
  }

  get paginatedDonations(): Donation[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredDonations.slice(start, start + this.pageSize);
  }

  get visiblePages(): number[] {
    const pages: number[] = [];
    const total = this.totalPages;
    let start = Math.max(1, this.currentPage - 2);
    let end = Math.min(total, start + 4);
    start = Math.max(1, end - 4);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  get filteredDonations(): Donation[] {
    let list = this.activeTab === 'All' ? [...this.donations] : this.donations.filter(d => d.status === this.activeTab.toUpperCase());
    const q = this.searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(d =>
        (d.itemName || '').toLowerCase().includes(q) ||
        (d.description || '').toLowerCase().includes(q) ||
        (d.type || '').toString().toLowerCase().includes(q) ||
        (d.condition || '').toString().toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      if (this.sortKey === 'date') {
        const da = a.donatedAt ? new Date(a.donatedAt).getTime() : 0;
        const db = b.donatedAt ? new Date(b.donatedAt).getTime() : 0;
        return this.sortDir === 'asc' ? da - db : db - da;
      }
      if (this.sortKey === 'quantity') {
        const qa = a.quantity || 0;
        const qb = b.quantity || 0;
        return this.sortDir === 'asc' ? qa - qb : qb - qa;
      }
      const na = (a.itemName || '').toLowerCase();
      const nb = (b.itemName || '').toLowerCase();
      return this.sortDir === 'asc' ? na.localeCompare(nb) : nb.localeCompare(na);
    });
    return list;
  }

  openDonateModal(): void {
    this.editingDonationId = null;
    this.formData = {
      type: DonationType.VETEMENT,
      itemName: '',
      description: '',
      quantity: 1,
      condition: ItemCondition.BON_ETAT,
      anonymous: false,
      imageFile: null,
      imageUrl: undefined
    };
    this.errorMessage = null;
    this.formSubmitted = false;
    this.formErrors = {};
    this.aiResult = null;
    this.showAiPanel = false;
    this.aiError = null;
    this.showModal = true;
  }

  openEditModal(donation: Donation): void {
    this.editingDonationId = donation.id ?? null;
    this.formData = {
      type: donation.type,
      itemName: donation.itemName,
      description: donation.description || '',
      quantity: donation.quantity,
      condition: donation.condition,
      anonymous: donation.anonymous,
      imageFile: null,
      imageUrl: donation.imageUrl
    };
    this.formSubmitted = false;
    this.formErrors = {};
    this.showModal = true;
  }

  closeDonateModal(): void {
    this.showModal = false;
    this.editingDonationId = null;
    this.errorMessage = null;
  }

  confirmDelete(donation: Donation): void {
    this.deletingDonationId = donation.id ?? null;
    this.showDeleteConfirm = true;
  }

  cancelDelete(): void {
    this.showDeleteConfirm = false;
    this.deletingDonationId = null;
  }

  deleteDonation(): void {
    if (!this.deletingDonationId) return;
    this.deleting = true;
    this.donationService.delete(this.deletingDonationId).subscribe({
      next: () => {
        this.deleting = false;
        this.showDeleteConfirm = false;
        this.deletingDonationId = null;
        this.loadDonations();
      },
      error: () => {
        this.deleting = false;
      }
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.formData.imageFile = input.files[0];
      const reader = new FileReader();
      reader.onload = () => this.formData.imageUrl = reader.result as string;
      reader.readAsDataURL(input.files[0]);
    }
  }

  getImageSrc(url?: string | null): string | null {
    if (!url) return null;
    try {
      if (url.startsWith('http')) {
        const idx = url.indexOf('/uploads/');
        if (idx !== -1) {
          return url.substring(idx);
        }
      }
      return url;
    } catch {
      return url;
    }
  }

  setSortKey(key: 'date' | 'quantity' | 'name'): void {
    if (this.sortKey === key) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = key;
      this.sortDir = key === 'name' ? 'asc' : 'desc';
    }
  }

  toggleDarkMode(): void {
    this.isDarkMode = !this.isDarkMode;
    try {
      localStorage.setItem('darkMode', this.isDarkMode ? '1' : '0');
    } catch {}
    this.applyDarkClass();
  }

  private applyDarkClass(): void {
    if (this.isDarkMode) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }

  exportPdf(): void {
    const rows = this.filteredDonations.map((d, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${d.itemName || ''}</td>
        <td>${d.type || ''}</td>
        <td>${d.condition || ''}</td>
        <td>${d.quantity ?? ''}</td>
        <td>${d.status || ''}</td>
        <td>${d.donatedAt || ''}</td>
      </tr>
    `).join('');
    const html = `
      <html>
        <head>
          <meta charset="utf-8">
          <title>Donations</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 16px; }
            h1 { font-size: 18px; margin: 0 0 12px 0; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 6px 8px; font-size: 12px; }
            th { background: #f3f4f6; text-align: left; }
          </style>
        </head>
        <body>
          <h1>My Donations</h1>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Item</th>
                <th>Type</th>
                <th>Condition</th>
                <th>Qty</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <script>window.onload = () => setTimeout(() => window.print(), 100);</script>
        </body>
      </html>
    `;
    const w = window.open('', '_blank');
    if (w) {
      w.document.open();
      w.document.write(html);
      w.document.close();
    }
  }

  validateForm(): boolean {
    this.formErrors = {};
    let valid = true;

    if (!this.formData.itemName || this.formData.itemName.trim().length === 0) {
      this.formErrors.itemName = 'Le nom de l\'article est requis.';
      valid = false;
    } else if (this.formData.itemName.trim().length < 2) {
      this.formErrors.itemName = 'Le nom doit contenir au moins 2 caractères.';
      valid = false;
    } else if (this.formData.itemName.trim().length > 100) {
      this.formErrors.itemName = 'Le nom ne doit pas dépasser 100 caractères.';
      valid = false;
    }

    if (this.formData.quantity === null || this.formData.quantity === undefined) {
      this.formErrors.quantity = 'La quantité est requise.';
      valid = false;
    } else if (this.formData.quantity <= 0) {
      this.formErrors.quantity = 'La quantité doit être supérieure à 0.';
      valid = false;
    } else if (this.formData.quantity > 1000) {
      this.formErrors.quantity = 'La quantité ne doit pas dépasser 1000.';
      valid = false;
    } else if (!Number.isInteger(this.formData.quantity)) {
      this.formErrors.quantity = 'La quantité doit être un nombre entier.';
      valid = false;
    }

    if (this.formData.description && this.formData.description.length > 500) {
      this.formErrors.description = 'La description ne doit pas dépasser 500 caractères.';
      valid = false;
    }

    return valid;
  }

  submitDonation(): void {
    this.formSubmitted = true;
    if (!this.validateForm()) return;
    this.submitting = true;
    this.errorMessage = null;

    const createOrUpdate = (imageUrl?: string) => {
      const donation: Donation = {
        userId: this.userId,
        type: this.formData.type,
        itemName: this.formData.itemName,
        description: this.formData.description || undefined,
        quantity: this.formData.quantity!,
        condition: this.formData.condition,
        anonymous: this.formData.anonymous,
        status: DonationStatus.PENDING,
        imageUrl
      };
      const request$ = this.editingDonationId
        ? this.donationService.update(this.editingDonationId, donation)
        : this.donationService.create(donation);
      request$.subscribe({
        next: () => {
          this.submitting = false;
          this.showModal = false;
          this.editingDonationId = null;
          this.loadDonations();
          this.loadMerciPoints();
          this.loadGamification();
        },
        error: (err) => {
          this.submitting = false;
          this.errorMessage = (err?.error?.message as string) || 'Échec de l’envoi de la donation.';
        }
      });
    };

    if (this.formData.imageFile) {
      this.donationService.uploadImage(this.formData.imageFile).subscribe({
        next: (url) => createOrUpdate(url),
        error: () => createOrUpdate(undefined)
      });
    } else {
      createOrUpdate(this.formData.imageUrl);
    }
  }

  // ─── AI Assistant ─────────────────────────────────────────────────────────

  analyzeWithAi(): void {
    this.aiAnalyzing = true;
    this.aiResult = null;
    this.aiError = null;
    this.showAiPanel = true;

    const previousItems = this.donations.slice(0, 10).map(d => d.itemName);

    this.aiDonationService.analyzeDonation({
      itemName: this.formData.itemName,
      description: this.formData.description,
      condition: this.formData.condition,
      quantity: this.formData.quantity ?? 1,
      type: this.formData.type,
      previousDonationItems: previousItems
    }).subscribe({
      next: (result) => {
        this.aiResult = result;
        this.aiAnalyzing = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.aiError = 'L\'analyse a échoué. Vérifiez votre connexion et réessayez.';
        this.aiAnalyzing = false;
        this.cdr.markForCheck();
      }
    });
  }

  acceptAiDescription(): void {
    if (this.aiResult?.improvedText) {
      this.formData.description = this.aiResult.improvedText;
    }
  }

  acceptAiCategory(): void {
    if (this.aiResult?.category === 'VETEMENT' || this.aiResult?.category === 'JEU') {
      this.formData.type = this.aiResult.category as DonationType;
    }
  }

  acceptAllAiSuggestions(): void {
    this.acceptAiDescription();
    this.acceptAiCategory();
    this.showAiPanel = false;
  }

  loadAiSuggestions(): void {
    this.loadingAiSuggestions = true;
    const previousItems = this.donations.map(d => d.itemName);
    this.aiDonationService.getSuggestions({
      userId: this.userId,
      previousDonationItems: previousItems
    }).subscribe({
      next: (result) => {
        this.aiSuggestions = result.suggestions || [];
        this.aiSuggestionsMessage = result.message || '';
        this.loadingAiSuggestions = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loadingAiSuggestions = false;
        this.cdr.markForCheck();
      }
    });
  }

  getImpactColor(score: number): string {
    if (score >= 70) return '#56c416';
    if (score >= 40) return '#f59e0b';
    return '#ef4444';
  }

  getImpactLabel(score: number): string {
    if (score >= 70) return 'Élevé';
    if (score >= 40) return 'Modéré';
    return 'Faible';
  }

  // ──────────────────────────────────────────────────────────────────────────

  isFavorite(id?: number | null): boolean {
    if (!id) return false;
    return this.favoriteIds.has(id);
  }

  toggleFavorite(donation: Donation): void {
    if (!donation.id) return;
    const id = donation.id as number;
    if (this.isFavorite(id)) {
      this.donationService.removeFavorite(id, this.userId).subscribe({
        next: () => this.favoriteIds.delete(id)
      });
    } else {
      this.donationService.addFavorite(id, this.userId).subscribe({
        next: () => this.favoriteIds.add(id)
      });
    }
  }

  addCommentPrompt(donation: Donation): void {
    if (!donation.id) return;
    const id = donation.id as number;
    const text = prompt('Votre commentaire :') || '';
    if (!text.trim()) return;
    this.donationService.addComment(id, { userId: this.userId, text }).subscribe({
      next: () => {
        if (this.viewingCommentsFor === id) this.viewComments(donation);
      }
    });
  }

  viewComments(donation: Donation): void {
    if (!donation.id) return;
    const id = donation.id as number;
    this.viewingCommentsFor = id;
    this.loadingComments = true;
    this.comments = [];
    this.donationService.getComments(id).subscribe({
      next: (data) => {
        this.comments = data || [];
        this.loadingComments = false;
      },
      error: () => {
        this.loadingComments = false;
      }
    });
  }
}
