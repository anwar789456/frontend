export interface WritingPrompt {
  id?: number;
  title: string;
  description: string;
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  xpReward: number;
  archived: boolean;
  minWords: number;
  maxWords: number;
}

export interface WritingSubmission {
  id?: number;
  userId: number;
  writingPromptId: number;
  submittedText: string;
  overallScore: number;
  grammarScore: number;
  spellingScore: number;
  contentScore: number;
  overallFeedback: string;
  feedbackJson: string;
  completed: boolean;
  startedAt: string;
  completedAt: string;
}

export interface WritingFeedback {
  overallScore: number;
  grammarScore: number;
  spellingScore: number;
  contentScore: number;
  grammarIssues: GrammarIssue[];
  spellingIssues: SpellingIssue[];
  rephrasingSuggestions: RephrasingSuggestion[];
  overallFeedback: string;
}

export interface GrammarIssue {
  message: string;
  context: string;
  suggestion: string;
  offset: number;
  length: number;
}

export interface SpellingIssue {
  word: string;
  suggestion: string;
  offset: number;
  length: number;
}

export interface RephrasingSuggestion {
  original: string;
  suggestion: string;
  reason: string;
}
