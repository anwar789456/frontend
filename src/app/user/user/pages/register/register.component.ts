import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { UserService } from '../../services/user.service';
import { User, Role } from '../../models/user.model';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.component.html'
})
export class RegisterComponent {
  // Step tracking
  currentStep = 1;
  totalSteps = 2;

  // Step 1 fields
  name = '';
  username = '';
  email = '';
  password = '';
  confirmPassword = '';
  showPassword = false;
  showConfirmPassword = false;

  // Step 2 fields
  numTel = '';
  dateNaiss = '';
  role: Role = 'ETUDIANT';

  // TUTEUR-specific
  CIN = '';
  yearsOfExperience: number | null = null;
  specialization = '';
  cvFile: File | null = null;
  cvFileName = '';
  cvError = '';

  // State
  errorMessage = '';
  successMessage = '';
  isLoading = false;

  // Touched tracking
  nameTouched = false;
  usernameTouched = false;
  emailTouched = false;
  passwordTouched = false;
  confirmPasswordTouched = false;
  numTelTouched = false;
  dateNaissTouched = false;
  CINTouched = false;
  yearsOfExperienceTouched = false;
  specializationTouched = false;

  constructor(
    private userService: UserService,
    private router: Router
  ) {}

  // --- Step 1 Validators ---

  get nameError(): string {
    if (!this.nameTouched) return '';
    if (!this.name.trim()) return 'Full name is required.';
    if (this.name.trim().length < 2) return 'Name must be at least 2 characters.';
    return '';
  }

  get usernameError(): string {
    if (!this.usernameTouched) return '';
    if (!this.username.trim()) return 'Username is required.';
    if (this.username.trim().length < 3) return 'Username must be at least 3 characters.';
    if (!/^[a-zA-Z0-9_]+$/.test(this.username)) return 'Only letters, numbers and underscores.';
    return '';
  }

