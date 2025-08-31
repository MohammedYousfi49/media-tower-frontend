import React, { useState } from 'react';
import axiosClient from '../../api/axiosClient';
import { Loader2, ShieldOff, AlertTriangle, Key, Shield } from 'lucide-react';
import { AxiosError } from 'axios';
import { useAuth } from '../../hooks/useAuth';

interface MfaDisableModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

interface ApiErrorResponse {
    message?: string;
    error?: string;
}

const MfaDisableModal: React.FC<MfaDisableModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [verificationCode, setVerificationCode] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [useRecoveryCode, setUseRecoveryCode] = useState<boolean>(false);
    const [recoveryCodeUsed, setRecoveryCodeUsed] = useState<boolean>(false);
    const { currentUser } = useAuth();

    const handleDisable = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError('');

        const minLength = useRecoveryCode ? 8 : 6;
        if (!verificationCode || verificationCode.length < minLength) {
            setError(`Please enter a valid ${useRecoveryCode ? 'recovery code' : '6-digit code'}.`);
            return;
        }

        if (!currentUser) {
            setError('You must be logged in to disable 2FA. Please refresh the page and try again.');
            return;
        }

        setIsLoading(true);
        try {
            // CRITIQUE: Attendre et forcer le rafraîchissement du token
            await new Promise(resolve => setTimeout(resolve, 100));
            const token = await currentUser.getIdToken(true);
            console.log('Token obtained for MFA disable:', token ? 'Present' : 'Missing');

            const response = await axiosClient.post('/mfa/disable',
                { code: verificationCode.trim() },
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            // Vérifier si un code de récupération a été utilisé
            if (response.data.message && response.data.message.includes('Recovery code was used')) {
                setRecoveryCodeUsed(true);
            }

            // Réinitialiser le formulaire
            setVerificationCode('');
            setUseRecoveryCode(false);
            setRecoveryCodeUsed(false);
            setError('');

            // Notifier le succès et fermer
            onSuccess();
            onClose();

        } catch (error) {
            console.error('MFA disable detailed error:', error);

            if (error instanceof AxiosError) {
                console.log('Disable response status:', error.response?.status);
                console.log('Disable response data:', error.response?.data);

                const responseData = error.response?.data as ApiErrorResponse;

                switch (error.response?.status) {
                    case 401:
                        if (responseData?.error?.includes('token') || responseData?.error?.includes('Authentication')) {
                            setError('Session expired. Please refresh the page and try again.');
                        } else {
                            setError('Invalid code. Please check your authenticator app or recovery code.');
                        }
                        break;
                    case 400:
                        setError(responseData?.message || responseData?.error || 'Invalid request.');
                        break;
                    case 403:
                        setError('Authentication session expired. Please refresh the page and try again.');
                        break;
                    case 429:
                        setError('Too many attempts. Please try again later.');
                        break;
                    case 500:
                        setError('Server error. Please try again later.');
                        break;
                    default:
                        setError(responseData?.message || responseData?.error || 'An error occurred. Please try again.');
                }
            } else {
                setError('An unexpected error occurred. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        setVerificationCode('');
        setError('');
        setUseRecoveryCode(false);
        setRecoveryCodeUsed(false);
        onClose();
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (useRecoveryCode) {
            // Pour les codes de récupération, permettre lettres, chiffres et tirets
            const sanitized = value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
            if (sanitized.length <= 9) { // XXXX-XXXX = 9 caractères max
                setVerificationCode(sanitized);
            }
        } else {
            // Pour les codes TOTP, seulement les chiffres
            const sanitized = value.replace(/\D/g, '');
            if (sanitized.length <= 6) {
                setVerificationCode(sanitized);
            }
        }
        if (error) setError('');
    };

    const toggleInputMode = () => {
        setUseRecoveryCode(!useRecoveryCode);
        setVerificationCode('');
        setError('');
    };

    if (!isOpen) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm">
            <div className="bg-card text-foreground rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
                <h2 className="text-2xl font-bold mb-4 text-center text-red-400">
                    Disable Two-Factor Authentication
                </h2>

                <div className="bg-yellow-900/30 text-yellow-400 p-3 rounded-md mb-4 flex items-start gap-2">
                    <AlertTriangle size={20} className="mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                        <p className="font-semibold mb-1">Warning!</p>
                        <p>Disabling 2FA will make your account less secure. You'll only need your password to log in.</p>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-900/30 text-red-400 p-3 rounded-md mb-4 flex items-center gap-2">
                        <AlertTriangle size={20} />
                        <p>{error}</p>
                    </div>
                )}

                {recoveryCodeUsed && (
                    <div className="bg-orange-900/30 text-orange-400 p-3 rounded-md mb-4 flex items-center gap-2">
                        <Key size={20} />
                        <p>Recovery code was used. 2FA has been disabled successfully.</p>
                    </div>
                )}

                <div className="text-center mb-4">
                    <div className="flex items-center justify-center mb-2">
                        {useRecoveryCode ? (
                            <Key className="text-yellow-400 mr-2" size={20} />
                        ) : (
                            <Shield className="text-blue-400 mr-2" size={20} />
                        )}
                        <span className="font-medium">
                            {useRecoveryCode ? 'Recovery Code' : 'Authenticator Code'}
                        </span>
                    </div>
                    <p className="text-gray-400 text-sm">
                        {useRecoveryCode
                            ? 'Enter one of your recovery codes to confirm.'
                            : 'Enter your current 6-digit authenticator code to confirm.'
                        }
                    </p>
                </div>

                <form onSubmit={handleDisable}>
                    <input
                        type="text"
                        value={verificationCode}
                        onChange={handleInputChange}
                        maxLength={useRecoveryCode ? 9 : 6}
                        placeholder={useRecoveryCode ? "XXXX-XXXX" : "123456"}
                        className="w-full px-4 py-2 text-center text-xl tracking-[0.3em] bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                        required
                        autoComplete="off"
                        disabled={isLoading}
                    />

                    <div className="text-center mt-3">
                        <button
                            type="button"
                            onClick={toggleInputMode}
                            className="text-sm text-blue-400 hover:text-blue-300 underline"
                            disabled={isLoading}
                        >
                            {useRecoveryCode
                                ? 'Use authenticator app instead'
                                : 'Use recovery code instead'
                            }
                        </button>
                    </div>

                    <div className="mt-6 flex gap-4">
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={isLoading}
                            className="w-full py-2 font-bold text-gray-300 bg-gray-600 rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading || (useRecoveryCode ? verificationCode.length < 8 : verificationCode.length !== 6) || !currentUser}
                            className="w-full py-2 font-bold text-white bg-red-600 rounded-md hover:bg-red-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors flex justify-center items-center"
                        >
                            {isLoading ? (
                                <Loader2 className="animate-spin" size={20} />
                            ) : (
                                <>
                                    <ShieldOff size={20} className="mr-2" />
                                    Disable 2FA
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default MfaDisableModal;