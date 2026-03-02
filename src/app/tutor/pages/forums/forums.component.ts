import { Component, OnInit, OnDestroy, ViewChild, ElementRef, HostListener } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ForumService } from '../../../user/forum/services/forum.service';
import { AuthService, AuthUser } from '../../../shared/services/auth.service';
import { UserService } from '../../../user/user/services/user.service';
import { FriendsService } from '../../../user/friends/services/friends.service';
import { ForumPost, ForumPostWithShared, TrendingTopic } from '../../../user/forum/models/forum.model';
import { ForumReport, REPORT_REASONS, ReportReason } from '../../../user/forum/models/forum-report.model';
import { Friend, FriendRequest, Friendship, ChatMessage } from '../../../user/friends/models/friend.model';
import { User } from '../../../user/user/models/user.model';

@Component({
  selector: 'app-tutor-forums',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './forums.component.html',
  styleUrls: ['./forums.component.css']
})
export class TutorForumsComponent implements OnInit, OnDestroy {
  @ViewChild('postInput') postInput!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  private newTopicSub!: Subscription;
  posts: ForumPost[] = [];
  allPosts: ForumPost[] = [];
  trendingTopics: TrendingTopic[] = [];
  filteredPosts: ForumPost[] = [];
  user: AuthUser | null = null;
  newPostContent = '';
  newPostImage = '';
  showImageInput = false;
  selectedFile: File | null = null;
  filePreviewUrl: string | null = null;
  fileType: 'image' | 'video' | null = null;
  fileError = '';
  showEmojiPicker = false;
  activeEmojiCategory = 0;
  emojiCategories = [
    { name: 'Smileys', icon: '😊', emojis: ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','😊','😇','🥰','😍','🤩','😘','😗','😚','😙','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','😌','😔','😪','😴','😷','🤒','🤕','🤢','🤮','🥴','😵','🤯','🥳','😎','🤓','🧐','😈','👿','💀','💩','🤡','👹','👻','👽','👾','🤖'] },
    { name: 'Gestures', icon: '👋', emojis: ['👋','🤚','🖐','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','💪','🦾'] },
    { name: 'Hearts', icon: '❤️', emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❤️‍🔥','❣️','💕','💞','💓','💗','💖','💘','💝','💟','🫶'] },
    { name: 'Animals', icon: '🐶', emojis: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🙈','🙉','🙊','🐔','🐧','🐦','🐤','🦆','🦅','🦉','🐺','🐴','🦄','🐝','🦋','🐌','🐞','🐢','🐍','🐙','🐬','🐳','🦈'] },
    { name: 'Food', icon: '🍕', emojis: ['🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🍒','🍑','🥭','🍍','🥝','🍅','🥑','🍆','🥦','🥒','🌶','🌽','🥕','🍞','🧀','🍳','🍔','🍟','🍕','🌭','🥪','🌮','🍜','🍝','🍣','🍩','🍪','🎂','🍰','🍫','🍬','☕','🧋','🍺','🍷'] },
    { name: 'Travel', icon: '✈️', emojis: ['🚗','🚕','🚌','🏎','🚑','🚒','✈️','🚀','🛸','🚁','⛵','🚢','🏠','🏢','🏰','🗼','🗽','🌋','🏔','🏕','🏖','🏜','🏝','🌅','🌄','🌠','🎇','🎆','🌃','🌉'] },
    { name: 'Objects', icon: '💡', emojis: ['📱','💻','🖥','🎮','🕹','📷','📹','🎥','📺','🎙','⏰','💡','🔋','💸','💰','💎','🔑','🔒','🛠','🔧','📌','📎','✂️','📝','✏️','📚','📖','📰','✉️','📦'] },
    { name: 'Symbols', icon: '⭐', emojis: ['⭐','🌟','✨','💫','🔥','💥','⚡','🌈','☀️','❄️','💨','🌊','💧','🎵','🎶','🔔','💬','💭','❗','❓','✅','❌','⭕','🚫','💯','🔴','🟠','🟡','🟢','🔵','🟣','⚫','⚪','🏁','🚩'] }
  ];
  showLocationInput = false;
  newPostLocation = '';
  showUserSuggestions = false;
  userSuggestions: { id: number; name: string; username: string; avatar: string }[] = [];
  allKnownUsers: { id: number; name: string; username: string; avatar: string }[] = [];
  searchQuery = '';
  replyingToPostId: number | null = null;
  replyContent = '';
  editingPostId: number | null = null;
  editContent = '';
  openMenuPostId: number | null = null;
  repliesMap: Map<number, ForumPost[]> = new Map();
  expandedRepliesPostId: number | null = null;
  showNewTopicForm = false;
  newTopicTitle = '';
  newTopicCategory = '';
  selectedTopicId: number | null = null;
  postError = '';
  replyError = '';
  editError = '';
  topicTitleError = '';
  topicCategoryError = '';
  showReportModal = false;
  reportingPost: ForumPost | null = null;
  reportReason: ReportReason | '' = '';
  reportDescription = '';
  reportError = '';
  reportSuccess = '';
  reportSubmitting = false;
  reportReasons = REPORT_REASONS;
  reactionEmojis = ['❤️', '😂', '😮', '😢', '🔥', '👏'];
  showReactionsPostId: number | null = null;
  userReactions: Map<number, string> = new Map();
  postReactionCounts: Map<number, Map<string, number>> = new Map();
  floatingReaction: { postId: number; emoji: string } | null = null;
  showGifPicker = false;
  gifSearchQuery = '';
  gifResults: { url: string; preview: string }[] = [];
  gifLoading = false;
  private gifSearchTimeout: any;
  private readonly GIPHY_KEY = 'GlVGYR8KgYBgoK546FpLBaAZeLp5MHaX';
  darkMode = false;
  notifications: { id: number; message: string; type: 'success' | 'info' | 'warning'; time: number; exiting?: boolean }[] = [];
  private notifCounter = 0;
  showNotifPanel = false;
  tagNotifications: any[] = [];
  unreadNotifCount = 0;
  private notifPollInterval: any;
  showShareModal = false;
  sharingPost: ForumPost | null = null;
  shareFriends: Friend[] = [];
  shareSearchQuery = '';
  shareLoading = false;
  friendStatuses: Map<number, string> = new Map();

  // Save & Favorite
  savedPostIds: Set<number> = new Set();
  favoritePostIds: Set<number> = new Set();

  // Facebook-style Share
  shareMessage = '';
  showShareEmojiPicker = false;
  shareShowUserSuggestions = false;
  shareUserSuggestions: { id: number; name: string; username: string; avatar: string }[] = [];

  // Notification → Post scroll
  highlightedPostId: number | null = null;
  private highlightTimeout: any;

  // Friend Request Notifications
  pendingFriendRequests: FriendRequest[] = [];

  // View Profile Modal
  showProfileModal = false;
  profileUser: User | null = null;
  profileUserPosts: ForumPostWithShared[] = [];
  profileFriendRequest: FriendRequest | null = null;
  profileLoading = false;

  constructor(
    private forumService: ForumService,
    private authService: AuthService,
    private userService: UserService,
    private friendsService: FriendsService,
    private sanitizer: DomSanitizer,
    private http: HttpClient
  ) { }

  ngOnInit(): void {
    this.user = this.authService.currentUser;
    this.newTopicSub = this.authService.currentUser$.subscribe(u => { this.user = u; });
    this.darkMode = localStorage.getItem('forum_dark_mode') === 'true';
    this.loadReactionsFromStorage();
    this.loadSavedAndFavorites();
    this.loadPosts();
    this.loadTrendingTopics();
    this.loadAllUsers();
    this.loadTrendingGifs();
    this.loadTagNotifications();
    this.loadPendingFriendRequests();
    this.forumService.newTopic$.subscribe(() => { this.toggleNewTopicForm(); });
    this.notifPollInterval = setInterval(() => this.pollNotifications(), 15000);
  }

  ngOnDestroy(): void {
    this.newTopicSub?.unsubscribe();
    if (this.notifPollInterval) clearInterval(this.notifPollInterval);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    try {
      const target = event.target as HTMLElement;
      if (!target.closest('.emoji-picker-container')) this.showEmojiPicker = false;
      if (!target.closest('.user-suggestions-container')) this.showUserSuggestions = false;
    } catch { this.showEmojiPicker = false; this.showUserSuggestions = false; }
  }

  focusPostInput(): void {
    setTimeout(() => { this.postInput?.nativeElement?.focus(); this.postInput?.nativeElement?.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
  }

  private parseTimestamp(ts: string): Date {
    if (!ts.endsWith('Z') && !ts.includes('+') && !ts.includes('-', 10)) return new Date(ts + 'Z');
    return new Date(ts);
  }

  private extractHashtags(content: string): string[] {
    const matches = content.match(/#(\w+)/g);
    return matches ? matches.map(m => m.toLowerCase()) : [];
  }

  private findTopicByHashtag(hashtag: string): TrendingTopic | undefined {
    return this.trendingTopics.find(t => t.title?.toLowerCase() === hashtag.toLowerCase());
  }

  loadPosts(): void {
    this.forumService.getAllPosts().subscribe({
      next: (all) => {
        this.allPosts = all;
        this.posts = all.filter(p => !p.parentPostId);
        this.countCommentsFromAll();
        this.resolveSharedPosts();
        this.buildKnownUsers();
        this.applyFilter();
      }
    });
  }

  private countCommentsFromAll(): void {
    for (const post of this.posts) {
      post.comments = this.allPosts.filter(p => p.parentPostId === post.id).length;
    }
  }

  loadTrendingTopics(): void {
    this.forumService.getAllTopics().subscribe({ next: (topics) => { this.trendingTopics = topics || []; } });
  }

  applyFilter(): void {
    let result = this.posts;
    if (this.selectedTopicId !== null) {
      const topic = this.trendingTopics.find(t => t.id === this.selectedTopicId);
      if (topic?.title) {
        const tag = topic.title.toLowerCase();
        result = result.filter(p => this.extractHashtags(p.content).includes(tag));
      }
    }
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(p => p.content.toLowerCase().includes(q) || p.author.toLowerCase().includes(q) || p.username.toLowerCase().includes(q));
    }
    this.filteredPosts = result;
  }

  onSearchChange(): void { this.applyFilter(); }

  validatePostContent(content: string): string {
    if (!content.trim()) return 'Post content cannot be empty.';
    if (content.trim().length < 2) return 'Post must be at least 2 characters.';
    if (content.length > 1000) return 'Post cannot exceed 1000 characters.';
    return '';
  }

  validateReplyContent(content: string): string {
    if (!content.trim()) return 'Reply cannot be empty.';
    if (content.length > 500) return 'Reply cannot exceed 500 characters.';
    return '';
  }

  validateTopicTitle(title: string): string {
    if (!title.trim()) return 'Topic title is required.';
    if (!title.startsWith('#')) return 'Topic title must start with #.';
    if (title.trim().length < 2) return 'Topic title must be at least 2 characters.';
    if (title.length > 50) return 'Topic title cannot exceed 50 characters.';
    if (this.trendingTopics.find(t => t.title?.toLowerCase() === title.toLowerCase())) return 'This topic already exists.';
    return '';
  }

  validateTopicCategory(category: string): string {
    if (!category.trim()) return 'Category is required.';
    if (category.length > 30) return 'Category cannot exceed 30 characters.';
    return '';
  }

  validateImageUrl(url: string): boolean {
    if (!url) return true;
    try { new URL(url); return true; } catch { return false; }
  }

  createPost(): void {
    if (!this.user) this.user = this.authService.currentUser;
    if (!this.user) { this.postError = 'You must be logged in to post.'; return; }
    this.postError = this.validatePostContent(this.newPostContent);
    if (this.postError) return;
    if (this.showImageInput && this.newPostImage && !this.validateImageUrl(this.newPostImage)) { this.postError = 'Please enter a valid image URL.'; return; }
    const hashtags = this.extractHashtags(this.newPostContent);
    let topicId: number | undefined;
    for (const tag of hashtags) { const topic = this.findTopicByHashtag(tag); if (topic?.id) { topicId = topic.id; this.forumService.incrementTopicPostCount(topic.id).subscribe(); break; } }
    let imageValue = this.newPostImage.trim() || '';
    if (this.filePreviewUrl && this.fileType === 'image') imageValue = this.filePreviewUrl;
    let finalContent = this.newPostContent.trim();
    if (this.newPostLocation.trim()) finalContent += '\n[LOC:' + this.newPostLocation.trim() + ']';
    const post: any = {
      content: finalContent, author: this.user.name,
      username: '@' + this.user.name.replace(/\s+/g, '_').toLowerCase(),
      avatar: (this.user as any).avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + this.user.name,
      userId: this.user.id, comments: 0, reposts: 0, likes: 0
    };
    if (imageValue) post.image = imageValue;
    if (topicId) post.topicId = topicId;
    this.forumService.createPost(post).subscribe({
      next: (res) => {
        this.sendTagNotifications(finalContent, res);
        this.newPostContent = ''; this.newPostImage = ''; this.showImageInput = false;
        this.postError = ''; this.removeSelectedFile();
        this.newPostLocation = ''; this.showLocationInput = false;
        this.showEmojiPicker = false; this.showGifPicker = false;
        this.loadPosts(); this.loadTrendingTopics();
        this.addNotification('Your post has been published!', 'success');
      },
      error: (err) => { this.postError = `Failed to post (${err?.status || 'network error'}).`; this.addNotification('Failed to publish post.', 'warning'); }
    });
  }

  toggleImageInput(): void { this.showImageInput = !this.showImageInput; if (!this.showImageInput) this.newPostImage = ''; }
  triggerFileInput(): void { this.fileInput.nativeElement.click(); }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    if (!isImage && !isVideo) { this.fileError = 'Only image and video files are allowed.'; return; }
    if (isImage && file.size > 5 * 1024 * 1024) { this.fileError = 'Image must be under 5 MB.'; return; }
    if (isVideo && file.size > 20 * 1024 * 1024) { this.fileError = 'Video must be under 20 MB.'; return; }
    this.fileError = ''; this.selectedFile = file;
    this.fileType = isImage ? 'image' : 'video';
    if (isImage) {
      this.compressImage(file, 800, 0.6).then(compressed => { this.filePreviewUrl = compressed; });
    } else {
      const reader = new FileReader();
      reader.onload = () => { this.filePreviewUrl = reader.result as string; };
      reader.readAsDataURL(file);
    }
    input.value = '';
  }

  private compressImage(file: File, maxWidth: number, quality: number): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image(); const url = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width, h = img.height;
        if (w > maxWidth) { h = Math.round(h * maxWidth / w); w = maxWidth; }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url); resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = url;
    });
  }

