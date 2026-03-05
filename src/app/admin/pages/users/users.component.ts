import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../../user/user/services/user.service';
import { User, Role } from '../../../user/user/models/user.model';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './users.component.html'
})
export class UsersComponent implements OnInit {
  allUsers: User[] = [];
  selectedUser: User | null = null;
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  searchQuery = '';

  // Tabs
  tabs = ['All Users', 'Tutors', 'Students', 'Admins', 'Banned'];
  activeTab = 'All Users';

  // Modal state
  showModal = false;
  modalMode: 'add' | 'edit' = 'add';
  showDeleteConfirm = false;
  userToDelete: User | null = null;
  isSaving = false;

  // Form fields
  form: Partial<User> = {};
  formTouched: Record<string, boolean> = {};

  // ─── PAGINATION ───────────────────────────────────────────
  currentPage = 1;
  pageSize = 8;
  pageSizeOptions = [5, 8, 10, 20, 50];
  // ──────────────────────────────────────────────────────────

  constructor(private userService: UserService) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  // --- Data Loading ---

  loadUsers(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.userService.getAllUsers().subscribe({
      next: (users) => {
        this.allUsers = users;
        this.isLoading = false;
      },
      error: (err: any) => {
        this.isLoading = false;
        this.errorMessage = typeof err === 'string' ? err : 'Failed to load users.';
      }
    });
  }

  // --- Stats ---

  get stats() {
    const total = this.allUsers.length;
    const tutors = this.allUsers.filter(u => u.role === 'TUTEUR').length;
    const students = this.allUsers.filter(u => u.role === 'ETUDIANT').length;
    const admins = this.allUsers.filter(u => u.role === 'ADMIN').length;
    return [
      { label: 'Total Users', value: total.toLocaleString(), sub: `${tutors + students + admins} accounts`, subColor: 'text-green-500', valueColor: 'text-[#38a9f3]' },
      { label: 'Tutors', value: tutors.toLocaleString(), sub: `${tutors} registered`, subColor: 'text-green-500', valueColor: 'text-[#38a9f3]' },
      { label: 'Students', value: students.toLocaleString(), sub: `${students} registered`, subColor: 'text-[#9ca3af]', valueColor: 'text-[#0f1419]' },
      { label: 'Admins', value: admins.toLocaleString(), sub: `${admins} registered`, subColor: 'text-[#536471]', valueColor: 'text-[#0f1419]' }
    ];
  }

  // --- Filtering ---

