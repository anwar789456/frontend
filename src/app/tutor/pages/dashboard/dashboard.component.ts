import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-tutor-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html'
})
export class TutorDashboardComponent {
  stats = [
    { label: 'Total Revenue', value: '$12,450', sub: '+8% this month', icon: 'revenue' },
    { label: 'Active Students', value: '148', sub: '+12 new this week', icon: 'students' },
    { label: 'Average Rating', value: '4.8', sub: 'From 324 reviews', icon: 'rating' },
    { label: 'Hours Taught', value: '1,240', sub: 'Total platform hours', icon: 'hours' }
  ];

  upcomingClasses = [
    { date: '24', month: 'OCT', title: 'Business English: Negotiation Skills', time: '14:00 - 15:30', students: 12, canStart: true },
    { date: '25', month: 'OCT', title: 'IELTS Speaking Practice', time: '10:00 - 11:00', students: 8, canStart: false }
  ];

  topCourses = [
    { name: 'Business English', revenue: '$4,200 revenue', change: '+15%', changeColor: 'text-green-500' },
    { name: 'IELTS Prep', revenue: '$3,850 revenue', change: '+8%', changeColor: 'text-green-500' },
    { name: 'Creative Writing', revenue: '$1,200 revenue', change: '0%', changeColor: 'text-[#9ca3af]' }
  ];

  recentActivity = [
    { avatar: '👩', text: 'Priya Patel', action: 'submitted an assignment for', target: 'Advanced Business English', time: '2 hours ago' },
    { avatar: '👨', text: 'James Wilson', action: 'enrolled in', target: 'IELTS Preparation', time: '5 hours ago' },
    { avatar: '🧑', text: 'Yuki Tanaka', action: 'posted a question in', target: 'General Discussion', time: 'Yesterday' }
  ];

  messages = [
    { name: 'Michael Okonjo', preview: 'Can we reschedule the...', avatar: '👨', unread: true },
    { name: 'Maria Garcia', preview: 'Thanks for the feedback!', avatar: '👩', unread: false }
  ];
}
