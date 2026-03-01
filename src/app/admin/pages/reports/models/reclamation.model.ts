export type ReclamationStatus = 'PENDING' | 'INVESTIGATING' | 'RESOLVED' | 'ARCHIVED';
export type ReclamationPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface Reclamation {
  id: number;
  sujet: string;
  description: string;
  status: ReclamationStatus;
  priorite: ReclamationPriority;
  dateCreation: string;
  userId: number;
  userName?: string;
  userEmail?: string;
}
