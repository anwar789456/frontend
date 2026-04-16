import { Component, OnInit, OnDestroy, ViewChild, ElementRef, HostListener, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subscription, forkJoin } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ForumService } from '../services/forum.service';
import { AuthService, AuthUser } from '../../../shared/services/auth.service';
import { UserService } from '../../user/services/user.service';
import { FriendsService } from '../../friends/services/friends.service';
import { ForumPost, ForumPostWithShared, TrendingTopic, ForumBadge, UserForumXP, UserStreak, WordOfTheDay } from '../models/forum.model';
import { ForumReport, REPORT_REASONS, ReportReason } from '../models/forum-report.model';
import { Friend, FriendRequest, Friendship, ChatMessage } from '../../friends/models/friend.model';
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

  // Loading state
  postsLoading = true;
  private postsPollInterval: any;

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

  // Edit Reply
  editingReplyId: number | null = null;
  editReplyContent = '';
  editReplyError = '';

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

  // Reactions (Kid-friendly)
  reactionEmojis = [
    { emoji: '⭐', label: 'Super Star!' },
    { emoji: '❤️', label: 'Love it!' },
    { emoji: '😄', label: 'Makes me happy!' },
    { emoji: '👏', label: 'Well done!' },
    { emoji: '🎉', label: 'Awesome!' },
    { emoji: '�', label: 'I learned something!' }
  ];
  showReactionsPostId: number | null = null;
  userReactions: Map<number, string> = new Map();
  postReactionCounts: Map<number, Map<string, number>> = new Map();
  floatingReaction: { postId: number; emoji: string } | null = null;

  // Interaction debounce for polling
  private lastInteractionTime = 0;

  // GIF Picker
  showGifPicker = false;
  gifSearchQuery = '';
  gifResults: { url: string; preview: string }[] = [];
  gifLoading = false;
  private gifSearchTimeout: any;
  private readonly TENOR_KEY = 'AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ';

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

  // Content Moderation
  isModeratingPost = false;
  moderationWarning = '';
  showModerationWarning = false;
  showModerationBlock = false;

  // Share Post
  showShareModal = false;
  sharingPost: ForumPost | null = null;
  shareFriends: Friend[] = [];
  shareSearchQuery = '';
  shareLoading = false;

  // Add Friend from Forum
  friendStatuses: Map<number, string> = new Map(); // userId -> 'none' | 'pending' | 'friend'

  // Save & Favorite
  savedPostIds: Set<number> = new Set();
  favoritePostIds: Set<number> = new Set();
  activeTab: 'all' | 'saved' | 'favorites' = 'all';

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

  // XP & Badges
  userXP: UserForumXP = { userId: 0, xp: 0, level: 1, postsCount: 0, commentsCount: 0, likesGivenCount: 0, wotdCount: 0, badges: [] };
  allBadges = ForumService.BADGES;
  showBadgeUnlock: ForumBadge | null = null;
  xpGainAnimation: { amount: number; action: string } | null = null;

  // Streak
  userStreak: UserStreak = { userId: 0, currentStreak: 0, longestStreak: 0, lastActiveDate: '' };
  showStreakAnimation = false;

  // Word of the Day
  wordOfTheDay: WordOfTheDay = { word: '', definition: '', example: '', date: '' };
  wotdUsedToday = false;
  showWotdCelebration = false;

  // Translation
  translatedPosts: Map<number, string> = new Map();
  translatingPostId: number | null = null;
  showTranslation: Set<number> = new Set();

  // View Profile Modal
  showProfileModal = false;
  profileUser: User | null = null;
  profileUserPosts: ForumPostWithShared[] = [];
  profileFriendRequest: FriendRequest | null = null;
  profileLoading = false;

  // Badge Equip
  equippedBadgeId: string | null = null;

  // Friends Suggestions (left sidebar)
  friendSuggestions: { id: number; name: string; avatar: string; username: string }[] = [];

  constructor(
    private forumService: ForumService,
    private authService: AuthService,
    private userService: UserService,
    private friendsService: FriendsService,
    private sanitizer: DomSanitizer,
    private http: HttpClient,
    private cdRef: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.user = this.authService.currentUser;
    this.newTopicSub = this.authService.currentUser$.subscribe(u => {
      this.user = u;
    });
    this.darkMode = localStorage.getItem('forum_dark_mode') === 'true';

    // Load local data instantly (no network)
    this.loadReactionsFromStorage();
    this.loadSavedAndFavorites();
    this.loadEquippedBadge();

    // Load critical path data in parallel with forkJoin
    this.postsLoading = true;
    forkJoin({
      posts: this.forumService.getAllPosts(),
      topics: this.forumService.getAllTopics()
    }).subscribe({
      next: ({ posts, topics }) => {
        this.allPosts = posts;
        this.posts = posts.filter(p => !p.parentPostId);
        this.trendingTopics = topics || [];
        this.countCommentsFromAll();
        this.resolveSharedPosts();
        this.buildKnownUsers();
        this.applyFilter();
        this.postsLoading = false;
        this.cdRef.detectChanges();
      },
      error: () => {
        this.postsLoading = false;
        this.cdRef.detectChanges();
      }
    });

    // Load secondary data in parallel (non-blocking)
    this.loadXPData();
    this.loadStreakData();
    this.loadWordOfTheDay();
    this.loadAllUsers();
    this.loadTrendingGifs();
    this.loadTagNotifications();
    this.loadPendingFriendRequests();
    this.loadFriendSuggestions();

    this.forumService.newTopic$.subscribe(() => {
      this.toggleNewTopicForm();
    });

    // Poll for new posts every 3 seconds
    this.postsPollInterval = setInterval(() => this.pollNewPosts(), 3000);
    // Poll for new notifications every 5 seconds
    this.notifPollInterval = setInterval(() => this.pollNotifications(), 5000);
  }

  ngOnDestroy(): void {
    this.newTopicSub?.unsubscribe();
    if (this.notifPollInterval) clearInterval(this.notifPollInterval);
    if (this.postsPollInterval) clearInterval(this.postsPollInterval);
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
      }
    } catch {
      this.showEmojiPicker = false;
      this.showUserSuggestions = false;
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
        this.resolveSharedPosts();
        this.buildKnownUsers();
        this.applyFilter();
        this.postsLoading = false;
        this.cdRef.detectChanges();
      }
    });
  }

  private pollNewPosts(): void {
    // Skip poll if user interacted recently (avoid overwriting optimistic updates)
    if (Date.now() - this.lastInteractionTime < 5000) return;

    this.forumService.getAllPosts().subscribe({
      next: (all) => {
        // Skip if user interacted while request was in-flight
        if (Date.now() - this.lastInteractionTime < 5000) return;

        this.allPosts = all;
        this.posts = all.filter(p => !p.parentPostId);
        this.countCommentsFromAll();
        this.resolveSharedPosts();
        this.applyFilter();

        // Auto-refresh expanded replies
        if (this.expandedRepliesPostId) {
          const replies = this.allPosts.filter(p => p.parentPostId === this.expandedRepliesPostId);
          this.repliesMap.set(this.expandedRepliesPostId, replies);
        }

        this.cdRef.detectChanges();
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
        this.cdRef.detectChanges();
      }
    });
  }

  // ── Search & Filter ──

  applyFilter(): void {
    let result = this.posts;
    if (this.activeTab === 'saved') {
      result = result.filter(p => this.savedPostIds.has(p.id));
    } else if (this.activeTab === 'favorites') {
      result = result.filter(p => this.favoritePostIds.has(p.id));
    }
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
    // Sort by date: newest first
    result.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
    this.filteredPosts = result;
  }

  switchTab(tab: 'all' | 'saved' | 'favorites'): void {
    this.activeTab = tab;
    this.applyFilter();
  }

  getSavedCount(): number { return this.savedPostIds.size; }
  getFavoriteCount(): number { return this.favoritePostIds.size; }

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

    this.showModerationWarning = false;
    this.showModerationBlock = false;
    this.moderationWarning = '';
    this.isModeratingPost = true;
    this.cdRef.detectChanges();

    this.forumService.moderateContent(this.newPostContent).subscribe({
      next: (modResult) => {
        this.isModeratingPost = false;
        if (!modResult.isSafe) {
          const warningCount = this.forumService.incrementModerationWarning(this.user!.id);
          if (warningCount >= 2) {
            this.showModerationBlock = true;
            this.moderationWarning = modResult.reason || 'Your post contains inappropriate content.';
            this.addNotification('Your post has been reported. Please check your email.', 'warning');
            this.autoReportPost(this.newPostContent, modResult.reason);
          } else {
            this.showModerationWarning = true;
            this.moderationWarning = modResult.reason || 'Your post contains inappropriate content.';
            this.addNotification('Your post was blocked. Please revise the content.', 'warning');
          }
          this.cdRef.detectChanges();
          return;
        }
        this.proceedWithCreatePost();
      },
      error: () => {
        this.isModeratingPost = false;
        this.proceedWithCreatePost();
      }
    });
  }

  private autoReportPost(content: string, reason: string): void {
    if (!this.user) return;
    const report: any = {
      postId: 0,
      reporterId: 0,
      reportedUserId: this.user.id,
      reporterName: 'AI Moderation System',
      reporterEmail: '',
      reportedUserName: this.user.name,
      reason: 'AI_MODERATION',
      postContent: content.substring(0, 500),
      description: 'Auto-reported by AI content moderation (2nd offense). Reason: ' + (reason || 'Inappropriate content'),
      status: 'PENDING'
    };
    this.forumService.createReport(report).subscribe();
  }

  dismissModerationWarning(): void {
    this.showModerationWarning = false;
    this.showModerationBlock = false;
    this.moderationWarning = '';
  }

  private proceedWithCreatePost(): void {
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

    let finalContent = this.newPostContent.trim();
    if (this.newPostLocation.trim()) {
      finalContent += '\n[LOC:' + this.newPostLocation.trim() + ']';
    }

    const doCreatePost = (imageUrl?: string) => {
      const post: any = {
        content: finalContent,
        author: this.user!.name,
        username: '@' + this.user!.name.replace(/\s+/g, '_').toLowerCase(),
        avatar: (this.user as any).avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + this.user!.name,
        userId: this.user!.id,
        comments: 0,
        reposts: 0,
        likes: 0
      };
      if (imageUrl) post.image = imageUrl;
      if (topicId) post.topicId = topicId;

      this.forumService.createPost(post).subscribe({
        next: (res) => {
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
          this.awardXP(ForumService.XP_REWARDS.post, 'post');
          this.checkWotdInContent(finalContent);
          this.addNotification('Your post has been published!', 'success');
          this.cdRef.detectChanges();
        },
        error: (err) => {
          console.error('[Forum] Failed to create post:', err);
          this.postError = `Failed to post (${err?.status || 'network error'}). Please try again.`;
          this.addNotification('Failed to publish post. Please try again.', 'warning');
          this.cdRef.detectChanges();
        }
      });
    };

    // If a file is selected, upload it first via the file upload service
    if (this.selectedFile) {
      this.postError = '';
      this.addNotification('Uploading image...', 'info');
      this.forumService.uploadFile(this.selectedFile).subscribe({
        next: (url) => {
          doCreatePost(url);
        },
        error: (err) => {
          console.error('[Forum] File upload failed:', err);
          this.postError = 'Failed to upload image. Please try again.';
          this.addNotification('Image upload failed.', 'warning');
          this.cdRef.detectChanges();
        }
      });
    } else if (this.filePreviewUrl && this.fileType === 'image') {
      // GIF URL or pasted URL
      doCreatePost(this.filePreviewUrl);
    } else {
      const imageValue = this.newPostImage.trim() || '';
      doCreatePost(imageValue || undefined);
    }
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
      this.compressImage(file, 800, 0.6).then(compressed => {
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

  private compressImage(file: File, maxWidth: number, quality: number): Promise<string> {
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
        this.cdRef.detectChanges();
      }
    });
  }

  // ── Repost ──

  repostPost(post: ForumPost): void {
    this.lastInteractionTime = Date.now();
    post.reposts = (post.reposts || 0) + 1;
    this.cdRef.detectChanges();
    this.forumService.repostPost(post.id).subscribe({
      next: (updated) => {
        const idx = this.posts.findIndex(p => p.id === post.id);
        if (idx !== -1) {
          updated.comments = this.posts[idx].comments;
          this.posts[idx] = updated;
        }
        this.applyFilter();
        this.cdRef.detectChanges();
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
    this.lastInteractionTime = Date.now();

    this.showModerationWarning = false;
    this.showModerationBlock = false;
    this.moderationWarning = '';

    this.forumService.moderateContent(this.replyContent).subscribe({
      next: (modResult) => {
        if (!modResult.isSafe) {
          const warningCount = this.forumService.incrementModerationWarning(this.user!.id);
          if (warningCount >= 2) {
            this.showModerationBlock = true;
            this.moderationWarning = modResult.reason || 'Your reply contains inappropriate content.';
            this.addNotification('Your reply has been reported. Please check your email.', 'warning');
            this.autoReportPost(this.replyContent, modResult.reason);
          } else {
            this.showModerationWarning = true;
            this.moderationWarning = modResult.reason || 'Your reply contains inappropriate content.';
            this.addNotification('Your reply was blocked. Please revise the content.', 'warning');
          }
          this.cdRef.detectChanges();
          return;
        }
        this.proceedWithSubmitReply(parentPostId);
      },
      error: () => {
        this.proceedWithSubmitReply(parentPostId);
      }
    });
  }

  private proceedWithSubmitReply(parentPostId: number): void {
    const reply: any = {
      content: this.replyContent.trim(),
      author: this.user!.name,
      username: '@' + this.user!.name.replace(/\s+/g, '_').toLowerCase(),
      avatar: (this.user as any).avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + this.user!.name,
      userId: this.user!.id,
      parentPostId: parentPostId,
      comments: 0,
      reposts: 0,
      likes: 0
    };
    this.forumService.createPost(reply).subscribe({
      next: () => {
        this.replyContent = '';
        this.replyingToPostId = null;
        this.replyError = '';
        this.awardXP(ForumService.XP_REWARDS.comment, 'comment');
        this.loadPosts();
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

  // ── Edit / Delete Reply ──

  isOwnReply(reply: ForumPost): boolean {
    return !!this.user && reply.userId === this.user.id;
  }

  startEditReply(reply: ForumPost): void {
    this.editingReplyId = reply.id;
    this.editReplyContent = reply.content;
    this.editReplyError = '';
  }

  cancelEditReply(): void {
    this.editingReplyId = null;
    this.editReplyContent = '';
    this.editReplyError = '';
  }

  submitEditReply(reply: ForumPost): void {
    this.editReplyError = this.validateReplyContent(this.editReplyContent);
    if (this.editReplyError) return;

    const updated: any = {
      content: this.editReplyContent.trim(),
      isEdited: true,
      image: reply.image,
      author: reply.author,
      username: reply.username,
      avatar: reply.avatar
    };
    this.forumService.updatePost(reply.id, updated).subscribe({
      next: () => {
        this.editingReplyId = null;
        this.editReplyContent = '';
        this.editReplyError = '';
        this.loadPosts();
        // Refresh replies for the parent post
        setTimeout(() => {
          if (this.expandedRepliesPostId) {
            const replies = this.allPosts.filter(p => p.parentPostId === this.expandedRepliesPostId);
            this.repliesMap.set(this.expandedRepliesPostId, replies);
            this.cdRef.detectChanges();
          }
        }, 500);
        this.addNotification('Reply updated!', 'success');
      },
      error: (err) => {
        this.editReplyError = `Failed to update reply (${err?.status || 'network error'}).`;
      }
    });
  }

  deleteReply(reply: ForumPost, parentPostId: number): void {
    this.lastInteractionTime = Date.now();
    // Optimistic: remove reply from local map immediately
    const replies = this.repliesMap.get(parentPostId);
    if (replies) {
      this.repliesMap.set(parentPostId, replies.filter(r => r.id !== reply.id));
    }
    // Optimistic: decrement comment count
    const parentPost = this.posts.find(p => p.id === parentPostId);
    if (parentPost) parentPost.comments = Math.max(0, parentPost.comments - 1);
    this.cdRef.detectChanges();
    this.forumService.deletePost(reply.id).subscribe({
      next: () => {
        this.loadPosts();
        setTimeout(() => {
          const replies = this.allPosts.filter(p => p.parentPostId === parentPostId);
          this.repliesMap.set(parentPostId, replies);
          this.cdRef.detectChanges();
        }, 500);
        this.addNotification('Reply deleted', 'info');
      },
      error: () => {
        this.addNotification('Failed to delete reply', 'warning');
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
    this.lastInteractionTime = Date.now();

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
    this.lastInteractionTime = Date.now();
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
    const oldLikes = post.likes;

    // Pause polling briefly so it doesn't overwrite optimistic update
    this.lastInteractionTime = Date.now();

    const updatePostInList = (updated: ForumPost) => {
      const idx = this.posts.findIndex(p => p.id === post.id);
      if (idx !== -1) { updated.comments = this.posts[idx].comments; this.posts[idx] = updated; }
      this.applyFilter();
      this.cdRef.detectChanges();
    };

    const revertOnError = () => {
      post.likes = oldLikes;
      this.applyFilter();
      this.cdRef.detectChanges();
    };

    if (currentReaction === emoji) {
      // Removing reaction → unlike on backend
      this.userReactions.delete(post.id);
      const counts = this.postReactionCounts.get(post.id);
      if (counts) {
        const c = (counts.get(emoji) || 1) - 1;
        if (c <= 0) counts.delete(emoji); else counts.set(emoji, c);
      }
      // Optimistic: decrement immediately
      post.likes = Math.max(0, post.likes - 1);
      this.applyFilter();
      this.cdRef.detectChanges();
      this.forumService.unlikePost(post.id).subscribe({
        next: updatePostInList,
        error: revertOnError
      });
    } else {
      // Switching or adding reaction
      const hadReaction = !!currentReaction;
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
      if (!hadReaction) {
        // Optimistic: increment immediately
        post.likes = post.likes + 1;
        this.applyFilter();
        this.cdRef.detectChanges();
        this.awardXP(ForumService.XP_REWARDS.reaction, 'reaction');
        this.forumService.likePost(post.id).subscribe({
          next: updatePostInList,
          error: revertOnError
        });
      }
      // If switching reactions, no backend call — like count stays the same
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
    this.http.get<any>(`https://tenor.googleapis.com/v2/featured?key=${this.TENOR_KEY}&limit=20&contentfilter=high&media_filter=gif,tinygif`).subscribe({
      next: (res) => {
        this.gifResults = (res.results || []).map((g: any) => ({
          url: g.media_formats?.gif?.url || g.media_formats?.mediumgif?.url || '',
          preview: g.media_formats?.tinygif?.url || g.media_formats?.nanogif?.url || ''
        })).filter((g: any) => g.url);
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
      this.http.get<any>(`https://tenor.googleapis.com/v2/search?key=${this.TENOR_KEY}&q=${encodeURIComponent(this.gifSearchQuery)}&limit=20&contentfilter=high&media_filter=gif,tinygif`).subscribe({
        next: (res) => {
          this.gifResults = (res.results || []).map((g: any) => ({
            url: g.media_formats?.gif?.url || g.media_formats?.mediumgif?.url || '',
            preview: g.media_formats?.tinygif?.url || g.media_formats?.nanogif?.url || ''
          })).filter((g: any) => g.url);
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
        this.cdRef.detectChanges();
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
        this.cdRef.detectChanges();
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
        this.cdRef.detectChanges();
      }
    });
  }

  markAllNotifsRead(): void {
    if (!this.user) return;
    this.forumService.markAllNotificationsRead(this.user.id).subscribe({
      next: () => {
        this.tagNotifications.forEach((n: any) => n.isRead = true);
        this.unreadNotifCount = 0;
        this.cdRef.detectChanges();
      }
    });
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

  // ── Facebook-style Share (creates a new post embedding the original) ──

  openShareModal(post: ForumPost): void {
    this.sharingPost = post;
    this.showShareModal = true;
    this.shareMessage = '';
    this.shareSearchQuery = '';
    this.showShareEmojiPicker = false;
    this.openMenuPostId = null;
    this.loadShareFriends();
  }

  closeShareModal(): void {
    this.showShareModal = false;
    this.sharingPost = null;
    this.shareMessage = '';
    this.shareSearchQuery = '';
    this.showShareEmojiPicker = false;
  }

  private loadShareFriends(): void {
    if (!this.user) return;
    this.shareLoading = true;
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
        this.cdRef.detectChanges();
      },
      error: () => { this.shareLoading = false; }
    });
  }

  sendPostToFriend(friend: Friend): void {
    if (!this.user || !this.sharingPost) return;
    const msg: ChatMessage = {
      senderId: this.user.id,
      senderName: this.user.name,
      senderAvatar: (this.user as any).avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + this.user.name,
      receiverId: friend.id,
      receiverName: friend.name,
      content: this.sharingPost.content?.substring(0, 200) || 'Shared a post',
      messageType: 'SHARED_POST',
      sharedPostId: this.sharingPost.id,
      isRead: false
    };
    this.friendsService.sendMessage(msg).subscribe({
      next: () => {
        this.addNotification(`Post sent to ${friend.name}!`, 'success');
        this.closeShareModal();
      },
      error: () => this.addNotification('Failed to send post', 'warning')
    });
  }

  get filteredShareFriends(): Friend[] {
    if (!this.shareSearchQuery.trim()) return this.shareFriends;
    const q = this.shareSearchQuery.toLowerCase();
    return this.shareFriends.filter(f => f.name.toLowerCase().includes(q));
  }

  toggleShareEmojiPicker(event: Event): void {
    event.stopPropagation();
    this.showShareEmojiPicker = !this.showShareEmojiPicker;
  }

  insertShareEmoji(emoji: string, event: Event): void {
    event.stopPropagation();
    this.shareMessage += emoji;
  }

  onShareMessageInput(): void {
    const text = this.shareMessage;
    const lastAtIndex = text.lastIndexOf('@');
    if (lastAtIndex === -1 || lastAtIndex === text.length - 1) { this.shareShowUserSuggestions = false; return; }
    const afterAt = text.substring(lastAtIndex + 1);
    if (afterAt.includes(' ')) { this.shareShowUserSuggestions = false; return; }
    const query = afterAt.toLowerCase();
    this.shareUserSuggestions = this.allKnownUsers
      .filter(u => u.name.toLowerCase().includes(query) || u.username.toLowerCase().includes(query))
      .slice(0, 5);
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
      content,
      author: this.user.name,
      username: '@' + this.user.name.replace(/\s+/g, '_').toLowerCase(),
      avatar: (this.user as any).avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + this.user.name,
      userId: this.user.id,
      sharedPostId: this.sharingPost.id,
      comments: 0,
      reposts: 0,
      likes: 0
    };
    this.forumService.createPost(post).subscribe({
      next: (res) => {
        this.sendTagNotifications(content, res);
        this.forumService.repostPost(this.sharingPost!.id).subscribe();
        this.addNotification('Post shared to your feed!', 'success');
        this.closeShareModal();
        this.loadPosts();
      },
      error: () => { this.addNotification('Failed to share post', 'warning'); }
    });
  }

  getSharedPost(post: ForumPostWithShared): ForumPost | undefined {
    if (!post.sharedPostId) return undefined;
    if (post.sharedPost) return post.sharedPost;
    return this.allPosts.find(p => p.id === post.sharedPostId);
  }

  // ── Resolve shared posts for display ──

  private resolveSharedPosts(): void {
    for (const post of this.posts as ForumPostWithShared[]) {
      if (post.sharedPostId && !post.sharedPost) {
        post.sharedPost = this.allPosts.find(p => p.id === post.sharedPostId);
      }
    }
  }

  // ── Notification → Post scroll & highlight ──

  onNotifClick(notif: any): void {
    this.markNotifRead(notif);
    this.showNotifPanel = false;

    if (notif.type === 'FRIEND_REQUEST') {
      this.openProfileFromNotif(notif);
      return;
    }

    if (notif.postId) {
      this.scrollToPost(notif.postId);
    }
  }

  scrollToPost(postId: number): void {
    this.selectedTopicId = null;
    this.searchQuery = '';
    this.applyFilter();
    this.highlightedPostId = postId;
    if (this.highlightTimeout) clearTimeout(this.highlightTimeout);
    this.highlightTimeout = setTimeout(() => { this.highlightedPostId = null; }, 3000);
    setTimeout(() => {
      const el = document.getElementById('post-' + postId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  }

  // ── Friend Request Notifications ──

  private loadPendingFriendRequests(): void {
    if (!this.user) return;
    this.friendsService.getPendingRequests(this.user.id).subscribe({
      next: (reqs) => {
        this.pendingFriendRequests = reqs.map(r => ({
          id: r.id!, friendshipId: r.id!, name: r.userName, avatar: r.userAvatar, userId: r.userId, createdAt: r.createdAt || ''
        }));
        // Inject friend request notifications into tagNotifications
        for (const req of this.pendingFriendRequests) {
          const exists = this.tagNotifications.find((n: any) => n.type === 'FRIEND_REQUEST' && n.fromUserId === req.userId);
          if (!exists) {
            this.tagNotifications.unshift({
              id: -req.id,
              userId: this.user!.id,
              postId: null,
              fromUserId: req.userId,
              fromUsername: req.name,
              fromAvatar: req.avatar,
              message: req.name + ' sent you a friend request',
              type: 'FRIEND_REQUEST',
              isRead: false,
              createdAt: req.createdAt,
              friendshipId: req.friendshipId
            });
          }
        }
        this.unreadNotifCount = this.tagNotifications.filter((n: any) => !n.isRead).length;
        this.cdRef.detectChanges();
      }
    });
  }

  // ── View Profile Modal ──

  openProfileFromNotif(notif: any): void {
    if (!notif.fromUserId) return;
    this.showProfileModal = true;
    this.profileLoading = true;
    this.profileUser = null;
    this.profileUserPosts = [];
    this.profileFriendRequest = notif.friendshipId
      ? this.pendingFriendRequests.find(r => r.friendshipId === notif.friendshipId) || null
      : null;

    this.userService.getUserById(notif.fromUserId).subscribe({
      next: (user) => {
        this.profileUser = user;
        this.forumService.getPostsByUser(notif.fromUserId).subscribe({
          next: (posts) => {
            this.profileUserPosts = posts.filter(p => !p.parentPostId) as ForumPostWithShared[];
            // Resolve shared posts
            for (const post of this.profileUserPosts) {
              if (post.sharedPostId) {
                const orig = this.allPosts.find(p => p.id === post.sharedPostId);
                if (orig) post.sharedPost = orig;
              }
            }
            this.profileLoading = false;
          },
          error: () => { this.profileLoading = false; }
        });
      },
      error: () => { this.profileLoading = false; }
    });
  }

  openProfileByUserId(userId: number): void {
    this.showProfileModal = true;
    this.profileLoading = true;
    this.profileUser = null;
    this.profileUserPosts = [];
    this.profileFriendRequest = null;
    this.openMenuPostId = null;

    this.userService.getUserById(userId).subscribe({
      next: (user) => {
        this.profileUser = user;
        this.forumService.getPostsByUser(userId).subscribe({
          next: (posts) => {
            this.profileUserPosts = posts.filter(p => !p.parentPostId) as ForumPostWithShared[];
            for (const post of this.profileUserPosts) {
              if (post.sharedPostId) {
                const orig = this.allPosts.find(p => p.id === post.sharedPostId);
                if (orig) post.sharedPost = orig;
              }
            }
            this.profileLoading = false;
          },
          error: () => { this.profileLoading = false; }
        });
      },
      error: () => { this.profileLoading = false; }
    });
  }

  closeProfileModal(): void {
    this.showProfileModal = false;
    this.profileUser = null;
    this.profileUserPosts = [];
    this.profileFriendRequest = null;
  }

  acceptFriendRequestFromProfile(req: FriendRequest): void {
    this.friendsService.acceptFriendRequest(req.friendshipId).subscribe({
      next: () => {
        this.addNotification(req.name + ' is now your friend!', 'success');
        this.profileFriendRequest = null;
        this.pendingFriendRequests = this.pendingFriendRequests.filter(r => r.id !== req.id);
        this.tagNotifications = this.tagNotifications.filter((n: any) => !(n.type === 'FRIEND_REQUEST' && n.friendshipId === req.friendshipId));
        this.unreadNotifCount = this.tagNotifications.filter((n: any) => !n.isRead).length;
        this.friendStatuses.set(req.userId, 'friend');
        this.cdRef.detectChanges();
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
        this.cdRef.detectChanges();
      },
      error: () => { this.addNotification('Failed to decline request', 'warning'); }
    });
  }

  // ── XP & Badges ──

  private loadXPData(): void {
    if (!this.user) return;
    this.userXP = this.forumService.getUserXP(this.user.id);
  }

  awardXP(amount: number, action: 'post' | 'comment' | 'reaction' | 'wotd_bonus'): void {
    if (!this.user) return;
    const { xpData, newBadges } = this.forumService.addXP(this.user.id, amount, action);
    const oldLevel = this.userXP.level;
    this.userXP = xpData;
    this.xpGainAnimation = { amount, action };
    setTimeout(() => this.xpGainAnimation = null, 1500);
    if (xpData.level > oldLevel) {
      this.addNotification(`Level Up! You're now level ${xpData.level}! 🎉`, 'success');
    }
    for (const badge of newBadges) {
      this.showBadgeUnlock = badge;
      this.addNotification(`Badge Unlocked: ${badge.icon} ${badge.name}!`, 'success');
      setTimeout(() => this.showBadgeUnlock = null, 3000);
    }
    // Record streak activity
    const { streak, isNewDay } = this.forumService.recordActivity(this.user.id);
    if (isNewDay && streak.currentStreak > 1) {
      this.userStreak = streak;
      this.showStreakAnimation = true;
      setTimeout(() => this.showStreakAnimation = false, 2000);
    } else {
      this.userStreak = streak;
    }
  }

  getXPProgress(): number {
    return (this.userXP.xp % 100);
  }

  getXPToNextLevel(): number {
    return 100 - (this.userXP.xp % 100);
  }

  getUserBadges(): ForumBadge[] {
    return this.userXP.badges.map(id => this.forumService.getBadgeById(id)).filter(b => !!b) as ForumBadge[];
  }

  getLockedBadges(): ForumBadge[] {
    return ForumService.BADGES.filter(b => !this.userXP.badges.includes(b.id));
  }

  // ── Streak ──

  private loadStreakData(): void {
    if (!this.user) return;
    this.userStreak = this.forumService.getUserStreak(this.user.id);
  }

  getStreakFlameSize(): string {
    if (this.userStreak.currentStreak >= 30) return 'text-4xl';
    if (this.userStreak.currentStreak >= 7) return 'text-3xl';
    if (this.userStreak.currentStreak >= 3) return 'text-2xl';
    return 'text-xl';
  }

  // ── Word of the Day ──

  private loadWordOfTheDay(): void {
    this.wordOfTheDay = this.forumService.getWordOfTheDay();
    if (this.user) this.wotdUsedToday = this.forumService.hasUsedWotdToday(this.user.id);
  }

  private checkWotdInContent(content: string): void {
    if (!this.user || this.wotdUsedToday) return;
    if (content.toLowerCase().includes(this.wordOfTheDay.word.toLowerCase())) {
      this.forumService.markWotdUsed(this.user.id);
      this.wotdUsedToday = true;
      this.showWotdCelebration = true;
      this.awardXP(ForumService.XP_REWARDS.wotd_bonus, 'wotd_bonus');
      this.addNotification(`Word of the Day bonus! +${ForumService.XP_REWARDS.wotd_bonus} XP for using "${this.wordOfTheDay.word}" 🎯`, 'success');
      setTimeout(() => this.showWotdCelebration = false, 3000);
    }
  }

  insertWotd(): void {
    this.newPostContent += (this.newPostContent ? ' ' : '') + this.wordOfTheDay.word;
    this.postError = '';
  }

  // ── Translation ──

  toggleTranslation(post: ForumPost): void {
    if (this.showTranslation.has(post.id)) {
      this.showTranslation.delete(post.id);
      return;
    }
    if (this.translatedPosts.has(post.id)) {
      this.showTranslation.add(post.id);
      return;
    }
    this.translatingPostId = post.id;
    const cleanContent = post.content.replace(/\[LOC:.+?\]/g, '').trim();
    this.forumService.translateText(cleanContent).subscribe({
      next: (translated) => {
        this.translatedPosts.set(post.id, translated);
        this.showTranslation.add(post.id);
        this.translatingPostId = null;
      },
      error: () => { this.translatingPostId = null; }
    });
  }

  getTranslation(postId: number): string | undefined {
    return this.translatedPosts.get(postId);
  }

  isShowingTranslation(postId: number): boolean {
    return this.showTranslation.has(postId);
  }

  isTranslating(postId: number): boolean {
    return this.translatingPostId === postId;
  }

  // ── Badge Equip ──

  private loadEquippedBadge(): void {
    if (!this.user) return;
    this.equippedBadgeId = this.forumService.getEquippedBadge(this.user.id);
  }

  toggleEquipBadge(badge: ForumBadge): void {
    if (!this.user) return;
    if (this.equippedBadgeId === badge.id) {
      this.forumService.unequipBadge(this.user.id);
      this.equippedBadgeId = null;
      this.addNotification('Badge unequipped', 'info');
    } else {
      this.forumService.equipBadge(this.user.id, badge.id);
      this.equippedBadgeId = badge.id;
      this.addNotification(`Equipped badge: ${badge.icon} ${badge.name}!`, 'success');
    }
  }

  getEquippedBadge(): ForumBadge | null {
    if (!this.equippedBadgeId) return null;
    return this.forumService.getBadgeById(this.equippedBadgeId) || null;
  }

  getUserEquippedBadgeIcon(userId: number | undefined): string | null {
    if (!userId) return null;
    const badgeId = this.forumService.getEquippedBadge(userId);
    if (!badgeId) return null;
    const badge = this.forumService.getBadgeById(badgeId);
    return badge ? badge.icon : null;
  }

  // ── Friend Suggestions (Left Sidebar) ──

  private loadFriendSuggestions(): void {
    if (!this.user) return;
    this.friendsService.getFriends(this.user.id).subscribe({
      next: (friendships) => {
        const friendIds = new Set(friendships.map(f => f.friendId));
        friendIds.add(this.user!.id);
        this.userService.getAllUsers().subscribe({
          next: (users) => {
            this.friendSuggestions = users
              .filter(u => !friendIds.has(u.id))
              .slice(0, 5)
              .map(u => ({
                id: u.id,
                name: u.name,
                avatar: u.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + u.name,
                username: '@' + u.name.replace(/\s+/g, '_').toLowerCase()
              }));
          }
        });
      }
    });
  }

  sendFriendRequestFromSuggestion(suggestion: { id: number; name: string; avatar: string }): void {
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
        this.addNotification(`Friend request sent to ${suggestion.name}!`, 'success');
      },
      error: () => {
        this.addNotification('Failed to send friend request', 'warning');
      }
    });
  }
}
