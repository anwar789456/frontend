import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReclamationService } from './services/reclamation.service';
import { Reclamation, ReclamationStatus, ReclamationPriority } from './models/reclamation.model';

@Component({
  selector: 'app-admin-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reports.component.html'
})
export class ReportsComponent implements OnInit {
  allReports: Reclamation[] = [];
  selectedReport: Reclamation | null = null;
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  searchQuery = '';

  // Tabs
  tabs: string[] = ['All', 'Pending', 'Investigating', 'Resolved', 'Archived'];
  activeTab = 'All';

  // Modal state
  showModal = false;
  modalMode: 'add' | 'edit' = 'add';
  showDeleteConfirm = false;
  reportToDelete: Reclamation | null = null;
  isSaving = false;

  // Form
  form: Partial<Reclamation> = {};
  formTouched: Record<string, boolean> = {};

  constructor(private reclamationService: ReclamationService) {}

  ngOnInit(): void {
    this.loadReports();
  }

  // --- Data Loading ---

  loadReports(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.reclamationService.getAll().subscribe({
      next: (reports) => {
        this.allReports = reports;
        this.isLoading = false;
      },
      error: (err: any) => {
        this.isLoading = false;
        this.errorMessage = typeof err === 'string' ? err : 'Failed to load reports.';
      }
    });
  }

  // --- Stats ---

  get stats() {
    const total = this.allReports.length;
    const pending = this.allReports.filter(r => r.status === 'PENDING').length;
    const investigating = this.allReports.filter(r => r.status === 'INVESTIGATING').length;
    const resolved = this.allReports.filter(r => r.status === 'RESOLVED').length;
    const archived = this.allReports.filter(r => r.status === 'ARCHIVED').length;
    return [
      { label: 'Total Reports', value: total.toLocaleString(), sub: `${pending} need attention`, subColor: pending > 0 ? 'text-red-500' : 'text-green-500', valueColor: 'text-[#38a9f3]' },
      { label: 'Pending', value: pending.toLocaleString(), sub: pending > 0 ? 'Requires action' : 'All clear', subColor: pending > 0 ? 'text-red-500' : 'text-green-500', valueColor: pending > 0 ? 'text-red-500' : 'text-[#0f1419]' },
      { label: 'Investigating', value: investigating.toLocaleString(), sub: `${investigating} in progress`, subColor: 'text-blue-500', valueColor: 'text-[#0f1419]' },
      { label: 'Resolved', value: resolved.toLocaleString(), sub: `${archived} archived`, subColor: 'text-green-500', valueColor: 'text-[#0f1419]' }
    ];
  }

  // --- Filtering ---

