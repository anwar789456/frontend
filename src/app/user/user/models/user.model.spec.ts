import { User, Role } from './user.model';

describe('User Model', () => {

  it('should create a valid ETUDIANT user', () => {
    const u: User = {
      id: 1, name: 'John', username: 'john', email: 'j@e.com', pwd: 'hash',
      numTel: '+216123', dateNaiss: '2010-01-01', role: 'ETUDIANT',
      inscriptionOk: true, posterForum: true, avatar: 'a.png'
    };
    expect(u.role).toBe('ETUDIANT');
  });

  it('should support all Role values', () => {
    const roles: Role[] = ['ADMIN', 'TUTEUR', 'ETUDIANT'];
    roles.forEach(r => {
      const u: User = { id: 1, name: '', username: '', email: '', pwd: '', numTel: '', dateNaiss: '', role: r, inscriptionOk: true, posterForum: true, avatar: '' };
      expect(u.role).toBe(r);
    });
  });

  it('should support ban fields', () => {
    const u: User = {
      id: 1, name: '', username: '', email: '', pwd: '', numTel: '', dateNaiss: '', role: 'ETUDIANT',
      inscriptionOk: true, posterForum: false, avatar: '',
      banned: true, banReason: 'Spam', banDuration: '7_days', banExpiresAt: '2026-05-01'
    };
    expect(u.banned).toBe(true);
    expect(u.banDuration).toBe('7_days');
  });

  it('should support face recognition fields', () => {
    const u: User = {
      id: 1, name: '', username: '', email: '', pwd: '', numTel: '', dateNaiss: '', role: 'ETUDIANT',
      inscriptionOk: true, posterForum: true, avatar: '',
      faceRegistered: true, faceImageUrl: 'face.jpg'
    };
    expect(u.faceRegistered).toBe(true);
  });

  it('should support TUTEUR-specific fields', () => {
    const u: User = {
      id: 2, name: 'Tutor', username: 'tutor', email: 't@e.com', pwd: '', numTel: '', dateNaiss: '',
      role: 'TUTEUR', inscriptionOk: true, posterForum: true, avatar: '',
      CIN: '12345678', yearsOfExperience: 5, specialization: 'English', cvPath: '/cv.pdf'
    };
    expect(u.CIN).toBe('12345678');
    expect(u.yearsOfExperience).toBe(5);
  });

  it('should support ADMIN-specific fields', () => {
    const u: User = {
      id: 3, name: 'Admin', username: 'admin', email: 'a@e.com', pwd: '', numTel: '', dateNaiss: '',
      role: 'ADMIN', inscriptionOk: true, posterForum: true, avatar: '',
      departement: 'IT', adminCIN: '99999999'
    };
    expect(u.departement).toBe('IT');
  });

  it('should support ETUDIANT-specific fields', () => {
    const u: User = {
      id: 1, name: '', username: '', email: '', pwd: '', numTel: '', dateNaiss: '',
      role: 'ETUDIANT', inscriptionOk: true, posterForum: true, avatar: '',
      level: 'B1', xp: 250, streak: 7, coins: 100, language: 'French', joinDate: '2026-01-01', bio: 'Hello!'
    };
    expect(u.level).toBe('B1');
    expect(u.xp).toBe(250);
    expect(u.coins).toBe(100);
  });
});
