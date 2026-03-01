// ===== ENUMS =====

export enum QuizLevel {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED'
}

export enum QuizStatus {
  DRAFT = 'DRAFT',
  OPEN = 'OPEN',
  CLOSED = 'CLOSED'
}

export enum QuestionType {
  MCQ = 'MCQ',
  TRUE_FALSE = 'TRUE_FALSE'
}

export enum QuizCardStatus {
  CONTINUE = 'CONTINUE',
  START = 'START',
  LOCKED = 'LOCKED'
}

// ===== ENTITIES =====

export interface QuizCategory {
  id?: number;
  title: string;
  description: string;
  totalSets: number;
  icon: string;
}

export interface Quiz {
  id?: number;
  title: string;
  description: string;
  level: QuizLevel;
  dateStart: string;
  dateEnd: string;
  status: QuizStatus;
  courseId?: number;
  xpReward: number;
  questions?: QuestionQuiz[];
}

export interface QuestionQuiz {
  id?: number;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  type: QuestionType;
  quiz?: { id: number };
}

export interface QuizCard {
  id?: number;
  title: string;
  totalQuestions: number;
  level: string;
  progress: number;
  status: QuizCardStatus;
  icon: string;
  xpRequired: number;
}
