import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Cours, ContenuPedagogique } from '../models/course.model';

@Injectable({
  providedIn: 'root'
})
export class CourseService {
  private readonly apiUrl = 'https://minolingo.online/api/cours';

  constructor(private http: HttpClient) {}

  // ── File Upload ──
  uploadFile(file: File): Observable<string> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${this.apiUrl}/file/upload`, formData, { responseType: 'text' });
  }

  // ── Courses ──

  createCours(cours: Cours): Observable<Cours> {
    return this.http.post<Cours>(`${this.apiUrl}/cours/create-cours`, cours);
  }

  getCoursById(id: number): Observable<Cours> {
    return this.http.get<Cours>(`${this.apiUrl}/cours/get-cours-by-id/${id}`);
  }

  getAllCours(): Observable<Cours[]> {
    return this.http.get<Cours[]>(`${this.apiUrl}/cours/get-all-cours`);
  }

  updateCours(id: number, cours: Cours): Observable<Cours> {
    return this.http.put<Cours>(`${this.apiUrl}/cours/update-cours/${id}`, cours);
  }

  deleteCours(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/cours/delete-cours/${id}`);
  }

  // ── Contenus Pedagogiques ──

  createContenu(contenu: ContenuPedagogique): Observable<ContenuPedagogique> {
    return this.http.post<ContenuPedagogique>(`${this.apiUrl}/contenus/create-contenu`, contenu);
  }

  getContenuById(id: number): Observable<ContenuPedagogique> {
    return this.http.get<ContenuPedagogique>(`${this.apiUrl}/contenus/get-contenu-by-id/${id}`);
  }

  getAllContenus(): Observable<ContenuPedagogique[]> {
    return this.http.get<ContenuPedagogique[]>(`${this.apiUrl}/contenus/get-all-contenus`);
  }

  getContenusByCoursId(coursId: number): Observable<ContenuPedagogique[]> {
    return this.http.get<ContenuPedagogique[]>(`${this.apiUrl}/contenus/get-contenus-by-cours-id/${coursId}`);
  }

  updateContenu(id: number, contenu: ContenuPedagogique): Observable<ContenuPedagogique> {
    return this.http.put<ContenuPedagogique>(`${this.apiUrl}/contenus/update-contenu/${id}`, contenu);
  }

  deleteContenu(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/contenus/delete-contenu/${id}`);
  }
}