  get filteredReports(): Reclamation[] {
    let reports = this.allReports;

    if (this.activeTab === 'Pending') {
      reports = reports.filter(r => r.status === 'PENDING');
    } else if (this.activeTab === 'Investigating') {
      reports = reports.filter(r => r.status === 'INVESTIGATING');
    } else if (this.activeTab === 'Resolved') {
      reports = reports.filter(r => r.status === 'RESOLVED');
    } else if (this.activeTab === 'Archived') {
      reports = reports.filter(r => r.status === 'ARCHIVED');
    }

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      reports = reports.filter(r =>
        r.sujet.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q) ||
        r.priorite.toLowerCase().includes(q) ||
        (r.userName?.toLowerCase().includes(q) ?? false) ||
        (r.userEmail?.toLowerCase().includes(q) ?? false) ||
        r.id.toString().includes(q)
      );
    }

    return reports;
  }

  selectReport(report: Reclamation): void {
    this.selectedReport = report;
  }

  closePanel(): void {
    this.selectedReport = null;
  }

  // --- Helpers ---

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'PENDING': return 'bg-orange-100 text-orange-600';
      case 'INVESTIGATING': return 'bg-blue-100 text-blue-600';
      case 'RESOLVED': return 'bg-green-100 text-green-600';
      case 'ARCHIVED': return 'bg-gray-100 text-gray-500';
      default: return 'bg-gray-100 text-gray-600';
    }
  }

  getStatusLabel(status: string): string {
    return status.charAt(0) + status.slice(1).toLowerCase();
  }

  getPriorityBadgeClass(priority: string): string {
    switch (priority) {
      case 'HIGH': return 'text-red-500';
      case 'MEDIUM': return 'text-orange-500';
      case 'LOW': return 'text-green-500';
      default: return 'text-gray-500';
    }
  }

  // --- ADD ---

  openAddModal(): void {
    this.modalMode = 'add';
    this.form = {
      sujet: '',
      description: '',
      status: 'PENDING',
      priorite: 'MEDIUM',
      dateCreation: new Date().toISOString().split('T')[0],
      userId: 0
    };
    this.formTouched = {};
    this.showModal = true;
    this.errorMessage = '';
    this.successMessage = '';
  }

  // --- EDIT ---

  openEditModal(report: Reclamation): void {
    this.modalMode = 'edit';
    this.form = { ...report };
    this.formTouched = {};
    this.showModal = true;
    this.errorMessage = '';
    this.successMessage = '';
  }

  closeModal(): void {
    this.showModal = false;
    this.form = {};
    this.formTouched = {};
  }

  // --- SAVE ---

  saveReport(): void {
    this.formTouched = { sujet: true, description: true, userId: true };

    if (!this.isFormValid) return;

    this.isSaving = true;
    this.errorMessage = '';

    if (this.modalMode === 'add') {
      this.reclamationService.create(this.form).subscribe({
        next: () => {
          this.isSaving = false;
          this.closeModal();
          this.successMessage = 'Report created successfully.';
          this.loadReports();
          this.clearSuccessAfterDelay();
        },
        error: (err: any) => {
          this.isSaving = false;
          this.errorMessage = typeof err === 'string' ? err : 'Failed to create report.';
        }
      });
    } else {
      const id = this.form.id!;
      this.reclamationService.update(id, this.form as Reclamation).subscribe({
        next: (updated) => {
          this.isSaving = false;
          this.closeModal();
          this.successMessage = 'Report updated successfully.';
          this.loadReports();
          if (this.selectedReport?.id === id) {
            this.selectedReport = updated;
          }
          this.clearSuccessAfterDelay();
        },
        error: (err: any) => {
          this.isSaving = false;
          this.errorMessage = typeof err === 'string' ? err : 'Failed to update report.';
        }
      });
    }
  }

  // --- Quick status update from detail panel ---

  updateStatus(report: Reclamation, newStatus: ReclamationStatus): void {
    const updated = { ...report, status: newStatus };
    this.reclamationService.update(report.id, updated).subscribe({
      next: (result) => {
        this.successMessage = `Report marked as ${this.getStatusLabel(newStatus)}.`;
        this.loadReports();
        if (this.selectedReport?.id === report.id) {
          this.selectedReport = result;
        }
        this.clearSuccessAfterDelay();
      },
      error: (err: any) => {
        this.errorMessage = typeof err === 'string' ? err : 'Failed to update status.';
      }
    });
  }

  // --- DELETE ---

  confirmDelete(report: Reclamation): void {
    this.reportToDelete = report;
    this.showDeleteConfirm = true;
  }

  cancelDelete(): void {
    this.showDeleteConfirm = false;
    this.reportToDelete = null;
  }

  deleteReport(): void {
    if (!this.reportToDelete) return;
    const id = this.reportToDelete.id;

    this.isSaving = true;
    this.reclamationService.delete(id).subscribe({
      next: () => {
        this.isSaving = false;
        this.showDeleteConfirm = false;
        this.reportToDelete = null;
        if (this.selectedReport?.id === id) {
          this.selectedReport = null;
        }
        this.successMessage = 'Report deleted successfully.';
        this.loadReports();
        this.clearSuccessAfterDelay();
      },
      error: (err: any) => {
        this.isSaving = false;
        this.errorMessage = typeof err === 'string' ? err : 'Failed to delete report.';
        this.showDeleteConfirm = false;
      }
    });
  }

  // --- Form Validation ---

  get isFormValid(): boolean {
    const f = this.form;
    return !!(f.sujet?.trim() && f.description?.trim());
  }

  fieldError(field: string): string {
    if (!this.formTouched[field]) return '';
    const val = (this.form as any)[field];
    if (!val || (typeof val === 'string' && !val.trim())) {
      const labels: Record<string, string> = {
        sujet: 'Subject', description: 'Description', userId: 'User ID'
      };
      return `${labels[field] || field} is required.`;
    }
    return '';
  }

  private clearSuccessAfterDelay(): void {
    setTimeout(() => { this.successMessage = ''; }, 3000);
  }
}
