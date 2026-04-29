import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { AiDonationService, AiAnalysisRequest, AiAnalysisResponse, AiSuggestionRequest, AiSuggestionResponse } from './ai-donation.service';

describe('AiDonationService', () => {
  let service: AiDonationService;
  let httpMock: HttpTestingController;
  const apiUrl = 'https://minolingo.online/api/donations/ai';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), AiDonationService]
    });
    service = TestBed.inject(AiDonationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => { httpMock.verify(); });

  it('should be created', () => { expect(service).toBeTruthy(); });

  it('should analyze a donation', () => {
    const request: AiAnalysisRequest = {
      itemName: 'Winter Jacket', description: 'Warm jacket for kids',
      condition: 'BON_ETAT', quantity: 1, type: 'VETEMENT'
    };
    const mockResp: AiAnalysisResponse = {
      improvedText: 'High-quality winter jacket suitable for children',
      category: 'CLOTHING', categoryLabel: 'Clothing',
      impactScore: 85, suggestions: ['Add size info', 'Include photo']
    };

    service.analyzeDonation(request).subscribe(r => {
      expect(r.impactScore).toBe(85);
      expect(r.suggestions.length).toBe(2);
      expect(r.improvedText).toContain('winter jacket');
    });

    const req = httpMock.expectOne(`${apiUrl}/analyze-donation`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush(mockResp);
  });

  it('should get donation suggestions', () => {
    const request: AiSuggestionRequest = {
      userId: 10, previousDonationItems: ['jacket', 'shoes']
    };
    const mockResp: AiSuggestionResponse = {
      suggestions: ['Winter gloves', 'Scarf', 'Hat'],
      message: 'Based on your previous donations'
    };

    service.getSuggestions(request).subscribe(r => {
      expect(r.suggestions.length).toBe(3);
      expect(r.message).toContain('previous');
    });

    const req = httpMock.expectOne(`${apiUrl}/suggestions`);
    expect(req.request.method).toBe('POST');
    req.flush(mockResp);
  });
});
