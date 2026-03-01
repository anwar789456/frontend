import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-tutor-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.component.html'
})
export class TutorProfileComponent {
  profileStats = [
    { label: 'ACTIVE STUDENTS', value: '32' },
    { label: 'COURSES CREATED', value: '5' },
    { label: 'AVG. RATING', value: '4.9' }
  ];

  profile = {
    fullName: 'Sarah Johnson',
    username: '@sarah_eng',
    email: 'sarah.johnson@example.com',
    phone: '+1 555 0123 456',
    cin: 'AB123456',
    bio: "Hi! I'm Sarah, a certified English tutor with over 6 years of experience teaching students of all ages. I specialize in conversational English and exam preparation. My goal is to make learning fun and effective through interactive lessons."
  };

  specializations = ['Vocabulary', 'Speaking', 'Writing', 'IELTS Prep'];

  removeSpecialization(tag: string) {
    this.specializations = this.specializations.filter(s => s !== tag);
  }
}
