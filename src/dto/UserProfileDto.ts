export interface UserProfileDto {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    status: string;
    preferredLanguage: string;
    phoneNumber: string;
    address: string;
    emailVerified: boolean;
    mfaEnabled: boolean;
    profileImageUrl: string | null;
}