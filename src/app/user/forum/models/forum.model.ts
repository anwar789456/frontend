export interface ForumPost {
  id: number;
  topicId?: number;
  userId?: number;
  author: string;
  username: string;
  avatar: string;
  time: string;
  content: string;
  image?: string;
  video?: string;
  location?: string;
  isEdited?: boolean;
  parentPostId?: number;
  sharedPostId?: number;
  comments: number;
  reposts: number;
  likes: number;
  createdAt?: string;
  updatedAt?: string;
}

// Resolved shared post for display (loaded client-side)
export interface ForumPostWithShared extends ForumPost {
  sharedPost?: ForumPost;
}
// export interface TrendingTopic {
//   id: number;
//   forumId?: number;
//   category: string;
//   title: string;
//   posts: string;
//   isPinned?: boolean;
//   viewCount?: number;
//   postCount?: number;
//   createdAt?: string;
//   updateAt?: string;
// }
export interface TrendingTopic {
  id?: number;
  category?: string;
  title?: string;
  isPinned?: boolean;
  viewCount?: number;
  postCount?: number;
  createdAt?: string;
  updatedAt?: string;
}
// export interface TopContributor {
//   id: number;
//   name: string;
//   username: string;
//   avatar: string;
// }

export interface ForumBadge {
  id: string;
  name: string;
  icon: string;
  description: string;
  requirement: number;
  type: 'posts' | 'comments' | 'likes_given' | 'streak' | 'wotd';
}

export interface UserForumXP {
  userId: number;
  xp: number;
  level: number;
  postsCount: number;
  commentsCount: number;
  likesGivenCount: number;
  wotdCount: number;
  badges: string[];
}

export interface UserStreak {
  userId: number;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string;
}

export interface WordOfTheDay {
  word: string;
  definition: string;
  example: string;
  date: string;
}
