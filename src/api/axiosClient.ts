import axios, { InternalAxiosRequestConfig } from 'axios';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { UserProfileDto } from '../dto/UserProfileDto'; // Assurez-vous d'avoir ce DTO

// INTERFACES (existantes)
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

// INSTANCE AXIOS (existante)
const axiosClient = axios.create({
    baseURL: 'http://localhost:8080/api',
    timeout: 10000,
});

// MODULE DECLARATION (existante)
declare module 'axios' {
    export interface AxiosRequestConfig {
        _retry?: boolean;
    }
}

// INTERCEPTEUR (existant)
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

// FONCTIONS D'API (existantes)
export const fetchMyProducts = async (): Promise<UserProduct[]> => {
    const response = await axiosClient.get<UserProduct[]>('/user/products');
    return response.data;
};
export const getDownloadLink = async (productId: number): Promise<DownloadLinkResponse> => {
    const response = await axiosClient.get<DownloadLinkResponse>(`/products/${productId}/download-link`);
    return response.data;
};
export const fetchMyBookings = async (): Promise<UserBooking[]> => {
    const response = await axiosClient.get<UserBooking[]>('/bookings/me');
    return response.data;
};

// ▼▼▼ NOUVELLE FONCTION D'API ▼▼▼
export const uploadProfileImage = async (file: File): Promise<UserProfileDto> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await axiosClient.post<UserProfileDto>('/users/me/profile-image', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
};