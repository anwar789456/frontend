import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Donation, DonationStatus, DonationType, ItemCondition } from '../models/donation.model';
import { DonationService } from '../services/donation.service';

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

  showModal = false;
  submitting = false;
  loading = true;
  editingDonationId: number | null = null;
  showDeleteConfirm = false;
  deletingDonationId: number | null = null;
  deleting = false;
  errorMessage: string | null = null;
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

  constructor(private donationService: DonationService) {}

  donations: Donation[] = [];

  ngOnInit(): void {
    this.loadDonations();
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
  loadDonations(): void {
    this.loading = true;
    this.donationService.getAll().subscribe({
      next: (data) => {
        this.donations = data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
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
    this.showModal = true;
  }

  openEditModal(donation: Donation): void {
    this.editingDonationId = donation.id ?? null;
    this.formData = {
      type: donation.type ?? DonationType.VETEMENT,
      itemName: donation.itemName ?? '',
      description: donation.description || '',
      quantity: donation.quantity ?? 1,
      condition: donation.condition ?? ItemCondition.BON_ETAT,
      anonymous: donation.anonymous ?? false,
      imageFile: null,
      imageUrl: donation.imageUrl
    };
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

  submitDonation(): void {
    if (!this.formData.itemName || !this.formData.quantity || this.formData.quantity <= 0) return;
    this.submitting = true;
    this.errorMessage = null;

    const createOrUpdate = (imageUrl?: string) => {
      const donation: Donation = {
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
}
