import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CourseService } from '../services/course.service';
import { Cours, ContenuPedagogique } from '../models/course.model';
import { AuthService } from '../../../shared/services/auth.service';
import { MOCK_LEADERBOARD, MOCK_USER } from '../../../shared/constants/mock-data';

@Component({
  selector: 'app-courses',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './courses.component.html',
  styles: [`
    @keyframes fadeInUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes popIn { 0% { opacity: 0; transform: scale(0.7); } 60% { transform: scale(1.05); } 100% { opacity: 1; transform: scale(1); } }
    @keyframes bounceIn { 0% { opacity: 0; transform: scale(0.3); } 50% { transform: scale(1.08); } 70% { transform: scale(0.95); } 100% { opacity: 1; transform: scale(1); } }
    @keyframes slideInLeft { from { opacity: 0; transform: translateX(-40px); } to { opacity: 1; transform: translateX(0); } }
    @keyframes slideInRight { from { opacity: 0; transform: translateX(40px); } to { opacity: 1; transform: translateX(0); } }
    @keyframes wiggle { 0%,100% { transform: rotate(0deg); } 25% { transform: rotate(-6deg); } 75% { transform: rotate(6deg); } }
    @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
    @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
    @keyframes sparkle { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.3); } }
    .anim-fade-up { animation: fadeInUp 0.5s ease-out both; }
    .anim-pop { animation: popIn 0.4s ease-out both; }
    .anim-bounce { animation: bounceIn 0.6s ease-out both; }
    .anim-slide-left { animation: slideInLeft 0.5s ease-out both; }
    .anim-slide-right { animation: slideInRight 0.5s ease-out both; }
    .anim-wiggle { animation: wiggle 0.5s ease-in-out; }
    .anim-float { animation: float 3s ease-in-out infinite; }
    .anim-shimmer { background: linear-gradient(90deg, transparent 30%, rgba(255,255,255,0.4) 50%, transparent 70%); background-size: 200% 100%; animation: shimmer 2s infinite; }
    .anim-sparkle { animation: sparkle 1.5s ease-in-out infinite; }
    .anim-delay-1 { animation-delay: 0.1s; }
    .anim-delay-2 { animation-delay: 0.2s; }
    .anim-delay-3 { animation-delay: 0.3s; }
    .anim-delay-4 { animation-delay: 0.4s; }
    .anim-delay-5 { animation-delay: 0.5s; }
    .hover-grow { transition: transform 0.2s ease; }
    .hover-grow:hover { transform: scale(1.03); }
  `]
})
export class CoursesComponent implements OnInit {
  courses: Cours[] = [];
  leaderboard = MOCK_LEADERBOARD;
  user = MOCK_USER;
  isLoading = true;
  errorMessage = '';

  // View state: null = adventure map, Cours = detail view
  selectedCourse: Cours | null = null;

  // CRUD state
  showCourseForm = false;
  editingCourse: Cours | null = null;
  courseForm!: FormGroup;

  // Contenu form state
  showContenuForm = false;
  editingContenu: ContenuPedagogique | null = null;
  contenuForm!: FormGroup;
  contenuParentCoursId: number | null = null;

  // Expanded course detail
  expandedCourseId: number | null = null;

  // ── Course Pagination ──
  currentPage = 0;
  coursesPerPage = 2;

  // ── Content/Contenu Pagination ──
  currentContenuPage = 0;
  contenusPerPage = 4;

  // Course card colors
  courseColors = [
    { bg: '#3b82f6', icon: '🛒' },
    { bg: '#22c55e', icon: '✈️' },
    { bg: '#6b7280', icon: '🏢' },
    { bg: '#8b5cf6', icon: '🎤' },
    { bg: '#f59e0b', icon: '📖' },
    { bg: '#ec4899', icon: '🎨' }
  ];