  removeSelectedFile(): void { this.selectedFile = null; this.filePreviewUrl = null; this.fileType = null; this.fileError = ''; }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  toggleEmojiPicker(event: Event): void { event.stopPropagation(); this.showEmojiPicker = !this.showEmojiPicker; }
  insertEmoji(emoji: string, event: Event): void { event.stopPropagation(); this.newPostContent += emoji; this.postError = ''; }
  toggleLocationInput(): void { this.showLocationInput = !this.showLocationInput; if (!this.showLocationInput) this.newPostLocation = ''; }
  onPostContentInput(): void { this.postError = ''; this.checkForUserMention(); }

  private checkForUserMention(): void {
    const text = this.newPostContent;
    const lastAtIndex = text.lastIndexOf('@');
    if (lastAtIndex === -1 || lastAtIndex === text.length - 1) { this.showUserSuggestions = false; return; }
    const afterAt = text.substring(lastAtIndex + 1);
    if (afterAt.includes(' ')) { this.showUserSuggestions = false; return; }
    const query = afterAt.toLowerCase();
    this.userSuggestions = this.allKnownUsers.filter(u => u.name.toLowerCase().includes(query) || u.username.toLowerCase().includes(query)).slice(0, 5);
    this.showUserSuggestions = this.userSuggestions.length > 0;
  }

