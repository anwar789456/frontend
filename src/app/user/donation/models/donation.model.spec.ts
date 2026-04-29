import { Donation, DonationStatus, DonationType, ItemCondition, DonationCause } from './donation.model';

describe('Donation Models', () => {

  describe('Donation', () => {
    it('should create a valid donation', () => {
      const d: Donation = {
        id: 1, type: DonationType.VETEMENT, itemName: 'Jacket',
        quantity: 1, condition: ItemCondition.NEUF, anonymous: false,
        status: DonationStatus.PENDING
      };
      expect(d.type).toBe('VETEMENT');
      expect(d.status).toBe('PENDING');
    });

    it('should support anonymous donations', () => {
      const d: Donation = {
        type: DonationType.JEU, itemName: 'Board Game',
        quantity: 2, condition: ItemCondition.ACCEPTABLE, anonymous: true,
        status: DonationStatus.ACCEPTED
      };
      expect(d.anonymous).toBe(true);
    });

    it('should support nullable userId', () => {
      const d: Donation = {
        type: DonationType.VETEMENT, itemName: 'T-shirt',
        quantity: 1, condition: ItemCondition.BON_ETAT, anonymous: true,
        status: DonationStatus.PENDING, userId: null
      };
      expect(d.userId).toBeNull();
    });
  });

  describe('DonationStatus enum', () => {
    it('should have 3 values', () => {
      expect(Object.keys(DonationStatus).length).toBe(3);
      expect(DonationStatus.PENDING).toBe('PENDING');
      expect(DonationStatus.ACCEPTED).toBe('ACCEPTED');
      expect(DonationStatus.REJECTED).toBe('REJECTED');
    });
  });

  describe('DonationType enum', () => {
    it('should have 2 values', () => {
      expect(Object.keys(DonationType).length).toBe(2);
      expect(DonationType.VETEMENT).toBe('VETEMENT');
      expect(DonationType.JEU).toBe('JEU');
    });
  });

  describe('ItemCondition enum', () => {
    it('should have 3 values', () => {
      expect(Object.keys(ItemCondition).length).toBe(3);
      expect(ItemCondition.NEUF).toBe('NEUF');
      expect(ItemCondition.BON_ETAT).toBe('BON_ETAT');
      expect(ItemCondition.ACCEPTABLE).toBe('ACCEPTABLE');
    });
  });

  describe('DonationCause', () => {
    it('should create a valid cause', () => {
      const c: DonationCause = {
        id: 1, title: 'Help Kids', description: 'Donate clothes',
        image: 'cause.jpg', category: 'Children', backers: 50, raised: 1000
      };
      expect(c.title).toBe('Help Kids');
      expect(c.backers).toBe(50);
    });

    it('should support optional fields', () => {
      const c: DonationCause = {
        id: 1, title: 'T', description: 'D', image: 'i', category: 'C',
        backers: 0, raised: 0, location: 'Tunis', goal: 5000, isFeatured: true, startDate: '2026-01-01'
      };
      expect(c.location).toBe('Tunis');
      expect(c.goal).toBe(5000);
    });
  });
});
