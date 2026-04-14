export type EventStatus = 'DRAFT' | 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';

export type TargetLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ALL_LEVELS';

export interface Event {
  id: number;

  // Core Info
  title: string;
  description: string;
  image?: string;
  category?: string;
  tags?: string[];

  // Scheduling
  startDate: string;
  endDate?: string;

  // Location
  location?: string;
  latitude?: number;
  longitude?: number;

  // Capacity & Attendance
  maxAttendees?: number;
  currentAttendees?: number;
  isRegistrationOpen?: boolean;
  registrationDeadline?: string;

  // Status & Visibility
  status: EventStatus;
  isFeatured?: boolean;
  isPublic?: boolean;

  // Host / Organizer
  hostName?: string;
  hostId?: number;
  contactEmail?: string;

  // English Learning Specific
  targetLevel?: TargetLevel;
  skillFocus?: string;

  // Metadata
  createdAt?: string;
  updatedAt?: string;
}

export interface ScheduleItem {
  time: string;
  title: string;
  subtitle?: string;
  status?: EventStatus;
}

export interface SuggestedEvent {
  id: number;
  title: string;
  startDate: string;
  isFree: boolean;
  image?: string;
  category?: string;
  targetLevel?: TargetLevel;
}

export interface RecommendedEvent {
  event: Event;
  score: number;    // 0-100 confidence score from AI
  reason: string;   // AI-generated natural language explanation
}