  bgImage = 'https://www.figma.com/api/mcp/asset/ad0c3be3-3572-4818-9705-6cee1d518352';
  bannerImage = 'https://www.figma.com/api/mcp/asset/6145994e-91f6-4f36-acfd-6b4274630d7e';

  constructor(
    private courseService: CourseService,
    private authService: AuthService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {}

  get isTutor(): boolean {
    return this.authService.userRole === 'TUTEUR';
  }

  ngOnInit(): void {
    this.initForms();
  }

  ngAfterViewInit(): void {
    this.loadCourses();
  }

  private initForms(): void {
    this.courseForm = this.fb.group({
      title: ['', Validators.required],
      description: ['', Validators.required],
      content: ['', Validators.required]
    });

    this.contenuForm = this.fb.group({
      titleC: ['', Validators.required],
      duration: [0, [Validators.required, Validators.min(1)]],
      contentType: ['VIDEO', Validators.required]
    });
  }

  loadCourses(): void {
    this.isLoading = true;
    this.courseService.getAllCours().subscribe({
      next: (data) => {
        this.courses = data;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load courses:', err);
        this.errorMessage = 'Failed to load courses. Please try again later.';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  getContentCount(course: Cours): number {
    return course.contenus?.length ?? 0;
  }

  toggleCourseDetail(courseId: number): void {
    this.expandedCourseId = this.expandedCourseId === courseId ? null : courseId;
  }

  openCourseDetail(course: Cours): void {
    this.selectedCourse = course;
    this.currentContenuPage = 0; // reset content page when opening a course
  }

  backToMap(): void {
    this.selectedCourse = null;
    this.currentContenuPage = 0;
  }

  getCourseColor(index: number): { bg: string; icon: string } {
    return this.courseColors[index % this.courseColors.length];
  }

  getContentTypeIcon(type: string): string {
    switch (type?.toUpperCase()) {
      case 'VIDEO': return '🎬';
      case 'PDF': return '📄';
      case 'TEXT': return '📝';
      case 'GAME': return '🎮';
      case 'PRESENTATION': return '🖥️';
      default: return '📋';
    }
  }

  getCompletedCount(course: Cours): number {
    return course.contenus && course.contenus.length > 0 ? 1 : 0;
  }

  getProgressPercent(course: Cours): number {
    const total = course.contenus?.length ?? 0;
    if (total === 0) return 0;
    return Math.round((this.getCompletedCount(course) / total) * 100);
  }

  // ── Course Pagination ──

  get totalPages(): number {
    return Math.ceil(this.courses.length / this.coursesPerPage);
  }

  get paginatedCourses(): Cours[] {
    const start = this.currentPage * this.coursesPerPage;
    return this.courses.slice(start, start + this.coursesPerPage);
  }

  get globalIndexOffset(): number {
    return this.currentPage * this.coursesPerPage;
  }

  /** Used in template instead of [].constructor(totalPages) which can cause issues */
  get pageArray(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i);
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
    }
  }

  prevPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
    }
  }

  goToPage(page: number): void {
    if (page >= 0 && page < this.totalPages) {
      this.currentPage = page;
    }
  }

  // ── Content/Contenu Pagination ──

  get totalContenuPages(): number {
    const total = this.selectedCourse?.contenus?.length ?? 0;
    return Math.ceil(total / this.contenusPerPage);
  }

  get paginatedContenus(): ContenuPedagogique[] {
    if (!this.selectedCourse?.contenus) return [];
    const start = this.currentContenuPage * this.contenusPerPage;
    return this.selectedCourse.contenus.slice(start, start + this.contenusPerPage);
  }

  get contenuPageArray(): number[] {
    return Array.from({ length: this.totalContenuPages }, (_, i) => i);
  }

  /** Returns the global (across all pages) index of a contenu item, used for styling the first item */
  getGlobalContenuIndex(localIndex: number): number {
    return this.currentContenuPage * this.contenusPerPage + localIndex;
  }

  nextContenuPage(): void {
    if (this.currentContenuPage < this.totalContenuPages - 1) {
      this.currentContenuPage++;
    }
  }

  prevContenuPage(): void {
    if (this.currentContenuPage > 0) {
      this.currentContenuPage--;
    }
  }

  goToContenuPage(page: number): void {
    if (page >= 0 && page < this.totalContenuPages) {
      this.currentContenuPage = page;
    }
  }

  // ── Course CRUD ──

  openCreateCourse(): void {
    this.editingCourse = null;
    this.courseForm.reset({ title: '', description: '', content: '' });
    this.showCourseForm = true;
  }

  openEditCourse(course: Cours): void {
    this.editingCourse = course;
    this.courseForm.patchValue({
      title: course.title,
      description: course.description,
      content: course.content
    });
    this.showCourseForm = true;
  }

  cancelCourseForm(): void {
    this.showCourseForm = false;
    this.editingCourse = null;
  }

  saveCourse(): void {
    if (this.courseForm.invalid) return;
    const formVal = this.courseForm.value;

    if (this.editingCourse && this.editingCourse.id) {
      this.courseService.updateCours(this.editingCourse.id, formVal).subscribe({
        next: () => {
          this.showCourseForm = false;
          this.editingCourse = null;
          this.loadCourses();
        },
        error: (err) => console.error('Failed to update course:', err)
      });
    } else {
      this.courseService.createCours(formVal).subscribe({
        next: () => {
          this.showCourseForm = false;
          this.loadCourses();
        },
        error: (err) => console.error('Failed to create course:', err)
      });
    }
  }

  deleteCourse(course: Cours): void {
    if (!course.id) return;
    if (!confirm(`Delete course "${course.title}"? This will also delete all its contenus.`)) return;
    this.courseService.deleteCours(course.id).subscribe({
      next: () => this.loadCourses(),
      error: (err) => console.error('Failed to delete course:', err)
    });
  }

  // ── Contenu CRUD ──

  openAddContenu(coursId: number): void {
    this.editingContenu = null;
    this.contenuParentCoursId = coursId;
    this.contenuForm.reset({ titleC: '', duration: 0, contentType: 'VIDEO' });
    this.showContenuForm = true;
  }

  openEditContenu(contenu: ContenuPedagogique, coursId: number): void {
    this.editingContenu = contenu;
    this.contenuParentCoursId = coursId;
    this.contenuForm.patchValue({
      titleC: contenu.titleC,
      duration: contenu.duration,
      contentType: contenu.contentType
    });
    this.showContenuForm = true;
  }

  cancelContenuForm(): void {
    this.showContenuForm = false;
    this.editingContenu = null;
    this.contenuParentCoursId = null;
  }

  saveContenu(): void {
    if (this.contenuForm.invalid || !this.contenuParentCoursId) return;
    const formVal = this.contenuForm.value;

    if (this.editingContenu && this.editingContenu.idContent) {
      const payload: ContenuPedagogique = {
        ...formVal,
        cours: { id: this.contenuParentCoursId }
      };
      this.courseService.updateContenu(this.editingContenu.idContent, payload).subscribe({
        next: () => {
          this.showContenuForm = false;
          this.editingContenu = null;
          this.loadCourses();
        },
        error: (err) => console.error('Failed to update contenu:', err)
      });
    } else {
      const payload: ContenuPedagogique = {
        ...formVal,
        cours: { id: this.contenuParentCoursId }
      };
      this.courseService.createContenu(payload).subscribe({
        next: () => {
          this.showContenuForm = false;
          this.loadCourses();
        },
        error: (err) => console.error('Failed to create contenu:', err)
      });
    }
  }

  deleteContenu(contenu: ContenuPedagogique): void {
    if (!contenu.idContent) return;
    if (!confirm(`Delete contenu "${contenu.titleC}"?`)) return;
    this.courseService.deleteContenu(contenu.idContent).subscribe({
      next: () => this.loadCourses(),
      error: (err) => console.error('Failed to delete contenu:', err)
    });
  }
}