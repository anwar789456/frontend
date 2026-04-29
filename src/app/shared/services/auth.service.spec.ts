import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService, AuthUser } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let router: Router;
  const apiUrl = 'https://minolingo.online/api/users';

  const mockUser: AuthUser = {
    id: 1, name: 'John', email: 'j@e.com', role: 'ETUDIANT'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(), provideHttpClientTesting(), AuthService,
        { provide: Router, useValue: { navigate: vi.fn() } }
      ]
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    localStorage.clear();
  });

  afterEach(() => { httpMock.verify(); localStorage.clear(); });

  it('should be created', () => { expect(service).toBeTruthy(); });

  it('should not be logged in initially', () => {
    expect(service.isLoggedIn).toBe(false);
    expect(service.currentUser).toBeNull();
  });

  it('should login and store session', () => {
    service.login('j@e.com', 'pass', 'captcha1', 0).subscribe(user => {
      expect(user.name).toBe('John');
    });

    const loginReq = httpMock.expectOne(`${apiUrl}/login`);
    expect(loginReq.request.body).toEqual({ email: 'j@e.com', pwd: 'pass', captchaId: 'captcha1', captchaIndex: 0 });
    loginReq.flush(mockUser);

    // Login triggers a second request to get full user
    const fullUserReq = httpMock.expectOne(`${apiUrl}/get-user-by-id/1`);
    fullUserReq.flush(mockUser);

    expect(service.isLoggedIn).toBe(true);
    expect(service.currentUser?.email).toBe('j@e.com');
  });

  it('should logout and navigate to login', () => {
    // Set up a logged-in state
    (service as any).setSession(mockUser);
    expect(service.isLoggedIn).toBe(true);

    service.logout();

    // Fire-and-forget invalidation request
    httpMock.expectOne(`${apiUrl}/session/1/invalidate`).flush({});

    expect(service.isLoggedIn).toBe(false);
    expect(service.currentUser).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('should return correct role', () => {
    (service as any).setSession(mockUser);
    expect(service.userRole).toBe('ETUDIANT');
  });

  it('should return empty role when not logged in', () => {
    expect(service.userRole).toBe('');
  });

  it('should redirect ADMIN to /admin', () => {
    expect(service.getRedirectUrlForRole('ADMIN')).toBe('/admin');
  });

  it('should redirect TUTEUR to /tutor', () => {
    expect(service.getRedirectUrlForRole('TUTEUR')).toBe('/tutor');
  });

  it('should redirect ETUDIANT to /courses', () => {
    expect(service.getRedirectUrlForRole('ETUDIANT')).toBe('/courses');
  });

  it('should redirect unknown role to /courses', () => {
    expect(service.getRedirectUrlForRole('UNKNOWN')).toBe('/courses');
  });

  it('should set session from verification', () => {
    service.setSessionFromVerification(mockUser);
    expect(service.isLoggedIn).toBe(true);
    expect(service.currentUser?.id).toBe(1);
  });

  it('should handle 403 banned user error', () => {
    service.login('banned@e.com', 'pass', 'c', 0).subscribe({
      error: (err) => {
        expect(err.type).toBe('ban');
        expect(err.banReason).toBe('Spam');
      }
    });

    httpMock.expectOne(`${apiUrl}/login`).flush(
      { banned: true, message: 'Banned', banReason: 'Spam', permanent: false },
      { status: 403, statusText: 'Forbidden' }
    );
  });

  it('should handle 401 error', () => {
    service.login('wrong@e.com', 'wrong', 'c', 0).subscribe({
      error: (err) => expect(err).toContain('Invalid')
    });
    httpMock.expectOne(`${apiUrl}/login`).flush(
      { message: 'Invalid email or password.' },
      { status: 401, statusText: 'Unauthorized' }
    );
  });

  it('should emit currentUser$ observable', () => {
    let emitted: AuthUser | null = null;
    service.currentUser$.subscribe(u => { emitted = u; });
    (service as any).setSession(mockUser);
    expect(emitted).toEqual(mockUser);
  });
});