  selectUserTag(user: { name: string; username: string }, event: Event): void {
    event.stopPropagation();
    const lastAtIndex = this.newPostContent.lastIndexOf('@');
    if (lastAtIndex !== -1) this.newPostContent = this.newPostContent.substring(0, lastAtIndex) + user.username + ' ';
    this.showUserSuggestions = false;
  }

  private buildKnownUsers(): void {
    const seen = new Set<string>();
    for (const post of this.allPosts) {
      if (!seen.has(post.username) && post.userId) {
        seen.add(post.username);
        this.allKnownUsers.push({ id: post.userId, name: post.author, username: post.username, avatar: post.avatar });
      }
    }
  }

  private loadAllUsers(): void {
    this.userService.getAllUsers().subscribe({
      next: (users) => {
        const seen = new Set<string>(this.allKnownUsers.map(u => u.username));
        for (const u of users) {
          const uname = '@' + u.name.replace(/\s+/g, '_').toLowerCase();
          if (!seen.has(uname)) { seen.add(uname); this.allKnownUsers.push({ id: u.id, name: u.name, username: uname, avatar: u.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + u.name }); }
        }
      }
    });
  }

  isVideoUrl(url?: string): boolean {
    if (!url) return false;
    return url.startsWith('data:video/') || /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url);
  }

  formatContent(content: string): SafeHtml {
    let locHtml = ''; let text = content;
    const locMatch = text.match(/\[LOC:(.+?)\]/);
    if (locMatch) {
      text = text.replace(/\n?\[LOC:.+?\]/, '').trim();
      locHtml = '<div style="margin-top:6px;display:inline-flex;align-items:center;gap:4px;background:#ecfdf5;color:#10b981;font-size:12px;padding:3px 10px;border-radius:999px;border:1px solid #d1fae5"><svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"/></svg>' + locMatch[1].replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') + '</div>';
    }
    let safe = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    safe = safe.replace(/(^|\s)(@[\w_]+)/g, '$1<span style="color:#10b981;font-weight:600;cursor:pointer">$2</span>');
    safe = safe.replace(/(^|\s)(#[\w]+)/g, '$1<span style="color:#10b981;font-weight:600;cursor:pointer">$2</span>');
    safe = safe.replace(/\n/g, '<br>');
    return this.sanitizer.bypassSecurityTrustHtml(safe + locHtml);
  }

  likePost(post: ForumPost): void {
    this.forumService.likePost(post.id).subscribe({
      next: (updated) => { const idx = this.posts.findIndex(p => p.id === post.id); if (idx !== -1) { updated.comments = this.posts[idx].comments; this.posts[idx] = updated; } this.applyFilter(); }
    });
  }

  repostPost(post: ForumPost): void {
    this.forumService.repostPost(post.id).subscribe({
      next: (updated) => { const idx = this.posts.findIndex(p => p.id === post.id); if (idx !== -1) { updated.comments = this.posts[idx].comments; this.posts[idx] = updated; } this.applyFilter(); }
    });
  }

  toggleReplies(post: ForumPost): void {
    if (this.expandedRepliesPostId === post.id) { this.expandedRepliesPostId = null; return; }
    this.expandedRepliesPostId = post.id;
    this.repliesMap.set(post.id, this.allPosts.filter(p => p.parentPostId === post.id));
  }

  startReply(postId: number): void {
    this.replyingToPostId = postId; this.replyContent = ''; this.replyError = '';
    if (this.expandedRepliesPostId !== postId) this.toggleReplies({ id: postId } as ForumPost);
  }

  cancelReply(): void { this.replyingToPostId = null; this.replyContent = ''; this.replyError = ''; }

  submitReply(parentPostId: number): void {
    this.replyError = this.validateReplyContent(this.replyContent);
    if (this.replyError || !this.user) return;
    const reply: any = {
      content: this.replyContent.trim(), author: this.user.name,
      username: '@' + this.user.name.replace(/\s+/g, '_').toLowerCase(),
      avatar: (this.user as any).avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + this.user.name,
      userId: this.user.id, parentPostId, comments: 0, reposts: 0, likes: 0
    };
    this.forumService.createPost(reply).subscribe({
      next: () => { this.replyContent = ''; this.replyingToPostId = null; this.replyError = ''; this.loadPosts(); },
      error: (err) => { this.replyError = `Failed to reply (${err?.status || 'network error'}).`; }
    });
  }

  startEdit(post: ForumPost): void { this.editingPostId = post.id; this.editContent = post.content; this.editError = ''; this.openMenuPostId = null; }
  cancelEdit(): void { this.editingPostId = null; this.editContent = ''; this.editError = ''; }

  submitEdit(post: ForumPost): void {
    this.editError = this.validatePostContent(this.editContent);
    if (this.editError) return;
    const hashtags = this.extractHashtags(this.editContent);
    let topicId = post.topicId;
    for (const tag of hashtags) { const topic = this.findTopicByHashtag(tag); if (topic?.id) { topicId = topic.id; break; } }
    const updated: any = { content: this.editContent.trim(), isEdited: true, topicId, image: post.image, author: post.author, username: post.username, avatar: post.avatar };
    this.forumService.updatePost(post.id, updated).subscribe({
      next: () => { this.editingPostId = null; this.editContent = ''; this.editError = ''; this.loadPosts(); this.addNotification('Post updated!', 'success'); },
      error: (err) => { this.editError = `Failed to save edit (${err?.status || 'network error'}).`; }
    });
  }

  deletePost(post: ForumPost): void {
    this.openMenuPostId = null;
    this.posts = this.posts.filter(p => p.id !== post.id); this.applyFilter();
    this.forumService.deletePost(post.id).subscribe({ next: () => this.loadPosts(), error: () => this.loadPosts() });
  }

  toggleMenu(postId: number): void { this.openMenuPostId = this.openMenuPostId === postId ? null : postId; }
  isOwnPost(post: ForumPost): boolean { return !!this.user && post.userId === this.user.id; }

  openReportModal(post: ForumPost): void {
    this.reportingPost = post; this.showReportModal = true; this.reportReason = '';
    this.reportDescription = ''; this.reportError = ''; this.reportSuccess = ''; this.openMenuPostId = null;
  }

  closeReportModal(): void {
    this.showReportModal = false; this.reportingPost = null; this.reportReason = '';
    this.reportDescription = ''; this.reportError = ''; this.reportSuccess = ''; this.reportSubmitting = false;
  }

  submitReport(): void {
    if (!this.reportReason) { this.reportError = 'Please select a reason.'; return; }
    if (!this.user || !this.reportingPost) return;
    if (this.reportSubmitting) return;
    this.reportSubmitting = true; this.reportError = '';
    const report: ForumReport = {
      postId: this.reportingPost.id, postContent: this.reportingPost.content,
      reporterId: this.user.id, reporterName: this.user.name, reporterEmail: this.user.email,
      reportedUserId: this.reportingPost.userId || 0, reportedUserName: this.reportingPost.author,
      reason: this.reportReason, description: this.reportDescription.trim() || undefined, status: 'PENDING'
    };
    this.forumService.createReport(report).subscribe({
      next: () => { this.reportSuccess = 'Report submitted!'; this.reportError = ''; this.reportSubmitting = false; this.addNotification('Report submitted!', 'success'); setTimeout(() => this.closeReportModal(), 2000); },
      error: (err) => { this.reportSubmitting = false; this.reportError = err.status === 0 ? 'Cannot reach server.' : `Failed (${err.status}).`; }
    });
  }

  toggleNewTopicForm(): void {
    this.showNewTopicForm = !this.showNewTopicForm;
    if (!this.showNewTopicForm) { this.newTopicTitle = ''; this.newTopicCategory = ''; this.topicTitleError = ''; this.topicCategoryError = ''; }
  }

  createTopic(): void {
    this.topicTitleError = this.validateTopicTitle(this.newTopicTitle);
    this.topicCategoryError = this.validateTopicCategory(this.newTopicCategory);
    if (this.topicTitleError || this.topicCategoryError) return;
    const topic: TrendingTopic = { title: this.newTopicTitle.trim(), category: this.newTopicCategory.trim(), isPinned: false, viewCount: 0, postCount: 0 };
    this.forumService.createTopic(topic).subscribe({
      next: () => { this.newTopicTitle = ''; this.newTopicCategory = ''; this.topicTitleError = ''; this.topicCategoryError = ''; this.showNewTopicForm = false; this.loadTrendingTopics(); }
    });
  }

  selectTopic(topic: TrendingTopic): void {
    if (this.selectedTopicId === topic.id) { this.selectedTopicId = null; this.applyFilter(); return; }
    this.selectedTopicId = topic.id!; this.forumService.incrementTopicViewCount(topic.id!).subscribe(); this.applyFilter();
  }

  clearTopicFilter(): void { this.selectedTopicId = null; this.applyFilter(); }

  getTimeAgo(post: ForumPost): string {
    const timestamp = post.createdAt;
    if (!timestamp) return post.time || '';
    const date = this.parseTimestamp(timestamp);
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now'; if (mins < 60) return mins + 'm';
    const hours = Math.floor(mins / 60); if (hours < 24) return hours + 'h';
    const days = Math.floor(hours / 24); if (days < 30) return days + 'd';
    return Math.floor(days / 30) + 'mo';
  }

  toggleReactionPicker(postId: number, event: Event): void { event.stopPropagation(); this.showReactionsPostId = this.showReactionsPostId === postId ? null : postId; }

  reactToPost(post: ForumPost, emoji: string, event: Event): void {
    event.stopPropagation();
    const currentReaction = this.userReactions.get(post.id);
    if (currentReaction === emoji) {
      this.userReactions.delete(post.id);
      const counts = this.postReactionCounts.get(post.id);
      if (counts) { const c = (counts.get(emoji) || 1) - 1; if (c <= 0) counts.delete(emoji); else counts.set(emoji, c); }
    } else {
      if (currentReaction) { const counts = this.postReactionCounts.get(post.id); if (counts) { const c = (counts.get(currentReaction) || 1) - 1; if (c <= 0) counts.delete(currentReaction); else counts.set(currentReaction, c); } }
      this.userReactions.set(post.id, emoji);
      if (!this.postReactionCounts.has(post.id)) this.postReactionCounts.set(post.id, new Map());
      this.postReactionCounts.get(post.id)!.set(emoji, (this.postReactionCounts.get(post.id)!.get(emoji) || 0) + 1);
      this.floatingReaction = { postId: post.id, emoji }; setTimeout(() => this.floatingReaction = null, 600);
      if (!currentReaction) { this.forumService.likePost(post.id).subscribe({ next: (updated) => { const idx = this.posts.findIndex(p => p.id === post.id); if (idx !== -1) { updated.comments = this.posts[idx].comments; this.posts[idx] = updated; } this.applyFilter(); } }); }
    }
    this.showReactionsPostId = null; this.saveReactionsToStorage();
  }

  getUserReaction(postId: number): string | undefined { return this.userReactions.get(postId); }

  getPostReactions(postId: number): { emoji: string; count: number }[] {
    const counts = this.postReactionCounts.get(postId);
    if (!counts) return [];
    return Array.from(counts.entries()).map(([emoji, count]) => ({ emoji, count })).filter(r => r.count > 0);
  }

  private loadReactionsFromStorage(): void {
    try {
      const data = localStorage.getItem('forum_reactions');
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed.userReactions) this.userReactions = new Map(Object.entries(parsed.userReactions).map(([k, v]) => [Number(k), v as string]));
        if (parsed.postReactionCounts) { for (const [postId, counts] of Object.entries(parsed.postReactionCounts)) this.postReactionCounts.set(Number(postId), new Map(Object.entries(counts as any))); }
      }
    } catch { /* ignore */ }
  }

  private saveReactionsToStorage(): void {
    const userReactions: any = {}; this.userReactions.forEach((v, k) => userReactions[k] = v);
    const postReactionCounts: any = {};
    this.postReactionCounts.forEach((counts, postId) => { const obj: any = {}; counts.forEach((c, e) => obj[e] = c); postReactionCounts[postId] = obj; });
    localStorage.setItem('forum_reactions', JSON.stringify({ userReactions, postReactionCounts }));
  }

  toggleGifPicker(event: Event): void { event.stopPropagation(); this.showGifPicker = !this.showGifPicker; if (this.showGifPicker && this.gifResults.length === 0) this.loadTrendingGifs(); }

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

  selectGif(gifUrl: string): void { this.filePreviewUrl = gifUrl; this.fileType = 'image'; this.selectedFile = null; this.showGifPicker = false; this.gifSearchQuery = ''; }
  toggleDarkMode(): void { this.darkMode = !this.darkMode; localStorage.setItem('forum_dark_mode', String(this.darkMode)); }

  addNotification(message: string, type: 'success' | 'info' | 'warning' = 'info'): void {
    const id = ++this.notifCounter;
    this.notifications.unshift({ id, message, type, time: Date.now() });
    if (this.notifications.length > 5) this.notifications = this.notifications.slice(0, 5);
    setTimeout(() => this.dismissNotification(id), 4000);
  }

  dismissNotification(id: number): void {
    const n = this.notifications.find(n => n.id === id);
    if (n) { n.exiting = true; setTimeout(() => { this.notifications = this.notifications.filter(n => n.id !== id); }, 300); }
  }

  getNotifIcon(type: string): string { switch (type) { case 'success': return '✅'; case 'warning': return '⚠️'; default: return '💬'; } }

  private sendTagNotifications(content: string, createdPost: ForumPost): void {
    if (!this.user) return;
    const mentions = content.match(/@[\w_]+/g); if (!mentions) return;
    const seen = new Set<string>();
    for (const mention of mentions) {
      const username = mention.toLowerCase(); if (seen.has(username)) continue; seen.add(username);
      const taggedUser = this.allKnownUsers.find(u => u.username.toLowerCase() === username);
      if (!taggedUser || !taggedUser.id || taggedUser.id === this.user!.id) continue;
      this.forumService.createNotification({ userId: taggedUser.id, postId: createdPost.id, fromUserId: this.user!.id, fromUsername: this.user!.name, fromAvatar: (this.user as any).avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + this.user!.name, message: this.user!.name + ' mentioned you', type: 'TAG' }).subscribe();
    }
  }

  loadTagNotifications(): void {
    if (!this.user) return;
    this.forumService.getNotifications(this.user.id).subscribe({ next: (notifs) => { this.tagNotifications = notifs || []; this.unreadNotifCount = this.tagNotifications.filter((n: any) => !n.isRead).length; } });
  }

  private pollNotifications(): void {
    if (!this.user) return;
    this.forumService.getUnreadCount(this.user.id).subscribe({
      next: (res) => { const c = res.count || 0; if (c > this.unreadNotifCount) { this.addNotification('New mentions!', 'info'); this.loadTagNotifications(); } this.unreadNotifCount = c; }
    });
  }

  toggleNotifPanel(): void { this.showNotifPanel = !this.showNotifPanel; if (this.showNotifPanel) this.loadTagNotifications(); }

  markNotifRead(notif: any): void {
    if (notif.isRead) return;
    this.forumService.markNotificationRead(notif.id).subscribe({ next: () => { notif.isRead = true; this.unreadNotifCount = Math.max(0, this.unreadNotifCount - 1); } });
  }

  markAllNotifsRead(): void {
    if (!this.user) return;
    this.forumService.markAllNotificationsRead(this.user.id).subscribe({ next: () => { this.tagNotifications.forEach((n: any) => n.isRead = true); this.unreadNotifCount = 0; } });
  }

  sendFriendRequestFromForum(post: ForumPost): void {
    if (!this.user || !post.userId || post.userId === this.user.id) return;
    const friendship: Friendship = {
      userId: this.user.id, userName: this.user.name,
      userAvatar: (this.user as any).avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + this.user.name,
      friendId: post.userId, friendName: post.author, friendAvatar: post.avatar, status: 'PENDING'
    };
    this.friendsService.sendFriendRequest(friendship).subscribe({
      next: () => { this.friendStatuses.set(post.userId!, 'pending'); this.addNotification(`Request sent to ${post.author}!`, 'success'); },
      error: (err: any) => { this.addNotification('Failed to send request (' + (err?.status || '') + ')', 'warning'); }
    });
  }

  getFriendStatus(userId: number | undefined): string {
    if (!userId || userId === this.user?.id) return 'self';
    return this.friendStatuses.get(userId) || 'none';
  }

  getNotifTimeAgo(dateStr: string): string {
    if (!dateStr) return '';
    const date = !dateStr.endsWith('Z') && !dateStr.includes('+') && !dateStr.includes('-', 10) ? new Date(dateStr + 'Z') : new Date(dateStr);
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now'; if (mins < 60) return mins + 'm';
    const hours = Math.floor(mins / 60); if (hours < 24) return hours + 'h';
    return Math.floor(hours / 24) + 'd';
  }

  // ── Save & Favorite ──

  private loadSavedAndFavorites(): void {
    if (!this.user) return;
    this.savedPostIds = this.forumService.getSavedPostIds(this.user.id);
    this.favoritePostIds = this.forumService.getFavoritePostIds(this.user.id);
  }

  toggleSavePost(post: ForumPost): void {
    if (!this.user) return;
    const isSaved = this.forumService.toggleSavePost(this.user.id, post.id);
    this.savedPostIds = this.forumService.getSavedPostIds(this.user.id);
    this.addNotification(isSaved ? 'Post saved!' : 'Post unsaved', isSaved ? 'success' : 'info');
  }

  toggleFavoritePost(post: ForumPost): void {
    if (!this.user) return;
    const isFav = this.forumService.toggleFavoritePost(this.user.id, post.id);
    this.favoritePostIds = this.forumService.getFavoritePostIds(this.user.id);
    this.addNotification(isFav ? 'Added to favorites!' : 'Removed from favorites', isFav ? 'success' : 'info');
  }

  isPostSaved(postId: number): boolean { return this.savedPostIds.has(postId); }
  isPostFavorited(postId: number): boolean { return this.favoritePostIds.has(postId); }

  // ── Facebook-style Share ──

  openShareModal(post: ForumPost): void {
    this.sharingPost = post; this.showShareModal = true; this.shareMessage = '';
    this.shareSearchQuery = ''; this.showShareEmojiPicker = false; this.openMenuPostId = null;
  }

  closeShareModal(): void {
    this.showShareModal = false; this.sharingPost = null; this.shareMessage = '';
    this.shareSearchQuery = ''; this.showShareEmojiPicker = false;
  }

  toggleShareEmojiPicker(event: Event): void { event.stopPropagation(); this.showShareEmojiPicker = !this.showShareEmojiPicker; }
  insertShareEmoji(emoji: string, event: Event): void { event.stopPropagation(); this.shareMessage += emoji; }

  onShareMessageInput(): void {
    const text = this.shareMessage;
    const lastAtIndex = text.lastIndexOf('@');
    if (lastAtIndex === -1 || lastAtIndex === text.length - 1) { this.shareShowUserSuggestions = false; return; }
    const afterAt = text.substring(lastAtIndex + 1);
    if (afterAt.includes(' ')) { this.shareShowUserSuggestions = false; return; }
    const query = afterAt.toLowerCase();
    this.shareUserSuggestions = this.allKnownUsers.filter(u => u.name.toLowerCase().includes(query) || u.username.toLowerCase().includes(query)).slice(0, 5);
    this.shareShowUserSuggestions = this.shareUserSuggestions.length > 0;
  }

  selectShareUserTag(user: { name: string; username: string }, event: Event): void {
    event.stopPropagation();
    const lastAtIndex = this.shareMessage.lastIndexOf('@');
    if (lastAtIndex !== -1) this.shareMessage = this.shareMessage.substring(0, lastAtIndex) + user.username + ' ';
    this.shareShowUserSuggestions = false;
  }

  submitShare(): void {
    if (!this.user || !this.sharingPost) return;
    const content = this.shareMessage.trim() || ('Shared a post by ' + this.sharingPost.author);
    const post: any = {
      content, author: this.user.name,
      username: '@' + this.user.name.replace(/\s+/g, '_').toLowerCase(),
      avatar: (this.user as any).avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + this.user.name,
      userId: this.user.id, sharedPostId: this.sharingPost.id, comments: 0, reposts: 0, likes: 0
    };
    this.forumService.createPost(post).subscribe({
      next: (res) => {
        this.sendTagNotifications(content, res);
        this.forumService.repostPost(this.sharingPost!.id).subscribe();
        this.addNotification('Post shared to your feed!', 'success');
        this.closeShareModal(); this.loadPosts();
      },
      error: () => { this.addNotification('Failed to share post', 'warning'); }
    });
  }

  getSharedPost(post: ForumPostWithShared): ForumPost | undefined {
    if (!post.sharedPostId) return undefined;
    if (post.sharedPost) return post.sharedPost;
    return this.allPosts.find(p => p.id === post.sharedPostId);
  }

  private resolveSharedPosts(): void {
    for (const post of this.posts as ForumPostWithShared[]) {
      if (post.sharedPostId && !post.sharedPost) {
        post.sharedPost = this.allPosts.find(p => p.id === post.sharedPostId);
      }
    }
  }

  // ── Notification → Post scroll & highlight ──

  onNotifClick(notif: any): void {
    this.markNotifRead(notif); this.showNotifPanel = false;
    if (notif.type === 'FRIEND_REQUEST') { this.openProfileFromNotif(notif); return; }
    if (notif.postId) this.scrollToPost(notif.postId);
  }

  scrollToPost(postId: number): void {
    this.selectedTopicId = null; this.searchQuery = ''; this.applyFilter();
    this.highlightedPostId = postId;
    if (this.highlightTimeout) clearTimeout(this.highlightTimeout);
    this.highlightTimeout = setTimeout(() => { this.highlightedPostId = null; }, 3000);
    setTimeout(() => { const el = document.getElementById('post-' + postId); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 100);
  }

  // ── Friend Request Notifications ──

  private loadPendingFriendRequests(): void {
    if (!this.user) return;
    this.friendsService.getPendingRequests(this.user.id).subscribe({
      next: (reqs) => {
        this.pendingFriendRequests = reqs.map(r => ({ id: r.id!, friendshipId: r.id!, name: r.userName, avatar: r.userAvatar, userId: r.userId, createdAt: r.createdAt || '' }));
        for (const req of this.pendingFriendRequests) {
          const exists = this.tagNotifications.find((n: any) => n.type === 'FRIEND_REQUEST' && n.fromUserId === req.userId);
          if (!exists) {
            this.tagNotifications.unshift({ id: -req.id, userId: this.user!.id, postId: null, fromUserId: req.userId, fromUsername: req.name, fromAvatar: req.avatar, message: req.name + ' sent you a friend request', type: 'FRIEND_REQUEST', isRead: false, createdAt: req.createdAt, friendshipId: req.friendshipId });
          }
        }
        this.unreadNotifCount = this.tagNotifications.filter((n: any) => !n.isRead).length;
      }
    });
  }

  // ── View Profile Modal ──

  openProfileFromNotif(notif: any): void {
    if (!notif.fromUserId) return;
    this.showProfileModal = true; this.profileLoading = true; this.profileUser = null; this.profileUserPosts = [];
    this.profileFriendRequest = notif.friendshipId ? this.pendingFriendRequests.find(r => r.friendshipId === notif.friendshipId) || null : null;
    this.userService.getUserById(notif.fromUserId).subscribe({
      next: (user) => {
        this.profileUser = user;
        this.forumService.getPostsByUser(notif.fromUserId).subscribe({
          next: (posts) => {
            this.profileUserPosts = posts.filter(p => !p.parentPostId) as ForumPostWithShared[];
            for (const post of this.profileUserPosts) { if (post.sharedPostId) { const orig = this.allPosts.find(p => p.id === post.sharedPostId); if (orig) post.sharedPost = orig; } }
            this.profileLoading = false;
          },
          error: () => { this.profileLoading = false; }
        });
      },
      error: () => { this.profileLoading = false; }
    });
  }

  openProfileByUserId(userId: number): void {
    this.showProfileModal = true; this.profileLoading = true; this.profileUser = null; this.profileUserPosts = []; this.profileFriendRequest = null; this.openMenuPostId = null;
    this.userService.getUserById(userId).subscribe({
      next: (user) => {
        this.profileUser = user;
        this.forumService.getPostsByUser(userId).subscribe({
          next: (posts) => {
            this.profileUserPosts = posts.filter(p => !p.parentPostId) as ForumPostWithShared[];
            for (const post of this.profileUserPosts) { if (post.sharedPostId) { const orig = this.allPosts.find(p => p.id === post.sharedPostId); if (orig) post.sharedPost = orig; } }
            this.profileLoading = false;
          },
          error: () => { this.profileLoading = false; }
        });
      },
      error: () => { this.profileLoading = false; }
    });
  }

  closeProfileModal(): void { this.showProfileModal = false; this.profileUser = null; this.profileUserPosts = []; this.profileFriendRequest = null; }

  acceptFriendRequestFromProfile(req: FriendRequest): void {
    this.friendsService.acceptFriendRequest(req.friendshipId).subscribe({
      next: () => {
        this.addNotification(req.name + ' is now your colleague!', 'success');
        this.profileFriendRequest = null;
        this.pendingFriendRequests = this.pendingFriendRequests.filter(r => r.id !== req.id);
        this.tagNotifications = this.tagNotifications.filter((n: any) => !(n.type === 'FRIEND_REQUEST' && n.friendshipId === req.friendshipId));
        this.unreadNotifCount = this.tagNotifications.filter((n: any) => !n.isRead).length;
        this.friendStatuses.set(req.userId, 'friend');
      },
      error: () => { this.addNotification('Failed to accept request', 'warning'); }
    });
  }

  rejectFriendRequestFromProfile(req: FriendRequest): void {
    this.friendsService.rejectFriendRequest(req.friendshipId).subscribe({
      next: () => {
        this.addNotification('Friend request declined', 'info');
        this.profileFriendRequest = null;
        this.pendingFriendRequests = this.pendingFriendRequests.filter(r => r.id !== req.id);
        this.tagNotifications = this.tagNotifications.filter((n: any) => !(n.type === 'FRIEND_REQUEST' && n.friendshipId === req.friendshipId));
        this.unreadNotifCount = this.tagNotifications.filter((n: any) => !n.isRead).length;
      },
      error: () => { this.addNotification('Failed to decline request', 'warning'); }
    });
  }
}
