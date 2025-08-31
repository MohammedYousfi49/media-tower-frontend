import axios, { AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios'; // <<< CORRECTION : Ajout de InternalAxiosRequestConfig
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';

// ====================================================================
// ==              INTERFACES EXPORTÉES CORRECTEMENT               ==
// ====================================================================
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

// ====================================================================
// ==            INSTANCE AXIOS UNIQUE ET CENTRALISÉE              ==
// ====================================================================
const axiosClient = axios.create({
    baseURL: 'http://localhost:8080/api',
    timeout: 10000,
});

// Déclaration pour TypeScript pour ajouter la propriété _retry
declare module 'axios' {
    export interface AxiosRequestConfig {
        _retry?: boolean;
    }
}

// Intercepteur pour ajouter le token
axiosClient.interceptors.request.use(
    // <<< CORRECTION : Utilisation du type InternalAxiosRequestConfig
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

// ====================================================================
// ==       FONCTIONS D'API EXPORTÉES CORRECTEMENT (NOMMÉES)        ==
// ====================================================================
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