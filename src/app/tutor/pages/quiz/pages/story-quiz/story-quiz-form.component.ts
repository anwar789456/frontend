import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TutorQuizService } from '../../services/quiz.service';
import { StoryQuiz, StoryBlank, StoryWordBank } from '../../models/quiz.model';

@Component({
  selector: 'app-tutor-story-quiz-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './story-quiz-form.component.html'
})
export class TutorStoryQuizFormComponent implements OnInit {
  isEditMode = false;
  storyQuizId: number | null = null;
  isLoading = false;
  isSaving = false;
  currentStep = 1;

  // Step 1 — Basic Info
  title = '';
  difficulty = 'BEGINNER';
  xpReward = 50;
  illustration = '';

  // Step 2 — Story Editor
  storyTemplate = '';
  blankCount = 0;

  // Step 3 — Correct Answers
  blanks: { blankIndex: number; correctWord: string; hint: string }[] = [];

  // Step 4 — Word Bank
  wordBankWords: string[] = [];
  newDistractorWord = '';
  wordBankError = '';

  difficulties = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];

  constructor(
    private quizService: TutorQuizService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.isEditMode = true;
      this.storyQuizId = +idParam;
      this.loadStoryQuiz(this.storyQuizId);
    }
  }

  private loadStoryQuiz(id: number): void {
    this.isLoading = true;
    this.quizService.getStoryQuizById(id).subscribe({
      next: (sq) => {
        this.title = sq.title;
        this.difficulty = sq.difficulty;
        this.xpReward = sq.xpReward;
        this.illustration = sq.illustration || '';
        this.storyTemplate = sq.storyTemplate;
        this.detectBlanks();
        if (sq.blanks) {
          this.blanks = sq.blanks.map(b => ({
            blankIndex: b.blankIndex,
            correctWord: b.correctWord,
            hint: b.hint || ''
          }));
        }
        // Load word bank
        this.quizService.getWordBank(id).subscribe({
          next: (wb) => { this.wordBankWords = wb.words || []; this.isLoading = false; },
          error: () => { this.buildWordBankFromBlanks(); this.isLoading = false; }
        });
      },
      error: () => this.isLoading = false
    });
  }

  insertBlank(): void {
    this.blankCount++;
    const placeholder = `{blank_${this.blankCount}}`;
    this.storyTemplate += placeholder;
    this.syncBlanks();
  }

  detectBlanks(): void {
    const matches = this.storyTemplate.match(/\{blank_(\d+)\}/g) || [];
    this.blankCount = matches.length;
  }

  onStoryChange(): void {
    this.detectBlanks();
    this.syncBlanks();
  }

  private syncBlanks(): void {
    const matches = this.storyTemplate.match(/\{blank_(\d+)\}/g) || [];
    const indices = matches.map(m => parseInt(m.replace(/\{blank_|\}/g, ''), 10));

    const existing = new Map(this.blanks.map(b => [b.blankIndex, b]));
    this.blanks = indices.map(idx => existing.get(idx) || { blankIndex: idx, correctWord: '', hint: '' });
  }

  private buildWordBankFromBlanks(): void {
    this.wordBankWords = this.blanks.filter(b => b.correctWord).map(b => b.correctWord);
  }

  goToStep(step: number): void {
    if (step === 3) {
      this.syncBlanks();
    }
    if (step === 4) {
      // Auto-add correct words to word bank
      const correctWords = this.blanks.filter(b => b.correctWord).map(b => b.correctWord);
      for (const w of correctWords) {
        if (!this.wordBankWords.includes(w)) {
          this.wordBankWords.push(w);
        }
      }
    }
    this.currentStep = step;
  }

  addDistractor(): void {
    const word = this.newDistractorWord.trim();
    if (!word) return;
    if (this.wordBankWords.includes(word)) {
      this.wordBankError = 'Word already in bank.';
      return;
    }
    this.wordBankWords.push(word);
    this.newDistractorWord = '';
    this.wordBankError = '';
  }

  removeWord(index: number): void {
    const word = this.wordBankWords[index];
    const isCorrect = this.blanks.some(b => b.correctWord === word);
    if (isCorrect) {
      this.wordBankError = 'Cannot remove a correct answer word.';
      return;
    }
    this.wordBankWords.splice(index, 1);
    this.wordBankError = '';
  }

  hasIncompleteAnswers(): boolean {
    return this.blanks.some(b => !b.correctWord.trim());
  }

  isCorrectWord(word: string): boolean {
    return this.blanks.some(b => b.correctWord === word);
  }

  get distractorCount(): number {
    const correctWords = new Set(this.blanks.filter(b => b.correctWord).map(b => b.correctWord));
    return this.wordBankWords.filter(w => !correctWords.has(w)).length;
  }

  get canSave(): boolean {
    return this.title.trim() !== ''
      && this.storyTemplate.trim() !== ''
      && this.blanks.length > 0
      && this.blanks.every(b => b.correctWord.trim() !== '')
      && this.distractorCount >= 2;
  }

  save(): void {
    if (!this.canSave || this.isSaving) return;
    this.isSaving = true;

    const storyQuiz: StoryQuiz = {
      title: this.title,
      storyTemplate: this.storyTemplate,
      illustration: this.illustration || undefined,
      xpReward: this.xpReward,
      difficulty: this.difficulty,
      blanks: this.blanks.map(b => ({
        blankIndex: b.blankIndex,
        correctWord: b.correctWord,
        hint: b.hint || undefined
      })) as StoryBlank[]
    };

    const saveQuiz$ = this.isEditMode && this.storyQuizId
      ? this.quizService.updateStoryQuiz(this.storyQuizId, storyQuiz)
      : this.quizService.createStoryQuiz(storyQuiz);

    saveQuiz$.subscribe({
      next: (saved) => {
        const quizId = saved.id!;
        const wordBank: StoryWordBank = { storyQuizId: quizId, words: this.wordBankWords };
        this.quizService.saveWordBank(quizId, wordBank).subscribe({
          next: () => { this.isSaving = false; this.router.navigate(['/tutor/quiz/story']); },
          error: () => { this.isSaving = false; this.router.navigate(['/tutor/quiz/story']); }
        });
      },
      error: (err) => { console.error('Save failed:', err); this.isSaving = false; }
    });
  }

  get previewSegments(): { type: 'text' | 'blank'; value: string; index?: number }[] {
    const parts: { type: 'text' | 'blank'; value: string; index?: number }[] = [];
    const regex = /\{blank_(\d+)\}/g;
    let lastIdx = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(this.storyTemplate)) !== null) {
      if (match.index > lastIdx) {
        parts.push({ type: 'text', value: this.storyTemplate.slice(lastIdx, match.index) });
      }
      const blankIdx = parseInt(match[1], 10);
      const filled = this.blanks.find(b => b.blankIndex === blankIdx);
      parts.push({ type: 'blank', value: filled?.correctWord || '____', index: blankIdx });
      lastIdx = regex.lastIndex;
    }
    if (lastIdx < this.storyTemplate.length) {
      parts.push({ type: 'text', value: this.storyTemplate.slice(lastIdx) });
    }
    return parts;
  }
}
