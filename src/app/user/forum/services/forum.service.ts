import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { ForumPost, TrendingTopic, ForumBadge, UserForumXP, UserStreak, WordOfTheDay } from '../models/forum.model';
import { ForumReport } from '../models/forum-report.model';

@Injectable({
  providedIn: 'root'
})
export class ForumService {
  private readonly apiUrl = 'https://minolingo.online/api/forums';

  private newTopicSubject = new Subject<void>();
  newTopic$ = this.newTopicSubject.asObservable();

  triggerNewTopic(): void {
    this.newTopicSubject.next();
  }

  constructor(private http: HttpClient) { }

  // ── Forum Posts ──

  createPost(post: ForumPost): Observable<ForumPost> {
    return this.http.post<ForumPost>(`${this.apiUrl}/create-forum`, post);
  }

  getAllPosts(): Observable<ForumPost[]> {
    return this.http.get<ForumPost[]>(`${this.apiUrl}/get-all-forums`);
  }

  getPostById(id: number): Observable<ForumPost> {
    return this.http.get<ForumPost>(`${this.apiUrl}/get-forum-by-id/${id}`);
  }

  getTopLevelPosts(): Observable<ForumPost[]> {
    return this.http.get<ForumPost[]>(`${this.apiUrl}/get-top-level-forums`);
  }

  getPostsByTopic(topicId: number): Observable<ForumPost[]> {
    return this.http.get<ForumPost[]>(`${this.apiUrl}/get-forums-by-topic/${topicId}`);
  }

  getPostsByUser(userId: number): Observable<ForumPost[]> {
    return this.http.get<ForumPost[]>(`${this.apiUrl}/get-forums-by-user/${userId}`);
  }

  getReplies(postId: number): Observable<ForumPost[]> {
    return this.http.get<ForumPost[]>(`${this.apiUrl}/get-replies/${postId}`);
  }

  updatePost(id: number, post: ForumPost): Observable<ForumPost> {
    return this.http.put<ForumPost>(`${this.apiUrl}/update-forum/${id}`, post);
  }

