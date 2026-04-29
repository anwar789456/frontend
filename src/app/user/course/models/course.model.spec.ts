import { Cours, ContenuPedagogique, ContentFile } from './course.model';

describe('Course Models', () => {

  describe('ContentFile', () => {
    it('should create a content file', () => {
      const f: ContentFile = { id: 1, fileName: 'test.pdf', fileUrl: '/files/test.pdf', fileType: 'application/pdf', fileSize: 1024 };
      expect(f.fileType).toBe('application/pdf');
      expect(f.fileSize).toBe(1024);
    });

    it('should allow all optional fields', () => {
      const f: ContentFile = {};
      expect(f.id).toBeUndefined();
    });
  });

  describe('ContenuPedagogique', () => {
    it('should create a contenu', () => {
      const c: ContenuPedagogique = { titleC: 'Video Lesson', duration: 45, contentType: 'VIDEO' };
      expect(c.titleC).toBe('Video Lesson');
      expect(c.duration).toBe(45);
    });

    it('should reference a course', () => {
      const c: ContenuPedagogique = { titleC: 'Quiz', duration: 15, contentType: 'QUIZ', cours: { id: 5 } };
      expect(c.cours?.id).toBe(5);
    });

    it('should support files array', () => {
      const c: ContenuPedagogique = {
        titleC: 'PDF', duration: 10, contentType: 'PDF',
        files: [{ id: 1, fileName: 'doc.pdf' }]
      };
      expect(c.files!.length).toBe(1);
    });
  });

  describe('Cours', () => {
    it('should create a valid course', () => {
      const c: Cours = { title: 'English 101', description: 'Beginner course', content: 'Lesson content' };
      expect(c.title).toBe('English 101');
    });

    it('should support archived flag', () => {
      const c: Cours = { title: 'Old Course', description: '', content: '', archived: true };
      expect(c.archived).toBe(true);
    });

    it('should support image and contenus', () => {
      const c: Cours = {
        title: 'Full Course', description: '', content: '',
        image: { id: 1, fileName: 'cover.jpg' },
        contenus: [{ titleC: 'Intro', duration: 5, contentType: 'VIDEO' }]
      };
      expect(c.image?.fileName).toBe('cover.jpg');
      expect(c.contenus!.length).toBe(1);
    });
  });
});
