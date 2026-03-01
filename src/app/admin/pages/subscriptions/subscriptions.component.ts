import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  SubscriptionPlan, PlanType, UserSubscription, SubscriptionStatus
} from '../../../user/subscription/models/subscription.model';
import { SubscriptionService } from '../../../user/subscription/services/subscription.service';

@Component({
  selector: 'app-admin-subscriptions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './subscriptions.component.html'
})
export class SubscriptionsComponent implements OnInit {
  plans: SubscriptionPlan[] = [];
  subscriptions: UserSubscription[] = [];
  isLoading = true;
  error: string | null = null;

  // View toggle: 'plans' or 'subscriptions'
  viewMode: 'plans' | 'subscriptions' = 'plans';

  // Plans tabs
  planTabs = ['All Plans', 'Basic', 'Plus', 'Premium'];
  activePlanTab = 'All Plans';

  // Subscriptions tabs
  subTabs = ['All Subs', 'Active', 'Expired', 'Cancelled'];
  activeSubTab = 'All Subs';

  selectedPlan: SubscriptionPlan | null = null;
  selectedSub: UserSubscription | null = null;

  // Plan Modal
  showPlanModal = false;
  isEditingPlan = false;
  isSavingPlan = false;
  showDeletePlanConfirm = false;
  isDeletingPlan = false;
  planFormData: Partial<SubscriptionPlan> = {};
  planTypes: PlanType[] = [PlanType.FREEMIUM, PlanType.STANDARD, PlanType.PREMIUM];
  planFormSubmitted = false;
  planFormErrors: { [key: string]: string } = {};

  // Subscription Modal
  showSubModal = false;
  isEditingSub = false;
  isSavingSub = false;
  showDeleteSubConfirm = false;
  isDeletingSub = false;
  subFormData: Partial<UserSubscription> = {};
  subStatuses: SubscriptionStatus[] = [SubscriptionStatus.ACTIVE, SubscriptionStatus.EXPIRED, SubscriptionStatus.CANCELLED];
  subFormSubmitted = false;
  subFormErrors: { [key: string]: string } = {};

  constructor(
    private subService: SubscriptionService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadAll();
  }

