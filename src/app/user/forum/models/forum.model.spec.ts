import { ForumPost, ForumPostWithShared, TrendingTopic, ForumBadge, UserForumXP, UserStreak, WordOfTheDay } from './forum.model';
import { ForumReport, ReportReason, REPORT_REASONS } from './forum-report.model';

describe('Forum Models', () => {

  describe('ForumPost', () => {
    it('should create a valid post', () => {
      const post: ForumPost = {
        id: 1, author: 'John', username: 'john', avatar: 'a.png',
        time: '1h', content: 'Hello', comments: 0, reposts: 0, likes: 0
      };
      expect(post.id).toBe(1);
      expect(post.content).toBe('Hello');
    });

    it('should support optional media fields', () => {
      const post: ForumPost = {
        id: 1, author: 'A', username: 'a', avatar: '', time: '', content: '',
        comments: 0, reposts: 0, likes: 0,
        image: 'img.jpg', video: 'vid.mp4', location: 'Tunis'
      };
      expect(post.image).toBe('img.jpg');
      expect(post.video).toBe('vid.mp4');
    });
  });

  describe('ForumPostWithShared', () => {
    it('should include shared post', () => {
      const shared: ForumPost = {
        id: 2, author: 'B', username: 'b', avatar: '', time: '', content: 'Original',
        comments: 0, reposts: 0, likes: 0
      };
      const post: ForumPostWithShared = {
        id: 1, author: 'A', username: 'a', avatar: '', time: '', content: 'Repost',
        comments: 0, reposts: 1, likes: 0, sharedPostId: 2, sharedPost: shared
      };
      expect(post.sharedPost?.content).toBe('Original');
    });
  });

  describe('TrendingTopic', () => {
    it('should create a valid topic', () => {
      const t: TrendingTopic = { id: 1, category: 'Grammar', title: 'Tips', isPinned: true, viewCount: 50, postCount: 5 };
      expect(t.isPinned).toBe(true);
    });
  });

  describe('ForumBadge', () => {
    it('should support all badge types', () => {
      const types: ForumBadge['type'][] = ['posts', 'comments', 'likes_given', 'streak', 'wotd'];
      types.forEach(t => {
        const b: ForumBadge = { id: 'test', name: 'Test', icon: '🏅', description: 'D', requirement: 1, type: t };
        expect(b.type).toBe(t);
      });
    });
  });

  describe('UserForumXP', () => {
    it('should create default XP state', () => {
      const xp: UserForumXP = { userId: 1, xp: 0, level: 1, postsCount: 0, commentsCount: 0, likesGivenCount: 0, wotdCount: 0, badges: [] };
      expect(xp.level).toBe(1);
      expect(xp.badges).toEqual([]);
    });
  });

  describe('UserStreak', () => {
    it('should create default streak', () => {
      const s: UserStreak = { userId: 1, currentStreak: 0, longestStreak: 0, lastActiveDate: '' };
      expect(s.currentStreak).toBe(0);
    });
  });

  describe('WordOfTheDay', () => {
    it('should have all required fields', () => {
      const w: WordOfTheDay = { word: 'adventure', definition: 'An exciting experience', example: 'Going to zoo', date: '2026-04-29' };
      expect(w.word).toBe('adventure');
    });
  });

  describe('ForumReport', () => {
    it('should create a valid report', () => {
      const r: ForumReport = { postId: 1, reporterId: 10, reporterName: 'J', reportedUserId: 20, reportedUserName: 'S', reason: 'Spam' };
      expect(r.reason).toBe('Spam');
    });

    it('should support all report statuses', () => {
      const statuses: ForumReport['status'][] = ['PENDING', 'INVESTIGATING', 'RESOLVED', 'DISMISSED'];
      statuses.forEach(s => {
        const r: ForumReport = { postId: 1, reporterId: 1, reporterName: '', reportedUserId: 2, reportedUserName: '', reason: '', status: s };
        expect(r.status).toBe(s);
      });
    });
  });

  describe('REPORT_REASONS', () => {
    it('should have 6 predefined reasons', () => {
      expect(REPORT_REASONS.length).toBe(6);
    });

    it('should include expected reasons', () => {
      expect(REPORT_REASONS).toContain('Spam');
      expect(REPORT_REASONS).toContain('Harassment');
      expect(REPORT_REASONS).toContain('Other');
    });
  });
});
