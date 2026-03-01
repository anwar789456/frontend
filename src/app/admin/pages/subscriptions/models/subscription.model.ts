export enum PlanType {
  FREEMIUM = 'FREEMIUM',
  STANDARD = 'STANDARD',
  PREMIUM = 'PREMIUM'
}

export interface SubscriptionPlan {
  id?: number;
  name: PlanType;
  price: number;
  durationDays: number;
  description: string;
}

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED'
}

export interface UserSubscription {
  id?: number;
  userId: number;
  plan: SubscriptionPlan;
  subscribedAt: string;
  expiresAt: string;
  status: SubscriptionStatus;
}
