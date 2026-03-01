import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-tutor-live-classes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './live-classes.component.html'
})
export class LiveClassesComponent {
  upNext = {
    status: 'CONFIRMED',
    course: 'ACADEMIC ENGLISH',
    title: 'Weekly Q&A: Essay Structure Review',
    description: 'An open session for students to ask questions about the recent module on thesis statements and paragraph transitions. Please review the homework before joining.',
    date: 'Mon, Oct 24',
    time: '19:00 - 20:30',
    platform: 'Banani Live'
  };

  registeredStudents = [
    { name: 'Amina K.', status: 'Confirmed', online: true },
    { name: 'Kenji T.', status: 'Confirmed', online: true },
    { name: 'Sofia M.', status: 'Pending', online: false },
    { name: 'David O.', status: 'Confirmed', online: true },
    { name: 'Elena R.', status: 'Confirmed', online: true }
  ];

  upcomingSchedule = [
    { day: 'WED', date: '26', month: 'Oct', category: 'BUSINESS ENGLISH', categoryColor: 'text-[#38a9f3]', title: 'Mock Interview Workshop', time: '15:00 - 16:30', students: 12 },
    { day: 'FRI', date: '28', month: 'Oct', category: 'CONVERSATION', categoryColor: 'text-purple-500', title: 'Weekend Casual Chat: Travel', time: '18:00 - 19:00', students: 8 },
    { day: 'MON', date: '31', month: 'Oct', category: 'GRAMMAR', categoryColor: 'text-green-500', title: 'Live Q&A: Prepositions', time: '20:00 - 21:00', students: 45 }
  ];
}
