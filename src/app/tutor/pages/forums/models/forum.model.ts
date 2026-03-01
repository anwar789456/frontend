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
  isEdited?: boolean;
  parentPostId?: number;
  comments: number;
  reposts: number;
  likes: number;
  createdAt?: string;
  updateAt?: string;
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