  loadAll(): void {
    this.isLoading = true;
    this.error = null;

    // Load plans
    this.subService.getAllPlans().subscribe({
      next: (data: SubscriptionPlan[]) => {
        this.plans = data;
        if (this.plans.length > 0 && !this.selectedPlan) {
          this.selectedPlan = this.plans[0];
        }
        this.loadSubscriptions();
      },
      error: (err: unknown) => {
        console.error('Failed to load plans:', err);
        this.error = 'Failed to load subscription plans.';
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  loadSubscriptions(): void {
    this.subService.getAllSubscriptions().subscribe({
      next: (data: UserSubscription[]) => {
        this.subscriptions = data;
        if (this.subscriptions.length > 0 && !this.selectedSub) {
          this.selectedSub = this.subscriptions[0];
        }
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (err: unknown) => {
        console.error('Failed to load subscriptions:', err);
        // Plans loaded fine, just note the sub error
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  // --- Stats ---
  get stats() {
    const active = this.subscriptions.filter(s => s.status === SubscriptionStatus.ACTIVE);
    const expired = this.subscriptions.filter(s => s.status === SubscriptionStatus.EXPIRED);
    const cancelled = this.subscriptions.filter(s => s.status === SubscriptionStatus.CANCELLED);
    const mrr = active.reduce((sum, s) => sum + (s.plan?.price || 0), 0);

    return [
      { label: 'Monthly Revenue', value: `${mrr.toFixed(2)} TND`, sub: `From ${active.length} active`, subColor: 'text-green-500', valueColor: 'text-[#38a9f3]' },
      { label: 'Active Subscribers', value: `${active.length}`, sub: `${this.subscriptions.length} total`, subColor: 'text-green-500', valueColor: 'text-[#0f1419]' },
      { label: 'Plans Available', value: `${this.plans.length}`, sub: 'Configured', subColor: 'text-[#9ca3af]', valueColor: 'text-[#0f1419]' },
      { label: 'Cancelled', value: `${cancelled.length}`, sub: `${expired.length} expired`, subColor: 'text-red-500', valueColor: 'text-orange-500' }
    ];
  }

  // --- Plan Filtering ---
  get filteredPlans(): SubscriptionPlan[] {
    switch (this.activePlanTab) {
      case 'Basic': return this.plans.filter(p => p.name === PlanType.FREEMIUM);
      case 'Plus': return this.plans.filter(p => p.name === PlanType.STANDARD);
      case 'Premium': return this.plans.filter(p => p.name === PlanType.PREMIUM);
      default: return this.plans;
    }
  }

  // --- Subscription Filtering ---
  get filteredSubscriptions(): UserSubscription[] {
    switch (this.activeSubTab) {
      case 'Active': return this.subscriptions.filter(s => s.status === SubscriptionStatus.ACTIVE);
      case 'Expired': return this.subscriptions.filter(s => s.status === SubscriptionStatus.EXPIRED);
      case 'Cancelled': return this.subscriptions.filter(s => s.status === SubscriptionStatus.CANCELLED);
      default: return this.subscriptions;
    }
  }

  // --- Status helpers ---
  getSubStatusColor(status: SubscriptionStatus): string {
    switch (status) {
      case SubscriptionStatus.ACTIVE: return 'bg-green-100 text-green-600';
      case SubscriptionStatus.EXPIRED: return 'bg-yellow-100 text-yellow-600';
      case SubscriptionStatus.CANCELLED: return 'bg-red-100 text-red-500';
      default: return 'bg-gray-100 text-gray-500';
    }
  }

  getPlanColor(plan: PlanType | undefined): string {
    switch (plan) {
      case PlanType.FREEMIUM: return 'bg-gray-200 text-gray-700';
      case PlanType.STANDARD: return 'bg-[#38a9f3] text-white';
      case PlanType.PREMIUM: return 'bg-purple-500 text-white';
      default: return 'bg-gray-200 text-gray-700';
    }
  }

  getPlanIcon(plan: PlanType): string {
    switch (plan) {
      case PlanType.FREEMIUM: return '';
      case PlanType.STANDARD: return '';
      case PlanType.PREMIUM: return '';
      default: return '';
    }
  }

  // --- Selection ---
  selectPlan(plan: SubscriptionPlan): void {
    this.selectedPlan = plan;
  }

  selectSub(sub: UserSubscription): void {
    this.selectedSub = sub;
  }

  // ============================================
  // CRUD: Subscription Plans
  // ============================================

  openCreatePlanModal(): void {
    this.isEditingPlan = false;
    this.planFormData = {
      name: PlanType.STANDARD,
      price: 0,
      durationDays: 30,
      description: ''
    };
    this.planFormSubmitted = false;
    this.planFormErrors = {};
    this.showPlanModal = true;
    this.cdr.markForCheck();
  }

  openEditPlanModal(plan: SubscriptionPlan): void {
    this.isEditingPlan = true;
    this.planFormData = { ...plan };
    this.planFormSubmitted = false;
    this.planFormErrors = {};
    this.showPlanModal = true;
    this.cdr.markForCheck();
  }

  closePlanModal(): void {
    this.showPlanModal = false;
    this.planFormData = {};
    this.planFormSubmitted = false;
    this.planFormErrors = {};
    this.cdr.markForCheck();
  }

  validatePlanForm(): boolean {
    this.planFormErrors = {};

    if (!this.planFormData.name) {
      this.planFormErrors['name'] = 'Plan type is required.';
    }
    if (this.planFormData.price == null || this.planFormData.price < 0) {
      this.planFormErrors['price'] = 'Price must be 0 or greater.';
    }
    if (!this.planFormData.durationDays || this.planFormData.durationDays < 1) {
      this.planFormErrors['durationDays'] = 'Duration must be at least 1 day.';
    }
    if (!this.planFormData.description || this.planFormData.description.trim().length === 0) {
      this.planFormErrors['description'] = 'Description is required.';
    }

    return Object.keys(this.planFormErrors).length === 0;
  }

  savePlan(): void {
    this.planFormSubmitted = true;
    if (!this.validatePlanForm()) {
      this.cdr.markForCheck();
      return;
    }
    this.isSavingPlan = true;
    const data = { ...this.planFormData } as SubscriptionPlan;

    const obs = this.isEditingPlan
      ? this.subService.updatePlan(data.id!, data)
      : this.subService.createPlan(data);

    obs.subscribe({
      next: () => {
        this.showPlanModal = false;
        this.isSavingPlan = false;
        this.planFormData = {};
        this.planFormSubmitted = false;
        this.planFormErrors = {};
        this.selectedPlan = null;
        this.loadAll();
        this.cdr.markForCheck();
      },
      error: (err: unknown) => {
        console.error('Failed to save plan:', err);
        this.isSavingPlan = false;
        this.cdr.markForCheck();
      }
    });
  }

  confirmDeletePlan(): void {
    this.showDeletePlanConfirm = true;
    this.cdr.markForCheck();
  }

  cancelDeletePlan(): void {
    this.showDeletePlanConfirm = false;
    this.cdr.markForCheck();
  }

  deletePlan(): void {
    if (!this.selectedPlan?.id) return;
    this.isDeletingPlan = true;
    this.subService.deletePlan(this.selectedPlan.id).subscribe({
      next: () => {
        this.showDeletePlanConfirm = false;
        this.isDeletingPlan = false;
        this.selectedPlan = null;
        this.loadAll();
        this.cdr.markForCheck();
      },
      error: (err: unknown) => {
        console.error('Failed to delete plan:', err);
        this.isDeletingPlan = false;
        this.cdr.markForCheck();
      }
    });
  }

  // ============================================
  // CRUD: User Subscriptions
  // ============================================

  openCreateSubModal(): void {
    this.isEditingSub = false;
    this.subFormData = {
      userId: 0,
      subscribedAt: '',
      expiresAt: '',
      status: SubscriptionStatus.ACTIVE
    };
    this.subFormSubmitted = false;
    this.subFormErrors = {};
    this.showSubModal = true;
    this.cdr.markForCheck();
  }

  openEditSubModal(sub: UserSubscription): void {
    this.isEditingSub = true;
    this.subFormData = { ...sub };
    this.subFormSubmitted = false;
    this.subFormErrors = {};
    this.showSubModal = true;
    this.cdr.markForCheck();
  }

  closeSubModal(): void {
    this.showSubModal = false;
    this.subFormData = {};
    this.subFormSubmitted = false;
    this.subFormErrors = {};
    this.cdr.markForCheck();
  }

  validateSubForm(): boolean {
    this.subFormErrors = {};

    if (!this.subFormData.userId || this.subFormData.userId <= 0) {
      this.subFormErrors['userId'] = 'User ID must be a positive number.';
    }
    if (!this.subFormData.plan) {
      this.subFormErrors['plan'] = 'Please select a plan.';
    }
    if (!this.subFormData.status) {
      this.subFormErrors['status'] = 'Status is required.';
    }
    if (!this.subFormData.subscribedAt) {
      this.subFormErrors['subscribedAt'] = 'Subscribed date is required.';
    }
    if (!this.subFormData.expiresAt) {
      this.subFormErrors['expiresAt'] = 'Expiry date is required.';
    }
    if (this.subFormData.subscribedAt && this.subFormData.expiresAt) {
      if (new Date(this.subFormData.expiresAt) <= new Date(this.subFormData.subscribedAt)) {
        this.subFormErrors['expiresAt'] = 'Expiry date must be after subscribed date.';
      }
    }

    return Object.keys(this.subFormErrors).length === 0;
  }

  saveSub(): void {
    this.subFormSubmitted = true;
    if (!this.validateSubForm()) {
      this.cdr.markForCheck();
      return;
    }
    this.isSavingSub = true;
    const data = { ...this.subFormData } as UserSubscription;

    const obs = this.isEditingSub
      ? this.subService.updateSubscription(data.id!, data)
      : this.subService.createSubscription(data);

    obs.subscribe({
      next: () => {
        this.showSubModal = false;
        this.isSavingSub = false;
        this.subFormData = {};
        this.selectedSub = null;
        this.loadAll();
        this.cdr.markForCheck();
      },
      error: (err: unknown) => {
        console.error('Failed to save subscription:', err);
        this.isSavingSub = false;
        this.cdr.markForCheck();
      }
    });
  }

  confirmDeleteSub(): void {
    this.showDeleteSubConfirm = true;
    this.cdr.markForCheck();
  }

  cancelDeleteSub(): void {
    this.showDeleteSubConfirm = false;
    this.cdr.markForCheck();
  }

  deleteSub(): void {
    if (!this.selectedSub?.id) return;
    this.isDeletingSub = true;
    this.subService.deleteSubscription(this.selectedSub.id).subscribe({
      next: () => {
        this.showDeleteSubConfirm = false;
        this.isDeletingSub = false;
        this.selectedSub = null;
        this.loadAll();
        this.cdr.markForCheck();
      },
      error: (err: unknown) => {
        console.error('Failed to delete subscription:', err);
        this.isDeletingSub = false;
        this.cdr.markForCheck();
      }
    });
  }

  // --- Helpers ---
  formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric'
      });
    } catch { return dateStr; }
  }

  getDaysRemaining(expiresAt: string): string {
    if (!expiresAt) return '—';
    const diff = new Date(expiresAt).getTime() - new Date().getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days < 0) return 'Expired';
    if (days === 0) return 'Today';
    return `${days} days`;
  }

  getSubCountForPlan(planId: number | undefined): number {
    if (!planId) return 0;
    return this.subscriptions.filter(s => s.plan?.id === planId).length;
  }
}