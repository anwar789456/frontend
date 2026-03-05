import { Component, OnInit, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { UserService } from '../../services/user.service';
import { User } from '../../models/user.model';
import { AuthService } from '../../../../shared/services/auth.service';
import { OnboardingComponent, OnboardingStep } from '../../../../shared/components/onboarding/onboarding.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, OnboardingComponent],
  templateUrl: './profile.component.html',
  changeDetection: ChangeDetectionStrategy.Default
})
export class ProfileComponent implements OnInit {
  user: User | null = null;
  isLoading = true;
  isEditing = false;
  editName = '';
  editUsername = '';
  avatarPreview: string | null = null;
  selectedFile: File | null = null;
  isSaving = false;
  successMessage = '';
  errorMessage = '';

  // --- Change Password ---
  showPasswordSection = false;
  currentPassword = '';
  newPassword = '';
  confirmNewPassword = '';
  showCurrentPassword = false;
  showNewPassword = false;
  showConfirmNewPassword = false;
  isChangingPassword = false;
  passwordSuccessMessage = '';
  passwordErrorMessage = '';
  currentPasswordTouched = false;
  newPasswordTouched = false;
  confirmNewPasswordTouched = false;

  // Onboarding steps
  profileOnboardingSteps: OnboardingStep[] = [
    {
      title: 'Your Profile! 👤',
      description: 'This is your personal space on MinoLingo. View your stats, achievements, and customize your profile!',
      icon: '🏠',
      mascotMessage: 'Your space!',
      highlightColor: '#38a9f3'
    },
    {
      title: 'Track Your Progress 📊',
      description: 'See your XP, streaks, coins, and learning stats. Keep pushing to reach new milestones!',
      icon: '📈',
      mascotMessage: 'Keep going!',
      highlightColor: '#22c55e'
    },
    {
      title: 'Edit Your Info ✏️',
      description: 'Click "Edit Profile" to update your name, username, or profile picture anytime!',
      icon: '🎨',
      mascotMessage: 'Make it yours!',
      highlightColor: '#6366f1'
    },
    {
      title: 'Stay Secure 🔒',
      description: 'You can change your password anytime in the security section. Keep your account safe!',
      icon: '🛡️',
      mascotMessage: 'Stay safe!',
      highlightColor: '#f59e0b'
    }
  ];

  get isStudent(): boolean {
    return this.user?.role === 'ETUDIANT';
  }

  get defaultAvatar(): string {
    const name = encodeURIComponent(this.user?.name || 'U');
    return `https://ui-avatars.com/api/?name=${name}&background=38a9f3&color=fff&size=128`;
  }

  get displayAvatar(): string {
    return this.user?.avatar || this.defaultAvatar;
  }

  // --- Password Validators ---

  get currentPasswordError(): string {
    if (!this.currentPasswordTouched) return '';
    if (!this.currentPassword) return 'Current password is required.';
    return '';
  }

  get newPasswordError(): string {
    if (!this.newPasswordTouched) return '';
    if (!this.newPassword) return 'New password is required.';
    if (this.newPassword.length < 6) return 'Password must be at least 6 characters.';
    if (this.newPassword === this.currentPassword) return 'New password must differ from current.';
    return '';
  }

  get confirmNewPasswordError(): string {
    if (!this.confirmNewPasswordTouched) return '';
    if (!this.confirmNewPassword) return 'Please confirm your new password.';
    if (this.confirmNewPassword !== this.newPassword) return 'Passwords do not match.';
    return '';
  }

