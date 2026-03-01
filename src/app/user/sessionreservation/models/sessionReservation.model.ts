// ===== ENUMS =====

export enum SessionStatus {
  UPCOMING = 'UPCOMING',
  COMPLETED = 'COMPLETED',
  MISSED = 'MISSED'
}

export enum CertificationStatus {
  PASSED = 'PASSED',
  ACTIVE = 'ACTIVE',
  LOCKED = 'LOCKED'
}

// ===== ENTITIES =====

export interface Session {
  id?: number;
  title: string;
  level: string;
  date: string;
  time: string;
  duration: string;
  readinessScore: number;
  status: SessionStatus;
  image: string;
  tip: string;
}

export interface Certification {
  id?: number;
  title: string;
  subtitle: string;
  status: CertificationStatus;
  progress: string;
  date: string;
  estimatedExam: string;
  icon: string;
}

export interface PracticeItem {
  id?: number;
  title: string;
  description: string;
  color: string;
}
