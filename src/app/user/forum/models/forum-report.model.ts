export interface ForumReport {
  id?: number;
  postId: number;
  postContent?: string;
  reporterId: number;
  reporterName: string;
  reporterEmail?: string;
  reportedUserId: number;
  reportedUserName: string;
  reason: string;
  description?: string;
  status?: 'PENDING' | 'INVESTIGATING' | 'RESOLVED' | 'DISMISSED';
  adminNote?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type ReportReason =
  | 'Inappropriate Language'
  | 'Spam'
  | 'Harassment'
  | 'Misinformation'
  | 'Hate Speech'
  | 'Other';

export const REPORT_REASONS: ReportReason[] = [
  'Inappropriate Language',
  'Spam',
  'Harassment',
  'Misinformation',
  'Hate Speech',
  'Other'
];
