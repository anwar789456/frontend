export interface Donation {
  id?: number;
  userId?: number | null;
  type?: DonationType;
  itemName?: string;
  description?: string;
  quantity?: number;
  condition?: ItemCondition;
  anonymous?: boolean;
  status: DonationStatus;
  donatedAt?: string;
  imageUrl?: string;
  amount?: number;
  paymentMethod?: string;
  message?: string;
}

export enum DonationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED'
}

export enum DonationType {
  VETEMENT = 'VETEMENT',
  JEU = 'JEU'
}

export enum ItemCondition {
  NEUF = 'NEUF',
  BON_ETAT = 'BON_ETAT',
  ACCEPTABLE = 'ACCEPTABLE'
}

export interface DonationCause {
  id: number;
  title: string;
  description: string;
  image: string;
  category: string;
  location?: string;
  backers: number;
  raised: number;
  goal?: number;
  isFeatured?: boolean;
  startDate?: string;
}
