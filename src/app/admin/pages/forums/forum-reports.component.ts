import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ForumService } from '../../../user/forum/services/forum.service';
import { ForumReport } from '../../../user/forum/models/forum-report.model';

@Component({
    selector: 'app-admin-forum-reports',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './forum-reports.component.html'
})
export class AdminForumReportsComponent implements OnInit {
    reports: ForumReport[] = [];
    filteredReports: ForumReport[] = [];
    selectedReport: ForumReport | null = null;
    searchQuery = '';
    activeTab = 'ALL';
    adminNote = '';
    isLoading = true;
    actionLoading = false;
    showDeleteConfirm = false;
    deleteTargetId: number | null = null;

    tabs = ['ALL', 'PENDING', 'INVESTIGATING', 'RESOLVED', 'DISMISSED'];

    // Stats
    stats = {
        total: 0,
        pending: 0,
        investigating: 0,
        resolved: 0,
        dismissed: 0
    };

    constructor(private forumService: ForumService) { }

    ngOnInit(): void {
        this.loadReports();
    }

    loadReports(): void {
        this.isLoading = true;
        this.forumService.getAllReports().subscribe({
            next: (reports) => {
                this.reports = reports.sort((a, b) => {
                    const dateA = new Date(a.createdAt || 0).getTime();
                    const dateB = new Date(b.createdAt || 0).getTime();
                    return dateB - dateA;
                });
                this.computeStats();
                this.applyFilter();
                this.isLoading = false;
            },
            error: () => {
                this.reports = [];
                this.filteredReports = [];
                this.isLoading = false;
            }
        });
    }

    computeStats(): void {
        this.stats.total = this.reports.length;
        this.stats.pending = this.reports.filter(r => r.status === 'PENDING').length;
        this.stats.investigating = this.reports.filter(r => r.status === 'INVESTIGATING').length;
        this.stats.resolved = this.reports.filter(r => r.status === 'RESOLVED').length;
        this.stats.dismissed = this.reports.filter(r => r.status === 'DISMISSED').length;
    }

    applyFilter(): void {
        let result = this.reports;

        if (this.activeTab !== 'ALL') {
            result = result.filter(r => r.status === this.activeTab);
        }

        if (this.searchQuery.trim()) {
            const q = this.searchQuery.toLowerCase();
            result = result.filter(r =>
                r.reportedUserName.toLowerCase().includes(q) ||
                r.reporterName.toLowerCase().includes(q) ||
                r.reason.toLowerCase().includes(q) ||
                (r.postContent || '').toLowerCase().includes(q) ||
                (r.description || '').toLowerCase().includes(q)
            );
        }

        this.filteredReports = result;
    }

    setActiveTab(tab: string): void {
        this.activeTab = tab;
        this.applyFilter();
    }

    onSearchChange(): void {
        this.applyFilter();
    }

    selectReport(report: ForumReport): void {
        this.selectedReport = report;
        this.adminNote = report.adminNote || '';
    }

    closeDetail(): void {
        this.selectedReport = null;
        this.adminNote = '';
    }

    getTabCount(tab: string): number {
        if (tab === 'ALL') return this.stats.total;
        if (tab === 'PENDING') return this.stats.pending;
        if (tab === 'INVESTIGATING') return this.stats.investigating;
        if (tab === 'RESOLVED') return this.stats.resolved;
        if (tab === 'DISMISSED') return this.stats.dismissed;
        return 0;
    }

    // Actions
    updateStatus(reportId: number, status: string): void {
        this.actionLoading = true;
        this.forumService.updateReportStatus(reportId, status, this.adminNote || undefined).subscribe({
            next: (updated) => {
                const idx = this.reports.findIndex(r => r.id === reportId);
                if (idx !== -1) {
                    this.reports[idx] = updated;
                }
                if (this.selectedReport?.id === reportId) {
                    this.selectedReport = updated;
                }
                this.computeStats();
                this.applyFilter();
                this.actionLoading = false;
            },
            error: () => {
                this.actionLoading = false;
            }
        });
    }

