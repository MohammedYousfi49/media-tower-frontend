// Fichier : src/api/axiosClient.ts (COMPLET ET CORRIGÉ)

import axios, { InternalAxiosRequestConfig } from 'axios';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { UserProfileDto } from '../dto/UserProfileDto';

// --- INTERFACES ---
export interface UserProduct {
    productId: number;
    names: { [key: string]: string };
    thumbnailUrl: string | null;
    purchaseDate: string;
    accessExpiresAt: string | null;
    downloadCount: number;
}

export interface DownloadLinkResponse {
    downloadUrl: string;
}

export interface UserBooking {
    id: number;
    customerName: string;
    customerEmail: string;
    serviceName: string;
    status: string;
    adminName: string | null;
    customerNotes: string;
    createdAt: string;
    serviceImageUrl?: string;
}

export interface PasswordHistory {
    changeDate: string;
    changeMethod: string;
    ipAddress: string;
}

export interface LoginHistory {
    timestamp: string;
    ipAddress: string;
    details: string;
}

export interface AuditLog {
    id: number;
    user: { id: number; email: string; };
    action: string;
    ipAddress: string;
    details: string;
    timestamp: string;
}

export interface PaginatedResponse<T> {
    content: T[];
    totalPages: number;
    totalElements: number;
    number: number;
}


// --- INSTANCE AXIOS ---
const axiosClient = axios.create({
    baseURL: 'http://localhost:8080/api',
    timeout: 10000,
});

declare module 'axios' {
    export interface AxiosRequestConfig {
        _retry?: boolean;
    }
}

axiosClient.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
        const user = auth.currentUser;
        if (user) {
            try {
                const token = await user.getIdToken(true);
                config.headers = config.headers || {};
                config.headers['Authorization'] = `Bearer ${token}`;
            } catch (error) {
                console.error("Failed to get fresh auth token:", error);
                await signOut(auth);
            }
        }
        return config;
    },
    (error) => Promise.reject(error)
);

export default axiosClient;

// --- FONCTIONS D'API ---

export const fetchMyProducts = async (): Promise<UserProduct[]> => {
    const response = await axiosClient.get<UserProduct[]>('/user/products');
    return response.data;
};

export const getDownloadLink = async (productId: number): Promise<DownloadLinkResponse> => {
    // ▼▼▼ CORRECTION DE L'URL ICI ▼▼▼
    // On utilise la route sécurisée de UserProductController
    const response = await axiosClient.get<DownloadLinkResponse>(`/user/products/${productId}/download-link`);
    // ▲▲▲ FIN DE LA CORRECTION ▲▲▲
    return response.data;
};

export const fetchMyBookings = async (): Promise<UserBooking[]> => {
    const response = await axiosClient.get<UserBooking[]>('/bookings/me');
    return response.data;
};

export const uploadProfileImage = async (file: File): Promise<UserProfileDto> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await axiosClient.post<UserProfileDto>('/users/me/profile-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
};

export const updateUserProfile = async (profileData: Partial<Pick<UserProfileDto, 'firstName' | 'lastName' | 'phoneNumber' | 'address'>>): Promise<UserProfileDto> => {
    const response = await axiosClient.put<UserProfileDto>('/users/me', profileData);
    return response.data;
};

export const fetchPasswordHistory = async (): Promise<PasswordHistory[]> => {
    const response = await axiosClient.get('/users/me/password-history');
    return response.data;
};

export const fetchLoginHistory = async (): Promise<LoginHistory[]> => {
    const response = await axiosClient.get('/users/me/login-history');
    return response.data;
};

export const fetchAuditLogs = async (page: number, size: number): Promise<PaginatedResponse<AuditLog>> => {
    const response = await axiosClient.get('/admin/audit-logs', {
        params: { page, size }
    });
    return response.data;
};