  get newPasswordStrength(): { label: string; color: string; percent: number } {
    const pwd = this.newPassword;
    if (!pwd) return { label: '', color: '', percent: 0 };
    let score = 0;
    if (pwd.length >= 6) score++;
    if (pwd.length >= 10) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[a-z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    if (score <= 2) return { label: 'Weak', color: 'bg-red-500', percent: 33 };
    if (score <= 4) return { label: 'Medium', color: 'bg-orange-400', percent: 66 };
    return { label: 'Strong', color: 'bg-green-500', percent: 100 };
  }

  get isPasswordFormValid(): boolean {
    return (
      !!this.currentPassword &&
      this.newPassword.length >= 6 &&
      this.newPassword !== this.currentPassword &&
      this.confirmNewPassword === this.newPassword
    );
  }

  constructor(
    private userService: UserService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadUser();
  }

  private loadUser(): void {
    this.isLoading = true;
    const authUser = this.authService.currentUser;
    if (authUser) {
      this.userService.getUserById(authUser.id).subscribe({
        next: (u) => {
          this.user = { ...u };
          localStorage.setItem('auth_user', JSON.stringify(u));
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.user = authUser as unknown as User;
          this.isLoading = false;
          this.cdr.markForCheck();
        }
      });
    } else {
      this.isLoading = false;
      this.errorMessage = 'No user session found. Please log in.';
    }
  }

  toggleEdit(): void {
    if (!this.user || !this.isStudent) return;
    this.isEditing = !this.isEditing;
    if (this.isEditing) {
      this.editName = this.user.name;
      this.editUsername = this.user.username;
      this.avatarPreview = null;
      this.selectedFile = null;
      this.successMessage = '';
      this.errorMessage = '';
      // Reset password section when opening edit
      this.showPasswordSection = false;
      this.resetPasswordForm();
    }
  }

  togglePasswordSection(): void {
    this.showPasswordSection = !this.showPasswordSection;
    if (!this.showPasswordSection) {
      this.resetPasswordForm();
    }
  }

  resetPasswordForm(): void {
    this.currentPassword = '';
    this.newPassword = '';
    this.confirmNewPassword = '';
    this.showCurrentPassword = false;
    this.showNewPassword = false;
    this.showConfirmNewPassword = false;
    this.currentPasswordTouched = false;
    this.newPasswordTouched = false;
    this.confirmNewPasswordTouched = false;
    this.passwordSuccessMessage = '';
    this.passwordErrorMessage = '';
  }

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      if (file.size > 5 * 1024 * 1024) {
        this.errorMessage = 'Avatar file must be less than 5 MB.';
        return;
      }
      this.selectedFile = file;
      this.errorMessage = '';
      const reader = new FileReader();
      reader.onload = (e) => {
        this.avatarPreview = e.target?.result as string;
        this.cdr.markForCheck();
      };
      reader.readAsDataURL(file);
    }
  }

  onAvatarError(event: Event): void {
    (event.target as HTMLImageElement).src = this.defaultAvatar;
  }

  saveProfile(): void {
    if (!this.user) return;
    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';

    const doUpdate = () => {
      const updatedUser: User = {
        ...this.user!,
        name: this.editName,
        username: this.editUsername
      };
      this.userService.updateUser(this.user!.id, updatedUser).subscribe({
        next: (updated) => {
          this.user = { ...updated };
          localStorage.setItem('auth_user', JSON.stringify(updated));
          this.isEditing = false;
          this.isSaving = false;
          this.successMessage = 'Profile updated successfully.';
          this.cdr.markForCheck();
          setTimeout(() => { this.successMessage = ''; this.cdr.markForCheck(); }, 4000);
        },
        error: (err: any) => {
          this.isSaving = false;
          this.errorMessage = typeof err === 'string' ? err : 'Failed to update profile.';
        }
      });
    };

    if (this.selectedFile) {
      this.userService.uploadAvatar(this.user.id, this.selectedFile).subscribe({
        next: (avatarUrl) => {
          this.user = { ...this.user!, avatar: avatarUrl };
          localStorage.setItem('auth_user', JSON.stringify(this.user));
          doUpdate();
        },
        error: (err: any) => {
          this.isSaving = false;
          this.errorMessage = typeof err === 'string' ? err : 'Failed to upload avatar.';
        }
      });
    } else {
      doUpdate();
    }
  }

  cancelEdit(): void {
    this.isEditing = false;
    this.avatarPreview = null;
    this.selectedFile = null;
    this.errorMessage = '';
    this.resetPasswordForm();
    this.showPasswordSection = false;
  }

  changePassword(): void {
    this.currentPasswordTouched = true;
    this.newPasswordTouched = true;
    this.confirmNewPasswordTouched = true;

    if (!this.isPasswordFormValid) return;

    this.isChangingPassword = true;
    this.passwordErrorMessage = '';
    this.passwordSuccessMessage = '';

    this.userService.changePassword(this.user!.id, this.currentPassword, this.newPassword).subscribe({
      next: () => {
        this.isChangingPassword = false;
        this.passwordSuccessMessage = 'Password changed successfully! ';
        this.cdr.markForCheck();
        // Reload user data so this.user.pwd reflects the new password
        this.userService.getUserById(this.user!.id).subscribe({
          next: (u) => {
            this.user = { ...u };
            localStorage.setItem('auth_user', JSON.stringify(u));
            this.cdr.markForCheck();
          }
        });
        this.resetPasswordForm();
        this.showPasswordSection = false;
        setTimeout(() => { this.passwordSuccessMessage = ''; this.cdr.markForCheck(); }, 4000);
      },
      error: (err: any) => {
        this.isChangingPassword = false;
        this.passwordErrorMessage = typeof err === 'string' ? err : (err?.message || 'Failed to change password.');
      }
    });
  }
}