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
  friendshipId?: number;
  name: string;
  avatar: string;
  lastMessage?: string;
  lastMessageTime?: string;
  time?: string;
  online: boolean;
  lastSeen?: string;
  unreadCount?: number;
  status?: string;
}

export interface FriendRequest {
  id: number;
  friendshipId?: number;
  name: string;
  avatar: string;
  userId?: number;
  createdAt?: string;
  info?: string;
}

// Backend ChatMessage entity
export interface ChatMessage {
  id?: number;
  senderId: number;
  senderName?: string;
  senderAvatar?: string;
  receiverId?: number;
  receiverName?: string;
  content?: string;
  messageType?: 'TEXT' | 'IMAGE' | 'GIF' | 'EMOJI' | 'SHARED_POST';
  imageUrl?: string;
  gifUrl?: string;
  sharedPostId?: number;
  isRead?: boolean;
  createdAt?: string;
  text?: string;
  time?: string;
  isMine?: boolean;
}

// Frontend display message
export interface DisplayMessage {
  id: number;
  senderId: number;
  content: string;
  messageType: 'TEXT' | 'IMAGE' | 'GIF' | 'EMOJI' | 'SHARED_POST';
  imageUrl?: string;
  gifUrl?: string;
  sharedPostId?: number;
  time: string;
  isMine: boolean;
  senderAvatar: string;
  senderName: string;
}

export interface UserStatus {
  userId: number;
  userName: string;
  userAvatar: string;
  isOnline: boolean;
  lastSeen?: string;
}
