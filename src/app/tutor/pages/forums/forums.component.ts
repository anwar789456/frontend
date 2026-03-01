import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-tutor-forums',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './forums.component.html'
})
export class TutorForumsComponent {
  posts = [
    { author: 'David Okafor', handle: '@david_learns', time: '2h', avatar: '👨', content: 'Just finished the Advanced Grammar certification! Huge thanks to everyone who helped me practice past participles last week. It really paid off!', hashtags: '#NiNoSuccess #Learning', hasImage: true, comments: 12, reposts: 4, likes: 156 },
    { author: 'Maria Garcia', handle: '@maria_g', time: '1h', avatar: '👩', content: "Congratulations David! That's amazing news. I'm struggling with phrasal verbs right now, any tips?", hashtags: '', hasImage: false, comments: 2, reposts: 8, likes: 27 },
    { author: 'David Okafor', handle: '@david_learns', time: '45m', avatar: '👨', content: 'Thanks Maria! For phrasal verbs, I try to group them by the main verb and make funny sentences. The "Verb Vibes" course here helped a lot.', hashtags: '', hasImage: false, comments: 1, reposts: 3, likes: 0 },
    { author: 'Alex Chen', handle: '@alexc_code', time: '3h', avatar: '🧑', content: 'Does anyone want to join a study group for IELTS preparation? Looking for 2-3 people to practice speaking on weekends.', hashtags: '', hasImage: false, comments: 24, reposts: 12, likes: 45 }
  ];

  trendingTopics = [
    { category: 'Grammar', title: '#PastParticiple', posts: '2.4k posts' },
    { category: 'Certification', title: 'TOEFL Prep', posts: '12k posts' },
    { category: 'Community Event', title: 'Sunday Speaking Club', posts: '543 posts' }
  ];

  topContributors = [
    { name: 'Sarah Teacher', handle: '@sarah_eng' },
    { name: 'Kenji M.', handle: '@kenji_jp' },
    { name: 'Ananya R.', handle: '@ana_reads' }
  ];
}
