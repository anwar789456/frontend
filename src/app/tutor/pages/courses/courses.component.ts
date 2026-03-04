import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { CourseService } from './services/course.service';
import { Cours, ContenuPedagogique, ContentFile } from './models/course.model';

@Component({
  selector: 'app-tutor-courses',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './courses.component.html',
  styles: [`
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(18px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes scaleIn {
      from { opacity: 0; transform: scale(0.92); }
      to { opacity: 1; transform: scale(1); }
    }
    @keyframes slideDown {
      from { opacity: 0; max-height: 0; }
      to { opacity: 1; max-height: 800px; }
    }
    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    .anim-fade-up { animation: fadeInUp 0.45s ease-out both; }
    .anim-scale-in { animation: scaleIn 0.35s ease-out both; }
    .anim-slide-down { animation: slideDown 0.4s ease-out both; }
    .anim-delay-1 { animation-delay: 0.06s; }
    .anim-delay-2 { animation-delay: 0.12s; }
    .anim-delay-3 { animation-delay: 0.18s; }
    .anim-delay-4 { animation-delay: 0.24s; }
    .skeleton-shimmer {
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 8px;
    }
  `]
})
export class TutorCoursesComponent implements OnInit {
  isGeneratingDescription = false;
  courses: Cours[] = [];
  isLoading = true;
  errorMessage = '';
  protected Math = Math;

  // File upload
  courseImageFile: File | null = null;
  courseImageUrl = '';
  courseImagePreview = '';
  isImageUploading = false;

  contenuFileUrls: ContentFile[] = [];
  isUploading = false;

  contentTypes = ['VIDEO', 'PDF', 'TEXT', 'GAME', 'PRESENTATION'];

  // Stats
  stats = [
    { label: 'TOTAL COURSES', value: '—', sub: '', icon: 'courses' },
    { label: 'TOTAL CONTENUS', value: '—', sub: '', icon: 'students' },
  ];

  // Course CRUD
  showCourseForm = false;
  editingCourse: Cours | null = null;
  courseForm!: FormGroup;

  // Inline contenus being built during course creation
  inlineContenus: ContenuPedagogique[] = [];
  showInlineContenuForm = false;
  inlineContenuForm!: FormGroup;
  inlineContenuFileUrls: ContentFile[] = [];
  isInlineFileUploading = false;
  editingInlineContenuIndex: number | null = null;

  // Contenu CRUD (for existing courses)
  showContenuForm = false;
  editingContenu: ContenuPedagogique | null = null;
  contenuForm!: FormGroup;
  contenuParentCoursId: number | null = null;

  // Expanded detail
  expandedCourseId: number | null = null;

  // Search & Filter
  searchTerm = '';
  activeFilter: string = 'all';
  sortBy: string = 'newest';

  // Pagination
  currentPage = 1;
  pageSize = 3;

  constructor(
    private courseService: CourseService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.initForms();
    this.loadCourses();
  }

  generateDescription(): void {
    const title = this.courseForm.get('title')?.value;
    if (!title?.trim()) return;
    
    this.isGeneratingDescription = true;
    this.courseService.generateDescription(title).subscribe({
      next: (response) => {
        // HuggingFace returns an array with generated_text
        const raw: string = response?.description ?? '';
        // Strip the prompt prefix to get only the generated description
        const promptPrefix = `Write a professional and engaging 150-word course description for an online children english learning platform.\nCourse Title: ${title}`;
        const description = raw.startsWith(promptPrefix)
          ? raw.slice(promptPrefix.length).trim()
          : raw.trim();
        
        this.courseForm.patchValue({ description });
        this.isGeneratingDescription = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('AI generation failed:', err);
        this.isGeneratingDescription = false;
        this.cdr.detectChanges();
      }
    });
  }

  private initForms(): void {
    this.courseForm = this.fb.group({
      title: ['', Validators.required],
      description: ['', Validators.required],
      content: ['', Validators.required]
    });
    this.contenuForm = this.fb.group({
      titleC: ['', Validators.required],
      duration: [0, [Validators.required, Validators.min(0)]],
      contentType: ['', Validators.required]
    });
    this.inlineContenuForm = this.fb.group({
      titleC: ['', Validators.required],
      duration: [0, [Validators.required, Validators.min(0)]],
      contentType: ['', Validators.required]
    });
  }

