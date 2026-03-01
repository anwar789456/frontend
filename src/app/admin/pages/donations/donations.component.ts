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

  tabs = ['All Donations', 'Pending', 'Success', 'Failed'];
  activeTab = 'All Donations';

  selectedDonation: Donation | null = null;

  // Modal state
  showModal = false;
  isEditing = false;
  isSaving = false;
  showDeleteConfirm = false;
  isDeleting = false;
  formData: Partial<Donation> = {};
  formErrors: { [key: string]: string } = {};
  formSubmitted = false;
  donationStatuses: DonationStatus[] = [DonationStatus.PENDING, DonationStatus.SUCCESS, DonationStatus.FAILED];

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
    const total = this.donations.reduce((sum, d) => sum + (d.amount || 0), 0);
    const pending = this.donations.filter(d => d.status === DonationStatus.PENDING);
    const success = this.donations.filter(d => d.status === DonationStatus.SUCCESS);
    const failed = this.donations.filter(d => d.status === DonationStatus.FAILED);
    const avg = this.donations.length > 0 ? total / this.donations.length : 0;

    return [
      { label: 'Total Raised', value: `${total.toFixed(2)} TND`, sub: `${success.length} successful`, subColor: 'text-green-500', valueColor: 'text-[#0f1419]' },
      { label: 'Pending Review', value: `${pending.length}`, sub: `${pending.reduce((s, d) => s + (d.amount || 0), 0).toFixed(2)} TND value`, subColor: 'text-orange-500', valueColor: 'text-orange-500' },
      { label: 'Avg. Donation', value: `${avg.toFixed(2)} TND`, sub: `${this.donations.length} total`, subColor: 'text-[#9ca3af]', valueColor: 'text-[#0f1419]' },
      { label: 'Failed', value: `${failed.length}`, sub: `${failed.reduce((s, d) => s + (d.amount || 0), 0).toFixed(2)} TND lost`, subColor: 'text-red-500', valueColor: 'text-red-500' }
    ];
  }

  // --- Filtering ---
  get filteredDonations(): Donation[] {
    switch (this.activeTab) {
      case 'Pending': return this.donations.filter(d => d.status === DonationStatus.PENDING);
      case 'Success': return this.donations.filter(d => d.status === DonationStatus.SUCCESS);
      case 'Failed': return this.donations.filter(d => d.status === DonationStatus.FAILED);
      default: return this.donations;
    }
  }

  // --- Status helpers ---
  getStatusColor(status: DonationStatus | undefined): string {
    switch (status) {
      case DonationStatus.PENDING: return 'bg-orange-100 text-orange-600';
      case DonationStatus.SUCCESS: return 'bg-green-100 text-green-600';
      case DonationStatus.FAILED: return 'bg-red-100 text-red-500';
      default: return 'bg-gray-100 text-gray-500';
    }
  }

  getStatusIcon(status: DonationStatus | undefined): string {
    switch (status) {
      case DonationStatus.PENDING: return '⏳';
      case DonationStatus.SUCCESS: return '✅';
      case DonationStatus.FAILED: return '❌';
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
      amount: 0,
      message: '',
      anonymous: false,
      status: DonationStatus.PENDING,
      paymentMethod: '',
      userId: null
    };
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

    if (!this.formData.amount || this.formData.amount <= 0) {
      this.formErrors['amount'] = 'Amount is required and must be greater than 0.';
    }

    if (!this.formData.status) {
      this.formErrors['status'] = 'Status is required.';
    }

    if (!this.formData.paymentMethod || this.formData.paymentMethod.trim() === '') {
      this.formErrors['paymentMethod'] = 'Payment method is required.';
    }

    if (this.formData.userId !== undefined && this.formData.userId !== null && this.formData.userId <= 0) {
      this.formErrors['userId'] = 'User ID must be a positive number.';
    }

    if (this.formData.message && this.formData.message.length > 500) {
      this.formErrors['message'] = 'Message must not exceed 500 characters.';
    }

    return Object.keys(this.formErrors).length === 0;
  }

  saveDonation(): void {
    this.formSubmitted = true;
    if (!this.validateForm()) return;

    this.isSaving = true;
    const data = { ...this.formData } as Donation;

    const obs = this.isEditing
      ? this.donationService.update(data.id!, data)
      : this.donationService.create(data);

    obs.subscribe({
      next: () => {
        this.showModal = false;
        this.isSaving = false;
        this.formData = {};
        this.selectedDonation = null;
        this.loadDonations();
        this.cdr.markForCheck();
      },
      error: (err: unknown) => {
        console.error('Failed to save donation:', err);
        this.isSaving = false;
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
}
