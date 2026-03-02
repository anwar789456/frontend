import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService, AuthUser } from '../../../shared/services/auth.service';
import { UserService } from '../../../user/user/services/user.service';
import { FriendsService } from '../../../user/friends/services/friends.service';
import { Friend, FriendRequest, Friendship, ChatMessage, UserStatus } from '../../../user/friends/models/friend.model';

@Component({
  selector: 'app-tutor-friends',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './friends.component.html',
  styleUrls: ['./friends.component.css']
})
export class TutorFriendsComponent implements OnInit, OnDestroy {
  @ViewChild('messageInput') messageInput!: ElementRef<HTMLInputElement>;
  @ViewChild('chatContainer') chatContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('chatFileInput') chatFileInput!: ElementRef<HTMLInputElement>;

  user: AuthUser | null = null;

  // Tabs
  activeTab: 'friends' | 'requests' | 'discover' = 'friends';

  // Friends
  friends: Friend[] = [];
  filteredFriends: Friend[] = [];
  friendSearchQuery = '';

  // Requests
  pendingRequests: FriendRequest[] = [];
  sentRequests: FriendRequest[] = [];

  // Discover
  discoverUsers: { id: number; name: string; avatar: string; requestSent?: boolean }[] = [];
  discoverSearchQuery = '';

  // Chat
  selectedFriend: Friend | null = null;
  chatMessages: ChatMessage[] = [];
  newMessage = '';
  chatLoading = false;

