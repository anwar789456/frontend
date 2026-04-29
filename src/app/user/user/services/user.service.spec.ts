import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { UserService } from './user.service';
import { User } from '../models/user.model';

describe('UserService', () => {
  let service: UserService;
  let httpMock: HttpTestingController;
  const apiUrl = 'https://minolingo.online/api/users';

  const mockUser: User = {
    id: 1, name: 'John Doe', username: 'johndoe', email: 'john@example.com',
    pwd: 'hashed', numTel: '+21612345678', dateNaiss: '2010-01-01',
    role: 'ETUDIANT', inscriptionOk: true, posterForum: true, avatar: 'avatar.png'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), UserService]
    });
    service = TestBed.inject(UserService);
    httpMock = TestBed.inject(HttpTestingController);
    localStorage.clear();
  });

  afterEach(() => { httpMock.verify(); localStorage.clear(); });

  it('should be created', () => { expect(service).toBeTruthy(); });

  // ── LOGIN ──

  it('should login and store user in localStorage', () => {
    service.login('john@example.com', 'pass123').subscribe(user => {
      expect(user.email).toBe('john@example.com');
      expect(localStorage.getItem('user')).toBeTruthy();
    });
    const req = httpMock.expectOne(`${apiUrl}/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'john@example.com', pwd: 'pass123' });
    req.flush(mockUser);
  });

  it('should handle login error 401', () => {
    service.login('wrong@example.com', 'wrong').subscribe({
      error: (err) => {
        expect(err).toContain('Invalid');
      }
    });
    httpMock.expectOne(`${apiUrl}/login`).flush(
      { message: 'Invalid email or password.' },
      { status: 401, statusText: 'Unauthorized' }
    );
  });

  // ── SIGN UP ──

  it('should sign up a new user', () => {
    const partial = { name: 'Jane', email: 'jane@example.com', pwd: 'pass' };
    service.signUp(partial).subscribe(user => expect(user.name).toBe('Jane'));
    const req = httpMock.expectOne(`${apiUrl}/sign-up`);
    expect(req.request.method).toBe('POST');
    req.flush({ ...mockUser, name: 'Jane', email: 'jane@example.com' });
  });

  // ── GET ALL USERS ──

  it('should get all users', () => {
    service.getAllUsers().subscribe(users => expect(users.length).toBe(2));
    httpMock.expectOne(`${apiUrl}/get-users`).flush([mockUser, { ...mockUser, id: 2 }]);
  });

  // ── GET BY ID ──

  it('should get user by ID', () => {
    service.getUserById(1).subscribe(user => expect(user.username).toBe('johndoe'));
    httpMock.expectOne(`${apiUrl}/get-user-by-id/1`).flush(mockUser);
  });

  // ── UPDATE USER ──

  it('should update a user', () => {
    const updated = { ...mockUser, name: 'John Updated' };
    service.updateUser(1, updated).subscribe(u => expect(u.name).toBe('John Updated'));
    const req = httpMock.expectOne(`${apiUrl}/update-user-by-id/1`);
    expect(req.request.method).toBe('PUT');
    req.flush(updated);
  });

  // ── UPDATE PROFILE ──

  it('should update profile', () => {
    service.updateProfile(1, 'New Name', 'new_username').subscribe(u => expect(u.name).toBe('New Name'));
    const req = httpMock.expectOne(`${apiUrl}/update-profile/1`);
    expect(req.request.body).toEqual({ name: 'New Name', username: 'new_username' });
    req.flush({ ...mockUser, name: 'New Name', username: 'new_username' });
  });

  // ── UPLOAD AVATAR ──

  it('should upload an avatar', () => {
    const file = new File(['data'], 'avatar.png', { type: 'image/png' });
    service.uploadAvatar(1, file).subscribe(url => expect(url).toContain('avatar'));
    const req = httpMock.expectOne(`${apiUrl}/upload-avatar/1`);
    expect(req.request.method).toBe('POST');
    req.flush('https://cdn.example.com/avatar.png');
  });

  // ── DELETE USER ──

  it('should delete a user', () => {
    service.deleteUser(1).subscribe();
    const req = httpMock.expectOne(`${apiUrl}/delete-user-by-id/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  // ── UPLOAD CV ──

  it('should upload CV', () => {
    const file = new File(['cv'], 'cv.pdf', { type: 'application/pdf' });
    service.uploadCV(1, file).subscribe(url => expect(url).toBeTruthy());
    const req = httpMock.expectOne(`${apiUrl}/upload-cv/1`);
    expect(req.request.body instanceof FormData).toBe(true);
    req.flush('https://cdn.example.com/cv.pdf');
  });

  // ── BAN / UNBAN ──

  it('should ban a user', () => {
    service.banUser(1, 'Spam', '7_days').subscribe(u => expect(u.banned).toBe(true));
    const req = httpMock.expectOne(`${apiUrl}/ban-user/1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.reason).toBe('Spam');
    expect(req.request.body.duration).toBe('7_days');
    req.flush({ ...mockUser, banned: true, banReason: 'Spam' });
  });

  it('should unban a user', () => {
    service.unbanUser(1).subscribe(u => expect(u.banned).toBeFalsy());
    const req = httpMock.expectOne(`${apiUrl}/unban-user/1`);
    expect(req.request.method).toBe('PUT');
    req.flush({ ...mockUser, banned: false });
  });

  // ── STORED USER ──

  it('should get stored user from localStorage', () => {
    localStorage.setItem('user', JSON.stringify(mockUser));
    const user = service.getStoredUser();
    expect(user).toBeTruthy();
    expect(user!.email).toBe('john@example.com');
  });

  it('should return null when no stored user', () => {
    expect(service.getStoredUser()).toBeNull();
  });

  // ── GET USER ROLE ──

  it('should return user role', () => {
    localStorage.setItem('user', JSON.stringify(mockUser));
    expect(service.getUserRole()).toBe('ETUDIANT');
  });

  it('should return empty string when no user', () => {
    expect(service.getUserRole()).toBe('');
  });

  // ── LOGOUT ──

  it('should clear localStorage on logout', () => {
    localStorage.setItem('user', JSON.stringify(mockUser));
    service.logout();
    expect(localStorage.getItem('user')).toBeNull();
  });

  // ── CHANGE PASSWORD ──

  it('should change password', () => {
    service.changePassword(1, 'oldPass', 'newPass').subscribe(r => expect(r).toBeTruthy());
    const req = httpMock.expectOne(`${apiUrl}/change-password/1`);
    expect(req.request.body).toEqual({ currentPassword: 'oldPass', newPassword: 'newPass' });
    req.flush({ success: true });
  });

  // ── FORGOT / RESET PASSWORD ──

  it('should send forgot password request', () => {
    service.forgotPassword('john@example.com').subscribe(msg => expect(msg).toBeTruthy());
    const req = httpMock.expectOne(`${apiUrl}/forgot-password`);
    expect(req.request.body).toEqual({ email: 'john@example.com' });
    req.flush('Reset link sent');
  });

  it('should reset password', () => {
    service.resetPassword('token123', 'newPass').subscribe(msg => expect(msg).toBeTruthy());
    const req = httpMock.expectOne(`${apiUrl}/reset-password`);
    expect(req.request.body).toEqual({ token: 'token123', newPassword: 'newPass' });
    req.flush('Password reset successful');
  });

  // ── VERIFY CODE / RESEND ──

  it('should verify code', () => {
    service.verifyCode('john@example.com', '123456').subscribe(r => expect(r).toBeTruthy());
    const req = httpMock.expectOne(`${apiUrl}/verify-code`);
    expect(req.request.body).toEqual({ email: 'john@example.com', code: '123456' });
    req.flush({ verified: true });
  });

  it('should resend code', () => {
    service.resendCode('john@example.com').subscribe(msg => expect(msg).toBeTruthy());
    const req = httpMock.expectOne(`${apiUrl}/resend-code`);
    expect(req.request.body).toEqual({ email: 'john@example.com' });
    req.flush('Code resent');
  });

  // ── ERROR HANDLING ──

  it('should handle 400 error', () => {
    service.getUserById(999).subscribe({ error: err => expect(err).toContain('Invalid') });
    httpMock.expectOne(`${apiUrl}/get-user-by-id/999`).flush(
      { message: 'Invalid request' }, { status: 400, statusText: 'Bad Request' }
    );
  });

  it('should handle 404 error', () => {
    service.getUserById(999).subscribe({ error: err => expect(err).toContain('not found') });
    httpMock.expectOne(`${apiUrl}/get-user-by-id/999`).flush(
      { message: 'User not found' }, { status: 404, statusText: 'Not Found' }
    );
  });

  it('should handle 500 error', () => {
    service.getAllUsers().subscribe({ error: err => expect(err).toContain('Server error') });
    httpMock.expectOne(`${apiUrl}/get-users`).flush(
      null, { status: 500, statusText: 'Internal Server Error' }
    );
  });

  it('should handle network error (status 0)', () => {
    service.getAllUsers().subscribe({ error: err => expect(err).toContain('internet') });
    httpMock.expectOne(`${apiUrl}/get-users`).error(new ProgressEvent('error'), { status: 0, statusText: '' });
  });
});
