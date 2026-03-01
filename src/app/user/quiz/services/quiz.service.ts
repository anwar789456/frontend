import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { QuizCard, QuizCategory, Quiz, QuestionQuiz } from '../models/quiz.model';

@Injectable({
  providedIn: 'root'
})
export class QuizService {
  private readonly apiUrl = 'https://minolingo.online/api/cours';

  constructor(private http: HttpClient) {}

  // ── Quiz Cards ──

  createQuizCard(quizCard: QuizCard): Observable<QuizCard> {
    return this.http.post<QuizCard>(`${this.apiUrl}/quiz-cards/create-quiz-card`, quizCard);
  }

  getQuizCardById(id: number): Observable<QuizCard> {
    return this.http.get<QuizCard>(`${this.apiUrl}/quiz-cards/get-quiz-card-by-id/${id}`);
  }

  getAllQuizCards(): Observable<QuizCard[]> {
    return this.http.get<QuizCard[]>(`${this.apiUrl}/quiz-cards/get-all-quiz-cards`);
  }

  updateQuizCard(id: number, quizCard: QuizCard): Observable<QuizCard> {
    return this.http.put<QuizCard>(`${this.apiUrl}/quiz-cards/update-quiz-card/${id}`, quizCard);
  }

  deleteQuizCard(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/quiz-cards/delete-quiz-card/${id}`);
  }

  // ── Quiz Categories ──

  createQuizCategory(category: QuizCategory): Observable<QuizCategory> {
    return this.http.post<QuizCategory>(`${this.apiUrl}/quiz-categories/create-quiz-category`, category);
  }

  getQuizCategoryById(id: number): Observable<QuizCategory> {
    return this.http.get<QuizCategory>(`${this.apiUrl}/quiz-categories/get-quiz-category-by-id/${id}`);
  }

  getAllQuizCategories(): Observable<QuizCategory[]> {
    return this.http.get<QuizCategory[]>(`${this.apiUrl}/quiz-categories/get-all-quiz-categories`);
  }

  updateQuizCategory(id: number, category: QuizCategory): Observable<QuizCategory> {
    return this.http.put<QuizCategory>(`${this.apiUrl}/quiz-categories/update-quiz-category/${id}`, category);
  }

  deleteQuizCategory(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/quiz-categories/delete-quiz-category/${id}`);
  }

  // ── Quizzes ──

  createQuiz(quiz: Quiz): Observable<Quiz> {
    return this.http.post<Quiz>(`${this.apiUrl}/quizzes/create-quiz`, quiz);
  }

  getQuizById(id: number): Observable<Quiz> {
    return this.http.get<Quiz>(`${this.apiUrl}/quizzes/get-quiz-by-id/${id}`);
  }

  getAllQuizzes(): Observable<Quiz[]> {
    return this.http.get<Quiz[]>(`${this.apiUrl}/quizzes/get-all-quizzes`);
  }

  updateQuiz(id: number, quiz: Quiz): Observable<Quiz> {
    return this.http.put<Quiz>(`${this.apiUrl}/quizzes/update-quiz/${id}`, quiz);
  }

  deleteQuiz(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/quizzes/delete-quiz/${id}`);
  }

  // ── Quiz Questions ──

  createQuestion(question: QuestionQuiz): Observable<QuestionQuiz> {
    return this.http.post<QuestionQuiz>(`${this.apiUrl}/questions/create-question`, question);
  }

  getQuestionById(id: number): Observable<QuestionQuiz> {
    return this.http.get<QuestionQuiz>(`${this.apiUrl}/questions/get-question-by-id/${id}`);
  }

  getAllQuestions(): Observable<QuestionQuiz[]> {
    return this.http.get<QuestionQuiz[]>(`${this.apiUrl}/questions/get-all-questions`);
  }

  getQuestionsByQuizId(quizId: number): Observable<QuestionQuiz[]> {
    return this.http.get<QuestionQuiz[]>(`${this.apiUrl}/questions/get-questions-by-quiz-id/${quizId}`);
  }

  updateQuestion(id: number, question: QuestionQuiz): Observable<QuestionQuiz> {
    return this.http.put<QuestionQuiz>(`${this.apiUrl}/questions/update-question/${id}`, question);
  }

  deleteQuestion(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/questions/delete-question/${id}`);
  }
}
