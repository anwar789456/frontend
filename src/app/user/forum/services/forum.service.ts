import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { ForumPost, TrendingTopic } from '../models/forum.model';
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
}