    markInvestigating(report: ForumReport): void {
        if (report.id) this.updateStatus(report.id, 'INVESTIGATING');
    }

    resolveReport(report: ForumReport): void {
        if (report.id) this.updateStatus(report.id, 'RESOLVED');
    }

    dismissReport(report: ForumReport): void {
        if (report.id) this.updateStatus(report.id, 'DISMISSED');
    }

    deleteReportedPost(report: ForumReport): void {
        if (!report.postId) return;
        this.actionLoading = true;
        this.forumService.deletePost(report.postId).subscribe({
            next: () => {
                if (report.id) this.updateStatus(report.id, 'RESOLVED');
                this.actionLoading = false;
            },
            error: () => {
                this.actionLoading = false;
            }
        });
    }

    confirmDeleteReport(reportId: number): void {
        this.showDeleteConfirm = true;
        this.deleteTargetId = reportId;
    }

    cancelDeleteReport(): void {
        this.showDeleteConfirm = false;
        this.deleteTargetId = null;
    }

    executeDeleteReport(): void {
        if (!this.deleteTargetId) return;
        this.actionLoading = true;
        this.forumService.deleteReport(this.deleteTargetId).subscribe({
            next: () => {
                this.reports = this.reports.filter(r => r.id !== this.deleteTargetId);
                if (this.selectedReport?.id === this.deleteTargetId) {
                    this.selectedReport = null;
                }
                this.computeStats();
                this.applyFilter();
                this.showDeleteConfirm = false;
                this.deleteTargetId = null;
                this.actionLoading = false;
            },
            error: () => {
                this.showDeleteConfirm = false;
                this.deleteTargetId = null;
                this.actionLoading = false;
            }
        });
    }

    // Helpers
    getStatusColor(status?: string): string {
        switch (status) {
            case 'PENDING': return 'bg-orange-100 text-orange-600';
            case 'INVESTIGATING': return 'bg-blue-100 text-blue-600';
            case 'RESOLVED': return 'bg-green-100 text-green-600';
            case 'DISMISSED': return 'bg-gray-100 text-gray-500';
            default: return 'bg-gray-100 text-gray-500';
        }
    }

    getReasonColor(reason: string): string {
        switch (reason) {
            case 'Inappropriate Language': return 'text-orange-500';
            case 'Spam': return 'text-yellow-600';
            case 'Harassment': return 'text-red-600';
            case 'Misinformation': return 'text-purple-500';
            case 'Hate Speech': return 'text-red-700';
            case 'Other': return 'text-gray-500';
            default: return 'text-gray-500';
        }
    }

    getPriorityFromReason(reason: string): { label: string; color: string } {
        switch (reason) {
            case 'Hate Speech':
            case 'Harassment':
                return { label: 'HIGH', color: 'text-red-600 bg-red-50' };
            case 'Inappropriate Language':
            case 'Misinformation':
                return { label: 'MEDIUM', color: 'text-orange-600 bg-orange-50' };
            case 'Spam':
            case 'Other':
            default:
                return { label: 'LOW', color: 'text-yellow-600 bg-yellow-50' };
        }
    }

    getTimeAgo(dateStr?: string): string {
        if (!dateStr) return 'Unknown';
        let date: Date;
        if (!dateStr.endsWith('Z') && !dateStr.includes('+') && !dateStr.includes('-', 10)) {
            date = new Date(dateStr + 'Z');
        } else {
            date = new Date(dateStr);
        }
        const diff = Date.now() - date.getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 0) return 'just now';
        if (mins < 1) return 'just now';
        if (mins < 60) return mins + 'm ago';
        const hours = Math.floor(mins / 60);
        if (hours < 24) return hours + 'h ago';
        const days = Math.floor(hours / 24);
        if (days < 30) return days + 'd ago';
        const months = Math.floor(days / 30);
        return months + 'mo ago';
    }

    getInitials(name: string): string {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
}