  loadCourses(): void {
    this.isLoading = true;
    this.courseService.getAllCours().subscribe({
      next: (data) => {
        // Always fetch each course individually to guarantee image data is present.
        // The list endpoint strips nested objects on many backends.
        const ids = data.filter(c => c.id).map(c => c.id!);

        if (ids.length === 0) {
          this.courses = [];
          this.updateStats();
          this.isLoading = false;
          this.cdr.detectChanges();
          return;
        }

        forkJoin(ids.map(id => this.courseService.getCoursById(id))).subscribe({
          next: (detailed) => {
            // Spread into a new array so Angular's change detection sees the mutation
            this.courses = [...detailed];
            this.updateStats();
            this.isLoading = false;
            this.cdr.detectChanges();
          },
          error: () => {
            // Fallback: use the list data even if images are missing
            this.courses = [...data];
            this.updateStats();
            this.isLoading = false;
            this.cdr.detectChanges();
          }
        });
      },
      error: (err) => {
        console.error('Failed to load courses:', err);
        this.errorMessage = 'Failed to load courses.';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private updateStats(): void {
    const totalContenus = this.courses.reduce((sum, c) => sum + (c.contenus?.length ?? 0), 0);
    const totalMinutes = this.courses.reduce((sum, c) =>
      sum + (c.contenus?.reduce((s, ct) => s + (ct.duration ?? 0), 0) ?? 0), 0);
    const totalHours = (totalMinutes / 60).toFixed(1);
    this.stats[0].value = String(this.courses.length);
    this.stats[0].sub = 'Active courses';
    this.stats[1].value = String(totalContenus);
    this.stats[1].sub = 'Across all courses';
    this.cdr.detectChanges();
  }

  // ── Image Upload ──

  onCourseImageSelected(event: any): void {
    const file = event.target.files[0];
    if (!file) return;
    this.courseImageFile = file;
    // Show local preview immediately
    const reader = new FileReader();
    reader.onload = (e) => {
      this.courseImagePreview = e.target?.result as string;
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);
    // Upload to server
    this.isImageUploading = true;
    this.courseService.uploadFile(file).subscribe({
      next: (url) => {
        this.courseImageUrl = url;
        this.isImageUploading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isImageUploading = false;
        this.cdr.detectChanges();
      }
    });
  }

  removeCourseImage(): void {
    this.courseImageFile = null;
    this.courseImageUrl = '';
    this.courseImagePreview = '';
  }

  onContenuFileSelected(event: any): void {
    const file = event.target.files[0];
    if (!file) return;
    this.isUploading = true;
    this.courseService.uploadFile(file).subscribe({
      next: (url) => {
        this.contenuFileUrls.push({
          fileName: file.name,
          fileUrl: url,
          fileType: file.type.split('/')[0] || 'document',
          fileSize: file.size
        });
        this.isUploading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.isUploading = false; this.cdr.detectChanges(); }
    });
  }

  removeContenuFile(index: number): void {
    this.contenuFileUrls.splice(index, 1);
  }

  // ── Inline Contenu (during course creation) ──

  onInlineContenuFileSelected(event: any): void {
    const file = event.target.files[0];
    if (!file) return;
    this.isInlineFileUploading = true;
    this.courseService.uploadFile(file).subscribe({
      next: (url) => {
        this.inlineContenuFileUrls.push({
          fileName: file.name,
          fileUrl: url,
          fileType: file.type.split('/')[0] || 'document',
          fileSize: file.size
        });
        this.isInlineFileUploading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.isInlineFileUploading = false; this.cdr.detectChanges(); }
    });
  }

  removeInlineContenuFile(index: number): void {
    this.inlineContenuFileUrls.splice(index, 1);
  }

  openInlineContenuForm(): void {
    this.editingInlineContenuIndex = null;
    this.inlineContenuForm.reset({ titleC: '', duration: 0, contentType: '' });
    this.inlineContenuFileUrls = [];
    this.showInlineContenuForm = true;
  }

  editInlineContenu(index: number): void {
    const contenu = this.inlineContenus[index];
    this.editingInlineContenuIndex = index;
    this.inlineContenuForm.patchValue({
      titleC: contenu.titleC,
      duration: contenu.duration,
      contentType: contenu.contentType
    });
    this.inlineContenuFileUrls = [...(contenu.files ?? [])];
    this.showInlineContenuForm = true;
  }

  saveInlineContenu(): void {
    if (this.inlineContenuForm.invalid) return;
    const formVal = this.inlineContenuForm.value;
    const contenu: ContenuPedagogique = {
      ...formVal,
      files: [...this.inlineContenuFileUrls]
    };
    if (this.editingInlineContenuIndex !== null) {
      this.inlineContenus[this.editingInlineContenuIndex] = contenu;
    } else {
      this.inlineContenus.push(contenu);
    }
    this.showInlineContenuForm = false;
    this.editingInlineContenuIndex = null;
    this.inlineContenuFileUrls = [];
    this.inlineContenuForm.reset({ titleC: '', duration: 0, contentType: '' });
    this.cdr.detectChanges();
  }

  cancelInlineContenuForm(): void {
    this.showInlineContenuForm = false;
    this.editingInlineContenuIndex = null;
    this.inlineContenuFileUrls = [];
    this.inlineContenuForm.reset({ titleC: '', duration: 0, contentType: '' });
  }

  removeInlineContenu(index: number): void {
    this.inlineContenus.splice(index, 1);
  }

  getContentTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      VIDEO: '🎬', PDF: '📄', TEXT: '📝', GAME: '🎮', PRESENTATION: '📊'
    };
    return icons[type] ?? '📁';
  }

  // ── Course CRUD ──

  openCreateCourse(): void {
    this.editingCourse = null;
    this.courseForm.reset({ title: '', description: '', content: '' });
    this.courseImageUrl = '';
    this.courseImagePreview = '';
    this.courseImageFile = null;
    this.inlineContenus = [];
    this.showInlineContenuForm = false;
    this.showCourseForm = true;
  }

  openEditCourse(course: Cours): void {
    this.editingCourse = course;
    this.courseForm.patchValue({
      title: course.title,
      description: course.description,
      content: course.content
    });
    this.courseImageUrl = course.image?.fileUrl ?? '';
    this.courseImagePreview = course.image?.fileUrl ?? '';
    this.inlineContenus = (course.contenus ?? []).map(c => ({ ...c }));
    this.showInlineContenuForm = false;
    this.showCourseForm = true;
  }

  cancelCourseForm(): void {
    this.showCourseForm = false;
    this.editingCourse = null;
    this.inlineContenus = [];
    this.showInlineContenuForm = false;
    this.courseImageUrl = '';
    this.courseImagePreview = '';
  }

  saveCourse(): void {
    if (this.courseForm.invalid) return;
    const formVal = this.courseForm.value;

    const imagePayload: ContentFile | undefined = this.courseImageUrl
      ? {
          fileUrl: this.courseImageUrl,
          fileName: this.courseImageFile?.name ?? 'course-image',
          fileType: 'image',
          fileSize: this.courseImageFile?.size ?? 0
        }
      : undefined;

    if (this.editingCourse && this.editingCourse.id) {
      const payload: Cours = {
        ...formVal,
        ...(imagePayload ? { image: imagePayload } : {}),
        contenus: this.inlineContenus.length > 0 ? this.inlineContenus : []
      };
      console.log('[DEBUG] updateCours payload:', JSON.stringify(payload));
      this.courseService.updateCours(this.editingCourse.id, payload).subscribe({
        next: (updated) => {
          console.log('[DEBUG] updateCours response:', JSON.stringify(updated));
          this.showCourseForm = false;
          this.editingCourse = null;
          this.inlineContenus = [];
          this.loadCourses();
        },
        error: (err) => console.error('Failed to update course:', err)
      });
    } else {
      const payload: Cours = {
        ...formVal,
        ...(imagePayload ? { image: imagePayload } : {}),
        contenus: this.inlineContenus.length > 0 ? this.inlineContenus : undefined
      };
      console.log('[DEBUG] createCours payload:', JSON.stringify(payload));
      this.courseService.createCours(payload).subscribe({
        next: (created) => {
          console.log('[DEBUG] createCours response:', JSON.stringify(created));
          this.showCourseForm = false;
          this.inlineContenus = [];
          this.courseImageUrl = '';
          this.courseImagePreview = '';
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

  // ── Contenu CRUD (existing courses) ──

  openAddContenu(coursId: number): void {
    this.editingContenu = null;
    this.contenuParentCoursId = coursId;
    this.contenuFileUrls = [];
    this.contenuForm.reset({ titleC: '', duration: 0, contentType: '' });
    this.showContenuForm = true;
  }

  openEditContenu(contenu: ContenuPedagogique, coursId: number): void {
    this.editingContenu = contenu;
    this.contenuParentCoursId = coursId;
    this.contenuFileUrls = [...(contenu.files ?? [])];
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
    this.contenuFileUrls = [];
  }

  saveContenu(): void {
    if (this.contenuForm.invalid || !this.contenuParentCoursId) return;
    const formVal = this.contenuForm.value;

    if (this.editingContenu && this.editingContenu.idContent) {
      const payload: ContenuPedagogique = {
        ...formVal,
        files: this.contenuFileUrls,
        cours: { id: this.contenuParentCoursId }
      };
      this.courseService.updateContenu(this.editingContenu.idContent, payload, this.contenuParentCoursId).subscribe({
        next: () => { this.showContenuForm = false; this.editingContenu = null; this.contenuFileUrls = []; this.loadCourses(); },
        error: (err) => console.error('Failed to update contenu:', err)
      });
    } else {
      const payload: ContenuPedagogique = {
        ...formVal,
        files: this.contenuFileUrls,
        cours: { id: this.contenuParentCoursId }
      };
      this.courseService.createContenu(payload, this.contenuParentCoursId).subscribe({
        next: () => { this.showContenuForm = false; this.contenuFileUrls = []; this.loadCourses(); },
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

  // ── Filtering & Pagination ──

  setFilter(filter: string): void {
    this.activeFilter = filter;
    this.currentPage = 1;
  }

  private getBaseFilteredCourses(): Cours[] {
    let courses = [...this.courses];

    // Search
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      courses = courses.filter(c =>
        c.title.toLowerCase().includes(term) || c.description.toLowerCase().includes(term)
      );
    }

    // Filter by content type presence
    if (this.activeFilter !== 'all') {
      courses = courses.filter(c =>
        c.contenus?.some(ct => ct.contentType === this.activeFilter)
      );
    }

    // Sort
    if (this.sortBy === 'title') {
      courses.sort((a, b) => a.title.localeCompare(b.title));
    } else if (this.sortBy === 'contenus') {
      courses.sort((a, b) => (b.contenus?.length ?? 0) - (a.contenus?.length ?? 0));
    }

    return courses;
  }

  get filteredCourses(): Cours[] {
    const courses = this.getBaseFilteredCourses();
    const totalPages = Math.ceil(courses.length / this.pageSize);
    if (this.currentPage > totalPages && totalPages > 0) this.currentPage = 1;
    const start = (this.currentPage - 1) * this.pageSize;
    return courses.slice(start, start + this.pageSize);
  }

  get totalFilteredCount(): number {
    return this.getBaseFilteredCourses().length;
  }

  get totalPages(): number {
    return Math.ceil(this.totalFilteredCount / this.pageSize);
  }

  get pageNumbers(): number[] {
    const total = this.totalPages;
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: number[] = [1];
    const start = Math.max(2, this.currentPage - 1);
    const end = Math.min(total - 1, this.currentPage + 1);
    if (start > 2) pages.push(-1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < total - 1) pages.push(-1);
    pages.push(total);
    return pages;
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
  }

  getContentCount(course: Cours): number {
    return course.contenus?.length ?? 0;
  }

  getTotalDuration(course: Cours): number {
    return course.contenus?.reduce((s, c) => s + (c.duration ?? 0), 0) ?? 0;
  }

  toggleCourseDetail(courseId: number): void {
    this.expandedCourseId = this.expandedCourseId === courseId ? null : courseId;
  }

  getContentTypeBadgeColor(type: string): string {
    const colors: Record<string, string> = {
      VIDEO: 'bg-blue-100 text-blue-700',
      PDF: 'bg-red-100 text-red-700',
      TEXT: 'bg-green-100 text-green-700',
      GAME: 'bg-amber-100 text-amber-700',
      PRESENTATION: 'bg-purple-100 text-purple-700'
    };
    return colors[type] ?? 'bg-gray-100 text-gray-700';
  }

  getUniqueContentTypes(course: Cours): string[] {
    if (!course.contenus) return [];
    return [...new Set(course.contenus.map(c => c.contentType))];
  }

  formatContentType(type: string): string {
    const labels: Record<string, string> = {
      VIDEO: 'Video',
      PDF: 'PDF Document',
      TEXT: 'Text / Instructions',
      GAME: 'Game',
      PRESENTATION: 'Presentation'
    };
    return labels[type] ?? type;
  }

  formatFileSize(bytes: number): string {
    if (!bytes) return '';
    if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    if (bytes >= 1024) return (bytes / 1024).toFixed(0) + ' KB';
    return bytes + ' B';
  }

  replaceInlineContenuFile(event: any, index: number): void {
    const file = event.target.files[0];
    if (!file) return;
    this.courseService.uploadFile(file).subscribe({
      next: (url) => {
        this.inlineContenus[index].files = [{
          fileName: file.name,
          fileUrl: url,
          fileType: file.type.split('/')[0] || 'document',
          fileSize: file.size
        }];
        this.cdr.detectChanges();
      }
    });
  }

  addFileToInlineContenu(event: any, index: number): void {
    const file = event.target.files[0];
    if (!file) return;
    this.courseService.uploadFile(file).subscribe({
      next: (url) => {
        if (!this.inlineContenus[index].files) this.inlineContenus[index].files = [];
        this.inlineContenus[index].files!.push({
          fileName: file.name,
          fileUrl: url,
          fileType: file.type.split('/')[0] || 'document',
          fileSize: file.size
        });
        this.cdr.detectChanges();
      }
    });
  }
}