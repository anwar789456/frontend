export type RegistrationStatus = 'REGISTERED' | 'CONFIRMED' | 'ATTENDED' | 'CANCELLED' | 'NO_SHOW';

export interface EventRegistration {
    id?: number;

    // Event reference (may come as nested object or just ID)
    event?: { id: number };
    eventId?: number;

    // User info
    userId?: number;
    userName?: string;
    userEmail?: string;

    // Registration details
    registrationDate?: string;
    status?: RegistrationStatus;
}
