/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useEffect, useContext, useCallback } from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { Client, over } from 'stompjs';
import SockJS from 'sockjs-client';
import { auth } from '../lib/firebase';
import axiosClient from '../api/axiosClient';
import { AxiosError } from 'axios';
import { useNavigate } from 'react-router-dom';
import { ReactNode } from 'react';

// --- Définition des Types ---
export interface AppUser {
    id: number;
    uid: string;
    email: string;
    firstName: string;
    lastName: string;
    role: 'USER' | 'ADMIN' | 'SELLER';
    status: 'ACTIVE' | 'BLOCKED';
    emailVerified: boolean;
    mfaEnabled: boolean;
    mfaVerified?: boolean;
    profileImageUrl?: string | null; // <-- CHAMP AJOUTÉ ICI
}

interface AuthContextType {
    currentUser: User | null;
    appUser: AppUser | null;
    loading: boolean;
    stompClient: Client | null;
    setAppUser: (user: AppUser | null) => void;
    setIsRegistering: (isRegistering: boolean) => void;
    refreshAppUser: (options?: { mfaVerified?: boolean }) => Promise<void>;
}

// --- Création du Contexte ---
export const AuthContext = createContext<AuthContextType>({
    currentUser: null,
    appUser: null,
    loading: true,
    stompClient: null,
    setAppUser: () => {},
    setIsRegistering: () => {},
    refreshAppUser: async () => {},
});

// --- Hook Personnalisé ---
export const useAuth = () => useContext(AuthContext);

// --- Le Composant Provider ---
let stompConnection: Client | null = null;

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [appUser, setAppUser] = useState<AppUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [stompClient, setStompClient] = useState<Client | null>(null);
    const [authInitialized, setAuthInitialized] = useState(false);
    const [isRegistering, setIsRegistering] = useState(false);
    const navigate = useNavigate();
    const [isMfaSessionVerified, setIsMfaSessionVerified] = useState(false);

    const connectWebSocket = useCallback(async (user: User) => {
        if (stompConnection?.connected) {
            setStompClient(stompConnection);
            return;
        }
        try {
            const token = await user.getIdToken(true);
            const socket = new SockJS('http://localhost:8080/ws');
            const client = over(socket);
            client.debug = () => {};
            client.connect({ Authorization: `Bearer ${token}` }, () => {
                stompConnection = client;
                setStompClient(client);
                console.log('WebSocket connected successfully');
            }, (error) => {
                console.error("WebSocket connection failed:", error);
                stompConnection = null;
                setStompClient(null);
            });
        } catch (error) {
            console.error("WebSocket Auth Error:", error);
        }
    }, []);

    const disconnectWebSocket = useCallback(() => {
        if (stompConnection?.connected) {
            stompConnection.disconnect(() => {
                console.log('WebSocket disconnected');
                stompConnection = null;
                setStompClient(null);
            });
        } else {
            stompConnection = null;
            setStompClient(null);
        }
    }, []);

    const refreshAppUser = useCallback(async (options?: { mfaVerified?: boolean }) => {
        if (options?.mfaVerified) {
            setIsMfaSessionVerified(true);
        }

        const user = auth.currentUser;
        if (!user) {
            setAppUser(null);
            return;
        }

        try {
            const token = await user.getIdToken(true);
            const response = await axiosClient.get<AppUser>('/users/me', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const updatedUser = {
                ...response.data,
                mfaVerified: isMfaSessionVerified
            };
            setAppUser(updatedUser);
        } catch (error) {
            console.error("AuthContext: Failed to refresh app user", error);
            if (error instanceof AxiosError) {
                switch (error.response?.status) {
                    case 401:
                        await auth.signOut();
                        break;
                    case 403:
                        navigate('/login?status=unauthorized', { replace: true });
                        await auth.signOut();
                        break;
                }
            }
        }
    }, [navigate, isMfaSessionVerified]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setCurrentUser(user);

            if (user) {
                if (isRegistering) {
                    setLoading(false);
                    return;
                }
                setLoading(true);
                try {
                    const token = await user.getIdToken(true);
                    const response = await axiosClient.get<AppUser>('/users/me', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });

                    setAppUser({ ...response.data, mfaVerified: isMfaSessionVerified });
                    await connectWebSocket(user);
                } catch (error) {
                    console.error("AuthContext: Failed to fetch user data on auth state change.", error);
                    if (error instanceof AxiosError && (error.response?.status === 401 || error.response?.status === 403)) {
                        await auth.signOut();
                    }
                    setAppUser(null);
                } finally {
                    setLoading(false);
                }
            } else {
                setIsMfaSessionVerified(false);
                setAppUser(null);
                disconnectWebSocket();
                setLoading(false);
            }

            if (!authInitialized) {
                setAuthInitialized(true);
            }
        });
        return () => unsubscribe();
    }, [authInitialized, connectWebSocket, disconnectWebSocket, navigate, isRegistering, isMfaSessionVerified]);

    useEffect(() => {
        return () => {
            disconnectWebSocket();
        };
    }, [disconnectWebSocket]);

    const value = {
        currentUser,
        appUser,
        loading,
        stompClient,
        setAppUser,
        setIsRegistering,
        refreshAppUser
    };

    if (!authInitialized) {
        return (
            <div className="flex justify-center items-center h-screen bg-gray-900 text-white">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-400">Initializing application...</p>
                </div>
            </div>
        );
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const AuthProviderWrapper = ({ children }: { children: ReactNode }) => {
    return <AuthProvider>{children}</AuthProvider>;
};