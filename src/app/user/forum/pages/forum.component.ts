import { Component, OnInit, OnDestroy, ViewChild, ElementRef, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ForumService } from '../services/forum.service';
import { AuthService, AuthUser } from '../../../shared/services/auth.service';
import { UserService } from '../../user/services/user.service';
import { FriendsService } from '../../friends/services/friends.service';
import { ForumPost, TrendingTopic } from '../models/forum.model';
import { ForumReport, REPORT_REASONS, ReportReason } from '../models/forum-report.model';
import { Friend, Friendship, ChatMessage } from '../../friends/models/friend.model';
import { User } from '../../user/models/user.model';

@Component({
  selector: 'app-forum',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './forum.component.html',
  styleUrl: './forum.component.css'
})
export class ForumComponent implements OnInit, OnDestroy {
  @ViewChild('postInput') postInput!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  private newTopicSub!: Subscription;
  posts: ForumPost[] = [];
  allPosts: ForumPost[] = [];
  trendingTopics: TrendingTopic[] = [];
  filteredPosts: ForumPost[] = [];
  user: AuthUser | null = null;

  // Create post
  newPostContent = '';
  newPostImage = '';
  showImageInput = false;

  // File upload
  selectedFile: File | null = null;
  filePreviewUrl: string | null = null;
  fileType: 'image' | 'video' | null = null;
  fileError = '';

  // Emoji picker
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

  // Location
  showLocationInput = false;
  newPostLocation = '';

  // User tagging
  showUserSuggestions = false;
  userSuggestions: { id: number; name: string; username: string; avatar: string }[] = [];
  allKnownUsers: { id: number; name: string; username: string; avatar: string }[] = [];

  // Search
  searchQuery = '';

  // Reply
  replyingToPostId: number | null = null;
  replyContent = '';

  // Edit
  editingPostId: number | null = null;
  editContent = '';

  // Menu
  openMenuPostId: number | null = null;

  // Replies map
  repliesMap: Map<number, ForumPost[]> = new Map();
  expandedRepliesPostId: number | null = null;

  // Topic creation
  showNewTopicForm = false;
  newTopicTitle = '';
  newTopicCategory = '';
  selectedTopicId: number | null = null;

  // Validation errors
  postError = '';
  replyError = '';
  editError = '';
  topicTitleError = '';
  topicCategoryError = '';

  // Report
  showReportModal = false;
  reportingPost: ForumPost | null = null;
  reportReason: ReportReason | '' = '';
  reportDescription = '';
  reportError = '';
  reportSuccess = '';
  reportSubmitting = false;
  reportReasons = REPORT_REASONS;

  // Reactions
  reactionEmojis = ['❤️', '😂', '😮', '😢', '🔥', '👏'];
  showReactionsPostId: number | null = null;
  userReactions: Map<number, string> = new Map();
  postReactionCounts: Map<number, Map<string, number>> = new Map();
  floatingReaction: { postId: number; emoji: string } | null = null;

  // GIF Picker
  showGifPicker = false;
  gifSearchQuery = '';
  gifResults: { url: string; preview: string }[] = [];
  gifLoading = false;
  private gifSearchTimeout: any;
  private readonly GIPHY_KEY = 'GlVGYR8KgYBgoK546FpLBaAZeLp5MHaX';

  // Dark Mode
  darkMode = false;

  // Toast Notifications
  notifications: { id: number; message: string; type: 'success' | 'info' | 'warning'; time: number; exiting?: boolean }[] = [];
  private notifCounter = 0;

  // Tag Notifications Panel
  showNotifPanel = false;
  tagNotifications: any[] = [];
  unreadNotifCount = 0;
  private notifPollInterval: any;

  // Share Post
  showShareModal = false;
  sharingPost: ForumPost | null = null;
  shareFriends: Friend[] = [];
  shareSearchQuery = '';
  shareLoading = false;

  // Add Friend from Forum
  friendStatuses: Map<number, string> = new Map(); // userId -> 'none' | 'pending' | 'friend'

  // Friend Suggestions
  suggestedFriends: { id: number; name: string; avatar: string; bio?: string; mutualCount?: number }[] = [];
  allUsersData: User[] = [];
  myFriendIds: Set<number> = new Set();

  // User Profile Popup
  showProfilePopup = false;
  profileUser: { id: number; name: string; username: string; avatar: string; bio?: string; joinDate?: string; xp?: number; level?: string; isFriend: boolean } | null = null;

  // Forum Profile Modal (full page)
  showForumProfile = false;
  forumProfileUser: { id: number; name: string; username: string; avatar: string; bio?: string; joinDate?: string; xp?: number; level?: string; streak?: number; language?: string } | null = null;
  forumProfilePosts: ForumPost[] = [];
  forumProfileFriends: { id: number; name: string; avatar: string }[] = [];
  forumProfileTab: 'posts' | 'friends' = 'posts';
  forumProfileIsFriend = false;
  forumProfileFriendStatus = 'none';

  // Topic suggestions for # hashtag
  showTopicSuggestions = false;
  topicSuggestions: TrendingTopic[] = [];

  // Reply user tagging
  showReplyUserSuggestions = false;
  replyUserSuggestions: { id: number; name: string; username: string; avatar: string }[] = [];

