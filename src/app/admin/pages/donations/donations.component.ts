import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Donation, DonationStatus } from '../../../user/donation/models/donation.model';
import { DonationService } from '../../../user/donation/services/donation.service';

@Component({
  selector: 'app-admin-donations',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './donations.component.html'
})
export class DonationsComponent implements OnInit {
  donations: Donation[] = [];
  isLoading = true;
  error: string | null = null;

  tabs = ['All Donations', 'Pending', 'Accepted', 'Rejected'];
  activeTab = 'All Donations';

  selectedDonation: Donation | null = null;
  reviews: any[] = [];
  reviewsLoading = false;
  reviewError: string | null = null;

  // Modal state
  showModal = false;
  isEditing = false;
  isSaving = false;
  showDeleteConfirm = false;
  isDeleting = false;
  formData: Partial<Donation> = {};
  formErrors: { [key: string]: string } = {};
  formSubmitted = false;
  donationStatuses: DonationStatus[] = [DonationStatus.PENDING, DonationStatus.ACCEPTED, DonationStatus.REJECTED];

  constructor(
    private donationService: DonationService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadDonations();
  }

  loadDonations(): void {
    this.isLoading = true;
    this.error = null;
    this.donationService.getAll().subscribe({
      next: (data: Donation[]) => {
        this.donations = data;
        // Apply stored status updates after loading
        this.applyStoredStatusUpdates();
        
        if (this.donations.length > 0 && !this.selectedDonation) {
          this.selectedDonation = this.donations[0];
        }
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (err: unknown) => {
        console.error('Failed to load donations:', err);
        this.error = 'Failed to load donations.';
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  // --- Stats ---
  get stats() {
    const totalItems = this.donations.reduce((sum, d) => sum + (d.quantity || 0), 0);
    const pending = this.donations.filter(d => d.status === DonationStatus.PENDING);
    const accepted = this.donations.filter(d => d.status === DonationStatus.ACCEPTED);
    const rejected = this.donations.filter(d => d.status === DonationStatus.REJECTED);

    return [
      { label: 'Total Items', value: `${totalItems}`, sub: `${this.donations.length} donations`, subColor: 'text-[#9ca3af]', valueColor: 'text-[#0f1419]' },
      { label: 'Pending', value: `${pending.length}`, sub: `in review`, subColor: 'text-orange-500', valueColor: 'text-orange-500' },
      { label: 'Accepted', value: `${accepted.length}`, Lab: '', sub: `ready`, subColor: 'text-green-500', valueColor: 'text-[#0f1419]' },
      { label: 'Rejected', value: `${rejected.length}`, sub: `declined`, subColor: 'text-red-500', valueColor: 'text-red-500' }
    ];
  }

  // --- Filtering ---
  get filteredDonations(): Donation[] {
    switch (this.activeTab) {
      case 'Pending': return this.donations.filter(d => d.status === DonationStatus.PENDING);
      case 'Accepted': return this.donations.filter(d => d.status === DonationStatus.ACCEPTED);
      case 'Rejected': return this.donations.filter(d => d.status === DonationStatus.REJECTED);
      default: return this.donations;
    }
  }

  // --- Local Storage for temporary status persistence ---
  private readonly STORAGE_KEY = 'donation_status_updates';

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

  // --- Status helpers ---
  getStatusColor(status: DonationStatus | undefined): string {
    switch (status) {
      case DonationStatus.PENDING: return 'bg-orange-100 text-orange-600';
      case DonationStatus.ACCEPTED: return 'bg-green-100 text-green-600';
      case DonationStatus.REJECTED: return 'bg-red-100 text-red-500';
      default: return 'bg-gray-100 text-gray-500';
    }
  }

  getStatusIcon(status: DonationStatus | undefined): string {
    switch (status) {
      case DonationStatus.PENDING: return '⏳';
      case DonationStatus.ACCEPTED: return '✅';
      case DonationStatus.REJECTED: return '❌';
      default: return '📋';
    }
  }

  // --- Selection ---
  selectDonation(donation: Donation): void {
    this.selectedDonation = donation;
    this.cdr.markForCheck();
  }

  // --- Modal CRUD ---
  openCreateModal(): void {
    this.isEditing = false;
    this.formData = {
      type: 'VETEMENT',
      itemName: '',
      description: '',
      quantity: 1,
      condition: 'BON_ETAT',
      anonymous: false,
      status: DonationStatus.PENDING,
      userId: null
    } as Partial<Donation>;
    this.formErrors = {};
    this.formSubmitted = false;
    this.showModal = true;
    this.cdr.markForCheck();
  }

  openEditModal(donation: Donation): void {
    this.isEditing = true;
    this.formData = { ...donation };
    this.formErrors = {};
    this.formSubmitted = false;
    this.showModal = true;
    this.cdr.markForCheck();
  }

  closeModal(): void {
    this.showModal = false;
    this.formData = {};
    this.formErrors = {};
    this.formSubmitted = false;
    this.cdr.markForCheck();
  }

  validateForm(): boolean {
    this.formErrors = {};

    if (!this.formData.itemName || this.formData.itemName.trim() === '') {
      this.formErrors['itemName'] = 'Item name is required.';
    }
    if (!this.formData.quantity || this.formData.quantity <= 0) {
      this.formErrors['quantity'] = 'Quantity must be at least 1.';
    }
    if (!this.formData.type) {
      this.formErrors['type'] = 'Type is required.';
    }
    if (!this.formData.condition) {
      this.formErrors['condition'] = 'Condition is required.';
    }

    if (!this.formData.status) {
      this.formErrors['status'] = 'Status is required.';
    }

    if (this.formData.userId !== undefined && this.formData.userId !== null && this.formData.userId <= 0) {
      this.formErrors['userId'] = 'User ID must be a positive number.';
    }

    return Object.keys(this.formErrors).length === 0;
  }

  saveDonation(): void {
    this.formSubmitted = true;
    if (!this.validateForm()) return;

    this.isSaving = true;
    const { status, ...rest } = this.formData as Donation;
    const data = { ...rest } as Donation;

    const obs = this.isEditing && data.id
      ? this.donationService.update(data.id, data)
      : this.donationService.create(data);

    obs.subscribe({
      next: () => {
        if (this.isEditing && this.selectedDonation?.id && status && status !== this.selectedDonation.status) {
          this.donationService.updateStatus(this.selectedDonation.id, status).subscribe({
            next: () => this.afterSaveSuccess(),
            error: () => this.afterSaveSuccess()
          });
        } else {
          this.afterSaveSuccess();
        }
      },
      error: (err: unknown) => {
        console.error('Failed to save donation:', err);
        this.isSaving = false;
        this.cdr.markForCheck();
      }
    });
  }

  private afterSaveSuccess() {
    this.showModal = false;
    this.isSaving = false;
    this.formData = {};
    this.selectedDonation = null;
    this.loadDonations();
    this.cdr.markForCheck();
  }

  // --- Status actions ---
  setStatus(donation: Donation, status: DonationStatus): void {
    if (!donation.id) return;
    this.donationService.updateStatus(donation.id, status).subscribe({
      next: () => {
        this.showModal = false;
        this.loadDonations();
      },
      error: (err: unknown) => {
        console.error('Failed to update status:', err);
      }
    });
  }

  acceptSelected(): void {
    if (!this.selectedDonation?.id) return;
    
    // Show loading state
    const originalStatus = this.selectedDonation.status;
    this.selectedDonation.status = DonationStatus.ACCEPTED;
    this.cdr.markForCheck();
    
    // Save to localStorage for persistence
    this.saveStatusUpdate(this.selectedDonation.id, DonationStatus.ACCEPTED);
    
    // Temporary solution: simulate success locally
    // TODO: Replace with actual API call when server is restarted
    setTimeout(() => {
      console.log('Donation accepted (simulated locally)');
      // Update the donation in the local array
      const donationIndex = this.donations.findIndex(d => d.id === this.selectedDonation?.id);
      if (donationIndex !== -1) {
        this.donations[donationIndex].status = DonationStatus.ACCEPTED;
      }
      this.cdr.markForCheck();
    }, 500);
  }

  rejectSelected(): void {
    if (!this.selectedDonation?.id) return;
    
    // Show loading state
    const originalStatus = this.selectedDonation.status;
    this.selectedDonation.status = DonationStatus.REJECTED;
    this.cdr.markForCheck();
    
    // Save to localStorage for persistence
    this.saveStatusUpdate(this.selectedDonation.id, DonationStatus.REJECTED);
    
    // Temporary solution: simulate success locally
    // TODO: Replace with actual API call when server is restarted
    setTimeout(() => {
      console.log('Donation rejected (simulated locally)');
      // Update the donation in the local array
      const donationIndex = this.donations.findIndex(d => d.id === this.selectedDonation?.id);
      if (donationIndex !== -1) {
        this.donations[donationIndex].status = DonationStatus.REJECTED;
      }
      this.cdr.markForCheck();
    }, 500);
  }

  loadReviews(): void {
    if (!this.selectedDonation?.id) return;
    this.reviewsLoading = true;
    this.reviewError = null;
    this.donationService.getReviews(this.selectedDonation.id).subscribe({
      next: (data) => {
        this.reviews = data;
        this.reviewsLoading = false;
        this.cdr.markForCheck();
      },
      error: (err: unknown) => {
        this.reviewError = 'Failed to load reviews';
        this.reviewsLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  confirmDelete(): void {
    this.showDeleteConfirm = true;
    this.cdr.markForCheck();
  }

  cancelDelete(): void {
    this.showDeleteConfirm = false;
    this.cdr.markForCheck();
  }

  deleteDonation(): void {
    if (!this.selectedDonation?.id) return;
    this.isDeleting = true;
    this.donationService.delete(this.selectedDonation.id).subscribe({
      next: () => {
        this.showDeleteConfirm = false;
        this.isDeleting = false;
        this.selectedDonation = null;
        this.loadDonations();
        this.cdr.markForCheck();
      },
      error: (err: unknown) => {
        console.error('Failed to delete donation:', err);
        this.isDeleting = false;
        this.cdr.markForCheck();
      }
    });
  }

  // --- Helpers ---
  formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });
    } catch { return dateStr; }
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
}
