import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../../user/user/services/user.service';
import { User } from '../../../user/user/models/user.model';
import { AuthService } from '../../../shared/services/auth.service';
import { FaceRecognitionComponent } from '../../../shared/components/face-recognition/face-recognition.component';

@Component({
  selector: 'app-tutor-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, FaceRecognitionComponent],
  templateUrl: './profile.component.html'
})
export class TutorProfileComponent implements OnInit {
  user: User | null = null;
  isLoading = true;
  isEditing = false;

  // Edit form fields
  editName = '';
  editUsername = '';
  editBio = '';
  avatarPreview: string | null = null;
  selectedFile: File | null = null;
  isSaving = false;
  successMessage = '';
  errorMessage = '';

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

  get defaultAvatar(): string {
    const name = encodeURIComponent(this.user?.name || 'T');
    return `https://ui-avatars.com/api/?name=${name}&background=38a9f3&color=fff&size=128`;
  }

  get displayAvatar(): string {
    return this.avatarPreview || this.user?.avatar || this.defaultAvatar;
  }

  get joinDateFormatted(): string {
    if (!this.user?.joinDate) return 'N/A';
    try {
      return new Date(this.user.joinDate).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
      });
    } catch {
      return this.user.joinDate;
    }
  }

  get experienceLabel(): string {
    const yrs = this.user?.yearsOfExperience;
    if (!yrs && yrs !== 0) return 'N/A';
    return yrs === 1 ? '1 Year' : `${yrs} Years`;
  }

  get memberSinceDays(): number {
    if (!this.user?.joinDate) return 0;
    const join = new Date(this.user.joinDate);
    const now = new Date();
    return Math.floor((now.getTime() - join.getTime()) / (1000 * 60 * 60 * 24));
  }

  toggleEdit(): void {
    this.isEditing = !this.isEditing;
    if (this.isEditing && this.user) {
      this.editName = this.user.name || '';
      this.editUsername = this.user.username || '';
      this.editBio = this.user.bio || '';
      this.avatarPreview = null;
      this.selectedFile = null;
      this.successMessage = '';
      this.errorMessage = '';
    }
  }

  cancelEdit(): void {
    this.isEditing = false;
    this.avatarPreview = null;
    this.selectedFile = null;
    this.errorMessage = '';
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
        username: this.editUsername,
        bio: this.editBio
      };
      this.userService.updateUser(this.user!.id, updatedUser).subscribe({
        next: (updated) => {
          this.user = { ...updated };
          localStorage.setItem('auth_user', JSON.stringify(updated));
          this.isEditing = false;
          this.isSaving = false;
          this.successMessage = 'Profile updated successfully!';
          this.avatarPreview = null;
          this.selectedFile = null;
          this.cdr.markForCheck();
          setTimeout(() => { this.successMessage = ''; this.cdr.markForCheck(); }, 4000);
        },
        error: (err: any) => {
          this.isSaving = false;
          this.errorMessage = typeof err === 'string' ? err : 'Failed to update profile.';
          this.cdr.markForCheck();
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
          this.cdr.markForCheck();
        }
      });
    } else {
      doUpdate();
    }
  }
}