  // Emoji Picker
  showEmojiPicker = false;
  activeEmojiCategory = 0;
  emojiCategories = [
    { name: 'Smileys', icon: '😊', emojis: ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','😊','😇','🥰','😍','🤩','😘','😗','😚','😙','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','😌','😔','😪','😴','😷','🤒','🤕','🤢','🤮','🥴','😵','🤯','🥳','😎','🤓','🧐'] },
    { name: 'Gestures', icon: '👋', emojis: ['👋','🤚','🖐','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','💪','🦾'] },
    { name: 'Hearts', icon: '❤️', emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❤️‍🔥','❣️','💕','💞','💓','💗','💖','💘','💝','💟','🫶'] },
    { name: 'Objects', icon: '📚', emojis: ['📱','💻','🖥','🎮','📷','📹','🎥','📺','⏰','💡','📚','📖','📰','✉️','📦','✏️','📝','🎓','🏫','📐','📏','🔬','🔭','🎨','🎵','🎶'] }
  ];

  // GIF Picker
  showGifPicker = false;
  gifSearchQuery = '';
  gifResults: { url: string; preview: string }[] = [];
  gifLoading = false;
  private gifSearchTimeout: any;
  private readonly GIPHY_KEY = 'GlVGYR8KgYBgoK546FpLBaAZeLp5MHaX';

  // Image Upload
  imagePreview: string | null = null;

  // Friend Info Panel
  showFriendInfo = false;

  // Online Status
  onlineStatuses: Map<number, boolean> = new Map();
  private statusInterval: any;
  private chatPollInterval: any;

  // Toasts
  toasts: { id: number; message: string; type: 'success' | 'error' | 'info'; exiting?: boolean }[] = [];
  private toastCounter = 0;

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private friendsService: FriendsService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.user = this.authService.currentUser;
    this.loadFriends();
    this.loadPendingRequests();
    this.loadSentRequests();
    this.loadDiscoverUsers();
    this.loadTrendingGifs();

    // Poll online statuses
    this.statusInterval = setInterval(() => this.refreshOnlineStatuses(), 20000);
    // Heartbeat
    if (this.user) {
      const status: UserStatus = { userId: this.user.id, userName: this.user.name, userAvatar: (this.user as any).avatar || '', isOnline: true };
      this.friendsService.sendHeartbeat(status).subscribe();
    }
  }

  ngOnDestroy(): void {
    if (this.statusInterval) clearInterval(this.statusInterval);
    if (this.chatPollInterval) clearInterval(this.chatPollInterval);
    if (this.user) {
      this.friendsService.setOffline(this.user.id).subscribe();
    }
  }

  // ─── Data Loading ───
  loadFriends(): void {
    if (!this.user) return;
    this.friendsService.getFriends(this.user.id).subscribe({
      next: (friendships) => {
        this.friends = friendships.map(f => {
          const isUser = f.userId === this.user!.id;
          return {
            id: isUser ? f.friendId : f.userId,
            friendshipId: f.id!,
            name: isUser ? f.friendName : f.userName,
            avatar: isUser ? f.friendAvatar : f.userAvatar,
            lastMessage: '', lastMessageTime: '', online: false, unreadCount: 0
          };
        });
        this.filteredFriends = [...this.friends];
        this.refreshOnlineStatuses();
        this.loadLastMessages();
      },
      error: () => this.addToast('Failed to load colleagues', 'error')
    });
  }

  loadLastMessages(): void {
    for (const friend of this.friends) {
      if (!this.user) continue;
      this.friendsService.getConversation(this.user.id, friend.id).subscribe({
        next: (msgs: ChatMessage[]) => {
          if (msgs && msgs.length > 0) {
            const last = msgs[msgs.length - 1];
            friend.lastMessage = last.content || '';
            friend.lastMessageTime = this.formatTimeAgo(last.createdAt || '');
          }
        }
      });
      this.friendsService.getUnreadMessageCount(friend.id, this.user.id).subscribe({
        next: (res: { count: number }) => { friend.unreadCount = res?.count || 0; }
      });
    }
  }

  loadPendingRequests(): void {
    if (!this.user) return;
    this.friendsService.getPendingRequests(this.user.id).subscribe({
      next: (reqs) => {
        this.pendingRequests = reqs.map(r => ({
          id: r.id!, friendshipId: r.id!, name: r.userName, avatar: r.userAvatar, userId: r.userId, createdAt: r.createdAt || ''
        }));
      }
    });
  }

  loadSentRequests(): void {
    if (!this.user) return;
    this.friendsService.getSentRequests(this.user.id).subscribe({
      next: (reqs) => {
        this.sentRequests = reqs.map(r => ({
          id: r.id!, friendshipId: r.id!, name: r.friendName, avatar: r.friendAvatar, userId: r.friendId, createdAt: r.createdAt || ''
        }));
      }
    });
  }

  loadDiscoverUsers(): void {
    this.userService.getAllUsers().subscribe({
      next: (users) => {
        const friendIds = new Set(this.friends.map(f => f.id));
        const pendingIds = new Set([...this.pendingRequests.map(r => r.userId), ...this.sentRequests.map(r => r.userId)]);
        this.discoverUsers = users
          .filter(u => u.id !== this.user?.id && !friendIds.has(u.id) && !pendingIds.has(u.id))
          .map(u => ({ id: u.id, name: u.name, avatar: u.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + u.name }));
      }
    });
  }

  refreshOnlineStatuses(): void {
    if (this.friends.length === 0) return;
    const ids = this.friends.map(f => f.id);
    this.friendsService.getUserStatuses(ids).subscribe({
      next: (statuses: UserStatus[]) => {
        for (const s of statuses) {
          this.onlineStatuses.set(s.userId, s.isOnline);
          const friend = this.friends.find(f => f.id === s.userId);
          if (friend) friend.online = s.isOnline;
        }
      }
    });
  }

  // ─── Friend Actions ───
  acceptRequest(req: FriendRequest): void {
    this.friendsService.acceptFriendRequest(req.id).subscribe({
      next: () => {
        this.pendingRequests = this.pendingRequests.filter(r => r.id !== req.id);
        this.addToast(`${req.name} is now your colleague!`, 'success');
        this.loadFriends();
      },
      error: () => this.addToast('Failed to accept request', 'error')
    });
  }

  rejectRequest(req: FriendRequest): void {
    this.friendsService.rejectFriendRequest(req.id).subscribe({
      next: () => {
        this.pendingRequests = this.pendingRequests.filter(r => r.id !== req.id);
        this.addToast('Request declined', 'info');
      },
      error: () => this.addToast('Failed to decline request', 'error')
    });
  }

  sendFriendRequest(discoverUser: { id: number; name: string; avatar: string; requestSent?: boolean }): void {
    if (!this.user) return;
    const friendship: Friendship = {
      userId: this.user.id, userName: this.user.name,
      userAvatar: (this.user as any).avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + this.user.name,
      friendId: discoverUser.id, friendName: discoverUser.name, friendAvatar: discoverUser.avatar, status: 'PENDING'
    };
    this.friendsService.sendFriendRequest(friendship).subscribe({
      next: () => {
        discoverUser.requestSent = true;
        this.addToast(`Request sent to ${discoverUser.name}!`, 'success');
        this.loadSentRequests();
      },
      error: () => this.addToast('Failed to send request', 'error')
    });
  }

  removeFriend(friend: Friend): void {
    this.friendsService.removeFriend(friend.friendshipId).subscribe({
      next: () => {
        this.friends = this.friends.filter(f => f.id !== friend.id);
        this.filteredFriends = this.filteredFriends.filter(f => f.id !== friend.id);
        if (this.selectedFriend?.id === friend.id) { this.selectedFriend = null; this.chatMessages = []; }
        this.addToast(`Removed ${friend.name} from colleagues`, 'info');
      },
      error: () => this.addToast('Failed to remove colleague', 'error')
    });
  }

  // ─── Search ───
  onFriendSearch(): void {
    if (!this.friendSearchQuery.trim()) { this.filteredFriends = [...this.friends]; return; }
    const q = this.friendSearchQuery.toLowerCase();
    this.filteredFriends = this.friends.filter(f => f.name.toLowerCase().includes(q));
  }

  get filteredDiscoverUsers() {
    if (!this.discoverSearchQuery.trim()) return this.discoverUsers;
    const q = this.discoverSearchQuery.toLowerCase();
    return this.discoverUsers.filter(u => u.name.toLowerCase().includes(q));
  }

  // ─── Chat ───
  openChat(friend: Friend): void {
    this.selectedFriend = friend;
    this.chatLoading = true;
    this.showFriendInfo = false;
    this.loadChatMessages();
    if (this.chatPollInterval) clearInterval(this.chatPollInterval);
    this.chatPollInterval = setInterval(() => this.loadChatMessages(), 5000);
    // Mark read
    if (this.user) {
      this.friendsService.markConversationRead(friend.id, this.user.id).subscribe({
        next: () => { friend.unreadCount = 0; }
      });
    }
  }

  loadChatMessages(): void {
    if (!this.user || !this.selectedFriend) return;
    this.friendsService.getConversation(this.user.id, this.selectedFriend.id).subscribe({
      next: (msgs) => {
        this.chatMessages = msgs || [];
        this.chatLoading = false;
        setTimeout(() => this.scrollToBottom(), 100);
      },
      error: () => { this.chatLoading = false; }
    });
  }

  sendMessage(): void {
    if (!this.user || !this.selectedFriend) return;
    const content = this.newMessage.trim();
    if (!content && !this.imagePreview) return;

    const msg: ChatMessage = {
      senderId: this.user.id, senderName: this.user.name,
      senderAvatar: (this.user as any).avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + this.user.name,
      receiverId: this.selectedFriend.id, receiverName: this.selectedFriend.name,
      content: content || '', messageType: this.imagePreview ? 'IMAGE' : 'TEXT',
      imageUrl: this.imagePreview || undefined, isRead: false
    };

    this.friendsService.sendMessage(msg).subscribe({
      next: (sent) => {
        this.chatMessages.push(sent);
        this.newMessage = '';
        this.imagePreview = null;
        this.showEmojiPicker = false;
        this.showGifPicker = false;
        setTimeout(() => this.scrollToBottom(), 100);
      },
      error: () => this.addToast('Failed to send message', 'error')
    });
  }

  sendGif(gifUrl: string): void {
    if (!this.user || !this.selectedFriend) return;
    const msg: ChatMessage = {
      senderId: this.user.id, senderName: this.user.name,
      senderAvatar: (this.user as any).avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + this.user.name,
      receiverId: this.selectedFriend.id, receiverName: this.selectedFriend.name,
      content: '', messageType: 'GIF', gifUrl, isRead: false
    };
    this.friendsService.sendMessage(msg).subscribe({
      next: (sent) => {
        this.chatMessages.push(sent);
        this.showGifPicker = false;
        this.gifSearchQuery = '';
        setTimeout(() => this.scrollToBottom(), 100);
      },
      error: () => this.addToast('Failed to send GIF', 'error')
    });
  }

  // ─── Emoji ───
  toggleEmojiPicker(event: Event): void { event.stopPropagation(); this.showEmojiPicker = !this.showEmojiPicker; this.showGifPicker = false; }
  insertChatEmoji(emoji: string, event: Event): void { event.stopPropagation(); this.newMessage += emoji; }

  // ─── GIF ───
  toggleGifPicker(event: Event): void { event.stopPropagation(); this.showGifPicker = !this.showGifPicker; this.showEmojiPicker = false; if (this.showGifPicker && this.gifResults.length === 0) this.loadTrendingGifs(); }

  loadTrendingGifs(): void {
    this.gifLoading = true;
    this.http.get<any>(`https://api.giphy.com/v1/gifs/trending?api_key=${this.GIPHY_KEY}&limit=20&rating=g`).subscribe({
      next: (res) => { this.gifResults = (res.data || []).map((g: any) => ({ url: g.images?.original?.url || g.images?.downsized_medium?.url, preview: g.images?.fixed_height_small?.url || g.images?.preview_gif?.url })); this.gifLoading = false; },
      error: () => { this.gifLoading = false; }
    });
  }

  onGifSearch(): void {
    clearTimeout(this.gifSearchTimeout);
    if (!this.gifSearchQuery.trim()) { this.loadTrendingGifs(); return; }
    this.gifSearchTimeout = setTimeout(() => {
      this.gifLoading = true;
      this.http.get<any>(`https://api.giphy.com/v1/gifs/search?api_key=${this.GIPHY_KEY}&q=${encodeURIComponent(this.gifSearchQuery)}&limit=20&rating=g`).subscribe({
        next: (res) => { this.gifResults = (res.data || []).map((g: any) => ({ url: g.images?.original?.url || g.images?.downsized_medium?.url, preview: g.images?.fixed_height_small?.url || g.images?.preview_gif?.url })); this.gifLoading = false; },
        error: () => { this.gifLoading = false; }
      });
    }, 400);
  }

  // ─── Image Upload ───
  triggerChatFileInput(): void { this.chatFileInput?.nativeElement?.click(); }

  onChatFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    if (!file.type.startsWith('image/')) { this.addToast('Only images allowed', 'error'); return; }
    if (file.size > 5 * 1024 * 1024) { this.addToast('Image must be under 5MB', 'error'); return; }
    const reader = new FileReader();
    reader.onload = () => { this.imagePreview = reader.result as string; };
    reader.readAsDataURL(file);
    input.value = '';
  }