  get filteredUsers(): User[] {
    let users = this.allUsers;

    if (this.activeTab === 'Tutors') users = users.filter(u => u.role === 'TUTEUR');
    else if (this.activeTab === 'Students') users = users.filter(u => u.role === 'ETUDIANT');
    else if (this.activeTab === 'Admins') users = users.filter(u => u.role === 'ADMIN');
    else if (this.activeTab === 'Banned') users = users.filter(u => u.banned);

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      users = users.filter(u =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q)
      );
    }

    return users;
  }

  // ─── PAGINATION COMPUTED ──────────────────────────────────

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredUsers.length / this.pageSize));
  }

  get paginatedUsers(): User[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredUsers.slice(start, start + this.pageSize);
  }

  get pageNumbers(): (number | '...')[] {
    const total = this.totalPages;
    const current = this.currentPage;
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

    const pages: (number | '...')[] = [1];
    if (current > 3) pages.push('...');
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (current < total - 2) pages.push('...');
    pages.push(total);
    return pages;
  }

  get startIndex(): number {
    return this.filteredUsers.length === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1;
  }

  get endIndex(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredUsers.length);
  }

  goToPage(page: number | '...'): void {
    if (page === '...' || typeof page !== 'number') return;
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
  }

  prevPage(): void {
    if (this.currentPage > 1) this.currentPage--;
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) this.currentPage++;
  }

  onTabChange(tab: string): void {
    this.activeTab = tab;
    this.currentPage = 1;
  }

  onSearchChange(): void {
    this.currentPage = 1;
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
  }
  // ──────────────────────────────────────────────────────────

  selectUser(user: User): void {
    this.selectedUser = user;
  }

  closePanel(): void {
    this.selectedUser = null;
  }

  getRoleBadgeClass(role: string): string {
    switch (role) {
      case 'ADMIN': return 'bg-purple-100 text-purple-600';
      case 'TUTEUR': return 'bg-blue-100 text-blue-600';
      case 'ETUDIANT': return 'bg-green-100 text-green-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  }

  getRoleLabel(role: string): string {
    switch (role) {
      case 'ADMIN': return 'Admin';
      case 'TUTEUR': return 'Tutor';
      case 'ETUDIANT': return 'Student';
      default: return role;
    }
  }

  // --- ADD ---

  openAddModal(): void {
    this.modalMode = 'add';
    this.form = {
      name: '', username: '', email: '', pwd: '',
      numTel: '', dateNaiss: '', role: 'ETUDIANT',
      inscriptionOk: true, posterForum: true, avatar: ''
    };
    this.formTouched = {};
    this.showModal = true;
    this.errorMessage = '';
    this.successMessage = '';
  }

  // --- EDIT ---

  openEditModal(user: User): void {
    this.modalMode = 'edit';
    this.form = { ...user };
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

  saveUser(): void {
    this.formTouched = { name: true, username: true, email: true, pwd: true, numTel: true, dateNaiss: true };
    if (!this.isFormValid) return;

    this.isSaving = true;
    this.errorMessage = '';

    if (this.modalMode === 'add') {
      const payload: Partial<User> = {
        name: this.form.name?.trim(),
        username: this.form.username?.trim(),
        email: this.form.email?.trim(),
        pwd: this.form.pwd,
        numTel: this.form.numTel?.trim(),
        dateNaiss: this.form.dateNaiss,
        role: this.form.role as Role,
        inscriptionOk: true,
        posterForum: true,
        avatar: ''
      };

      this.userService.signUp(payload).subscribe({
        next: () => {
          this.isSaving = false;
          this.closeModal();
          this.successMessage = 'User created successfully.';
          this.loadUsers();
          this.clearSuccessAfterDelay();
        },
        error: (err: any) => {
          this.isSaving = false;
          this.errorMessage = typeof err === 'string' ? err : 'Failed to create user.';
        }
      });
    } else {
      const userId = this.form.id!;
      this.userService.updateUser(userId, this.form as User).subscribe({
        next: (updated) => {
          this.isSaving = false;
          this.closeModal();
          this.successMessage = 'User updated successfully.';
          this.loadUsers();
          if (this.selectedUser?.id === userId) this.selectedUser = updated;
          this.clearSuccessAfterDelay();
        },
        error: (err: any) => {
          this.isSaving = false;
          this.errorMessage = typeof err === 'string' ? err : 'Failed to update user.';
        }
      });
    }
  }

  // --- DELETE ---

  confirmDelete(user: User): void {
    this.userToDelete = user;
    this.showDeleteConfirm = true;
  }

  cancelDelete(): void {
    this.showDeleteConfirm = false;
    this.userToDelete = null;
  }

  deleteUser(): void {
    if (!this.userToDelete) return;
    const id = this.userToDelete.id;

    this.isSaving = true;
    this.userService.deleteUser(id).subscribe({
      next: () => {
        this.isSaving = false;
        this.showDeleteConfirm = false;
        this.userToDelete = null;
        if (this.selectedUser?.id === id) this.selectedUser = null;
        this.successMessage = 'User deleted successfully.';
        this.loadUsers();
        // Go to prev page if current page becomes empty
        if (this.paginatedUsers.length === 1 && this.currentPage > 1) {
          this.currentPage--;
        }
        this.clearSuccessAfterDelay();
      },
      error: (err: any) => {
        this.isSaving = false;
        this.errorMessage = typeof err === 'string' ? err : 'Failed to delete user.';
        this.showDeleteConfirm = false;
      }
    });
  }

  // --- BAN / UNBAN ---

  showBanConfirm = false;
  userToBan: User | null = null;
  banAction: 'ban' | 'unban' = 'ban';
  banReason = '';
  banDuration = '7_days';
  banReasonError = '';

  banReasons = [
    'Spam or advertising',
    'Inappropriate behavior',
    'Harassment or bullying',
    'Cheating or fraud',
    'Fake account',
    'Violation of terms of service',
    'Offensive content',
    'Other'
  ];

  confirmBan(user: User): void {
    if (!user.banned && user.role === 'ADMIN') {
      this.errorMessage = 'Cannot ban an admin user.';
      setTimeout(() => { this.errorMessage = ''; }, 3000);
      return;
    }
    this.userToBan = user;
    this.banAction = user.banned ? 'unban' : 'ban';
    this.banReason = '';
    this.banDuration = '7_days';
    this.banReasonError = '';
    this.showBanConfirm = true;
  }

  cancelBan(): void {
    this.showBanConfirm = false;
    this.userToBan = null;
  }

  executeBan(): void {
    if (!this.userToBan) return;
    if (this.banAction === 'ban' && !this.banReason.trim()) {
      this.banReasonError = 'Please select a ban reason.';
      return;
    }
    this.banReasonError = '';

    const id = this.userToBan.id;
    const action = this.banAction;
    const updatedUser: User = { ...this.userToBan };

    if (action === 'ban') {
      updatedUser.banned = true;
      updatedUser.banReason = this.banReason.trim();
      updatedUser.banDuration = this.banDuration;
      updatedUser.banExpiresAt = this.calcBanExpiry(this.banDuration) ?? undefined;
    } else {
      updatedUser.banned = false;
      updatedUser.banReason = undefined;
      updatedUser.banDuration = undefined;
      updatedUser.banExpiresAt = undefined;
    }

    this.isSaving = true;
    this.userService.updateUser(id, updatedUser).subscribe({
      next: (updated) => {
        this.isSaving = false;
        this.showBanConfirm = false;
        this.userToBan = null;
        const banApplied = action === 'ban' ? updated.banned === true : updated.banned !== true;
        if (banApplied) {
          this.successMessage = action === 'ban' ? 'User banned successfully.' : 'User unbanned successfully.';
        } else {
          this.errorMessage = `The ${action} operation was not saved by the server.`;
        }
        this.loadUsers();
        if (this.selectedUser?.id === id) this.selectedUser = updated;
        this.clearSuccessAfterDelay();
      },
      error: (err: any) => {
        this.isSaving = false;
        this.errorMessage = typeof err === 'string' ? err : `Failed to ${action} user.`;
        this.showBanConfirm = false;
      }
    });
  }

  private calcBanExpiry(duration: string): string | null {
    if (duration === 'permanent') return null;
    const now = new Date();
    const days: Record<string, number> = { '1_day': 1, '3_days': 3, '7_days': 7, '30_days': 30 };
    const d = days[duration] || 7;
    now.setDate(now.getDate() + d);
    return now.toISOString();
  }

  // --- Form Validation ---

  get isFormValid(): boolean {
    const f = this.form;
    const hasBase = !!(f.name?.trim() && f.username?.trim() && f.email?.trim() && f.numTel?.trim() && f.dateNaiss);
    if (this.modalMode === 'add') return hasBase && !!(f.pwd && f.pwd.length >= 6);
    return hasBase;
  }

  fieldError(field: string): string {
    if (!this.formTouched[field]) return '';
    const val = (this.form as any)[field];
    if (field === 'pwd' && this.modalMode === 'add') {
      if (!val) return 'Password is required.';
      if (val.length < 6) return 'Min. 6 characters.';
    }
    if (!val || (typeof val === 'string' && !val.trim())) {
      const labels: Record<string, string> = {
        name: 'Name', username: 'Username', email: 'Email',
        numTel: 'Phone', dateNaiss: 'Date of birth'
      };
      return `${labels[field] || field} is required.`;
    }
    if (field === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return 'Invalid email.';
    return '';
  }

  getDurationLabel(duration?: string): string {
    const labels: Record<string, string> = {
      '1_day': '1 Day', '3_days': '3 Days', '7_days': '7 Days',
      '30_days': '30 Days', 'permanent': 'Permanent'
    };
    return labels[duration || ''] || duration || 'Unknown';
  }

  private clearSuccessAfterDelay(): void {
    setTimeout(() => { this.successMessage = ''; }, 3000);
  }
}