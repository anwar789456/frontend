import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { CourseService } from './course.service';
import { Cours, ContenuPedagogique } from '../models/course.model';

describe('CourseService', () => {
  let service: CourseService;
  let httpMock: HttpTestingController;
  const apiUrl = '/api/cours';

  const mockCours: Cours = {
    id: 1, title: 'English Basics', description: 'Beginner English course',
    content: 'Lesson 1', archived: false
  };

  const mockContenu: ContenuPedagogique = {
    idContent: 1, titleC: 'Intro Video', duration: 30,
    contentType: 'VIDEO', cours: { id: 1 }
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), CourseService]
    });
    service = TestBed.inject(CourseService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => { httpMock.verify(); });

  it('should be created', () => { expect(service).toBeTruthy(); });

  // ── File Upload ──

  it('should upload a file', () => {
    const file = new File(['data'], 'test.pdf', { type: 'application/pdf' });
    service.uploadFile(file).subscribe(url => expect(url).toContain('uploaded'));
    const req = httpMock.expectOne(`${apiUrl}/file/upload`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body instanceof FormData).toBe(true);
    req.flush('https://cdn.example.com/uploaded.pdf');
  });

  // ── Courses CRUD ──

  it('should create a course', () => {
    service.createCours(mockCours).subscribe(c => expect(c.title).toBe('English Basics'));
    const req = httpMock.expectOne(`${apiUrl}/cours/create-cours`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(mockCours);
    req.flush(mockCours);
  });

  it('should get course by ID', () => {
    service.getCoursById(1).subscribe(c => {
      expect(c.id).toBe(1);
      expect(c.title).toBe('English Basics');
    });
    httpMock.expectOne(`${apiUrl}/cours/get-cours-by-id/1`).flush(mockCours);
  });

  it('should get all courses', () => {
    const courses = [mockCours, { ...mockCours, id: 2, title: 'Advanced English' }];
    service.getAllCours().subscribe(c => {
      expect(c.length).toBe(2);
      expect(c[1].title).toBe('Advanced English');
    });
    httpMock.expectOne(`${apiUrl}/cours/get-all-cours`).flush(courses);
  });

  it('should return empty array when no courses', () => {
    service.getAllCours().subscribe(c => expect(c).toEqual([]));
    httpMock.expectOne(`${apiUrl}/cours/get-all-cours`).flush([]);
  });

  it('should update a course', () => {
    const updated = { ...mockCours, title: 'Updated Course' };
    service.updateCours(1, updated).subscribe(c => expect(c.title).toBe('Updated Course'));
    const req = httpMock.expectOne(`${apiUrl}/cours/update-cours/1`);
    expect(req.request.method).toBe('PUT');
    req.flush(updated);
  });

  it('should delete a course', () => {
    service.deleteCours(1).subscribe();
    const req = httpMock.expectOne(`${apiUrl}/cours/delete-cours/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  // ── Contenus Pedagogiques CRUD ──

  it('should create a contenu', () => {
    service.createContenu(mockContenu).subscribe(c => expect(c.titleC).toBe('Intro Video'));
    const req = httpMock.expectOne(`${apiUrl}/contenus/create-contenu`);
    expect(req.request.method).toBe('POST');
    req.flush(mockContenu);
  });

  it('should get contenu by ID', () => {
    service.getContenuById(1).subscribe(c => expect(c.idContent).toBe(1));
    httpMock.expectOne(`${apiUrl}/contenus/get-contenu-by-id/1`).flush(mockContenu);
  });

  it('should get all contenus', () => {
    service.getAllContenus().subscribe(c => expect(c.length).toBe(1));
    httpMock.expectOne(`${apiUrl}/contenus/get-all-contenus`).flush([mockContenu]);
  });

  it('should get contenus by course ID', () => {
    service.getContenusByCoursId(1).subscribe(c => {
      expect(c.length).toBe(1);
      expect(c[0].cours?.id).toBe(1);
    });
    httpMock.expectOne(`${apiUrl}/contenus/get-contenus-by-cours-id/1`).flush([mockContenu]);
  });

  it('should update a contenu', () => {
    const updated = { ...mockContenu, titleC: 'Updated Video' };
    service.updateContenu(1, updated).subscribe(c => expect(c.titleC).toBe('Updated Video'));
    const req = httpMock.expectOne(`${apiUrl}/contenus/update-contenu/1`);
    expect(req.request.method).toBe('PUT');
    req.flush(updated);
  });

  it('should delete a contenu', () => {
    service.deleteContenu(1).subscribe();
    const req = httpMock.expectOne(`${apiUrl}/contenus/delete-contenu/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
