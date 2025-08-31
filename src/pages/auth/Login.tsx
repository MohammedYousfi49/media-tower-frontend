import { useState, FormEvent, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams, Link, useLocation } from 'react-router-dom';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { FirebaseError } from 'firebase/app';
import { AxiosError } from 'axios';
import axiosClient from '../../api/axiosClient';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface RateLimitInfo {
    attempts: number;
    firstAttemptTime: number;
    lastAttemptTime: number;
}

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [emailLoading, setEmailLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [isNotVerifiedActionRequired, setIsNotVerifiedActionRequired] = useState(false);
    const [resendMessage, setResendMessage] = useState('');
    const [resendLoading, setResendLoading] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const [rateLimitBlocked, setRateLimitBlocked] = useState(false);
    const [rateLimitResetTime, setRateLimitResetTime] = useState<number | null>(null);

    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const { refreshAppUser } = useAuth();

    const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

    const cooldownIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const rateLimitIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const googleAuthProviderInstance = new GoogleAuthProvider();

    const MAX_ATTEMPTS = 5;
    const TIME_WINDOW_MINUTES = 60;
    const RATE_LIMIT_STORAGE_KEY = 'resendVerificationRateLimit';

    const getRateLimitInfo = (userEmail: string): RateLimitInfo | null => {
        try {
            const storedData = localStorage.getItem(`${RATE_LIMIT_STORAGE_KEY}_${userEmail}`);
            if (!storedData) return null;
            return JSON.parse(storedData);
        } catch (error) {
            console.error('Erreur lors de la récupération des données de rate limiting:', error);
            return null;
        }
    };

    const saveRateLimitInfo = (userEmail: string, info: RateLimitInfo) => {
        try {
            localStorage.setItem(`${RATE_LIMIT_STORAGE_KEY}_${userEmail}`, JSON.stringify(info));
        } catch (error) {
            console.error('Erreur lors de la sauvegarde des données de rate limiting:', error);
        }
    };

    const cleanupOldRateLimitData = () => {
        try {
            const keys = Object.keys(localStorage);
            const now = Date.now();
            keys.forEach(key => {
                if (key.startsWith(RATE_LIMIT_STORAGE_KEY)) {
                    const data = localStorage.getItem(key);
                    if (data) {
                        const rateLimitInfo: RateLimitInfo = JSON.parse(data);
                        if (now - rateLimitInfo.firstAttemptTime > TIME_WINDOW_MINUTES * 60 * 1000) {
                            localStorage.removeItem(key);
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Erreur lors du nettoyage des données de rate limiting:', error);
        }
    };

    const checkRateLimit = useCallback((userEmail: string): { allowed: boolean; remainingTime?: number } => {
        if (!userEmail) return { allowed: true };
        const rateLimitInfo = getRateLimitInfo(userEmail);
        if (!rateLimitInfo) return { allowed: true };
        const now = Date.now();
        const timeSinceFirst = now - rateLimitInfo.firstAttemptTime;
        const timeWindowMs = TIME_WINDOW_MINUTES * 60 * 1000;
        if (timeSinceFirst > timeWindowMs) return { allowed: true };
        if (rateLimitInfo.attempts >= MAX_ATTEMPTS) {
            const remainingTime = Math.ceil((timeWindowMs - timeSinceFirst) / 1000);
            return { allowed: false, remainingTime };
        }
        return { allowed: true };
    }, []);

    const recordResendAttempt = (userEmail: string) => {
        if (!userEmail) return;
        const now = Date.now();
        const existingInfo = getRateLimitInfo(userEmail);
        if (!existingInfo || (now - existingInfo.firstAttemptTime) > (TIME_WINDOW_MINUTES * 60 * 1000)) {
            saveRateLimitInfo(userEmail, { attempts: 1, firstAttemptTime: now, lastAttemptTime: now });
        } else {
            saveRateLimitInfo(userEmail, { ...existingInfo, attempts: existingInfo.attempts + 1, lastAttemptTime: now });
        }
    };

    const startRateLimitCountdown = (remainingSeconds: number) => {
        setRateLimitBlocked(true);
        setRateLimitResetTime(remainingSeconds);
        if (rateLimitIntervalRef.current) {
            clearInterval(rateLimitIntervalRef.current);
        }
        rateLimitIntervalRef.current = setInterval(() => {
            setRateLimitResetTime(prev => {
                if (prev === null || prev <= 1) {
                    setRateLimitBlocked(false);
                    if (rateLimitIntervalRef.current) {
                        clearInterval(rateLimitIntervalRef.current);
                        rateLimitIntervalRef.current = null;
                    }
                    return null;
                }
                return prev - 1;
            });
        }, 1000);
    };

    useEffect(() => {
        const fromParam = searchParams.get('from');
        if (fromParam) {
            sessionStorage.setItem('loginRedirect', fromParam);
        }
        const statusParam = searchParams.get('status');
        setError('');
        setResendMessage('');
        setIsNotVerifiedActionRequired(false);
        if (statusParam === 'unauthorized') {
            setError("You are not authorized to access this section. Please contact support.");
        }
        if (statusParam) {
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.delete('status');
            window.history.replaceState({}, document.title, newUrl.toString());
        }
        cleanupOldRateLimitData();
        return () => {
            if (cooldownIntervalRef.current) {
                clearInterval(cooldownIntervalRef.current);
            }
            if (rateLimitIntervalRef.current) {
                clearInterval(rateLimitIntervalRef.current);
            }
        };
    }, [searchParams]);

    useEffect(() => {
        if (email && isNotVerifiedActionRequired) {
            const rateLimitCheck = checkRateLimit(email);
            if (!rateLimitCheck.allowed && rateLimitCheck.remainingTime) {
                startRateLimitCountdown(rateLimitCheck.remainingTime);
            } else {
                setRateLimitBlocked(false);
                setRateLimitResetTime(null);
            }
        }
    }, [email, isNotVerifiedActionRequired, checkRateLimit]);

    // FONCTION LOGIN CORRIGÉE AVEC MEILLEURE GESTION DU FLUX
    const handleLogin = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setResendMessage('');
        setIsNotVerifiedActionRequired(false);
        setEmailLoading(true);

        try {
            // NOUVELLE APPROCHE : Firebase d'abord, puis backend
            const firebaseUserCredential = await signInWithEmailAndPassword(auth, email, password);
            const firebaseUser = firebaseUserCredential.user;

            // Attendre que le token soit disponible
            const token = await firebaseUser.getIdToken(true);

            // Maintenant appeler le backend avec le token valide
            const backendResponse = await axiosClient.post('/auth/login', {
                email,
                password
            }, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            // Gérer la réponse selon le statut MFA
            if (backendResponse.data.status === 'mfa_required') {
                navigate('/verify-2fa', {
                    state: {
                        from: location.state?.from,
                        hasRecoveryCodes: backendResponse.data.hasRecoveryCodes,
                        recoveryCodesCount: backendResponse.data.recoveryCodesCount
                    }
                });
            } else if (backendResponse.data.status === 'success') {
                await refreshAppUser({ mfaVerified: true });
                navigate(from, { replace: true });
            }

        } catch (err: unknown) {
            // En cas d'erreur, s'assurer que Firebase est déconnecté
            try {
                await signOut(auth);
            } catch (signOutError) {
                console.error("Error signing out from Firebase:", signOutError);
            }

            let errorMessage = 'An unexpected error occurred. Please try again.';

            if (err instanceof AxiosError && err.response) {
                const status = err.response.status;
                const data = err.response.data;

                switch (status) {
                    case 401:
                        errorMessage = 'Invalid email or password. Please check your credentials.';
                        break;
                    case 403:
                        if (data?.emailNotVerified) {
                            setIsNotVerifiedActionRequired(true);
                            setResendMessage("Your email address has not been verified.");
                            errorMessage = '';
                        } else {
                            errorMessage = data?.error || 'Access forbidden. Please contact support.';
                        }
                        break;
                    case 404:
                        errorMessage = 'Account not found. Please check your email address.';
                        break;
                    case 429:
                        errorMessage = 'Too many login attempts. Please try again later.';
                        break;
                    default:
                        errorMessage = data?.error || `Login failed (${status}). Please try again.`;
                }
            } else if (err instanceof FirebaseError) {
                switch (err.code) {
                    case 'auth/invalid-credential':
                    case 'auth/wrong-password':
                    case 'auth/user-not-found':
                        errorMessage = 'Invalid email or password. Please check your credentials.';
                        break;
                    case 'auth/too-many-requests':
                        errorMessage = 'Too many failed login attempts. Please try again later.';
                        break;
                    case 'auth/user-disabled':
                        errorMessage = 'This account has been disabled. Please contact support.';
                        break;
                    case 'auth/invalid-email':
                        errorMessage = 'Invalid email address format.';
                        break;
                    case 'auth/network-request-failed':
                        errorMessage = 'Network error. Please check your connection and try again.';
                        break;
                    default:
                        errorMessage = `Authentication error: ${err.message}`;
                }
            }

            setError(errorMessage);
            console.error("Login failed:", err);
        } finally {
            setEmailLoading(false);
        }
    };

    // FONCTION GOOGLE LOGIN CORRIGÉE
    const handleGoogleLogin = async () => {
        setError('');
        setResendMessage('');
        setIsNotVerifiedActionRequired(false);
        setGoogleLoading(true);

        try {
            const result = await signInWithPopup(auth, googleAuthProviderInstance);
            const user = result.user;

            // Attendre que le token soit disponible
            const token = await user.getIdToken(true);

            // Informer le backend de la connexion Google
            try {
                const backendResponse = await axiosClient.post('/auth/google-login', {
                    email: user.email,
                    uid: user.uid
                }, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (backendResponse.data.status === 'mfa_required') {
                    navigate('/verify-2fa', {
                        state: {
                            from: location.state?.from,
                            hasRecoveryCodes: backendResponse.data.hasRecoveryCodes,
                            recoveryCodesCount: backendResponse.data.recoveryCodesCount
                        }
                    });
                } else {
                    await refreshAppUser({ mfaVerified: !backendResponse.data.mfaEnabled });
                    navigate(from, { replace: true });
                }
            } catch (backendError) {
                console.error("Backend Google login error:", backendError);
                // Si le backend échoue, essayer de rafraîchir les données utilisateur
                await refreshAppUser();
                navigate(from, { replace: true });
            }

        } catch (err: unknown) {
            // En cas d'erreur Firebase, déconnecter
            try {
                await signOut(auth);
            } catch (signOutError) {
                console.error("Error signing out from Firebase:", signOutError);
            }

            if (err instanceof FirebaseError) {
                switch (err.code) {
                    case 'auth/popup-closed-by-user':
                        setError('Login cancelled. Please try again.');
                        break;
                    case 'auth/popup-blocked':
                        setError('Popup blocked. Please allow popups for this site and try again.');
                        break;
                    case 'auth/cancelled-popup-request':
                        // Ne pas afficher d'erreur pour les popups annulées
                        break;
                    case 'auth/network-request-failed':
                        setError('Network error. Please check your connection and try again.');
                        break;
                    default:
                        setError(`Google login failed: ${err.message}`);
                }
            } else {
                setError('An unexpected error occurred during Google login.');
            }
            console.error("Google login failed:", err);
        } finally {
            setGoogleLoading(false);
        }
    };

    const handleResendVerification = async () => {
        if (!email) {
            setResendMessage('Please enter your email address first.');
            return;
        }
        const rateLimitCheck = checkRateLimit(email);
        if (!rateLimitCheck.allowed) {
            if (rateLimitCheck.remainingTime) {
                startRateLimitCountdown(rateLimitCheck.remainingTime);
                setResendMessage(`Too many attempts. Please wait ${Math.ceil(rateLimitCheck.remainingTime / 60)} minutes before trying again.`);
            }
            return;
        }
        if (resendCooldown > 0) {
            return;
        }
        setResendLoading(true);
        setResendMessage('');
        setError('');
        try {
            recordResendAttempt(email);
            const response = await axiosClient.post('/auth/resend-verification', { email });
            setResendMessage(response.data.message);
            setResendCooldown(60);
            if (cooldownIntervalRef.current) {
                clearInterval(cooldownIntervalRef.current);
            }
            cooldownIntervalRef.current = setInterval(() => {
                setResendCooldown(prev => {
                    if (prev <= 1) {
                        if (cooldownIntervalRef.current) {
                            clearInterval(cooldownIntervalRef.current);
                        }
                        cooldownIntervalRef.current = null;
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } catch (err) {
            console.error("Failed to resend verification email:", err);
            if (err instanceof AxiosError && err.response) {
                const status = err.response.status;
                const message = err.response.data.message;
                if (status === 429) {
                    setResendMessage(message || "Too many requests. Please try again later.");
                    startRateLimitCountdown(TIME_WINDOW_MINUTES * 60);
                } else {
                    setResendMessage(message || "Failed to resend email.");
                }
            } else {
                setResendMessage('Failed to resend email. An unexpected error occurred.');
            }
        } finally {
            setResendLoading(false);
        }
    };

    const formatRemainingTime = (seconds: number): string => {
        if (seconds >= 60) {
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            return `${minutes}m ${remainingSeconds}s`;
        }
        return `${seconds}s`;
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
            <div className="w-full max-w-md p-8 space-y-6 bg-card rounded-lg shadow-md">
                <h1 className="text-2xl font-bold text-center text-foreground">Login to Media Tower</h1>
                {error && <p className="text-red-500 text-center p-2 bg-red-900/20 rounded-md">{error}</p>}

                {resendMessage && (
                    <p className={`text-center p-2 rounded-md ${
                        resendMessage.includes('successful') || resendMessage.includes('sent') || resendMessage.includes('If your email is in our system')
                            ? 'bg-green-900/20 text-green-500' : 'bg-red-900/20 text-red-500'
                    }`}>
                        {resendMessage}
                    </p>
                )}

                {isNotVerifiedActionRequired && (
                    <div className="text-center p-3 my-2 bg-yellow-900/30 border border-yellow-700 rounded-md">
                        <p className="text-gray-400 mb-3">Your email is not verified.</p>
                        {rateLimitBlocked && rateLimitResetTime !== null ? (
                            <div className="space-y-2">
                                <p className="text-orange-400 text-sm">
                                    Too many verification requests. Please wait {formatRemainingTime(rateLimitResetTime)} before trying again.
                                </p>
                                <button disabled={true} className="w-full py-2 font-bold text-gray-400 bg-gray-600 rounded-md cursor-not-allowed">
                                    Resend blocked ({formatRemainingTime(rateLimitResetTime)})
                                </button>
                            </div>
                        ) : (
                            <button onClick={handleResendVerification} disabled={resendLoading || resendCooldown > 0 || !email.trim()}
                                    className={`w-full py-2 font-bold text-white rounded-md transition-colors ${!email.trim() ? 'bg-gray-500 cursor-not-allowed' : 'bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-500'}`}>
                                {resendLoading ? <Loader2 className="animate-spin mx-auto" size={20} /> : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : !email.trim() ? 'Enter email first' : 'Resend verification email'}
                            </button>
                        )}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400">Email</label>
                        <input
                            type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-3 py-2 mt-1 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary" required
                        />
                    </div>
                    <div>
                        <div className="flex items-center justify-between">
                            <label className="block text-sm font-medium text-gray-400">Password</label>
                            <div className="text-sm">
                                <Link to="/forgot-password" className="font-medium text-primary hover:underline">
                                    Forgot password?
                                </Link>
                            </div>
                        </div>
                        <input
                            type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-3 py-2 mt-1 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary" required
                        />
                    </div>
                    <button
                        type="submit" disabled={emailLoading || googleLoading}
                        className="w-full py-2 font-bold text-white bg-primary rounded-md hover:bg-blue-600 disabled:bg-gray-500 transition-colors"
                    >
                        {emailLoading ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Login'}
                    </button>
                </form>

                <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-600" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-card text-gray-400">Or continue with</span>
                    </div>
                </div>

                <button
                    onClick={handleGoogleLogin} disabled={emailLoading || googleLoading}
                    className="w-full py-2 font-bold text-white bg-red-600 rounded-md hover:bg-red-700 disabled:bg-gray-500 transition-colors flex items-center justify-center"
                >
                    {googleLoading ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Login with Google'}
                </button>

                <p className="text-sm text-center text-gray-400">
                    Don't have an account? <Link to="/register" className="font-medium text-primary hover:underline">Register</Link>
                </p>
            </div>
        </div>
    );
};

export default Login;