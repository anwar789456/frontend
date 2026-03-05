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

// ===== QUIZ ATTEMPT =====

export interface QuizAttempt {
  id?: number;
  userId: number;
  quizId: number;
  score: number;
  totalQuestions: number;
  answeredQuestions: number;
  completed: boolean;
  startedAt?: string;
  completedAt?: string;
  answers: { [questionId: number]: string };
}

// ===== STORY QUIZ =====

export interface StoryQuiz {
  id?: number;
  title: string;
  storyTemplate: string;
  illustration?: string;
  xpReward: number;
  difficulty: string;
  blanks?: StoryBlank[];
}

export interface StoryBlank {
  id?: number;
  blankIndex: number;
  hint?: string;
  correctWord?: string;
}

export interface StoryWordBank {
  id?: number;
  storyQuizId: number;
  words: string[];
}

export interface StoryAttempt {
  id?: number;
  userId: number;
  storyQuizId: number;
  completed: boolean;
  score: number;
  startedAt?: string;
  completedAt?: string;
  answers: { [blankIndex: number]: string };
}