  removeImagePreview(): void { this.imagePreview = null; }

  // ─── Utilities ───
  scrollToBottom(): void {
    try { this.chatContainer?.nativeElement?.scrollTo({ top: this.chatContainer.nativeElement.scrollHeight, behavior: 'smooth' }); } catch {}
  }

  isOwnMessage(msg: ChatMessage): boolean { return msg.senderId === this.user?.id; }

  formatTimeAgo(dateStr: string): string {
    if (!dateStr) return '';
    const date = !dateStr.endsWith('Z') && !dateStr.includes('+') && !dateStr.includes('-', 10) ? new Date(dateStr + 'Z') : new Date(dateStr);
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return mins + 'm';
    const hours = Math.floor(mins / 60);
    if (hours < 24) return hours + 'h';
    return Math.floor(hours / 24) + 'd';
  }

  formatMessageTime(dateStr?: string): string {
    if (!dateStr) return '';
    const date = !dateStr.endsWith('Z') && !dateStr.includes('+') && !dateStr.includes('-', 10) ? new Date(dateStr + 'Z') : new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // ─── Toasts ───
  addToast(message: string, type: 'success' | 'error' | 'info'): void {
    const id = ++this.toastCounter;
    this.toasts.unshift({ id, message, type });
    if (this.toasts.length > 4) this.toasts = this.toasts.slice(0, 4);
    setTimeout(() => this.dismissToast(id), 3500);
  }

  dismissToast(id: number): void {
    const t = this.toasts.find(t => t.id === id);
    if (t) { t.exiting = true; setTimeout(() => { this.toasts = this.toasts.filter(t => t.id !== id); }, 300); }
  }

  getToastIcon(type: string): string {
    switch (type) { case 'success': return '✅'; case 'error': return '❌'; default: return '💬'; }
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); this.sendMessage(); }
  }

  toggleFriendInfo(): void { this.showFriendInfo = !this.showFriendInfo; }
}
