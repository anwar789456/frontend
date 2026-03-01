import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Friendship, ChatMessage, UserStatus } from '../models/friend.model';

@Injectable({
  providedIn: 'root'
})
export class FriendsService {
  private readonly apiUrl = 'https://minolingo.online/api/forums';

  constructor(private http: HttpClient) {}

  // ── Friendship ──

  sendFriendRequest(friendship: Friendship): Observable<Friendship> {
    return this.http.post<Friendship>(`${this.apiUrl}/send-friend-request`, friendship);
  }

  acceptFriendRequest(friendshipId: number): Observable<Friendship> {
    return this.http.put<Friendship>(`${this.apiUrl}/accept-friend-request/${friendshipId}`, {});
  }

  rejectFriendRequest(friendshipId: number): Observable<Friendship> {
    return this.http.put<Friendship>(`${this.apiUrl}/reject-friend-request/${friendshipId}`, {});
  }

  removeFriend(friendshipId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/remove-friend/${friendshipId}`);
  }

  getFriends(userId: number): Observable<Friendship[]> {
    return this.http.get<Friendship[]>(`${this.apiUrl}/get-friends/${userId}`);
  }

  getPendingRequests(userId: number): Observable<Friendship[]> {
    return this.http.get<Friendship[]>(`${this.apiUrl}/get-pending-requests/${userId}`);
  }

  getSentRequests(userId: number): Observable<Friendship[]> {
    return this.http.get<Friendship[]>(`${this.apiUrl}/get-sent-requests/${userId}`);
  }

  getFriendshipStatus(userId1: number, userId2: number): Observable<Friendship> {
    return this.http.get<Friendship>(`${this.apiUrl}/get-friendship-status/${userId1}/${userId2}`);
  }

  blockUser(friendshipId: number): Observable<Friendship> {
    return this.http.put<Friendship>(`${this.apiUrl}/block-user/${friendshipId}`, {});
  }

  // ── Chat Messages ──

  sendMessage(message: ChatMessage): Observable<ChatMessage> {
    return this.http.post<ChatMessage>(`${this.apiUrl}/send-message`, message);
  }

  getConversation(userId1: number, userId2: number): Observable<ChatMessage[]> {
    return this.http.get<ChatMessage[]>(`${this.apiUrl}/get-conversation/${userId1}/${userId2}`);
  }

  getUnreadMessages(userId: number): Observable<ChatMessage[]> {
    return this.http.get<ChatMessage[]>(`${this.apiUrl}/get-unread-messages/${userId}`);
  }

  getUnreadMessageCount(senderId: number, receiverId: number): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.apiUrl}/get-unread-message-count/${senderId}/${receiverId}`);
  }

  markConversationRead(senderId: number, receiverId: number): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/mark-conversation-read/${senderId}/${receiverId}`, {});
  }

  getAllMessages(userId: number): Observable<ChatMessage[]> {
    return this.http.get<ChatMessage[]>(`${this.apiUrl}/get-all-messages/${userId}`);
  }

  deleteMessage(messageId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/delete-message/${messageId}`);
  }

  // ── User Status ──

  sendHeartbeat(status: UserStatus): Observable<UserStatus> {
    return this.http.post<UserStatus>(`${this.apiUrl}/user-heartbeat`, status);
  }

  setOffline(userId: number): Observable<UserStatus> {
    return this.http.put<UserStatus>(`${this.apiUrl}/user-offline/${userId}`, {});
  }

  getUserStatus(userId: number): Observable<UserStatus> {
    return this.http.get<UserStatus>(`${this.apiUrl}/user-status/${userId}`);
  }

  getUserStatuses(userIds: number[]): Observable<UserStatus[]> {
    return this.http.post<UserStatus[]>(`${this.apiUrl}/user-statuses`, userIds);
  }

  getOnlineUsers(): Observable<UserStatus[]> {
    return this.http.get<UserStatus[]>(`${this.apiUrl}/online-users`);
  }
}
