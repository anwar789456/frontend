import { Component, OnInit, OnDestroy, ViewChild, ElementRef, HostListener } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, AuthUser } from '../../../shared/services/auth.service';
import { UserService } from '../../user/services/user.service';
import { FriendsService } from '../services/friends.service';
import { Friend, FriendRequest, Friendship, ChatMessage, DisplayMessage, UserStatus } from '../models/friend.model';

@Component({
  selector: 'app-friends',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './friends.component.html',
  styleUrl: './friends.component.css'
})
export class FriendsComponent implements OnInit, OnDestroy {
  @ViewChild('chatContainer') chatContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('messageInput') messageInput!: ElementRef<HTMLInputElement>;
  @ViewChild('chatFileInput') chatFileInput!: ElementRef<HTMLInputElement>;

  user: AuthUser | null = null;

  // Friends & Requests
  friends: Friend[] = [];
  friendRequests: FriendRequest[] = [];
  sentRequests: number[] = [];
  allUsers: { id: number; name: string; avatar: string }[] = [];

  // Chat
  selectedFriend: Friend | null = null;
  messages: DisplayMessage[] = [];
  messageText = '';
  chatLoading = false;

  // Tabs
  activeTab: 'chats' | 'friends' | 'requests' | 'explore' = 'chats';

  // Search
  searchQuery = '';
  userSearchQuery = '';

