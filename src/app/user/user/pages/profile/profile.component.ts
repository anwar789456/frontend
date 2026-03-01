import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../services/user.service';
import { User } from '../../models/user.model';
import { AuthService } from '../../../../shared/services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.component.html'
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

  constructor(private userService: UserService, private authService: AuthService) {}

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
        },
        error: () => {
          this.user = authUser as unknown as User;
          this.isLoading = false;
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
    }
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
          setTimeout(() => this.successMessage = '', 4000);
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
  }
}