  deletePost(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/delete-forum/${id}`);
  }

  likePost(id: number): Observable<ForumPost> {
    return this.http.put<ForumPost>(`${this.apiUrl}/like-forum/${id}`, {});
  }

  repostPost(id: number): Observable<ForumPost> {
    return this.http.put<ForumPost>(`${this.apiUrl}/repost-forum/${id}`, {});
  }

  // ── Trending Topics ──

  createTopic(topic: TrendingTopic): Observable<TrendingTopic> {
    return this.http.post<TrendingTopic>(`${this.apiUrl}/create-topic`, topic);
  }

  getAllTopics(): Observable<TrendingTopic[]> {
    return this.http.get<TrendingTopic[]>(`${this.apiUrl}/get-all-topics`);
  }

  getTopicById(id: number): Observable<TrendingTopic> {
    return this.http.get<TrendingTopic>(`${this.apiUrl}/get-topic-by-id/${id}`);
  }

  getTopicsByCategory(category: string): Observable<TrendingTopic[]> {
    return this.http.get<TrendingTopic[]>(`${this.apiUrl}/get-topics-by-category/${category}`);
  }

  getPinnedTopics(): Observable<TrendingTopic[]> {
    return this.http.get<TrendingTopic[]>(`${this.apiUrl}/get-pinned-topics`);
  }

  getTrendingTopics(): Observable<TrendingTopic[]> {
    return this.http.get<TrendingTopic[]>(`${this.apiUrl}/get-trending-topics`);
  }

  updateTopic(id: number, topic: TrendingTopic): Observable<TrendingTopic> {
    return this.http.put<TrendingTopic>(`${this.apiUrl}/update-topic/${id}`, topic);
  }

  deleteTopic(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/delete-topic/${id}`);
  }

  incrementTopicViewCount(id: number): Observable<TrendingTopic> {
    return this.http.put<TrendingTopic>(`${this.apiUrl}/increment-topic-view-count/${id}`, {});
  }

  incrementTopicPostCount(id: number): Observable<TrendingTopic> {
    return this.http.put<TrendingTopic>(`${this.apiUrl}/increment-topic-post-count/${id}`, {});
  }

  // ── Forum Reports ──

  createReport(report: ForumReport): Observable<ForumReport> {
    return this.http.post<ForumReport>(`${this.apiUrl}/create-report`, report);
  }

  getAllReports(): Observable<ForumReport[]> {
    return this.http.get<ForumReport[]>(`${this.apiUrl}/get-all-reports`);
  }

  getReportById(id: number): Observable<ForumReport> {
    return this.http.get<ForumReport>(`${this.apiUrl}/get-report-by-id/${id}`);
  }

  getReportsByPost(postId: number): Observable<ForumReport[]> {
    return this.http.get<ForumReport[]>(`${this.apiUrl}/get-reports-by-post/${postId}`);
  }

  getReportsByStatus(status: string): Observable<ForumReport[]> {
    return this.http.get<ForumReport[]>(`${this.apiUrl}/get-reports-by-status/${status}`);
  }

  updateReportStatus(id: number, status: string, adminNote?: string): Observable<ForumReport> {
    return this.http.put<ForumReport>(`${this.apiUrl}/update-report-status/${id}`, { status, adminNote });
  }

  deleteReport(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/delete-report/${id}`);
  }

  // ── Notifications ──

  createNotification(notification: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/create-notification`, notification);
  }

  getNotifications(userId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/get-notifications/${userId}`);
  }

  getUnreadNotifications(userId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/get-unread-notifications/${userId}`);
  }

  getUnreadCount(userId: number): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.apiUrl}/get-unread-count/${userId}`);
  }

  markNotificationRead(id: number): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/mark-notification-read/${id}`, {});
  }

  markAllNotificationsRead(userId: number): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/mark-all-notifications-read/${userId}`, {});
  }

  // ── Save & Favorite (localStorage) ──

  private getStorageSet(key: string): Set<number> {
    try {
      const data = localStorage.getItem(key);
      return data ? new Set<number>(JSON.parse(data)) : new Set<number>();
    } catch { return new Set<number>(); }
  }

  private setStorageSet(key: string, s: Set<number>): void {
    localStorage.setItem(key, JSON.stringify(Array.from(s)));
  }

  getSavedPostIds(userId: number): Set<number> {
    return this.getStorageSet(`forum_saved_${userId}`);
  }

  toggleSavePost(userId: number, postId: number): boolean {
    const s = this.getSavedPostIds(userId);
    const isSaved = s.has(postId);
    if (isSaved) s.delete(postId); else s.add(postId);
    this.setStorageSet(`forum_saved_${userId}`, s);
    return !isSaved;
  }

  getFavoritePostIds(userId: number): Set<number> {
    return this.getStorageSet(`forum_fav_${userId}`);
  }

  toggleFavoritePost(userId: number, postId: number): boolean {
    const s = this.getFavoritePostIds(userId);
    const isFav = s.has(postId);
    if (isFav) s.delete(postId); else s.add(postId);
    this.setStorageSet(`forum_fav_${userId}`, s);
    return !isFav;
  }

  // ── XP & Badges ──

  static readonly BADGES: ForumBadge[] = [
    { id: 'first_post', name: 'First Steps', icon: '🐣', description: 'Published your first post', requirement: 1, type: 'posts' },
    { id: 'storyteller', name: 'Storyteller', icon: '📖', description: 'Published 10 posts', requirement: 10, type: 'posts' },
    { id: 'prolific', name: 'Prolific Writer', icon: '✍️', description: 'Published 50 posts', requirement: 50, type: 'posts' },
    { id: 'helpful_friend', name: 'Helpful Friend', icon: '🤝', description: 'Left 5 comments', requirement: 5, type: 'comments' },
    { id: 'grammar_hero', name: 'Grammar Hero', icon: '🦸', description: 'Left 25 comments helping others', requirement: 25, type: 'comments' },
    { id: 'cheerleader', name: 'Cheerleader', icon: '📣', description: 'Reacted to 10 posts', requirement: 10, type: 'likes_given' },
    { id: 'supporter', name: 'Super Supporter', icon: '💪', description: 'Reacted to 50 posts', requirement: 50, type: 'likes_given' },
    { id: 'streak_3', name: 'On Fire', icon: '🔥', description: '3-day activity streak', requirement: 3, type: 'streak' },
    { id: 'streak_7', name: 'Unstoppable', icon: '⚡', description: '7-day activity streak', requirement: 7, type: 'streak' },
    { id: 'streak_30', name: 'Legend', icon: '👑', description: '30-day activity streak', requirement: 30, type: 'streak' },
    { id: 'wotd_1', name: 'Word Learner', icon: '📝', description: 'Used Word of the Day once', requirement: 1, type: 'wotd' },
    { id: 'wotd_7', name: 'Vocabulary Builder', icon: '📚', description: 'Used Word of the Day 7 times', requirement: 7, type: 'wotd' },
  ];

  static readonly XP_REWARDS = { post: 10, comment: 5, reaction: 2, wotd_bonus: 15 };

  getUserXP(userId: number): UserForumXP {
    try {
      const data = localStorage.getItem(`forum_xp_${userId}`);
      if (data) return JSON.parse(data);
    } catch { /* ignore */ }
    return { userId, xp: 0, level: 1, postsCount: 0, commentsCount: 0, likesGivenCount: 0, wotdCount: 0, badges: [] };
  }

  private saveUserXP(userId: number, xpData: UserForumXP): void {
    xpData.level = Math.floor(xpData.xp / 100) + 1;
    localStorage.setItem(`forum_xp_${userId}`, JSON.stringify(xpData));
  }

  addXP(userId: number, amount: number, action: 'post' | 'comment' | 'reaction' | 'wotd_bonus'): { xpData: UserForumXP; newBadges: ForumBadge[] } {
    const xpData = this.getUserXP(userId);
    const oldLevel = xpData.level;
    xpData.xp += amount;
    if (action === 'post') xpData.postsCount++;
    else if (action === 'comment') xpData.commentsCount++;
    else if (action === 'reaction') xpData.likesGivenCount++;
    else if (action === 'wotd_bonus') xpData.wotdCount++;
    const newBadges = this.checkNewBadges(xpData);
    this.saveUserXP(userId, xpData);
    return { xpData, newBadges };
  }

  private checkNewBadges(xpData: UserForumXP): ForumBadge[] {
    const newBadges: ForumBadge[] = [];
    for (const badge of ForumService.BADGES) {
      if (xpData.badges.includes(badge.id)) continue;
      let count = 0;
      switch (badge.type) {
        case 'posts': count = xpData.postsCount; break;
        case 'comments': count = xpData.commentsCount; break;
        case 'likes_given': count = xpData.likesGivenCount; break;
        case 'wotd': count = xpData.wotdCount; break;
        case 'streak': count = this.getUserStreak(xpData.userId).currentStreak; break;
      }
      if (count >= badge.requirement) { xpData.badges.push(badge.id); newBadges.push(badge); }
    }
    return newBadges;
  }

  getBadgeById(id: string): ForumBadge | undefined {
    return ForumService.BADGES.find(b => b.id === id);
  }

  // ── Streak Tracker ──

  getUserStreak(userId: number): UserStreak {
    try {
      const data = localStorage.getItem(`forum_streak_${userId}`);
      if (data) return JSON.parse(data);
    } catch { /* ignore */ }
    return { userId, currentStreak: 0, longestStreak: 0, lastActiveDate: '' };
  }

  recordActivity(userId: number): { streak: UserStreak; isNewDay: boolean } {
    const streak = this.getUserStreak(userId);
    const today = new Date().toISOString().slice(0, 10);
    if (streak.lastActiveDate === today) return { streak, isNewDay: false };
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (streak.lastActiveDate === yesterday) {
      streak.currentStreak++;
    } else {
      streak.currentStreak = 1;
    }
    if (streak.currentStreak > streak.longestStreak) streak.longestStreak = streak.currentStreak;
    streak.lastActiveDate = today;
    localStorage.setItem(`forum_streak_${userId}`, JSON.stringify(streak));
    return { streak, isNewDay: true };
  }

  // ── Word of the Day ──

  private static readonly WORD_LIST: Omit<WordOfTheDay, 'date'>[] = [
    { word: 'adventure', definition: 'An exciting or unusual experience', example: 'Going to the zoo was a great adventure!' },
    { word: 'brilliant', definition: 'Very clever or excellent', example: 'She had a brilliant idea for the project.' },
    { word: 'curious', definition: 'Eager to know or learn something', example: 'The curious cat explored the garden.' },
    { word: 'discover', definition: 'To find something for the first time', example: 'We discovered a hidden path in the forest.' },
    { word: 'enormous', definition: 'Very large in size or quantity', example: 'The elephant was enormous!' },
    { word: 'fantastic', definition: 'Extraordinarily good or attractive', example: 'The birthday party was fantastic!' },
    { word: 'generous', definition: 'Willing to give and share', example: 'My friend is very generous with her toys.' },
    { word: 'harmony', definition: 'A pleasing combination of things', example: 'The class worked together in harmony.' },
    { word: 'imagine', definition: 'To form a picture in your mind', example: 'Can you imagine living on the moon?' },
    { word: 'journey', definition: 'A trip from one place to another', example: 'The journey to school takes 20 minutes.' },
    { word: 'knowledge', definition: 'Facts and information learned', example: 'Reading books gives us knowledge.' },
    { word: 'magnificent', definition: 'Extremely beautiful or impressive', example: 'The sunset was magnificent.' },
    { word: 'navigate', definition: 'To find your way', example: 'We used a map to navigate through the city.' },
    { word: 'observe', definition: 'To watch carefully', example: 'I like to observe birds in the park.' },
    { word: 'persevere', definition: 'To keep trying even when it is hard', example: 'She persevered and finished the race.' },
    { word: 'question', definition: 'A sentence that asks for information', example: 'Always ask questions when you are curious!' },
    { word: 'remarkable', definition: 'Worth noticing; extraordinary', example: 'Her painting was truly remarkable.' },
    { word: 'spectacular', definition: 'Beautiful in a dramatic way', example: 'The fireworks show was spectacular!' },
    { word: 'treasure', definition: 'Something very valuable', example: 'Our friendship is a treasure.' },
    { word: 'unique', definition: 'Being the only one of its kind', example: 'Every snowflake is unique.' },
    { word: 'vibrant', definition: 'Full of energy and life', example: 'The flowers were vibrant and colorful.' },
    { word: 'wonderful', definition: 'Causing delight; excellent', example: 'We had a wonderful time at the beach.' },
    { word: 'extraordinary', definition: 'Very unusual or remarkable', example: 'The magician did extraordinary tricks.' },
    { word: 'yearn', definition: 'To have a strong desire for something', example: 'I yearn to visit new countries.' },
    { word: 'zealous', definition: 'Having great energy and enthusiasm', example: 'She was zealous about learning French.' },
    { word: 'courageous', definition: 'Not afraid of danger; brave', example: 'The courageous firefighter saved the cat.' },
    { word: 'delightful', definition: 'Causing great pleasure', example: 'The story had a delightful ending.' },
    { word: 'encourage', definition: 'To give support and confidence', example: 'My teacher always encourages me to try.' },
    { word: 'grateful', definition: 'Feeling thankful', example: 'I am grateful for my family.' },
    { word: 'cooperate', definition: 'To work together toward a goal', example: 'We cooperate to clean the classroom.' },
  ];

  getWordOfTheDay(): WordOfTheDay {
    const today = new Date().toISOString().slice(0, 10);
    const dayIndex = Math.floor(new Date(today).getTime() / 86400000) % ForumService.WORD_LIST.length;
    return { ...ForumService.WORD_LIST[dayIndex], date: today };
  }

  hasUsedWotdToday(userId: number): boolean {
    const today = new Date().toISOString().slice(0, 10);
    return localStorage.getItem(`forum_wotd_${userId}_${today}`) === 'true';
  }

  markWotdUsed(userId: number): void {
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem(`forum_wotd_${userId}_${today}`, 'true');
  }

  // ── Translation ──

  translateText(text: string, targetLang: string = 'en'): Observable<string> {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=autodetect|${targetLang}`;
    return new Observable<string>(observer => {
      this.http.get<any>(url).subscribe({
        next: (res) => {
          const translated = res?.responseData?.translatedText || text;
          observer.next(translated);
          observer.complete();
        },
        error: () => { observer.next(text); observer.complete(); }
      });
    });
  }
}