  // Emoji picker
  showEmojiPicker = false;
  activeEmojiCategory = 0;
  emojiCategories = [
    { name: 'Smileys', icon: '😊', emojis: ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','😊','😇','🥰','😍','🤩','😘','😗','😚','😙','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','😌','😔','😪','😴','😷','🤒','🤕','🤢','🤮','🥴','😵','🤯','🥳','😎','🤓','🧐'] },
    { name: 'Gestures', icon: '👋', emojis: ['👋','🤚','🖐','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','💪','🦾'] },
    { name: 'Hearts', icon: '❤️', emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❤️‍🔥','❣️','💕','💞','💓','💗','💖','💘','💝','💟','🫶'] },
    { name: 'Animals', icon: '🐶', emojis: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🙈','🙉','🙊','🐔','🐧','🐦','🐤','🦆','🦅','🦉','🐺','🐴','🦄','🐝','🦋'] },
    { name: 'Food', icon: '🍕', emojis: ['🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🍒','🍑','🥭','🍍','🥝','🍅','🥑','🍆','🥦','🥒','🌶','🌽','🥕','🍞','🧀','🍳','🍔','🍟','🍕','🌭','🥪','🌮','🍜','🍝','🍣','🍩','🍪','🎂','🍰','🍫','☕','🧋'] },
    { name: 'Symbols', icon: '⭐', emojis: ['⭐','🌟','✨','💫','🔥','💥','⚡','🌈','☀️','❄️','💨','🌊','💧','🎵','🎶','🔔','💬','💭','❗','❓','✅','❌','⭕','🚫','💯','🔴','🟠','🟡','🟢','🔵','🟣'] }
  ];

  // GIF picker
  showGifPicker = false;
  gifSearchQuery = '';
  gifResults: { url: string; preview: string }[] = [];
  gifLoading = false;
  private gifSearchTimeout: any;
  private readonly GIPHY_KEY = 'GlVGYR8KgYBgoK546FpLBaAZeLp5MHaX';

  // Image upload
  imagePreview: string | null = null;

  // Shared post preview (when receiving a shared post)
  sharedPostCache: Map<number, any> = new Map();

  // Status tracking
  friendStatuses: Map<number, UserStatus> = new Map();

  // Polling
  private heartbeatInterval: any;
  private messagePollInterval: any;
  private statusPollInterval: any;

  // Toasts
  toasts: { id: number; message: string; type: 'success' | 'info' | 'warning'; exiting?: boolean }[] = [];
  private toastCounter = 0;

  // Right panel
  showFriendInfo = false;

  constructor(
    private friendsService: FriendsService,
    private authService: AuthService,
    private userService: UserService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.user = this.authService.currentUser;
    if (!this.user) return;

    this.loadFriends();
    this.loadPendingRequests();
    this.loadAllUsers();
    this.startHeartbeat();

    // Poll messages every 3s
    this.messagePollInterval = setInterval(() => {
      if (this.selectedFriend) {
        this.pollMessages();
      }
    }, 3000);

    // Poll statuses every 10s
    this.statusPollInterval = setInterval(() => this.pollFriendStatuses(), 10000);
  }

  ngOnDestroy(): void {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    if (this.messagePollInterval) clearInterval(this.messagePollInterval);
    if (this.statusPollInterval) clearInterval(this.statusPollInterval);
    // Set offline
    if (this.user) {
      this.friendsService.setOffline(this.user.id).subscribe();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.emoji-picker-zone')) this.showEmojiPicker = false;
    if (!target.closest('.gif-picker-zone')) this.showGifPicker = false;
  }

  // ── Data Loading ──

  loadFriends(): void {
    if (!this.user) return;
    this.friendsService.getFriends(this.user.id).subscribe({
      error: (err) => console.error('Load friends error:', err),
      next: (friendships) => {
        this.friends = friendships.map(f => this.mapFriendshipToFriend(f));
        this.pollFriendStatuses();
        // Load last messages
        for (const friend of this.friends) {
          this.loadLastMessageForFriend(friend);
        }
      }
    });
  }

  private mapFriendshipToFriend(f: Friendship): Friend {
    const isUser = f.userId === this.user!.id;
    return {
      id: isUser ? f.friendId : f.userId,
      friendshipId: f.id!,
      name: isUser ? f.friendName : f.userName,
      avatar: isUser ? f.friendAvatar : f.userAvatar,
      lastMessage: '',
      lastMessageTime: '',
      online: false,
      unreadCount: 0
    };
  }

  private loadLastMessageForFriend(friend: Friend): void {
    if (!this.user) return;
    this.friendsService.getConversation(this.user.id, friend.id).subscribe({
      next: (msgs) => {
        if (msgs.length > 0) {
          const last = msgs[msgs.length - 1];
          friend.lastMessage = this.getMessagePreview(last);
          friend.lastMessageTime = this.getTimeAgo(last.createdAt || '');
          friend.unreadCount = msgs.filter(m => m.receiverId === this.user!.id && !m.isRead).length;
        }
      }
    });
  }

  private getMessagePreview(msg: ChatMessage): string {
    switch (msg.messageType) {
      case 'IMAGE': return '📷 Photo';
      case 'GIF': return 'GIF';
      case 'EMOJI': return msg.content || '😊';
      case 'SHARED_POST': return '📋 Shared a post';
      default: return msg.content?.substring(0, 40) + (msg.content && msg.content.length > 40 ? '...' : '') || '';
    }
  }

  loadPendingRequests(): void {
    if (!this.user) return;
    this.friendsService.getPendingRequests(this.user.id).subscribe({
      next: (friendships) => {
        this.friendRequests = friendships.map(f => ({
          id: f.userId,
          friendshipId: f.id!,
          name: f.userName,
          avatar: f.userAvatar,
          userId: f.userId,
          createdAt: f.createdAt || ''
        }));
      }
    });
    // Also load sent requests
    this.friendsService.getSentRequests(this.user.id).subscribe({
      next: (sent) => {
        this.sentRequests = sent.map(s => s.friendId);
      }
    });
  }

  loadAllUsers(): void {
    this.userService.getAllUsers().subscribe({
      next: (users) => {
        this.allUsers = users.map(u => ({
          id: u.id,
          name: u.name,
          avatar: (u as any).avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + u.name
        }));
      }
    });
  }

  // ── Heartbeat ──

  private startHeartbeat(): void {
    if (!this.user) return;
    const status: UserStatus = {
      userId: this.user.id,
      userName: this.user.name,
      userAvatar: (this.user as any).avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + this.user.name,
      isOnline: true
    };
    this.friendsService.sendHeartbeat(status).subscribe();
    this.heartbeatInterval = setInterval(() => {
      this.friendsService.sendHeartbeat(status).subscribe();
    }, 30000);
  }

  private pollFriendStatuses(): void {
    const ids = this.friends.map(f => f.id);
    if (ids.length === 0) return;
    this.friendsService.getUserStatuses(ids).subscribe({
      next: (statuses) => {
        for (const s of statuses) {
          this.friendStatuses.set(s.userId, s);
          const friend = this.friends.find(f => f.id === s.userId);
          if (friend) {
            friend.online = s.isOnline;
            friend.lastSeen = s.lastSeen;
          }
        }
      }
    });
  }

  // ── Friend Actions ──

  sendFriendRequest(targetUser: { id: number; name: string; avatar: string }): void {
    if (!this.user) return;
    const friendship: Friendship = {
      userId: this.user.id,
      userName: this.user.name,
      userAvatar: (this.user as any).avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + this.user.name,
      friendId: targetUser.id,
      friendName: targetUser.name,
      friendAvatar: targetUser.avatar,
      status: 'PENDING'
    };
    this.friendsService.sendFriendRequest(friendship).subscribe({
      next: () => {
        this.sentRequests.push(targetUser.id);
        this.addToast('Friend request sent!', 'success');
      },
      error: (err) => {
        console.error('Friend request error:', err);
        const status = err?.status || '';
        this.addToast(status === 404 ? 'Endpoint not found — backend not deployed' : 'Failed to send request (' + status + ')', 'warning');
      }
    });
  }

  acceptRequest(req: FriendRequest): void {
    this.friendsService.acceptFriendRequest(req.friendshipId!).subscribe({
      next: () => {
        this.friendRequests = this.friendRequests.filter(r => r.friendshipId !== req.friendshipId);
        this.loadFriends();
        this.addToast(`You and ${req.name} are now friends!`, 'success');
      }
    });
  }

  rejectRequest(req: FriendRequest): void {
    this.friendsService.rejectFriendRequest(req.friendshipId!).subscribe({
      next: () => {
        this.friendRequests = this.friendRequests.filter(r => r.friendshipId !== req.friendshipId);
        this.addToast('Request declined', 'info');
      }
    });
  }

  removeFriend(friend: Friend): void {
    this.friendsService.removeFriend(friend.friendshipId!).subscribe({
      next: () => {
        this.friends = this.friends.filter(f => f.id !== friend.id);
        if (this.selectedFriend?.id === friend.id) {
          this.selectedFriend = null;
          this.messages = [];
        }
        this.addToast(`${friend.name} removed from friends`, 'info');
      }
    });
  }

  // ── Chat ──

  selectFriend(friend: Friend): void {
    this.selectedFriend = friend;
    this.chatLoading = true;
    this.showEmojiPicker = false;
    this.showGifPicker = false;
    this.imagePreview = null;
    this.loadConversation(friend);
  }

  private loadConversation(friend: Friend): void {
    if (!this.user) return;
    this.friendsService.getConversation(this.user.id, friend.id).subscribe({
      next: (msgs) => {
        this.messages = msgs.map(m => this.mapToDisplayMessage(m));
        this.chatLoading = false;
        friend.unreadCount = 0;
        this.scrollToBottom();
        // Mark as read
        this.friendsService.markConversationRead(friend.id, this.user!.id).subscribe();
      },
      error: () => {
        this.chatLoading = false;
        this.messages = [];
      }
    });
  }

  private pollMessages(): void {
    if (!this.user || !this.selectedFriend) return;
    this.friendsService.getConversation(this.user.id, this.selectedFriend.id).subscribe({
      next: (msgs) => {
        if (msgs.length !== this.messages.length) {
          this.messages = msgs.map(m => this.mapToDisplayMessage(m));
          this.scrollToBottom();
          this.friendsService.markConversationRead(this.selectedFriend!.id, this.user!.id).subscribe();
        }
      }
    });
  }

  private mapToDisplayMessage(m: ChatMessage): DisplayMessage {
    return {
      id: m.id!,
      senderId: m.senderId,
      content: m.content ?? '',
      messageType: m.messageType ?? 'TEXT',
      imageUrl: m.imageUrl,
      gifUrl: m.gifUrl,
      sharedPostId: m.sharedPostId,
      time: this.formatMessageTime(m.createdAt || ''),
      isMine: m.senderId === this.user!.id,
      senderAvatar: m.senderAvatar ?? '',
      senderName: m.senderName ?? ''
    };
  }

  sendMessage(): void {
    if (!this.user || !this.selectedFriend) return;
    const text = this.messageText.trim();
    if (!text && !this.imagePreview) return;

    let messageType: ChatMessage['messageType'] = 'TEXT';
    let imageUrl: string | undefined;

    if (this.imagePreview) {
      messageType = 'IMAGE';
      imageUrl = this.imagePreview;
    }

    const msg: ChatMessage = {
      senderId: this.user.id,
      senderName: this.user.name,
      senderAvatar: (this.user as any).avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + this.user.name,
      receiverId: this.selectedFriend.id,
      receiverName: this.selectedFriend.name,
      content: text,
      messageType: messageType,
      imageUrl: imageUrl,
      isRead: false
    };

    this.friendsService.sendMessage(msg).subscribe({
      next: (saved) => {
        this.messages.push(this.mapToDisplayMessage(saved));
        this.messageText = '';
        this.imagePreview = null;
        this.scrollToBottom();
        // Update friend's last message
        this.selectedFriend!.lastMessage = this.getMessagePreview(saved);
        this.selectedFriend!.lastMessageTime = 'now';
      }
    });
  }

  sendEmoji(emoji: string): void {
    if (!this.user || !this.selectedFriend) return;
    const msg: ChatMessage = {
      senderId: this.user.id,
      senderName: this.user.name,
      senderAvatar: (this.user as any).avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + this.user.name,
      receiverId: this.selectedFriend.id,
      receiverName: this.selectedFriend.name,
      content: emoji,
      messageType: 'EMOJI',
      isRead: false
    };
    this.friendsService.sendMessage(msg).subscribe({
      next: (saved) => {
        this.messages.push(this.mapToDisplayMessage(saved));
        this.showEmojiPicker = false;
        this.scrollToBottom();
        this.selectedFriend!.lastMessage = emoji;
        this.selectedFriend!.lastMessageTime = 'now';
      }
    });
  }

  sendGif(gifUrl: string): void {
    if (!this.user || !this.selectedFriend) return;
    const msg: ChatMessage = {
      senderId: this.user.id,
      senderName: this.user.name,
      senderAvatar: (this.user as any).avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + this.user.name,
      receiverId: this.selectedFriend.id,
      receiverName: this.selectedFriend.name,
      content: '',
      messageType: 'GIF',
      gifUrl: gifUrl,
      isRead: false
    };
    this.friendsService.sendMessage(msg).subscribe({
      next: (saved) => {
        this.messages.push(this.mapToDisplayMessage(saved));
        this.showGifPicker = false;
        this.gifSearchQuery = '';
        this.scrollToBottom();
        this.selectedFriend!.lastMessage = 'GIF';
        this.selectedFriend!.lastMessageTime = 'now';
      }
    });
  }

  sendSharedPost(postId: number, postContent: string, postAuthor: string): void {
    if (!this.user || !this.selectedFriend) return;
    const msg: ChatMessage = {
      senderId: this.user.id,
      senderName: this.user.name,
      senderAvatar: (this.user as any).avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + this.user.name,
      receiverId: this.selectedFriend.id,
      receiverName: this.selectedFriend.name,
      content: postContent,
      messageType: 'SHARED_POST',
      sharedPostId: postId,
      isRead: false
    };
    this.friendsService.sendMessage(msg).subscribe({
      next: (saved) => {
        this.messages.push(this.mapToDisplayMessage(saved));
        this.scrollToBottom();
        this.selectedFriend!.lastMessage = '📋 Shared a post';
        this.selectedFriend!.lastMessageTime = 'now';
      }
    });
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  // ── Image Upload ──

  triggerFileInput(): void {
    this.chatFileInput?.nativeElement?.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    if (!file.type.startsWith('image/')) {
      this.addToast('Only image files are allowed', 'warning');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.addToast('Image must be under 5 MB', 'warning');
      return;
    }
    this.compressImage(file, 600, 0.6).then(compressed => {
      this.imagePreview = compressed;
    });
    input.value = '';
  }

  private compressImage(file: File, maxWidth: number, quality: number): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width;
        let h = img.height;
        if (w > maxWidth) { h = Math.round(h * maxWidth / w); w = maxWidth; }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = url;
    });
  }

  removeImagePreview(): void {
    this.imagePreview = null;
  }

  // ── Emoji Picker ──

  toggleEmojiPicker(event: Event): void {
    event.stopPropagation();
    this.showEmojiPicker = !this.showEmojiPicker;
    this.showGifPicker = false;
  }

  insertEmoji(emoji: string, event: Event): void {
    event.stopPropagation();
    this.messageText += emoji;
  }

  // ── GIF Picker ──

  toggleGifPicker(event: Event): void {
    event.stopPropagation();
    this.showGifPicker = !this.showGifPicker;
    this.showEmojiPicker = false;
    if (this.showGifPicker && this.gifResults.length === 0) {
      this.loadTrendingGifs();
    }
  }

  loadTrendingGifs(): void {
    this.gifLoading = true;
    this.http.get<any>(`https://api.giphy.com/v1/gifs/trending?api_key=${this.GIPHY_KEY}&limit=20&rating=g`).subscribe({
      next: (res) => {
        this.gifResults = (res.data || []).map((g: any) => ({
          url: g.images?.original?.url || g.images?.downsized_medium?.url,
          preview: g.images?.fixed_height_small?.url || g.images?.preview_gif?.url
        }));
        this.gifLoading = false;
      },
      error: () => { this.gifLoading = false; }
    });
  }

  onGifSearch(): void {
    clearTimeout(this.gifSearchTimeout);
    if (!this.gifSearchQuery.trim()) {
      this.loadTrendingGifs();
      return;
    }
    this.gifSearchTimeout = setTimeout(() => {
      this.gifLoading = true;
      this.http.get<any>(`https://api.giphy.com/v1/gifs/search?api_key=${this.GIPHY_KEY}&q=${encodeURIComponent(this.gifSearchQuery)}&limit=20&rating=g`).subscribe({
        next: (res) => {
          this.gifResults = (res.data || []).map((g: any) => ({
            url: g.images?.original?.url || g.images?.downsized_medium?.url,
            preview: g.images?.fixed_height_small?.url || g.images?.preview_gif?.url
          }));
          this.gifLoading = false;
        },
        error: () => { this.gifLoading = false; }
      });
    }, 400);
  }

  selectGif(gifUrl: string): void {
    this.sendGif(gifUrl);
  }

  // ── Search & Filters ──

  get filteredFriends(): Friend[] {
    if (!this.searchQuery.trim()) return this.friends;
    const q = this.searchQuery.toLowerCase();
    return this.friends.filter(f => f.name.toLowerCase().includes(q));
  }

  get onlineFriends(): Friend[] {
    return this.friends.filter(f => f.online);
  }

  get offlineFriends(): Friend[] {
    return this.friends.filter(f => !f.online);
  }

  get exploreUsers(): { id: number; name: string; avatar: string; isFriend: boolean; isPending: boolean }[] {
    if (!this.user) return [];
    const friendIds = new Set(this.friends.map(f => f.id));
    const q = this.userSearchQuery.toLowerCase();
    return this.allUsers
      .filter(u => u.id !== this.user!.id)
      .filter(u => !q || u.name.toLowerCase().includes(q))
      .map(u => ({
        ...u,
        isFriend: friendIds.has(u.id),
        isPending: this.sentRequests.includes(u.id) || this.friendRequests.some(r => r.userId === u.id)
      }));
  }

  // ── Utility ──

  private scrollToBottom(): void {
    setTimeout(() => {
      if (this.chatContainer) {
        this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight;
      }
    }, 50);
  }

  getTimeAgo(dateStr: string): string {
    if (!dateStr) return '';
    const date = !dateStr.endsWith('Z') && !dateStr.includes('+') && !dateStr.includes('-', 10)
      ? new Date(dateStr + 'Z') : new Date(dateStr);
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return mins + 'm';
    const hours = Math.floor(mins / 60);
    if (hours < 24) return hours + 'h';
    const days = Math.floor(hours / 24);
    if (days < 7) return days + 'd';
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  formatMessageTime(dateStr: string): string {
    if (!dateStr) return '';
    const date = !dateStr.endsWith('Z') && !dateStr.includes('+') && !dateStr.includes('-', 10)
      ? new Date(dateStr + 'Z') : new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' +
      date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  }

  getLastSeenText(friend: Friend): string {
    if (friend.online) return 'Online';
    if (!friend.lastSeen) return 'Offline';
    return 'Last seen ' + this.getTimeAgo(friend.lastSeen);
  }

  // ── Toast Notifications ──

  addToast(message: string, type: 'success' | 'info' | 'warning' = 'info'): void {
    const id = ++this.toastCounter;
    this.toasts.unshift({ id, message, type });
    if (this.toasts.length > 4) this.toasts = this.toasts.slice(0, 4);
    setTimeout(() => this.dismissToast(id), 3500);
  }

  dismissToast(id: number): void {
    const t = this.toasts.find(t => t.id === id);
    if (t) {
      t.exiting = true;
      setTimeout(() => { this.toasts = this.toasts.filter(t => t.id !== id); }, 300);
    }
  }

  getToastIcon(type: string): string {
    switch (type) {
      case 'success': return '✅';
      case 'warning': return '⚠️';
      default: return '💬';
    }
  }

  // ── Quick reactions (double tap emoji) ──
  quickReactions = ['👍', '❤️', '😂', '😮', '😢', '🔥'];
}
