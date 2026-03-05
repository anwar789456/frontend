import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Quiz, QuestionQuiz, QuizCategory, StoryQuiz, StoryWordBank } from '../models/quiz.model';

@Injectable({
  providedIn: 'root'
})
export class TutorQuizService {
  private readonly apiUrl = 'https://minolingo.online/api/cours';

  constructor(private http: HttpClient) {}

  // ── Quizzes ──

  getAllQuizzes(): Observable<Quiz[]> {
    return this.http.get<Quiz[]>(`${this.apiUrl}/quizzes/get-all-quizzes`);
  }

  getQuizById(id: number): Observable<Quiz> {
    return this.http.get<Quiz>(`${this.apiUrl}/quizzes/get-quiz-by-id/${id}`);
  }

  createQuiz(quiz: Quiz): Observable<Quiz> {
    return this.http.post<Quiz>(`${this.apiUrl}/quizzes/create-quiz`, quiz);
  }

  updateQuiz(id: number, quiz: Quiz): Observable<Quiz> {
    return this.http.put<Quiz>(`${this.apiUrl}/quizzes/update-quiz/${id}`, quiz);
  }

  deleteQuiz(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/quizzes/delete-quiz/${id}`);
  }

  archiveQuiz(id: number): Observable<Quiz> {
    return this.http.put<Quiz>(`${this.apiUrl}/quizzes/archive/${id}`, {});
  }

  unarchiveQuiz(id: number): Observable<Quiz> {
    return this.http.put<Quiz>(`${this.apiUrl}/quizzes/unarchive/${id}`, {});
  }

  // ── Questions ──

  getQuestionsByQuizId(quizId: number): Observable<QuestionQuiz[]> {
    return this.http.get<QuestionQuiz[]>(`${this.apiUrl}/questions/get-questions-by-quiz-id/${quizId}`);
  }

  createQuestion(question: QuestionQuiz): Observable<QuestionQuiz> {
    return this.http.post<QuestionQuiz>(`${this.apiUrl}/questions/create-question`, question);
  }

  updateQuestion(id: number, question: QuestionQuiz): Observable<QuestionQuiz> {
    return this.http.put<QuestionQuiz>(`${this.apiUrl}/questions/update-question/${id}`, question);
  }

  deleteQuestion(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/questions/delete-question/${id}`);
  }

  // ── Categories ──

  getAllCategories(): Observable<QuizCategory[]> {
    return this.http.get<QuizCategory[]>(`${this.apiUrl}/quiz-categories/get-all-quiz-categories`);
  }

  createCategory(category: QuizCategory): Observable<QuizCategory> {
    return this.http.post<QuizCategory>(`${this.apiUrl}/quiz-categories/create-quiz-category`, category);
  }

  // ── Story Quizzes ──

  getAllStoryQuizzes(): Observable<StoryQuiz[]> {
    return this.http.get<StoryQuiz[]>(`${this.apiUrl}/story-quizzes/all`);
  }

  getStoryQuizById(id: number): Observable<StoryQuiz> {
    return this.http.get<StoryQuiz>(`${this.apiUrl}/story-quizzes/${id}`);
  }

  createStoryQuiz(storyQuiz: StoryQuiz): Observable<StoryQuiz> {
    return this.http.post<StoryQuiz>(`${this.apiUrl}/story-quizzes/create`, storyQuiz);
  }

  updateStoryQuiz(id: number, storyQuiz: StoryQuiz): Observable<StoryQuiz> {
    return this.http.put<StoryQuiz>(`${this.apiUrl}/story-quizzes/update/${id}`, storyQuiz);
  }

  deleteStoryQuiz(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/story-quizzes/delete/${id}`);
  }

  archiveStoryQuiz(id: number): Observable<StoryQuiz> {
    return this.http.put<StoryQuiz>(`${this.apiUrl}/story-quizzes/archive/${id}`, {});
  }

  unarchiveStoryQuiz(id: number): Observable<StoryQuiz> {
    return this.http.put<StoryQuiz>(`${this.apiUrl}/story-quizzes/unarchive/${id}`, {});
  }

  getWordBank(storyQuizId: number): Observable<StoryWordBank> {
    return this.http.get<StoryWordBank>(`${this.apiUrl}/story-quizzes/${storyQuizId}/word-bank`);
  }

  saveWordBank(storyQuizId: number, wordBank: StoryWordBank): Observable<StoryWordBank> {
    return this.http.post<StoryWordBank>(`${this.apiUrl}/story-quizzes/${storyQuizId}/word-bank`, wordBank);
  }
}
