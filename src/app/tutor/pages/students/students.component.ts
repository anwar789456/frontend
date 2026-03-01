import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-tutor-students',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './students.component.html'
})
export class TutorStudentsComponent {
  stats = [
    { label: 'Total Students', value: '148', sub: '+12% this month', icon: 'students' },
    { label: 'Active Courses', value: '12', sub: 'Across 3 categories', icon: 'courses' },
    { label: 'Avg. Completion', value: '64%', sub: '+3.2% vs last week', icon: 'completion' },
    { label: 'Needs Attention', value: '5', sub: 'Falling behind schedule', icon: 'attention' }
  ];

  students = [
    { name: 'Priya Patel', email: 'priya.p@example.com', avatar: '👩', course: 'Advanced Business English', batch: 'Batch A-24', progress: 78, progressColor: 'bg-green-500', lastActive: '2 hours ago', warning: false },
    { name: 'James Wilson', email: 'j.wilson@nomad.com', avatar: '👨', course: 'IELTS Preparation - Speaking', batch: 'Batch B-12', progress: 42, progressColor: 'bg-[#38a9f3]', lastActive: 'Yesterday', warning: false },
    { name: 'Yuki Tanaka', email: 'yuki.t@student.edu', avatar: '🧑', course: 'Creative Writing Basics', batch: 'Batch A-24', progress: 92, progressColor: 'bg-green-500', lastActive: '5 mins ago', warning: false },
    { name: 'Michael Okonjo', email: 'm.okonjo@mail.com', avatar: '👨', course: 'Advanced Business English', batch: 'Batch A-24', progress: 15, progressColor: 'bg-red-500', lastActive: '3 weeks ago', warning: true },
    { name: 'Maria Garcia', email: 'm.garcia@design.net', avatar: '👩', course: 'IELTS Preparation - Speaking', batch: 'Batch B-12', progress: 55, progressColor: 'bg-[#38a9f3]', lastActive: '3 days ago', warning: false }
  ];
}
