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

// ===== QUIZ ENTITIES =====

export interface Quiz {
  id?: number;
  title: string;
  description?: string;
  level: QuizLevel | string;
  status: QuizStatus | string;
  courseId?: number;
  xpReward?: number;
  questions?: QuestionQuiz[];
}

export interface QuestionQuiz {
  id?: number;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation?: string;
  type: QuestionType | string;
  quiz?: { id: number };
}

export interface QuizCategory {
  id?: number;
  title: string;
  description?: string;
  totalSets?: number;
  icon?: string;
}

// ===== STORY QUIZ ENTITIES =====

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
  correctWord: string;
  hint?: string;
}

export interface StoryWordBank {
  id?: number;
  storyQuizId: number;
  words: string[];
}
