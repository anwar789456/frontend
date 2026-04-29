import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { DonationService } from './donation.service';
import { Donation, DonationStatus, DonationType, ItemCondition } from '../models/donation.model';

describe('DonationService', () => {
  let service: DonationService;
  let httpMock: HttpTestingController;
  const apiUrl = 'https://minolingo.online/api/donations';

  const mockDonation: Donation = {
    id: 1, userId: 10, type: DonationType.VETEMENT, itemName: 'Winter Jacket',
    description: 'Warm jacket', quantity: 1, condition: ItemCondition.BON_ETAT,
    anonymous: false, status: DonationStatus.PENDING, imageUrl: 'jacket.jpg'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), DonationService]
    });
    service = TestBed.inject(DonationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => { httpMock.verify(); });

  it('should be created', () => { expect(service).toBeTruthy(); });

  // ── CRUD ──

  it('should create a donation', () => {
    service.create(mockDonation).subscribe(d => expect(d.itemName).toBe('Winter Jacket'));
    const req = httpMock.expectOne(`${apiUrl}/create-donation`);
    expect(req.request.method).toBe('POST');
    req.flush(mockDonation);
  });

  it('should get all donations', () => {
    service.getAll().subscribe(d => expect(d.length).toBe(2));
    httpMock.expectOne(`${apiUrl}/get-all-donations`).flush([mockDonation, { ...mockDonation, id: 2 }]);
  });

  it('should get donation by ID', () => {
    service.getById(1).subscribe(d => expect(d.id).toBe(1));
    httpMock.expectOne(`${apiUrl}/get-donation/1`).flush(mockDonation);
  });

  it('should update a donation', () => {
    const updated = { ...mockDonation, itemName: 'Updated Jacket' };
    service.update(1, updated).subscribe(d => expect(d.itemName).toBe('Updated Jacket'));
    httpMock.expectOne(`${apiUrl}/update-donation/1`).flush(updated);
  });

  it('should delete a donation', () => {
    service.delete(1).subscribe();
    const req = httpMock.expectOne(`${apiUrl}/delete-donation/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  // ── STATUS UPDATE ──

  it('should update donation status', () => {
    service.updateStatus(1, DonationStatus.ACCEPTED).subscribe(d => expect(d.status).toBe('ACCEPTED'));
    const req = httpMock.expectOne(r => r.url === `${apiUrl}/update-status/1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.params.get('status')).toBe('ACCEPTED');
    req.flush({ ...mockDonation, status: DonationStatus.ACCEPTED });
  });

  // ── QR CODE ──

  it('should get QR code as blob', () => {
    service.getQrCode(1).subscribe(blob => expect(blob).toBeTruthy());
    const req = httpMock.expectOne(`${apiUrl}/1/qrcode`);
    req.flush(new Blob(['qr'], { type: 'image/png' }));
  });

  // ── REVIEW ──

  it('should review a donation', () => {
    const payload = { moderatorId: 5, decision: DonationStatus.ACCEPTED, reason: 'Good quality' };
    service.review(1, payload).subscribe(r => expect(r).toBeTruthy());
    const req = httpMock.expectOne(`${apiUrl}/1/review`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ success: true });
  });

  it('should get reviews', () => {
    service.getReviews(1).subscribe(r => expect(r.length).toBe(1));
    httpMock.expectOne(`${apiUrl}/1/reviews`).flush([{ moderatorId: 5, decision: 'ACCEPTED' }]);
  });

  // ── FAVORITES ──

  it('should get favorites', () => {
    service.getFavorites(10).subscribe(f => expect(f.length).toBe(1));
    const req = httpMock.expectOne(r => r.url === `${apiUrl}/favorites`);
    expect(req.request.params.get('userId')).toBe('10');
    req.flush([mockDonation]);
  });

  it('should add favorite', () => {
    service.addFavorite(1, 10).subscribe();
    const req = httpMock.expectOne(r => r.url === `${apiUrl}/1/favorite` && r.method === 'POST');
    expect(req.request.params.get('userId')).toBe('10');
    req.flush({});
  });

  it('should remove favorite', () => {
    service.removeFavorite(1, 10).subscribe();
    const req = httpMock.expectOne(r => r.url === `${apiUrl}/1/favorite` && r.method === 'DELETE');
    expect(req.request.params.get('userId')).toBe('10');
    req.flush(null);
  });

  // ── COMMENTS ──

  it('should add a comment', () => {
    service.addComment(1, { userId: 10, text: 'Nice!' }).subscribe(r => expect(r).toBeTruthy());
    const req = httpMock.expectOne(`${apiUrl}/1/comments`);
    expect(req.request.method).toBe('POST');
    req.flush({ id: 1, text: 'Nice!' });
  });

  it('should get comments', () => {
    service.getComments(1).subscribe(c => expect(c.length).toBe(1));
    httpMock.expectOne(`${apiUrl}/1/comments`).flush([{ id: 1, text: 'Nice!' }]);
  });

  it('should delete a comment', () => {
    service.deleteComment(1, 5).subscribe();
    const req = httpMock.expectOne(`${apiUrl}/1/comments/5`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  // ── IMAGE UPLOAD ──

  it('should upload an image', () => {
    const file = new File(['img'], 'photo.jpg', { type: 'image/jpeg' });
    service.uploadImage(file).subscribe(url => expect(url).toContain('photo'));
    const req = httpMock.expectOne(`${apiUrl}/upload-image`);
    expect(req.request.body instanceof FormData).toBe(true);
    req.flush('https://cdn.example.com/photo.jpg');
  });

  // ── STATS ──

  it('should get donation stats', () => {
    service.getStats(10).subscribe(s => expect(s.total).toBe(5));
    httpMock.expectOne(`${apiUrl}/stats/10`).flush({ total: 5, accepted: 3 });
  });

  // ── MERCI POINTS ──

  it('should get merci points total', () => {
    service.getMerciPointsTotal(10).subscribe(r => {
      expect(r.userId).toBe(10);
      expect(r.totalPoints).toBe(150);
    });
    httpMock.expectOne(`${apiUrl}/merci-points/total/10`).flush({ userId: 10, totalPoints: 150 });
  });

  it('should get merci points history', () => {
    service.getMerciPointsHistory(10).subscribe(h => expect(h.length).toBe(2));
    httpMock.expectOne(`${apiUrl}/merci-points/history/10`).flush([{ points: 50 }, { points: 100 }]);
  });

  // ── GAMIFICATION ──

  it('should get gamification data', () => {
    service.getGamification(10).subscribe(g => {
      expect(g.level).toBe('Silver');
      expect(g.badges.length).toBe(2);
    });
    httpMock.expectOne(`${apiUrl}/10/gamification`).flush({
      userId: 10, points: 300, level: 'Silver', badges: ['first_donation', 'streak_3'],
      nextLevel: 'Gold', pointsToNext: 200, progress: 60
    });
  });
});
