import { Component, OnInit, OnDestroy, ViewChild, ElementRef, HostListener, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, AuthUser } from '../../../shared/services/auth.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
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
  activeTab: 'chats' | 'friends' | 'requests' | 'explore' | 'suggestions' | 'blocked' = 'chats';

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

  // Message actions
  activeMessageId: number | null = null;
  showDeleteMenu: number | null = null;
  showReactionPicker: number | null = null;
  replyingTo: DisplayMessage | null = null;
  messageReactionEmojis = ['❤️', '😂', '😮', '😢', '👍', '👎'];
  quickReactions = ['👋', '❤️', '😂', '👍'];

  // Typing indicator
  friendIsTyping = false;
  private typingTimeout: any;
  private typingPollInterval: any;

  // Voice message
  isRecording = false;
  recordingDuration = 0;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private recordingTimer: any;

  // Forwarding
  showForwardModal = false;
  messageToForward: DisplayMessage | null = null;

  // Block/Unblock
  blockedUsers: { id: number; friendshipId: number; name: string; avatar: string }[] = [];

  // Friend Suggestions
  friendSuggestions: { id: number; name: string; avatar: string; mutualCount: number }[] = [];

  // User Profile Modal
  showProfileModal = false;
  profileUser: { id: number; name: string; avatar: string; online: boolean; lastSeen?: string } | null = null;

  // Push Notifications
  notificationsEnabled = false;
  private lastMessageCount = 0;

  constructor(
    private friendsService: FriendsService,
    private authService: AuthService,
    private userService: UserService,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.user = this.authService.currentUser;
    if (!this.user) return;

    // Load everything in parallel immediately
    this.startHeartbeat();
    this.loadFriends();
    this.loadPendingRequests();
    this.loadAllUsers();
    this.loadBlockedUsers();
    this.requestNotificationPermission();

    // Poll messages every 3s
    this.messagePollInterval = setInterval(() => {
      if (this.selectedFriend) {
        this.pollMessages();
      }
    }, 3000);

    // Poll statuses every 5s
    this.statusPollInterval = setInterval(() => this.pollFriendStatuses(), 5000);

    // Poll typing indicator every 2s
    this.typingPollInterval = setInterval(() => this.pollTypingStatus(), 2000);
  }

  ngOnDestroy(): void {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    if (this.messagePollInterval) clearInterval(this.messagePollInterval);
    if (this.statusPollInterval) clearInterval(this.statusPollInterval);
    if (this.typingPollInterval) clearInterval(this.typingPollInterval);
    if (this.typingTimeout) clearTimeout(this.typingTimeout);
    if (this.recordingTimer) clearInterval(this.recordingTimer);
    // Set offline + clear typing
    if (this.user) {
      this.friendsService.clearTyping(this.user.id).subscribe();
      this.friendsService.setOffline(this.user.id).subscribe();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.emoji-picker-zone')) this.showEmojiPicker = false;
    if (!target.closest('.gif-picker-zone')) this.showGifPicker = false;
    if (!target.closest('.msg-action-zone')) {
      this.activeMessageId = null;
      this.showDeleteMenu = null;
      this.showReactionPicker = null;
    }
  }

  // ── Data Loading ──

  loadFriends(): void {
    if (!this.user) return;
    this.friendsService.getFriends(this.user.id).subscribe({
      error: (err) => console.error('Load friends error:', err),
      next: (friendships) => {
        this.friends = friendships.map(f => this.mapFriendshipToFriend(f));
        this.cdr.detectChanges();

        // Load statuses + last messages + unread counts all in parallel
        if (this.friends.length > 0) {
          this.pollFriendStatuses();
          this.loadAllLastMessages();
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

  private loadAllLastMessages(): void {
    if (!this.user) return;
    for (const friend of this.friends) {
      // Use lightweight endpoints instead of full conversation
      forkJoin({
        lastMsg: this.friendsService.getLastMessage(this.user!.id, friend.id).pipe(catchError(() => of(null))),
        unread: this.friendsService.getUnreadMessageCount(friend.id, this.user!.id).pipe(catchError(() => of({ count: 0 })))
      }).subscribe({
        next: ({ lastMsg, unread }) => {
          if (lastMsg) {
            friend.lastMessage = this.getMessagePreview(lastMsg);
            friend.lastMessageTime = this.getTimeAgo(lastMsg.createdAt || '');
          }
          friend.unreadCount = unread?.count || 0;
          this.cdr.detectChanges();
        }
      });
    }
  }

  private getMessagePreview(msg: ChatMessage): string {
    switch (msg.messageType) {
      case 'IMAGE': return '📷 Photo';
      case 'GIF': return 'GIF';
      case 'EMOJI': return msg.content || '😊';
      case 'SHARED_POST': return '📋 Shared a post';
      case 'VOICE': return '🎤 Voice message';
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
        this.cdr.detectChanges();
      }
    });
    // Also load sent requests
    this.friendsService.getSentRequests(this.user.id).subscribe({
      next: (sent) => {
        this.sentRequests = sent.map(s => s.friendId);
        this.cdr.detectChanges();
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
        this.cdr.detectChanges();
        // Load suggestions once we have both friends and users
        setTimeout(() => this.loadFriendSuggestions(), 500);
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
        this.cdr.detectChanges();
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
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Friend request error:', err);
        const status = err?.status || '';
        this.addToast(status === 404 ? 'Endpoint not found — backend not deployed' : 'Failed to send request (' + status + ')', 'warning');
      }
    });
  }

  acceptRequest(req: FriendRequest): void {
    this.friendsService.acceptFriendRequest(req.friendshipId).subscribe({
      next: () => {
        this.friendRequests = this.friendRequests.filter(r => r.friendshipId !== req.friendshipId);
        this.loadFriends();
        this.addToast(`You and ${req.name} are now friends!`, 'success');
        this.cdr.detectChanges();
      }
    });
  }

  rejectRequest(req: FriendRequest): void {
    this.friendsService.rejectFriendRequest(req.friendshipId).subscribe({
      next: () => {
        this.friendRequests = this.friendRequests.filter(r => r.friendshipId !== req.friendshipId);
        this.addToast('Request declined', 'info');
        this.cdr.detectChanges();
      }
    });
  }

  removeFriend(friend: Friend): void {
    this.friendsService.removeFriend(friend.friendshipId).subscribe({
      next: () => {
        this.friends = this.friends.filter(f => f.id !== friend.id);
        if (this.selectedFriend?.id === friend.id) {
          this.selectedFriend = null;
          this.messages = [];
        }
        this.addToast(`${friend.name} removed from friends`, 'info');
        this.cdr.detectChanges();
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
        this.messages = this.filterDeletedMessages(msgs).map(m => this.mapToDisplayMessage(m));
        this.chatLoading = false;
        friend.unreadCount = 0;
        this.scrollToBottom();
        this.friendsService.markConversationRead(friend.id, this.user!.id).subscribe();
        this.cdr.detectChanges();
      },
      error: () => {
        this.chatLoading = false;
        this.messages = [];
        this.cdr.detectChanges();
      }
    });
  }

  private pollMessages(): void {
    if (!this.user || !this.selectedFriend) return;
    this.friendsService.getConversation(this.user.id, this.selectedFriend.id).subscribe({
      next: (msgs) => {
        const filtered = this.filterDeletedMessages(msgs);
        if (filtered.length > this.messages.length) {
          // Check for new incoming messages for push notification
          const newMsgs = filtered.slice(this.messages.length);
          for (const m of newMsgs) {
            if (m.senderId !== this.user!.id) {
              this.sendBrowserNotification(
                m.senderName || 'New message',
                m.messageType === 'VOICE' ? '🎤 Voice message' : (m.content?.substring(0, 60) || 'New message'),
                m.senderAvatar
              );
            }
          }
          this.messages = filtered.map(m => this.mapToDisplayMessage(m));
          this.scrollToBottom();
          this.friendsService.markConversationRead(this.selectedFriend!.id, this.user!.id).subscribe();
          this.cdr.detectChanges();
        }
      }
    });
  }

  private filterDeletedMessages(msgs: ChatMessage[]): ChatMessage[] {
    if (!this.user) return msgs;
    const uid = this.user.id.toString();
    return msgs.filter(m => {
      if (!m.deletedForUsers) return true;
      return !m.deletedForUsers.split(',').includes(uid);
    });
  }

  private mapToDisplayMessage(m: ChatMessage): DisplayMessage {
    return {
      id: m.id!,
      senderId: m.senderId,
      content: m.content,
      messageType: m.messageType,
      imageUrl: m.imageUrl,
      gifUrl: m.gifUrl,
      sharedPostId: m.sharedPostId,
      replyToId: m.replyToId,
      replyToContent: m.replyToContent,
      replyToSenderName: m.replyToSenderName,
      reactions: m.reactions,
      time: this.formatMessageTime(m.createdAt || ''),
      isMine: m.senderId === this.user!.id,
      senderAvatar: m.senderAvatar,
      senderName: m.senderName,
      isRead: m.isRead,
      readAt: m.readAt,
      voiceUrl: m.voiceUrl,
      voiceDuration: m.voiceDuration,
      isForwarded: m.isForwarded,
      forwardedFromName: m.forwardedFromName
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

    // Attach reply info if replying
    if (this.replyingTo) {
      msg.replyToId = this.replyingTo.id;
      msg.replyToContent = this.replyingTo.content?.substring(0, 100) || '';
      msg.replyToSenderName = this.replyingTo.senderName;
    }

    // Clear typing indicator on send
    if (this.typingTimeout) clearTimeout(this.typingTimeout);
    this.friendsService.clearTyping(this.user.id).subscribe();

    this.friendsService.sendMessage(msg).subscribe({
      next: (saved) => {
        this.messages.push(this.mapToDisplayMessage(saved));
        this.messageText = '';
        this.imagePreview = null;
        this.replyingTo = null;
        this.scrollToBottom();
        this.selectedFriend!.lastMessage = this.getMessagePreview(saved);
        this.selectedFriend!.lastMessageTime = 'now';
        this.cdr.detectChanges();
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
        this.cdr.detectChanges();
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
        this.cdr.detectChanges();
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
        this.cdr.detectChanges();
      }
    });
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    } else {
      this.onTyping();
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

  // ── Message Actions ──

  toggleMessageActions(msgId: number, event: Event): void {
    event.stopPropagation();
    this.activeMessageId = this.activeMessageId === msgId ? null : msgId;
    this.showDeleteMenu = null;
    this.showReactionPicker = null;
  }

  openDeleteMenu(msgId: number, event: Event): void {
    event.stopPropagation();
    this.showDeleteMenu = msgId;
  }

  deleteForMe(msg: DisplayMessage): void {
    if (!this.user) return;
    this.friendsService.deleteMessageForUser(msg.id, this.user.id).subscribe({
      next: () => {
        this.messages = this.messages.filter(m => m.id !== msg.id);
        this.activeMessageId = null;
        this.showDeleteMenu = null;
        this.addToast('Message deleted for you', 'info');
        this.cdr.detectChanges();
      },
      error: () => this.addToast('Failed to delete message', 'warning')
    });
  }

  deleteForEveryone(msg: DisplayMessage): void {
    this.friendsService.deleteMessage(msg.id).subscribe({
      next: () => {
        this.messages = this.messages.filter(m => m.id !== msg.id);
        this.activeMessageId = null;
        this.showDeleteMenu = null;
        this.addToast('Message deleted for everyone', 'info');
        this.cdr.detectChanges();
      },
      error: () => this.addToast('Failed to delete message', 'warning')
    });
  }

  replyToMessage(msg: DisplayMessage): void {
    this.replyingTo = msg;
    this.activeMessageId = null;
    this.messageInput?.nativeElement?.focus();
  }

  cancelReply(): void {
    this.replyingTo = null;
  }

  translateMessage(msg: DisplayMessage): void {
    if (msg.showTranslation && msg.translatedContent) {
      msg.showTranslation = false;
      this.activeMessageId = null;
      this.cdr.detectChanges();
      return;
    }
    const text = msg.content;
    if (!text) return;
    this.http.get<any>(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|fr`).subscribe({
      next: (res) => {
        msg.translatedContent = res?.responseData?.translatedText || 'Translation unavailable';
        msg.showTranslation = true;
        this.activeMessageId = null;
        this.cdr.detectChanges();
      },
      error: () => {
        this.addToast('Translation failed', 'warning');
        this.activeMessageId = null;
      }
    });
  }

  openReactionPicker(msgId: number, event: Event): void {
    event.stopPropagation();
    this.showReactionPicker = this.showReactionPicker === msgId ? null : msgId;
    this.showDeleteMenu = null;
  }

  reactToMessage(msg: DisplayMessage, emoji: string): void {
    if (!this.user) return;
    this.friendsService.toggleReaction(msg.id, this.user.id, emoji).subscribe({
      next: (updated) => {
        msg.reactions = updated.reactions || undefined;
        this.showReactionPicker = null;
        this.activeMessageId = null;
        this.cdr.detectChanges();
      },
      error: () => this.addToast('Failed to react', 'warning')
    });
  }

  getReactionsList(reactions: string | undefined): { emoji: string; count: number; userReacted: boolean }[] {
    if (!reactions || !this.user) return [];
    const entries = reactions.split(',').filter(r => r.trim());
    const emojiMap = new Map<string, { count: number; userReacted: boolean }>();
    for (const entry of entries) {
      const parts = entry.split(':');
      if (parts.length !== 2) continue;
      const [userId, emoji] = parts;
      if (!emojiMap.has(emoji)) {
        emojiMap.set(emoji, { count: 0, userReacted: false });
      }
      const data = emojiMap.get(emoji)!;
      data.count++;
      if (parseInt(userId) === this.user.id) data.userReacted = true;
    }
    return Array.from(emojiMap.entries()).map(([emoji, data]) => ({
      emoji,
      count: data.count,
      userReacted: data.userReacted
    }));
  }

  // ── Typing Indicator ──

  onTyping(): void {
    if (!this.user || !this.selectedFriend) return;
    this.friendsService.setTyping(this.user.id, this.selectedFriend.id).subscribe();
    // Clear typing after 3s of no input
    if (this.typingTimeout) clearTimeout(this.typingTimeout);
    this.typingTimeout = setTimeout(() => {
      if (this.user) {
        this.friendsService.clearTyping(this.user.id).subscribe();
      }
    }, 3000);
  }

  private pollTypingStatus(): void {
    if (!this.user || !this.selectedFriend) {
      this.friendIsTyping = false;
      return;
    }
    this.friendsService.isTyping(this.selectedFriend.id, this.user.id).subscribe({
      next: (res) => {
        this.friendIsTyping = res.typing;
        this.cdr.detectChanges();
      },
      error: () => { this.friendIsTyping = false; }
    });
  }

  // ── Voice Messages ──

  private recordingCancelled = false;

  async startRecording(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Use low bitrate to keep base64 small
      const options: MediaRecorderOptions = {};
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        options.mimeType = 'audio/webm;codecs=opus';
      }
      options.audioBitsPerSecond = 16000;

      this.mediaRecorder = new MediaRecorder(stream, options);
      this.audioChunks = [];
      this.recordingDuration = 0;
      this.isRecording = true;
      this.recordingCancelled = false;

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        // Stop all tracks first
        stream.getTracks().forEach(track => track.stop());
        // Only send if not cancelled
        if (this.recordingCancelled || this.audioChunks.length === 0) {
          this.recordingCancelled = false;
          return;
        }
        const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
        const audioBlob = new Blob(this.audioChunks, { type: mimeType });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          this.sendVoiceMessage(base64, this.recordingDuration);
        };
        reader.readAsDataURL(audioBlob);
      };

      // Collect data every 1s for smaller chunks
      this.mediaRecorder.start(1000);
      this.recordingTimer = setInterval(() => {
        this.recordingDuration++;
        this.cdr.detectChanges();
        if (this.recordingDuration >= 30) {
          this.stopRecording();
        }
      }, 1000);

      this.cdr.detectChanges();
    } catch (err) {
      this.addToast('Microphone access denied', 'warning');
    }
  }

  stopRecording(): void {
    if (this.mediaRecorder && this.isRecording) {
      this.recordingCancelled = false;
      this.mediaRecorder.stop();
      this.isRecording = false;
      if (this.recordingTimer) {
        clearInterval(this.recordingTimer);
        this.recordingTimer = null;
      }
      this.cdr.detectChanges();
    }
  }

  cancelRecording(): void {
    if (this.mediaRecorder && this.isRecording) {
      this.recordingCancelled = true;
      this.mediaRecorder.stop();
      this.isRecording = false;
      this.audioChunks = [];
      if (this.recordingTimer) {
        clearInterval(this.recordingTimer);
        this.recordingTimer = null;
      }
      this.cdr.detectChanges();
    }
  }

  private sendVoiceMessage(base64Audio: string, duration: number): void {
    if (!this.user || !this.selectedFriend) return;
    const msg: ChatMessage = {
      senderId: this.user.id,
      senderName: this.user.name,
      senderAvatar: (this.user as any).avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + this.user.name,
      receiverId: this.selectedFriend.id,
      receiverName: this.selectedFriend.name,
      content: '',
      messageType: 'VOICE',
      voiceUrl: base64Audio,
      voiceDuration: duration,
      isRead: false
    };
    this.friendsService.sendMessage(msg).subscribe({
      next: (saved) => {
        this.messages.push(this.mapToDisplayMessage(saved));
        this.scrollToBottom();
        this.selectedFriend!.lastMessage = '🎤 Voice message';
        this.selectedFriend!.lastMessageTime = 'now';
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Voice send error:', err);
        this.addToast('Failed to send voice message', 'warning');
      }
    });
  }

  formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  // ── Message Forwarding ──

  openForwardModal(msg: DisplayMessage): void {
    this.messageToForward = msg;
    this.showForwardModal = true;
    this.activeMessageId = null;
  }

  closeForwardModal(): void {
    this.showForwardModal = false;
    this.messageToForward = null;
  }

  forwardMessageTo(friend: Friend): void {
    if (!this.user || !this.messageToForward) return;
    const original = this.messageToForward;

    const msg: ChatMessage = {
      senderId: this.user.id,
      senderName: this.user.name,
      senderAvatar: (this.user as any).avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + this.user.name,
      receiverId: friend.id,
      receiverName: friend.name,
      content: original.content,
      messageType: original.messageType,
      imageUrl: original.imageUrl,
      gifUrl: original.gifUrl,
      voiceUrl: original.voiceUrl,
      voiceDuration: original.voiceDuration,
      isRead: false,
      isForwarded: true,
      forwardedFromName: original.senderName
    };

    this.friendsService.sendMessage(msg).subscribe({
      next: (saved) => {
        if (this.selectedFriend?.id === friend.id) {
          this.messages.push(this.mapToDisplayMessage(saved));
          this.scrollToBottom();
        }
        this.addToast(`Message forwarded to ${friend.name}`, 'success');
        this.closeForwardModal();
        this.cdr.detectChanges();
      },
      error: () => this.addToast('Failed to forward message', 'warning')
    });
  }

  // ── Block / Unblock ──

  loadBlockedUsers(): void {
    if (!this.user) return;
    this.friendsService.getBlockedUsers(this.user.id).subscribe({
      next: (blocked) => {
        this.blockedUsers = blocked.map(f => {
          const isUser = f.userId === this.user!.id;
          return {
            id: isUser ? f.friendId : f.userId,
            friendshipId: f.id!,
            name: isUser ? f.friendName : f.userName,
            avatar: isUser ? f.friendAvatar : f.userAvatar
          };
        });
        this.cdr.detectChanges();
      }
    });
  }

  blockFriend(friend: Friend): void {
    this.friendsService.blockUser(friend.friendshipId).subscribe({
      next: () => {
        this.friends = this.friends.filter(f => f.id !== friend.id);
        if (this.selectedFriend?.id === friend.id) {
          this.selectedFriend = null;
          this.messages = [];
        }
        this.blockedUsers.push({ id: friend.id, friendshipId: friend.friendshipId, name: friend.name, avatar: friend.avatar });
        this.addToast(`${friend.name} has been blocked`, 'info');
        this.cdr.detectChanges();
      }
    });
  }

  unblockUser(blocked: { id: number; friendshipId: number; name: string; avatar: string }): void {
    this.friendsService.unblockUser(blocked.friendshipId).subscribe({
      next: () => {
        this.blockedUsers = this.blockedUsers.filter(b => b.id !== blocked.id);
        this.loadFriends();
        this.addToast(`${blocked.name} has been unblocked`, 'success');
        this.cdr.detectChanges();
      }
    });
  }

  // ── Friend Suggestions ──

  loadFriendSuggestions(): void {
    if (!this.user) return;
    const friendIds = new Set(this.friends.map(f => f.id));
    friendIds.add(this.user.id);
    const blockedIds = new Set(this.blockedUsers.map(b => b.id));

    const suggestions = this.allUsers
      .filter(u => !friendIds.has(u.id) && !blockedIds.has(u.id) && !this.sentRequests.includes(u.id))
      .slice(0, 8);

    // Load mutual friends count for each suggestion
    this.friendSuggestions = suggestions.map(u => ({ id: u.id, name: u.name, avatar: u.avatar, mutualCount: 0 }));
    this.cdr.detectChanges();

    for (const s of this.friendSuggestions) {
      this.friendsService.getMutualFriendsCount(this.user.id, s.id).pipe(
        catchError(() => of({ count: 0 }))
      ).subscribe({
        next: (res) => {
          s.mutualCount = res.count;
          this.cdr.detectChanges();
        }
      });
    }
  }

  sendSuggestionRequest(suggestion: { id: number; name: string; avatar: string; mutualCount: number }): void {
    if (!this.user) return;
    const friendship: Friendship = {
      userId: this.user.id,
      userName: this.user.name,
      userAvatar: (this.user as any).avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + this.user.name,
      friendId: suggestion.id,
      friendName: suggestion.name,
      friendAvatar: suggestion.avatar,
      status: 'PENDING'
    };
    this.friendsService.sendFriendRequest(friendship).subscribe({
      next: () => {
        this.friendSuggestions = this.friendSuggestions.filter(s => s.id !== suggestion.id);
        this.sentRequests.push(suggestion.id);
        this.addToast(`Friend request sent to ${suggestion.name}!`, 'success');
        this.cdr.detectChanges();
      },
      error: () => this.addToast('Failed to send request', 'warning')
    });
  }

  // ── User Profile Modal ──

  openProfileModal(userId: number, name: string, avatar: string): void {
    const friend = this.friends.find(f => f.id === userId);
    this.profileUser = {
      id: userId,
      name: name,
      avatar: avatar,
      online: friend?.online || false,
      lastSeen: friend?.lastSeen
    };
    this.showProfileModal = true;
    this.cdr.detectChanges();
  }

  closeProfileModal(): void {
    this.showProfileModal = false;
    this.profileUser = null;
  }

  startChatFromProfile(): void {
    if (!this.profileUser) return;
    const friend = this.friends.find(f => f.id === this.profileUser!.id);
    if (friend) {
      this.selectFriend(friend);
      this.closeProfileModal();
    }
  }

  // ── Push Notifications ──

  requestNotificationPermission(): void {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        this.notificationsEnabled = true;
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(perm => {
          this.notificationsEnabled = perm === 'granted';
        });
      }
    }
  }

  private sendBrowserNotification(title: string, body: string, icon?: string): void {
    if (!this.notificationsEnabled || !('Notification' in window)) return;
    if (document.hasFocus()) return; // Don't notify if tab is focused
    const notif = new Notification(title, {
      body,
      icon: icon || 'https://api.dicebear.com/7.x/avataaars/svg?seed=MinoLingo',
      tag: 'minolingo-chat'
    });
    notif.onclick = () => {
      window.focus();
      notif.close();
    };
    setTimeout(() => notif.close(), 5000);
  }

}