  get emailError(): string {
    if (!this.emailTouched) return '';
    if (!this.email.trim()) return 'Email is required.';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email)) return 'Please enter a valid email address.';
    return '';
  }

  get passwordError(): string {
    if (!this.passwordTouched) return '';
    if (!this.password) return 'Password is required.';
    if (this.password.length < 6) return 'Password must be at least 6 characters.';
    return '';
  }

  get passwordStrength(): { level: number; label: string; color: string; percent: number } {
    const pwd = this.password;
    if (!pwd) return { level: 0, label: '', color: '', percent: 0 };

    let score = 0;
    if (pwd.length >= 6) score++;
    if (pwd.length >= 10) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[a-z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    if (score <= 2) return { level: 1, label: 'Low', color: 'bg-red-500', percent: 33 };
    if (score <= 4) return { level: 2, label: 'Medium', color: 'bg-orange-400', percent: 66 };
    return { level: 3, label: 'High', color: 'bg-green-500', percent: 100 };
  }

  get confirmPasswordError(): string {
    if (!this.confirmPasswordTouched) return '';
    if (!this.confirmPassword) return 'Please confirm your password.';
    if (this.confirmPassword !== this.password) return 'Passwords do not match.';
    return '';
  }

  // --- Step 2 Validators ---

  get numTelError(): string {
    if (!this.numTelTouched) return '';
    if (!this.numTel.trim()) return 'Phone number is required.';
    if (!/^[0-9+\-\s()]{7,20}$/.test(this.numTel.trim())) return 'Please enter a valid phone number.';
    return '';
  }

  get dateNaissError(): string {
    if (!this.dateNaissTouched) return '';
    if (!this.dateNaiss) return 'Date of birth is required.';
    return '';
  }

  get CINError(): string {
    if (!this.CINTouched) return '';
    if (!this.CIN.trim()) return 'CIN is required for tutors.';
    if (!/^[01]\d{7}$/.test(this.CIN.trim())) return 'CIN must be 8 digits and start with 0 or 1.';
    return '';
  }

  get yearsOfExperienceError(): string {
    if (!this.yearsOfExperienceTouched) return '';
    if (this.yearsOfExperience === null || this.yearsOfExperience === undefined) return 'Years of experience is required.';
    if (this.yearsOfExperience < 0) return 'Must be a positive number.';
    return '';
  }

  get specializationError(): string {
    if (!this.specializationTouched) return '';
    if (!this.specialization.trim()) return 'Specialization is required for tutors.';
    return '';
  }

  // --- Step validation ---

  get isStep1Valid(): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return (
      this.name.trim().length >= 2 &&
      this.username.trim().length >= 3 &&
      /^[a-zA-Z0-9_]+$/.test(this.username) &&
      emailRegex.test(this.email) &&
      this.password.length >= 6 &&
      this.confirmPassword === this.password
    );
  }

  get isStep2Valid(): boolean {
    const baseValid =
      /^[0-9+\-\s()]{7,20}$/.test(this.numTel.trim()) &&
      !!this.dateNaiss;

    if (this.role === 'TUTEUR') {
      return (
        baseValid &&
        this.CIN.trim().length > 0 &&
        this.yearsOfExperience !== null &&
        this.yearsOfExperience >= 0 &&
        this.specialization.trim().length > 0
      );
    }

    return baseValid;
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPassword(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  nextStep(): void {
    this.nameTouched = true;
    this.usernameTouched = true;
    this.emailTouched = true;
    this.passwordTouched = true;
    this.confirmPasswordTouched = true;

    if (this.isStep1Valid) {
      this.errorMessage = '';
      this.currentStep = 2;
    }
  }

  prevStep(): void {
    this.errorMessage = '';
    this.currentStep = 1;
  }

  onCvSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.cvError = '';
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedTypes.includes(file.type)) {
      this.cvError = 'Only PDF, DOC, and DOCX files are allowed.';
      input.value = '';
      return;
    }
    if (file.size > maxSize) {
      this.cvError = 'File size must be less than 5 MB.';
      input.value = '';
      return;
    }

    this.cvFile = file;
    this.cvFileName = file.name;
  }

  removeCv(): void {
    this.cvFile = null;
    this.cvFileName = '';
    this.cvError = '';
  }

  onSubmit(): void {
    this.numTelTouched = true;
    this.dateNaissTouched = true;
    if (this.role === 'TUTEUR') {
      this.CINTouched = true;
      this.yearsOfExperienceTouched = true;
      this.specializationTouched = true;
    }

    if (!this.isStep2Valid) return;

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const user: Partial<User> = {
      name: this.name.trim(),
      username: this.username.trim(),
      email: this.email.trim(),
      pwd: this.password,
      numTel: this.numTel.trim(),
      dateNaiss: this.dateNaiss,
      role: this.role,
      inscriptionOk: true,
      posterForum: true,
      avatar: '',
      ...(this.role === 'ETUDIANT' && {
        level: 'Beginner',
        xp: 0,
        streak: 0,
        coins: 0,
        language: 'EN',
        joinDate: new Date().toISOString().split('T')[0],
        bio: ''
      }),
      ...(this.role === 'TUTEUR' && {
        CIN: this.CIN.trim(),
        yearsOfExperience: this.yearsOfExperience!,
        specialization: this.specialization.trim()
      })
    };

    this.userService.signUp(user).subscribe({
      next: (createdUser) => {
        // Upload CV as non-blocking side-effect for tutors
        if (this.role === 'TUTEUR' && this.cvFile && createdUser?.id) {
          this.userService.uploadCV(createdUser.id, this.cvFile).subscribe();
        }
        this.isLoading = false;
        // ✅ Redirect to verification code page instead of auto-login
        this.router.navigate(['/verify-code'], {
          queryParams: { email: this.email.trim() }
        });
      },
      error: (err: any) => {
        this.isLoading = false;
        this.errorMessage = typeof err === 'string' ? err : 'Registration failed. Please try again.';
      }
    });
  }
}