  constructor(
    private forumService: ForumService,
    private authService: AuthService,
    private userService: UserService,
    private friendsService: FriendsService,
    private sanitizer: DomSanitizer,
    private http: HttpClient,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.user = this.authService.currentUser;
    this.newTopicSub = this.authService.currentUser$.subscribe(u => {
      this.user = u;
    });
    this.darkMode = localStorage.getItem('forum_dark_mode') === 'true';
    this.loadReactionsFromStorage();
    this.loadPosts();
    this.loadTrendingTopics();
    this.loadAllUsers();
    this.loadTrendingGifs();
    this.loadTagNotifications();
    this.loadSuggestedFriends();
    this.loadFriendStatuses();
    this.forumService.newTopic$.subscribe(() => {
      this.toggleNewTopicForm();
    });
    // Poll for new notifications every 15 seconds
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
      if (!target.closest('.emoji-picker-container')) {
        this.showEmojiPicker = false;
      }
      if (!target.closest('.user-suggestions-container')) {
        this.showUserSuggestions = false;
        this.showTopicSuggestions = false;
      }
      this.showReplyUserSuggestions = false;
    } catch {
      this.showEmojiPicker = false;
      this.showUserSuggestions = false;
      this.showTopicSuggestions = false;
      this.showReplyUserSuggestions = false;
    }
  }

  focusPostInput(): void {
    setTimeout(() => {
      this.postInput?.nativeElement?.focus();
      this.postInput?.nativeElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  // ── Helpers ──

  private parseTimestamp(ts: string): Date {
    if (!ts.endsWith('Z') && !ts.includes('+') && !ts.includes('-', 10)) {
      return new Date(ts + 'Z');
    }
    return new Date(ts);
  }

  private extractHashtags(content: string): string[] {
    const matches = content.match(/#(\w+)/g);
    return matches ? matches.map(m => m.toLowerCase()) : [];
  }

  private findTopicByHashtag(hashtag: string): TrendingTopic | undefined {
    return this.trendingTopics.find(t =>
      t.title?.toLowerCase() === hashtag.toLowerCase()
    );
  }

  // ── Data Loading ──

  loadPosts(): void {
    this.forumService.getAllPosts().subscribe({
      next: (all) => {
        this.allPosts = all;
        this.posts = all.filter(p => !p.parentPostId);
        this.countCommentsFromAll();
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
    this.forumService.getAllTopics().subscribe({
      next: (topics) => {
        this.trendingTopics = topics || [];
      }
    });
  }

  // ── Search & Filter ──

  applyFilter(): void {
    let result = this.posts;
    if (this.selectedTopicId !== null) {
      const topic = this.trendingTopics.find(t => t.id === this.selectedTopicId);
      if (topic?.title) {
        const tag = topic.title.toLowerCase();
        result = result.filter(p => {
          const hashtags = this.extractHashtags(p.content);
          return hashtags.includes(tag);
        });
      }
    }
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(p =>
        p.content.toLowerCase().includes(q) ||
        p.author.toLowerCase().includes(q) ||
        p.username.toLowerCase().includes(q)
      );
    }
    this.filteredPosts = result;
  }

  onSearchChange(): void {
    this.applyFilter();
  }

  // ── Validation ──

  validatePostContent(content: string): string {
    if (!content.trim()) return 'Post content cannot be empty.';
    if (content.trim().length < 2) return 'Post must be at least 2 characters.';
    if (content.length > 1000) return 'Post cannot exceed 1000 characters.';
    return '';
  }

  validateReplyContent(content: string): string {
    if (!content.trim()) return 'Reply cannot be empty.';
    if (content.trim().length < 1) return 'Reply must be at least 1 character.';
    if (content.length > 500) return 'Reply cannot exceed 500 characters.';
    return '';
  }

  validateTopicTitle(title: string): string {
    if (!title.trim()) return 'Topic title is required.';
    if (!title.startsWith('#')) return 'Topic title must start with # (e.g. #Grammar).';
    if (title.trim().length < 2) return 'Topic title must be at least 2 characters.';
    if (title.length > 50) return 'Topic title cannot exceed 50 characters.';
    const existing = this.trendingTopics.find(t => t.title?.toLowerCase() === title.toLowerCase());
    if (existing) return 'This topic already exists.';
    return '';
  }

  validateTopicCategory(category: string): string {
    if (!category.trim()) return 'Category is required.';
    if (category.trim().length < 2) return 'Category must be at least 2 characters.';
    if (category.length > 30) return 'Category cannot exceed 30 characters.';
    return '';
  }

  validateImageUrl(url: string): boolean {
    if (!url) return true;
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  // ── Create Post ──

  createPost(): void {
    if (!this.user) {
      this.user = this.authService.currentUser;
    }
    if (!this.user) {
      this.postError = 'You must be logged in to post.';
      return;
    }
    this.postError = this.validatePostContent(this.newPostContent);
    if (this.postError) return;
    if (this.showImageInput && this.newPostImage && !this.validateImageUrl(this.newPostImage)) {
      this.postError = 'Please enter a valid image URL.';
      return;
    }

    const hashtags = this.extractHashtags(this.newPostContent);
    let topicId: number | undefined;
    for (const tag of hashtags) {
      const topic = this.findTopicByHashtag(tag);
      if (topic?.id) {
        topicId = topic.id;
        this.forumService.incrementTopicPostCount(topic.id).subscribe();
        break;
      }
    }

    let imageValue = this.newPostImage.trim() || '';
    if (this.filePreviewUrl && this.fileType === 'image') {
      imageValue = this.filePreviewUrl;
    }

    let finalContent = this.newPostContent.trim();
    if (this.newPostLocation.trim()) {
      finalContent += '\n[LOC:' + this.newPostLocation.trim() + ']';
    }

    const post: any = {
      content: finalContent,
      author: this.user.name,
      username: '@' + this.user.name.replace(/\s+/g, '_').toLowerCase(),
      avatar: (this.user as any).avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + this.user.name,
      userId: this.user.id,
      comments: 0,
      reposts: 0,
      likes: 0
    };
    if (imageValue) post.image = imageValue;
    if (topicId) post.topicId = topicId;

    this.forumService.createPost(post).subscribe({
      next: (res) => {
        // Send tag notifications for @mentions
        this.sendTagNotifications(finalContent, res);
        this.newPostContent = '';
        this.newPostImage = '';
        this.showImageInput = false;
        this.postError = '';
        this.removeSelectedFile();
        this.newPostLocation = '';
        this.showLocationInput = false;
        this.showEmojiPicker = false;
        this.showGifPicker = false;
        this.loadPosts();
        this.loadTrendingTopics();
        this.addNotification('Your post has been published!', 'success');
      },
      error: (err) => {
        console.error('[Forum] Failed to create post:', err);
        this.postError = `Failed to post (${err?.status || 'network error'}). Please try again.`;
        this.addNotification('Failed to publish post. Please try again.', 'warning');
      }
    });
  }

  toggleImageInput(): void {
    this.showImageInput = !this.showImageInput;
    if (!this.showImageInput) this.newPostImage = '';
  }

  // ── File Upload ──

  triggerFileInput(): void {
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    if (!isImage && !isVideo) {
      this.fileError = 'Only image and video files are allowed.';
      return;
    }
    if (isImage && file.size > 5 * 1024 * 1024) {
      this.fileError = 'Image must be under 5 MB.';
      return;
    }
    if (isVideo && file.size > 20 * 1024 * 1024) {
      this.fileError = 'Video must be under 20 MB.';
      return;
    }
    this.fileError = '';
    this.selectedFile = file;
    this.fileType = isImage ? 'image' : 'video';
    if (isImage) {
      this.compressImage(file, 600, 0.5).then(compressed => {
        this.filePreviewUrl = compressed;
      });
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        this.filePreviewUrl = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
    input.value = '';
  }

  private compressImage(file: File, maxWidth: number = 600, quality: number = 0.5): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width;
        let h = img.height;
        if (w > maxWidth) {
          h = Math.round(h * maxWidth / w);
          w = maxWidth;
        }
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

  removeSelectedFile(): void {
    this.selectedFile = null;
    this.filePreviewUrl = null;
    this.fileType = null;
    this.fileError = '';
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  // ── Emoji Picker ──

  toggleEmojiPicker(event: Event): void {
    event.stopPropagation();
    this.showEmojiPicker = !this.showEmojiPicker;
  }

  insertEmoji(emoji: string, event: Event): void {
    event.stopPropagation();
    this.newPostContent += emoji;
    this.postError = '';
  }

  // ── Location ──

  toggleLocationInput(): void {
    this.showLocationInput = !this.showLocationInput;
    if (!this.showLocationInput) this.newPostLocation = '';
  }

  // ── User Tagging ──

  onPostContentInput(): void {
    this.postError = '';
    this.checkForUserMention();
    this.checkForTopicHashtag();
  }

  private checkForUserMention(): void {
    const text = this.newPostContent;
    const lastAtIndex = text.lastIndexOf('@');
    if (lastAtIndex === -1 || lastAtIndex === text.length - 1) {
      this.showUserSuggestions = false;
      return;
    }
    const afterAt = text.substring(lastAtIndex + 1);
    if (afterAt.includes(' ')) {
      this.showUserSuggestions = false;
      return;
    }
    const query = afterAt.toLowerCase();
    this.userSuggestions = this.allKnownUsers
      .filter(u => u.name.toLowerCase().includes(query) || u.username.toLowerCase().includes(query))
      .slice(0, 5);
    this.showUserSuggestions = this.userSuggestions.length > 0;
  }

  selectUserTag(user: { name: string; username: string }, event: Event): void {
    event.stopPropagation();
    const lastAtIndex = this.newPostContent.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      this.newPostContent = this.newPostContent.substring(0, lastAtIndex) + user.username + ' ';
    }
    this.showUserSuggestions = false;
  }

  // ── Topic Hashtag Suggestions ──

  private checkForTopicHashtag(): void {
    const text = this.newPostContent;
    const lastHashIndex = text.lastIndexOf('#');
    if (lastHashIndex === -1 || lastHashIndex === text.length - 1) {
      this.showTopicSuggestions = false;
      return;
    }
    const afterHash = text.substring(lastHashIndex + 1);
    if (afterHash.includes(' ')) {
      this.showTopicSuggestions = false;
      return;
    }
    const query = afterHash.toLowerCase();
    this.topicSuggestions = this.trendingTopics
      .filter(t => t.title?.toLowerCase().includes(query) || t.category?.toLowerCase().includes(query))
      .slice(0, 6);
    this.showTopicSuggestions = this.topicSuggestions.length > 0;
  }

  selectTopicTag(topic: TrendingTopic, event: Event): void {
    event.stopPropagation();
    const lastHashIndex = this.newPostContent.lastIndexOf('#');
    if (lastHashIndex !== -1 && topic.title) {
      this.newPostContent = this.newPostContent.substring(0, lastHashIndex) + topic.title + ' ';
    }
    this.showTopicSuggestions = false;
  }

  // ── Reply User Tagging ──

  onReplyContentInput(): void {
    this.replyError = '';
    this.checkForReplyUserMention();
  }

  private checkForReplyUserMention(): void {
    const text = this.replyContent;
    const lastAtIndex = text.lastIndexOf('@');
    if (lastAtIndex === -1 || lastAtIndex === text.length - 1) {
      this.showReplyUserSuggestions = false;
      return;
    }
    const afterAt = text.substring(lastAtIndex + 1);
    if (afterAt.includes(' ')) {
      this.showReplyUserSuggestions = false;
      return;
    }
    const query = afterAt.toLowerCase();
    this.replyUserSuggestions = this.allKnownUsers
      .filter(u => u.name.toLowerCase().includes(query) || u.username.toLowerCase().includes(query))
      .slice(0, 5);
    this.showReplyUserSuggestions = this.replyUserSuggestions.length > 0;
  }

  selectReplyUserTag(user: { name: string; username: string }, event: Event): void {
    event.stopPropagation();
    const lastAtIndex = this.replyContent.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      this.replyContent = this.replyContent.substring(0, lastAtIndex) + user.username + ' ';
    }
    this.showReplyUserSuggestions = false;
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
          if (!seen.has(uname)) {
            seen.add(uname);
            this.allKnownUsers.push({
              id: u.id,
              name: u.name,
              username: uname,
              avatar: u.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + u.name
            });
          }
        }
      }
    });
  }

  isVideoUrl(url?: string): boolean {
    if (!url) return false;
    return url.startsWith('data:video/') || /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url);
  }

  formatContent(content: string): SafeHtml {
    let locHtml = '';
    let text = content;
    const locMatch = text.match(/\[LOC:(.+?)\]/);
    if (locMatch) {
      text = text.replace(/\n?\[LOC:.+?\]/, '').trim();
      locHtml = '<div style="margin-top:6px;display:inline-flex;align-items:center;gap:4px;background:#f0f7ff;color:#38a9f3;font-size:12px;padding:3px 10px;border-radius:999px;border:1px solid #e0f0ff"><svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"/></svg>' + locMatch[1].replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') + '</div>';
    }
    let safe = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
    safe = safe.replace(/(^|\s)(@[\w_]+)/g, '$1<span style="color:#38a9f3;font-weight:600;cursor:pointer">$2</span>');
    safe = safe.replace(/(^|\s)(#[\w]+)/g, '$1<span style="color:#38a9f3;font-weight:600;cursor:pointer">$2</span>');
    safe = safe.replace(/\n/g, '<br>');
    return this.sanitizer.bypassSecurityTrustHtml(safe + locHtml);
  }

  // ── Like ──

  likePost(post: ForumPost): void {
    this.forumService.likePost(post.id).subscribe({
      next: (updated) => {
        const idx = this.posts.findIndex(p => p.id === post.id);
        if (idx !== -1) {
          updated.comments = this.posts[idx].comments;
          this.posts[idx] = updated;
        }
        this.applyFilter();
        this.sendNotificationForAction(post, 'LIKE', this.user?.name + ' liked your post');
      }
    });
  }

  // ── Repost ──

  repostPost(post: ForumPost): void {
    this.forumService.repostPost(post.id).subscribe({
      next: (updated) => {
        const idx = this.posts.findIndex(p => p.id === post.id);
        if (idx !== -1) {
          updated.comments = this.posts[idx].comments;
          this.posts[idx] = updated;
        }
        this.applyFilter();
      }
    });
  }

  // ── Replies / Comments ──

  toggleReplies(post: ForumPost): void {
    if (this.expandedRepliesPostId === post.id) {
      this.expandedRepliesPostId = null;
      return;
    }
    this.expandedRepliesPostId = post.id;
    const replies = this.allPosts.filter(p => p.parentPostId === post.id);
    this.repliesMap.set(post.id, replies);
  }

  startReply(postId: number): void {
    this.replyingToPostId = postId;
    this.replyContent = '';
    this.replyError = '';
    if (this.expandedRepliesPostId !== postId) {
      this.toggleReplies({ id: postId } as ForumPost);
    }
  }

  cancelReply(): void {
    this.replyingToPostId = null;
    this.replyContent = '';
    this.replyError = '';
  }

  submitReply(parentPostId: number): void {
    this.replyError = this.validateReplyContent(this.replyContent);
    if (this.replyError || !this.user) return;

    const reply: any = {
      content: this.replyContent.trim(),
      author: this.user.name,
      username: '@' + this.user.name.replace(/\s+/g, '_').toLowerCase(),
      avatar: (this.user as any).avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + this.user.name,
      userId: this.user.id,
      parentPostId: parentPostId,
      comments: 0,
      reposts: 0,
      likes: 0
    };
    this.forumService.createPost(reply).subscribe({
      next: (createdReply) => {
        this.replyContent = '';
        this.replyingToPostId = null;
        this.replyError = '';
        this.loadPosts();
        // Send comment notification to post owner
        const parentPost = this.posts.find(p => p.id === parentPostId);
        if (parentPost) {
          this.sendNotificationForAction(parentPost, 'COMMENT', this.user?.name + ' commented on your post');
        }
        // Send tag notifications for @mentions in reply
        this.sendTagNotifications(reply.content, createdReply);
        setTimeout(() => {
          if (this.expandedRepliesPostId === parentPostId) {
            const replies = this.allPosts.filter(p => p.parentPostId === parentPostId);
            this.repliesMap.set(parentPostId, replies);
          }
        }, 500);
      },
      error: (err) => {
        console.error('[Forum] Failed to submit reply. Status:', err?.status, 'Error:', err?.error);
        this.replyError = `Failed to reply (${err?.status || 'network error'}). Please try again.`;
      }
    });
  }

  // ── Edit Post ──

  startEdit(post: ForumPost): void {
    this.editingPostId = post.id;
    this.editContent = post.content;
    this.editError = '';
    this.openMenuPostId = null;
  }

  cancelEdit(): void {
    this.editingPostId = null;
    this.editContent = '';
    this.editError = '';
  }

  submitEdit(post: ForumPost): void {
    this.editError = this.validatePostContent(this.editContent);
    if (this.editError) return;

    const hashtags = this.extractHashtags(this.editContent);
    let topicId = post.topicId;
    for (const tag of hashtags) {
      const topic = this.findTopicByHashtag(tag);
      if (topic?.id) { topicId = topic.id; break; }
    }

    const updated: any = {
      content: this.editContent.trim(),
      isEdited: true,
      topicId: topicId,
      image: post.image,
      author: post.author,
      username: post.username,
      avatar: post.avatar
    };
    this.forumService.updatePost(post.id, updated).subscribe({
      next: () => {
        this.editingPostId = null;
        this.editContent = '';
        this.editError = '';
        this.loadPosts();
        this.addNotification('Post updated successfully!', 'success');
      },
      error: (err) => {
        console.error('[Forum] Failed to edit post:', err);
        this.editError = `Failed to save edit (${err?.status || 'network error'}). Please try again.`;
        this.addNotification('Failed to update post.', 'warning');
      }
    });
  }

  // ── Delete Post ──

  deletePost(post: ForumPost): void {
    this.openMenuPostId = null;
    this.posts = this.posts.filter(p => p.id !== post.id);
    this.applyFilter();
    this.forumService.deletePost(post.id).subscribe({
      next: () => this.loadPosts(),
      error: () => this.loadPosts()
    });
  }

  // ── 3-dot Menu ──

  toggleMenu(postId: number): void {
    this.openMenuPostId = this.openMenuPostId === postId ? null : postId;
  }

  isOwnPost(post: ForumPost): boolean {
    return !!this.user && post.userId === this.user.id;
  }

  // ── Report Post ──

  openReportModal(post: ForumPost): void {
    this.reportingPost = post;
    this.showReportModal = true;
    this.reportReason = '';
    this.reportDescription = '';
    this.reportError = '';
    this.reportSuccess = '';
    this.openMenuPostId = null;
  }

  closeReportModal(): void {
    this.showReportModal = false;
    this.reportingPost = null;
    this.reportReason = '';
    this.reportDescription = '';
    this.reportError = '';
    this.reportSuccess = '';
    this.reportSubmitting = false;
  }

  submitReport(): void {
    if (!this.reportReason) {
      this.reportError = 'Please select a reason for reporting.';
      return;
    }
    if (!this.user || !this.reportingPost) return;
    if (this.reportSubmitting) return;

    this.reportSubmitting = true;
    this.reportError = '';

    const report: ForumReport = {
      postId: this.reportingPost.id,
      postContent: this.reportingPost.content,
      reporterId: this.user.id,
      reporterName: this.user.name,
      reporterEmail: this.user.email,
      reportedUserId: this.reportingPost.userId || 0,
      reportedUserName: this.reportingPost.author,
      reason: this.reportReason,
      description: this.reportDescription.trim() || undefined,
      status: 'PENDING'
    };

    console.log('[Forum] Submitting report:', { reporterEmail: report.reporterEmail, reason: report.reason, postId: report.postId });

    this.forumService.createReport(report).subscribe({
      next: (res) => {
        console.log('[Forum] Report submitted successfully:', res);
        this.reportSuccess = 'Report submitted successfully. Our team will review it shortly.';
        this.reportError = '';
        this.reportSubmitting = false;
        this.addNotification('Report submitted successfully!', 'success');
        setTimeout(() => this.closeReportModal(), 2000);
      },
      error: (err) => {
        console.error('[Forum] Report submission failed:', err);
        this.reportSubmitting = false;
        if (err.status === 0) {
          this.reportError = 'Cannot reach the server. Please check your connection.';
        } else if (err.status === 500) {
          this.reportError = 'Server error. Please try again later.';
        } else {
          this.reportError = `Failed to submit report (${err.status || 'unknown'}). Please try again.`;
        }
      }
    });
  }

  // ── Topics ──

  toggleNewTopicForm(): void {
    this.showNewTopicForm = !this.showNewTopicForm;
    if (!this.showNewTopicForm) {
      this.newTopicTitle = '';
      this.newTopicCategory = '';
      this.topicTitleError = '';
      this.topicCategoryError = '';
    }
  }

  createTopic(): void {
    this.topicTitleError = this.validateTopicTitle(this.newTopicTitle);
    this.topicCategoryError = this.validateTopicCategory(this.newTopicCategory);
    if (this.topicTitleError || this.topicCategoryError) return;

    const topic: TrendingTopic = {
      title: this.newTopicTitle.trim(),
      category: this.newTopicCategory.trim(),
      isPinned: false,
      viewCount: 0,
      postCount: 0
    };
    this.forumService.createTopic(topic).subscribe({
      next: () => {
        this.newTopicTitle = '';
        this.newTopicCategory = '';
        this.topicTitleError = '';
        this.topicCategoryError = '';
        this.showNewTopicForm = false;
        this.loadTrendingTopics();
      }
    });
  }

  selectTopic(topic: TrendingTopic): void {
    if (this.selectedTopicId === topic.id) {
      this.selectedTopicId = null;
      this.applyFilter();
      return;
    }
    this.selectedTopicId = topic.id!;
    this.forumService.incrementTopicViewCount(topic.id!).subscribe();
    this.applyFilter();
  }

  clearTopicFilter(): void {
    this.selectedTopicId = null;
    this.applyFilter();
  }

  // ── Time formatting ──

  getTimeAgo(post: ForumPost): string {
    const timestamp = post.createdAt;
    if (!timestamp) return post.time || '';

    const date = this.parseTimestamp(timestamp);
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 0) return 'just now';
    if (mins < 1) return 'just now';
    if (mins < 60) return mins + 'm';
    const hours = Math.floor(mins / 60);
    if (hours < 24) return hours + 'h';
    const days = Math.floor(hours / 24);
    if (days < 30) return days + 'd';
    const months = Math.floor(days / 30);
    return months + 'mo';
  }

  // ── Reactions ──

  toggleReactionPicker(postId: number, event: Event): void {
    event.stopPropagation();
    this.showReactionsPostId = this.showReactionsPostId === postId ? null : postId;
  }

  reactToPost(post: ForumPost, emoji: string, event: Event): void {
    event.stopPropagation();
    const currentReaction = this.userReactions.get(post.id);
    if (currentReaction === emoji) {
      this.userReactions.delete(post.id);
      const counts = this.postReactionCounts.get(post.id);
      if (counts) {
        const c = (counts.get(emoji) || 1) - 1;
        if (c <= 0) counts.delete(emoji); else counts.set(emoji, c);
      }
    } else {
      if (currentReaction) {
        const counts = this.postReactionCounts.get(post.id);
        if (counts) {
          const c = (counts.get(currentReaction) || 1) - 1;
          if (c <= 0) counts.delete(currentReaction); else counts.set(currentReaction, c);
        }
      }
      this.userReactions.set(post.id, emoji);
      if (!this.postReactionCounts.has(post.id)) {
        this.postReactionCounts.set(post.id, new Map());
      }
      const counts = this.postReactionCounts.get(post.id)!;
      counts.set(emoji, (counts.get(emoji) || 0) + 1);
      this.floatingReaction = { postId: post.id, emoji };
      setTimeout(() => this.floatingReaction = null, 600);
      if (!currentReaction) {
        this.forumService.likePost(post.id).subscribe({
          next: (updated) => {
            const idx = this.posts.findIndex(p => p.id === post.id);
            if (idx !== -1) { updated.comments = this.posts[idx].comments; this.posts[idx] = updated; }
            this.applyFilter();
          }
        });
        this.sendNotificationForAction(post, 'LIKE', this.user?.name + ' reacted ' + emoji + ' to your post');
      }
    }
    this.showReactionsPostId = null;
    this.saveReactionsToStorage();
  }

  getUserReaction(postId: number): string | undefined {
    return this.userReactions.get(postId);
  }

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
        if (parsed.userReactions) {
          this.userReactions = new Map(Object.entries(parsed.userReactions).map(([k, v]) => [Number(k), v as string]));
        }
        if (parsed.postReactionCounts) {
          for (const [postId, counts] of Object.entries(parsed.postReactionCounts)) {
            this.postReactionCounts.set(Number(postId), new Map(Object.entries(counts as any)));
          }
        }
      }
    } catch { /* ignore */ }
  }

  private saveReactionsToStorage(): void {
    const userReactions: any = {};
    this.userReactions.forEach((v, k) => userReactions[k] = v);
    const postReactionCounts: any = {};
    this.postReactionCounts.forEach((counts, postId) => {
      const obj: any = {};
      counts.forEach((c, e) => obj[e] = c);
      postReactionCounts[postId] = obj;
    });
    localStorage.setItem('forum_reactions', JSON.stringify({ userReactions, postReactionCounts }));
  }

  // ── GIF Picker ──

  toggleGifPicker(event: Event): void {
    event.stopPropagation();
    this.showGifPicker = !this.showGifPicker;
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
    this.filePreviewUrl = gifUrl;
    this.fileType = 'image';
    this.selectedFile = null;
    this.showGifPicker = false;
    this.gifSearchQuery = '';
  }

  // ── Dark Mode ──

  toggleDarkMode(): void {
    this.darkMode = !this.darkMode;
    localStorage.setItem('forum_dark_mode', String(this.darkMode));
  }

  // ── Notifications ──

  addNotification(message: string, type: 'success' | 'info' | 'warning' = 'info'): void {
    const id = ++this.notifCounter;
    this.notifications.unshift({ id, message, type, time: Date.now() });
    if (this.notifications.length > 5) {
      this.notifications = this.notifications.slice(0, 5);
    }
    setTimeout(() => this.dismissNotification(id), 4000);
  }

  dismissNotification(id: number): void {
    const n = this.notifications.find(n => n.id === id);
    if (n) {
      n.exiting = true;
      setTimeout(() => {
        this.notifications = this.notifications.filter(n => n.id !== id);
      }, 300);
    }
  }

  getNotifIcon(type: string): string {
    switch (type) {
      case 'success': return '✅';
      case 'warning': return '⚠️';
      default: return '💬';
    }
  }

  // ── Tag Notifications ──

  private sendTagNotifications(content: string, createdPost: ForumPost): void {
    if (!this.user) return;
    const mentions = content.match(/@[\w_]+/g);
    if (!mentions) return;
    const seen = new Set<string>();
    for (const mention of mentions) {
      const username = mention.toLowerCase();
      if (seen.has(username)) continue;
      seen.add(username);
      const taggedUser = this.allKnownUsers.find(u => u.username.toLowerCase() === username);
      if (!taggedUser || !taggedUser.id) continue;
      if (taggedUser.id === this.user.id) continue;
      const notification = {
        userId: taggedUser.id,
        postId: createdPost.id,
        fromUserId: this.user.id,
        fromUsername: this.user.name,
        fromAvatar: (this.user as any).avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + this.user.name,
        message: this.user.name + ' mentioned you in a post',
        type: 'TAG'
      };
      this.forumService.createNotification(notification).subscribe();
    }
  }

  loadTagNotifications(): void {
    if (!this.user) return;
    this.forumService.getNotifications(this.user.id).subscribe({
      next: (notifs) => {
        this.tagNotifications = notifs || [];
        this.unreadNotifCount = this.tagNotifications.filter((n: any) => !n.isRead).length;
      }
    });
  }

  private pollNotifications(): void {
    if (!this.user) return;
    this.forumService.getUnreadCount(this.user.id).subscribe({
      next: (res) => {
        const newCount = res.count || 0;
        if (newCount > this.unreadNotifCount) {
          this.addNotification('You have new mentions!', 'info');
          this.loadTagNotifications();
        }
        this.unreadNotifCount = newCount;
      }
    });
  }

  toggleNotifPanel(): void {
    this.showNotifPanel = !this.showNotifPanel;
    if (this.showNotifPanel) {
      this.loadTagNotifications();
    }
  }

  markNotifRead(notif: any): void {
    if (notif.isRead) return;
    this.forumService.markNotificationRead(notif.id).subscribe({
      next: () => {
        notif.isRead = true;
        this.unreadNotifCount = Math.max(0, this.unreadNotifCount - 1);
      }
    });
  }

  markAllNotifsRead(): void {
    if (!this.user) return;
    this.forumService.markAllNotificationsRead(this.user.id).subscribe({
      next: () => {
        this.tagNotifications.forEach((n: any) => n.isRead = true);
        this.unreadNotifCount = 0;
      }
    });
  }

  // ── Share Post ──

  openShareModal(post: ForumPost): void {
    this.sharingPost = post;
    this.showShareModal = true;
    this.shareSearchQuery = '';
    this.shareLoading = true;
    this.openMenuPostId = null;
    // Load friends list
    if (this.user) {
      this.friendsService.getFriends(this.user.id).subscribe({
        next: (friendships) => {
          this.shareFriends = friendships.map(f => {
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
          });
          this.shareLoading = false;
        },
        error: () => { this.shareLoading = false; }
      });
    }
  }

  closeShareModal(): void {
    this.showShareModal = false;
    this.sharingPost = null;
    this.shareFriends = [];
    this.shareSearchQuery = '';
  }

  get filteredShareFriends(): Friend[] {
    if (!this.shareSearchQuery.trim()) return this.shareFriends;
    const q = this.shareSearchQuery.toLowerCase();
    return this.shareFriends.filter(f => f.name.toLowerCase().includes(q));
  }

  sharePostToFriend(friend: Friend): void {
    if (!this.user || !this.sharingPost) return;
    const msg: ChatMessage = {
      senderId: this.user.id,
      senderName: this.user.name,
      senderAvatar: (this.user as any).avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + this.user.name,
      receiverId: friend.id,
      receiverName: friend.name,
      content: this.sharingPost.content,
      messageType: 'SHARED_POST',
      sharedPostId: this.sharingPost.id,
      isRead: false
    };
    this.friendsService.sendMessage(msg).subscribe({
      next: () => {
        this.addNotification(`Post shared with ${friend.name}!`, 'success');
        this.closeShareModal();
      },
      error: () => {
        this.addNotification('Failed to share post', 'warning');
      }
    });
  }

  // ── Notification for Like/Comment ──

  private sendNotificationForAction(post: ForumPost, type: string, message: string): void {
    if (!this.user || !post.userId || post.userId === this.user.id) return;
    const notification = {
      userId: post.userId,
      postId: post.id,
      fromUserId: this.user.id,
      fromUsername: this.user.name,
      fromAvatar: (this.user as any).avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + this.user.name,
      message: message,
      type: type
    };
    this.forumService.createNotification(notification).subscribe();
  }

  // ── Friend Suggestions ──

  loadSuggestedFriends(): void {
    if (!this.user) return;
    this.userService.getAllUsers().subscribe({
      next: (users) => {
        this.allUsersData = users;
        this.friendsService.getFriends(this.user!.id).subscribe({
          next: (friendships) => {
            this.myFriendIds.clear();
            for (const f of friendships) {
              const otherId = f.userId === this.user!.id ? f.friendId : f.userId;
              this.myFriendIds.add(otherId);
              this.friendStatuses.set(otherId, 'friend');
            }
            this.suggestedFriends = users
              .filter(u => u.id !== this.user!.id && !this.myFriendIds.has(u.id) && u.role !== 'ADMIN')
              .slice(0, 5)
              .map(u => ({
                id: u.id,
                name: u.name,
                avatar: u.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + u.name,
                bio: u.bio || 'Language learner',
                mutualCount: Math.floor(Math.random() * 5)
              }));
          }
        });
      }
    });
  }

  private loadFriendStatuses(): void {
    if (!this.user) return;
    this.friendsService.getFriends(this.user.id).subscribe({
      next: (friendships) => {
        for (const f of friendships) {
          const otherId = f.userId === this.user!.id ? f.friendId : f.userId;
          this.friendStatuses.set(otherId, 'friend');
          this.myFriendIds.add(otherId);
        }
      }
    });
    this.friendsService.getSentRequests(this.user.id).subscribe({
      next: (requests) => {
        for (const r of requests) {
          this.friendStatuses.set(r.friendId, 'pending');
        }
      }
    });
  }

  sendFriendRequestFromSuggestion(suggested: { id: number; name: string; avatar: string }): void {
    if (!this.user) return;
    const friendship: Friendship = {
      userId: this.user.id,
      userName: this.user.name,
      userAvatar: (this.user as any).avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + this.user.name,
      friendId: suggested.id,
      friendName: suggested.name,
      friendAvatar: suggested.avatar,
      status: 'PENDING'
    };
    this.friendsService.sendFriendRequest(friendship).subscribe({
      next: () => {
        this.friendStatuses.set(suggested.id, 'pending');
        this.suggestedFriends = this.suggestedFriends.filter(f => f.id !== suggested.id);
        this.addNotification(`Friend request sent to ${suggested.name}!`, 'success');
      },
      error: () => {
        this.addNotification('Failed to send friend request', 'warning');
      }
    });
  }

  // ── User Profile Popup (quick card) ──

  openUserProfile(userId: number | undefined, name: string, username: string, avatar: string): void {
    if (!userId) return;
    this.profileUser = {
      id: userId,
      name: name,
      username: username,
      avatar: avatar,
      isFriend: this.myFriendIds.has(userId)
    };
    this.userService.getUserById(userId).subscribe({
      next: (u) => {
        if (this.profileUser && this.profileUser.id === userId) {
          this.profileUser.bio = u.bio || 'Language learner';
          this.profileUser.joinDate = u.joinDate;
          this.profileUser.xp = u.xp;
          this.profileUser.level = u.level;
          this.profileUser.avatar = u.avatar || avatar;
        }
      }
    });
    this.showProfilePopup = true;
  }

  closeUserProfile(): void {
    this.showProfilePopup = false;
    this.profileUser = null;
  }

  // ── Forum Profile Modal (full view with posts & friends) ──

  openForumProfile(userId: number): void {
    this.closeUserProfile();
    this.forumProfileTab = 'posts';
    this.forumProfilePosts = [];
    this.forumProfileFriends = [];
    this.forumProfileIsFriend = this.myFriendIds.has(userId);
    this.forumProfileFriendStatus = this.getFriendStatus(userId);
    this.showForumProfile = true;

    // Load user data
    this.userService.getUserById(userId).subscribe({
      next: (u) => {
        this.forumProfileUser = {
          id: u.id,
          name: u.name,
          username: '@' + u.name.replace(/\s+/g, '_').toLowerCase(),
          avatar: u.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + u.name,
          bio: u.bio || 'Language learner',
          joinDate: u.joinDate,
          xp: u.xp,
          level: u.level,
          streak: u.streak,
          language: u.language
        };
      }
    });

    // Load user's posts
    this.forumProfilePosts = this.allPosts.filter(p => p.userId === userId && !p.parentPostId);

    // Load user's friends
    this.friendsService.getFriends(userId).subscribe({
      next: (friendships) => {
        this.forumProfileFriends = friendships.map(f => {
          const isUser = f.userId === userId;
          return {
            id: isUser ? f.friendId : f.userId,
            name: isUser ? f.friendName : f.userName,
            avatar: isUser ? f.friendAvatar : f.userAvatar
          };
        });
      }
    });
  }

  closeForumProfile(): void {
    this.showForumProfile = false;
    this.forumProfileUser = null;
    this.forumProfilePosts = [];
    this.forumProfileFriends = [];
  }

  goToUserProfile(userId: number): void {
    this.closeUserProfile();
    this.openForumProfile(userId);
  }

  goToMessageUser(userId: number): void {
    this.closeUserProfile();
    this.closeForumProfile();
    this.router.navigate(['/friends']);
  }

  // ── Notification Icon by Type ──

  getNotifTypeIcon(type: string): string {
    switch (type) {
      case 'LIKE': return '❤️';
      case 'COMMENT': return '💬';
      case 'TAG': return '🏷️';
      default: return '🔔';
    }
  }

  // ── Add Friend from Forum ──

  sendFriendRequestFromForum(post: ForumPost): void {
    if (!this.user || !post.userId || post.userId === this.user.id) return;
    const friendship: Friendship = {
      userId: this.user.id,
      userName: this.user.name,
      userAvatar: (this.user as any).avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + this.user.name,
      friendId: post.userId,
      friendName: post.author,
      friendAvatar: post.avatar,
      status: 'PENDING'
    };
    this.friendsService.sendFriendRequest(friendship).subscribe({
      next: () => {
        this.friendStatuses.set(post.userId!, 'pending');
        this.addNotification(`Friend request sent to ${post.author}!`, 'success');
      },
      error: (err: any) => {
        console.error('Friend request error:', err);
        const status = err?.status || '';
        this.addNotification(status === 404 ? 'Endpoint not found — backend not deployed' : 'Failed to send friend request (' + status + ')', 'warning');
      }
    });
  }

  getFriendStatus(userId: number | undefined): string {
    if (!userId || userId === this.user?.id) return 'self';
    return this.friendStatuses.get(userId) || 'none';
  }

  getNotifTimeAgo(dateStr: string): string {
    if (!dateStr) return '';
    const date = !dateStr.endsWith('Z') && !dateStr.includes('+') && !dateStr.includes('-', 10)
      ? new Date(dateStr + 'Z') : new Date(dateStr);
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return mins + 'm';
    const hours = Math.floor(mins / 60);
    if (hours < 24) return hours + 'h';
    const days = Math.floor(hours / 24);
    return days + 'd';
  }
}
