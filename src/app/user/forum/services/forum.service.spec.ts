import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ForumService } from './forum.service';
import { ForumPost, TrendingTopic, ForumBadge, UserForumXP, UserStreak, WordOfTheDay } from '../models/forum.model';
import { ForumReport } from '../models/forum-report.model';

describe('ForumService', () => {
  let service: ForumService;
  let httpMock: HttpTestingController;
  const apiUrl = '/api/forums';

  const mockPost: ForumPost = {
    id: 1, author: 'John', username: 'john_doe', avatar: 'avatar.png',
    time: '2h ago', content: 'Hello world', comments: 5, reposts: 2, likes: 10
  };

  const mockTopic: TrendingTopic = {
    id: 1, category: 'Grammar', title: 'English Grammar Tips',
    isPinned: false, viewCount: 100, postCount: 10
  };

  const mockReport: ForumReport = {
    postId: 1, reporterId: 10, reporterName: 'Jane',
    reportedUserId: 20, reportedUserName: 'Spammer', reason: 'Spam'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), ForumService]
    });
    service = TestBed.inject(ForumService);
    httpMock = TestBed.inject(HttpTestingController);
    localStorage.clear();
  });

  afterEach(() => { httpMock.verify(); localStorage.clear(); });

  it('should be created', () => { expect(service).toBeTruthy(); });

  // ── Forum Posts CRUD ──

  it('should create a post', () => {
    service.createPost(mockPost).subscribe(p => expect(p.id).toBe(1));
    const req = httpMock.expectOne(`${apiUrl}/create-forum`);
    expect(req.request.method).toBe('POST');
    req.flush(mockPost);
  });

  it('should get all posts', () => {
    service.getAllPosts().subscribe(p => expect(p.length).toBe(2));
    httpMock.expectOne(`${apiUrl}/get-all-forums`).flush([mockPost, { ...mockPost, id: 2 }]);
  });

  it('should get post by id', () => {
    service.getPostById(1).subscribe(p => expect(p.content).toBe('Hello world'));
    httpMock.expectOne(`${apiUrl}/get-forum-by-id/1`).flush(mockPost);
  });

  it('should get top-level posts', () => {
    service.getTopLevelPosts().subscribe(p => expect(p.length).toBe(1));
    httpMock.expectOne(`${apiUrl}/get-top-level-forums`).flush([mockPost]);
  });

  it('should get posts by topic', () => {
    service.getPostsByTopic(1).subscribe(p => expect(p.length).toBe(1));
    httpMock.expectOne(`${apiUrl}/get-forums-by-topic/1`).flush([mockPost]);
  });

  it('should get posts by user', () => {
    service.getPostsByUser(10).subscribe(p => expect(p.length).toBe(1));
    httpMock.expectOne(`${apiUrl}/get-forums-by-user/10`).flush([mockPost]);
  });

  it('should get replies', () => {
    service.getReplies(1).subscribe(r => expect(r.length).toBe(1));
    httpMock.expectOne(`${apiUrl}/get-replies/1`).flush([{ ...mockPost, parentPostId: 1 }]);
  });

  it('should update a post', () => {
    const updated = { ...mockPost, content: 'Updated' };
    service.updatePost(1, updated).subscribe(p => expect(p.content).toBe('Updated'));
    const req = httpMock.expectOne(`${apiUrl}/update-forum/1`);
    expect(req.request.method).toBe('PUT');
    req.flush(updated);
  });

  it('should delete a post', () => {
    service.deletePost(1).subscribe();
    const req = httpMock.expectOne(`${apiUrl}/delete-forum/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('should like a post', () => {
    service.likePost(1).subscribe(p => expect(p.likes).toBe(11));
    httpMock.expectOne(`${apiUrl}/like-forum/1`).flush({ ...mockPost, likes: 11 });
  });

  it('should unlike a post', () => {
    service.unlikePost(1).subscribe(p => expect(p.likes).toBe(9));
    httpMock.expectOne(`${apiUrl}/unlike-forum/1`).flush({ ...mockPost, likes: 9 });
  });

  it('should repost', () => {
    service.repostPost(1).subscribe(p => expect(p.reposts).toBe(3));
    httpMock.expectOne(`${apiUrl}/repost-forum/1`).flush({ ...mockPost, reposts: 3 });
  });

  // ── Topics ──

  it('should create a topic', () => {
    service.createTopic(mockTopic).subscribe(t => expect(t.id).toBe(1));
    httpMock.expectOne(`${apiUrl}/create-topic`).flush(mockTopic);
  });

  it('should get all topics', () => {
    service.getAllTopics().subscribe(t => expect(t.length).toBe(1));
    httpMock.expectOne(`${apiUrl}/get-all-topics`).flush([mockTopic]);
  });

  it('should get trending topics', () => {
    service.getTrendingTopics().subscribe(t => expect(t.length).toBe(1));
    httpMock.expectOne(`${apiUrl}/get-trending-topics`).flush([mockTopic]);
  });

  it('should get pinned topics', () => {
    service.getPinnedTopics().subscribe(t => expect(t[0].isPinned).toBe(true));
    httpMock.expectOne(`${apiUrl}/get-pinned-topics`).flush([{ ...mockTopic, isPinned: true }]);
  });

  it('should delete a topic', () => {
    service.deleteTopic(1).subscribe();
    httpMock.expectOne(`${apiUrl}/delete-topic/1`).flush(null);
  });

  it('should increment view count', () => {
    service.incrementTopicViewCount(1).subscribe(t => expect(t.viewCount).toBe(101));
    httpMock.expectOne(`${apiUrl}/increment-topic-view-count/1`).flush({ ...mockTopic, viewCount: 101 });
  });

  // ── Reports ──

  it('should create a report', () => {
    service.createReport(mockReport).subscribe(r => expect(r.reason).toBe('Spam'));
    httpMock.expectOne(`${apiUrl}/create-report`).flush(mockReport);
  });

  it('should get all reports', () => {
    service.getAllReports().subscribe(r => expect(r.length).toBe(1));
    httpMock.expectOne(`${apiUrl}/get-all-reports`).flush([mockReport]);
  });

  it('should update report status', () => {
    service.updateReportStatus(1, 'RESOLVED', 'Fixed').subscribe(r => expect(r.status).toBe('RESOLVED'));
    const req = httpMock.expectOne(`${apiUrl}/update-report-status/1`);
    expect(req.request.body).toEqual({ status: 'RESOLVED', adminNote: 'Fixed' });
    req.flush({ ...mockReport, status: 'RESOLVED' });
  });

  // ── Notifications ──

  it('should get unread count', () => {
    service.getUnreadCount(1).subscribe(r => expect(r.count).toBe(5));
    httpMock.expectOne(`${apiUrl}/get-unread-count/1`).flush({ count: 5 });
  });

  it('should mark all notifications read', () => {
    service.markAllNotificationsRead(1).subscribe();
    httpMock.expectOne(`${apiUrl}/mark-all-notifications-read/1`).flush(null);
  });

  // ── Save & Favorite (localStorage) ──

  it('should toggle save post', () => {
    expect(service.toggleSavePost(1, 100)).toBe(true); // saved
    expect(service.getSavedPostIds(1).has(100)).toBe(true);
    expect(service.toggleSavePost(1, 100)).toBe(false); // unsaved
    expect(service.getSavedPostIds(1).has(100)).toBe(false);
  });

  it('should toggle favorite post', () => {
    expect(service.toggleFavoritePost(1, 200)).toBe(true);
    expect(service.getFavoritePostIds(1).has(200)).toBe(true);
    expect(service.toggleFavoritePost(1, 200)).toBe(false);
    expect(service.getFavoritePostIds(1).has(200)).toBe(false);
  });

  // ── XP & Badges ──

  it('should return default XP for new user', () => {
    const xp = service.getUserXP(999);
    expect(xp.xp).toBe(0);
    expect(xp.level).toBe(1);
    expect(xp.badges).toEqual([]);
  });

  it('should add XP for a post action', () => {
    const { xpData } = service.addXP(1, ForumService.XP_REWARDS.post, 'post');
    expect(xpData.xp).toBe(10);
    expect(xpData.postsCount).toBe(1);
  });

  it('should award first_post badge after 1 post', () => {
    const { newBadges } = service.addXP(1, ForumService.XP_REWARDS.post, 'post');
    expect(newBadges.some(b => b.id === 'first_post')).toBe(true);
  });

  it('should calculate level from XP', () => {
    // Add 250 XP → level should be 3
    service.addXP(2, 250, 'post');
    const xp = service.getUserXP(2);
    expect(xp.level).toBe(3); // floor(250/100)+1
  });

  it('should not award duplicate badges', () => {
    service.addXP(3, 10, 'post'); // first post → badge
    const { newBadges } = service.addXP(3, 10, 'post'); // second post → no new badge for first_post
    expect(newBadges.some(b => b.id === 'first_post')).toBe(false);
  });

  // ── Badge Lookup ──

  it('should find badge by id', () => {
    const badge = service.getBadgeById('first_post');
    expect(badge).toBeDefined();
    expect(badge!.name).toBe('First Steps');
  });

  it('should return undefined for unknown badge', () => {
    expect(service.getBadgeById('nonexistent')).toBeUndefined();
  });

  // ── Streak Tracker ──

  it('should return default streak for new user', () => {
    const streak = service.getUserStreak(999);
    expect(streak.currentStreak).toBe(0);
    expect(streak.longestStreak).toBe(0);
  });

  it('should start a new streak on first activity', () => {
    const { streak, isNewDay } = service.recordActivity(1);
    expect(isNewDay).toBe(true);
    expect(streak.currentStreak).toBe(1);
  });

  it('should not count same day twice', () => {
    service.recordActivity(1);
    const { isNewDay } = service.recordActivity(1);
    expect(isNewDay).toBe(false);
  });

  // ── Badge Equip ──

  it('should equip and unequip badge', () => {
    service.equipBadge(1, 'first_post');
    expect(service.getEquippedBadge(1)).toBe('first_post');
    service.unequipBadge(1);
    expect(service.getEquippedBadge(1)).toBeNull();
  });

  // ── Word of the Day ──

  it('should return a word of the day', () => {
    const wotd = service.getWordOfTheDay();
    expect(wotd.word).toBeTruthy();
    expect(wotd.definition).toBeTruthy();
    expect(wotd.example).toBeTruthy();
    expect(wotd.date).toBeTruthy();
  });

  it('should track WOTD usage', () => {
    expect(service.hasUsedWotdToday(1)).toBe(false);
    service.markWotdUsed(1);
    expect(service.hasUsedWotdToday(1)).toBe(true);
  });

  // ── Moderation ──

  it('should increment moderation warnings', () => {
    expect(service.getModerationWarningCount(1)).toBe(0);
    expect(service.incrementModerationWarning(1)).toBe(1);
    expect(service.incrementModerationWarning(1)).toBe(2);
  });

  it('should call moderate content API', () => {
    service.moderateContent('bad word').subscribe(r => expect(r.isSafe).toBe(false));
    const req = httpMock.expectOne(`${apiUrl}/moderate-content`);
    expect(req.request.body).toEqual({ content: 'bad word' });
    req.flush({ isSafe: false, reason: 'Profanity detected' });
  });

  // ── New Topic Subject ──

  it('should trigger new topic observable', () => {
    let triggered = false;
    service.newTopic$.subscribe(() => { triggered = true; });
    service.triggerNewTopic();
    expect(triggered).toBe(true);
  });

  // ── Static Constants ──

  it('should have 12 badges defined', () => {
    expect(ForumService.BADGES.length).toBe(12);
  });

  it('should have correct XP rewards', () => {
    expect(ForumService.XP_REWARDS.post).toBe(10);
    expect(ForumService.XP_REWARDS.comment).toBe(5);
    expect(ForumService.XP_REWARDS.reaction).toBe(2);
    expect(ForumService.XP_REWARDS.wotd_bonus).toBe(15);
  });
});
