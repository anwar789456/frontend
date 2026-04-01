// Backend Friendship entity
export interface Friendship {
  id?: number;
  userId: number;
  userName: string;
  userAvatar: string;
  friendId: number;
  friendName: string;
  friendAvatar: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'BLOCKED';
  createdAt?: string;
  updatedAt?: string;
}

// Frontend display model
export interface Friend {
  id: number;
  friendshipId: number;
  name: string;
  avatar: string;
  lastMessage: string;
  lastMessageTime: string;
  online: boolean;
  lastSeen?: string;
  unreadCount: number;
}

export interface FriendRequest {
  id: number;
  friendshipId: number;
  name: string;
  avatar: string;
  userId: number;
  createdAt: string;
}

// Backend ChatMessage entity
export interface ChatMessage {
  id?: number;
  senderId: number;
  senderName: string;
  senderAvatar: string;
  receiverId: number;
  receiverName: string;
  content: string;
  messageType: 'TEXT' | 'IMAGE' | 'GIF' | 'EMOJI' | 'SHARED_POST' | 'VOICE';
  imageUrl?: string;
  gifUrl?: string;
  sharedPostId?: number;
  replyToId?: number;
  replyToContent?: string;
  replyToSenderName?: string;
  reactions?: string;
  deletedForUsers?: string;
  isRead?: boolean;
  readAt?: string;
  voiceUrl?: string;
  voiceDuration?: number;
  isForwarded?: boolean;
  forwardedFromName?: string;
  createdAt?: string;
}

// Frontend display message
export interface DisplayMessage {
  id: number;
  senderId: number;
  content: string;
  messageType: 'TEXT' | 'IMAGE' | 'GIF' | 'EMOJI' | 'SHARED_POST' | 'VOICE';
  imageUrl?: string;
  gifUrl?: string;
  sharedPostId?: number;
  replyToId?: number;
  replyToContent?: string;
  replyToSenderName?: string;
  reactions?: string;
  translatedContent?: string;
  showTranslation?: boolean;
  time: string;
  isMine: boolean;
  senderAvatar: string;
  senderName: string;
  isRead?: boolean;
  readAt?: string;
  voiceUrl?: string;
  voiceDuration?: number;
  isForwarded?: boolean;
  forwardedFromName?: string;
}

export interface UserStatus {
  userId: number;
  userName: string;
  userAvatar: string;
  isOnline: boolean;
  lastSeen?: string;
  typingToUserId?: number;
  typingStartedAt?: string;
}
