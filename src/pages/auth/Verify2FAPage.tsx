import { useState, FormEvent, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { Loader2, Key, Shield, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { AxiosError } from 'axios';

const Verify2FAPage = () => {
    const [mfaCode, setMfaCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [useRecoveryCode, setUseRecoveryCode] = useState(false);
    const [showRecoveryCodeUsed, setShowRecoveryCodeUsed] = useState(false);
    const [remainingRecoveryCodes, setRemainingRecoveryCodes] = useState<number | null>(null);

    const navigate = useNavigate();
    const location = useLocation();
    // === MODIFICATION 1 : Récupérer setAppUser et appUser du contexte ===
    const { refreshAppUser, currentUser, setAppUser, appUser } = useAuth();

    const from = location.state?.from?.pathname || '/';
    const hasRecoveryCodes = location.state?.hasRecoveryCodes || false;
    const recoveryCodesCount = location.state?.recoveryCodesCount || 0;

    useEffect(() => {
        if (!currentUser) {
            navigate('/login', { replace: true });
        }
    }, [currentUser, navigate]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setShowRecoveryCodeUsed(false);

        const minLength = useRecoveryCode ? 8 : 6;
        if (!mfaCode || mfaCode.length < minLength) {
            setError(`Please enter a valid ${useRecoveryCode ? 'recovery code' : '6-digit code'}.`);
            return;
        }

        if (!currentUser) {
            setError('Authentication session expired. Please log in again.');
            navigate('/login', { replace: true });
            return;
        }

        setIsLoading(true);

        try {
            await new Promise(resolve => setTimeout(resolve, 100));
            const token = await currentUser.getIdToken(true);
            console.log('Token obtained for 2FA verification:', token ? 'Present' : 'Missing');

            const response = await axiosClient.post('/auth/verify-2fa',
                { code: mfaCode.trim() },
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.data.verificationMethod === 'RECOVERY_CODE_USED') {
                setShowRecoveryCodeUsed(true);
                setRemainingRecoveryCodes(response.data.remainingRecoveryCodes);
            }

            // === MODIFICATION 2 : Mettre à jour l'état de l'utilisateur IMMÉDIATEMENT ===
            // C'est la correction cruciale. On met à jour l'état local de l'utilisateur
            // pour inclure mfaVerified: true avant même de naviguer.
            if (appUser) {
                setAppUser({ ...appUser, mfaVerified: true });
            }

            // Rafraîchir les données utilisateur en arrière-plan (optionnel mais bon à garder)
            await refreshAppUser({ mfaVerified: true });

            // Rediriger l'utilisateur vers la page d'origine
            navigate(from, { replace: true });

        } catch (err) {
            console.error("2FA verification detailed error:", err);

            if (err instanceof AxiosError) {
                console.log('Response status:', err.response?.status);
                console.log('Response data:', err.response?.data);
                switch (err.response?.status) {
                    case 401:
                        if (err.response.data?.error?.includes('token') || err.response.data?.error?.includes('Authentication')) {
                            setError('Session expired. Please refresh the page and try again.');
                            setTimeout(() => { window.location.reload(); }, 2000);
                        } else {
                            setError('Invalid code. Please check your authenticator app or recovery code and try again.');
                        }
                        break;
                    case 403:
                        setError('Authentication session expired. Please log in again.');
                        setTimeout(() => navigate('/login', { replace: true }), 2000);
                        break;
                    case 400:
                        setError(err.response.data?.message || 'Invalid request. Please try again.');
                        break;
                    case 429:
                        setError('Too many attempts. Please try again later.');
                        break;
                    default:
                        setError('An error occurred during verification. Please try again.');
                }
            } else {
                setError('An unexpected error occurred. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const toggleInputMode = () => {
        setUseRecoveryCode(!useRecoveryCode);
        setMfaCode('');
        setError('');
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (useRecoveryCode) {
            const sanitized = value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
            if (sanitized.length <= 9) {
                setMfaCode(sanitized);
            }
        } else {
            const sanitized = value.replace(/\D/g, '');
            if (sanitized.length <= 6) {
                setMfaCode(sanitized);
            }
        }
        if (error) setError('');
    };

    if (!currentUser) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
                <div className="text-center">
                    <Loader2 className="animate-spin mx-auto mb-4" size={32} />
                    <p>Redirecting to login...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
            <div className="w-full max-w-md p-8 space-y-6 bg-card rounded-lg shadow-md">
                <h1 className="text-2xl font-bold text-center text-foreground">
                    Two-Factor Authentication
                </h1>

                {error && (
                    <div className="bg-red-900/30 text-red-400 p-3 rounded-md flex items-center gap-2">
                        <AlertTriangle size={20} />
                        <p>{error}</p>
                    </div>
                )}

                {showRecoveryCodeUsed && remainingRecoveryCodes !== null && (
                    <div className="bg-yellow-900/30 text-yellow-400 p-3 rounded-md">
                        <p className="font-semibold">Recovery code used successfully!</p>
                        <p className="text-sm mt-1">
                            You have {remainingRecoveryCodes} recovery codes remaining.
                            Consider generating new ones in your security settings.
                        </p>
                    </div>
                )}

                <div className="text-center">
                    <div className="flex items-center justify-center mb-4">
                        {useRecoveryCode ? (
                            <Key className="text-yellow-400 mr-2" size={24} />
                        ) : (
                            <Shield className="text-blue-400 mr-2" size={24} />
                        )}
                        <span className="text-lg font-medium">
                            {useRecoveryCode ? 'Recovery Code' : 'Authenticator Code'}
                        </span>
                    </div>

                    <p className="text-gray-400 text-sm mb-4">
                        {useRecoveryCode
                            ? 'Enter one of your recovery codes to continue.'
                            : 'Enter the 6-digit code from your authenticator app to continue.'
                        }
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <input
                            type="text"
                            value={mfaCode}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 text-center text-2xl tracking-[0.3em] bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                            required
                            maxLength={useRecoveryCode ? 9 : 6}
                            placeholder={useRecoveryCode ? "XXXX-XXXX" : "123456"}
                            autoFocus
                            disabled={isLoading}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading || (useRecoveryCode ? mfaCode.length < 8 : mfaCode.length !== 6)}
                        className="w-full py-2 font-bold text-white bg-primary rounded-md hover:bg-blue-600 disabled:bg-gray-500 transition-colors"
                    >
                        {isLoading ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Verify'}
                    </button>
                </form>

                {hasRecoveryCodes && (
                    <div className="text-center border-t border-gray-700 pt-4">
                        <button
                            type="button"
                            onClick={toggleInputMode}
                            className="text-sm text-blue-400 hover:text-blue-300 underline"
                            disabled={isLoading}
                        >
                            {useRecoveryCode
                                ? 'Use authenticator app instead'
                                : `Use recovery code instead (${recoveryCodesCount} available)`
                            }
                        </button>
                    </div>
                )}

                <div className="text-center text-xs text-gray-500">
                    <p>Having trouble? Contact support for assistance.</p>
                </div>
            </div>
        </div>
    );
};

export default Verify2FAPage;