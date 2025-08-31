import { useState, useEffect } from 'react';
import axiosClient from '../../api/axiosClient';
import { Loader2, RefreshCw, Copy, Download, Key, AlertTriangle, Eye, EyeOff, Shield } from 'lucide-react';
import { AxiosError } from 'axios';
import { useAuth } from '../../hooks/useAuth';

interface RecoveryCodesManagerProps {
    onClose?: () => void;
}

const RecoveryCodesManager: React.FC<RecoveryCodesManagerProps> = ({ onClose }) => {
    const [recoveryCodesCount, setRecoveryCodesCount] = useState<number>(0);
    const [newRecoveryCodes, setNewRecoveryCodes] = useState<string[]>([]);
    const [verificationCode, setVerificationCode] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [error, setError] = useState('');
    const [showVerificationForm, setShowVerificationForm] = useState(false);
    const [codesCopied, setCodesCopied] = useState(false);
    const [codesVisible, setCodesVisible] = useState(false);
    const [useRecoveryCode, setUseRecoveryCode] = useState(false);
    const { currentUser } = useAuth();

    useEffect(() => {
        const fetchRecoveryCodesInfo = async () => {
            if (!currentUser) {
                setError('Authentication required. Please refresh the page.');
                setIsLoading(false);
                return;
            }

            try {
                setError('');
                // Attendre un peu et forcer le rafraîchissement du token
                await new Promise(resolve => setTimeout(resolve, 100));
                const token = await currentUser.getIdToken(true);

                const response = await axiosClient.get('/mfa/recovery-codes/count', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                setRecoveryCodesCount(response.data.count || 0);
            } catch (error) {
                console.error("Failed to fetch recovery codes info:", error);
                if (error instanceof AxiosError) {
                    switch (error.response?.status) {
                        case 401:
                            setError('Session expired. Please refresh the page and try again.');
                            break;
                        case 403:
                            setError('Access denied. Please ensure 2FA is enabled.');
                            break;
                        default:
                            setError('Failed to load recovery codes information.');
                    }
                } else {
                    setError('Network error. Please check your connection.');
                }
            } finally {
                setIsLoading(false);
            }
        };
        fetchRecoveryCodesInfo();
    }, [currentUser]);

    const handleRegenerateRequest = () => {
        setShowVerificationForm(true);
        setVerificationCode('');
        setError('');
        setNewRecoveryCodes([]);
        setUseRecoveryCode(false);
    };

    const handleRegenerate = async (e: React.FormEvent) => {
        e.preventDefault();

        const minLength = useRecoveryCode ? 8 : 6;
        if (!verificationCode || verificationCode.length < minLength) {
            setError(`Please enter a valid ${useRecoveryCode ? 'recovery code' : '6-digit code'}.`);
            return;
        }

        if (!currentUser) {
            setError('Authentication required. Please refresh the page.');
            return;
        }

        setIsRegenerating(true);
        setError('');

        try {
            // CRITIQUE: Attendre et forcer le rafraîchissement du token
            await new Promise(resolve => setTimeout(resolve, 100));
            const token = await currentUser.getIdToken(true);
            console.log('Token obtained for recovery codes regeneration:', token ? 'Present' : 'Missing');

            const response = await axiosClient.post('/mfa/regenerate-recovery-codes',
                { code: verificationCode.trim() },
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            setNewRecoveryCodes(response.data.recoveryCodes);
            setRecoveryCodesCount(response.data.recoveryCodes.length);
            setShowVerificationForm(false);
            setVerificationCode('');
            setCodesVisible(true);
            setUseRecoveryCode(false);

        } catch (error) {
            console.error('Recovery codes regeneration detailed error:', error);

            if (error instanceof AxiosError) {
                console.log('Regeneration response status:', error.response?.status);
                console.log('Regeneration response data:', error.response?.data);

                switch (error.response?.status) {
                    case 401:
                        if (error.response.data?.error?.includes('token') || error.response.data?.error?.includes('Authentication')) {
                            setError('Session expired. Please refresh the page and try again.');
                        } else {
                            setError('Invalid code. Please check your authenticator app or recovery code.');
                        }
                        break;
                    case 403:
                        setError('Authentication session expired. Please refresh the page.');
                        break;
                    case 429:
                        setError('Too many attempts. Please try again later.');
                        break;
                    default:
                        setError(error.response?.data?.message || 'Failed to regenerate recovery codes.');
                }
            } else {
                setError('An unexpected error occurred.');
            }
        } finally {
            setIsRegenerating(false);
        }
    };

    const copyRecoveryCodes = async () => {
        if (newRecoveryCodes.length === 0) return;
        try {
            const codesText = newRecoveryCodes.join('\n');
            await navigator.clipboard.writeText(codesText);
            setCodesCopied(true);
            setTimeout(() => setCodesCopied(false), 3000);
        } catch (err) {
            console.error('Failed to copy recovery codes:', err);
            setError('Failed to copy codes to clipboard.');
        }
    };

    const downloadRecoveryCodes = () => {
        if (newRecoveryCodes.length === 0) return;
        try {
            const codesText = `Media Tower - Recovery Codes\nGenerated: ${new Date().toLocaleDateString()}\n\n${newRecoveryCodes.join('\n')}\n\nIMPORTANT:\n- Each code can only be used once\n- Store these codes in a secure location\n- Generate new codes if you suspect these have been compromised`;
            const blob = new Blob([codesText], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `mediatower-recovery-codes-${new Date().toISOString().split('T')[0]}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Failed to download recovery codes:', err);
            setError('Failed to download codes.');
        }
    };

    const handleCancel = () => {
        setShowVerificationForm(false);
        setVerificationCode('');
        setError('');
        setNewRecoveryCodes([]);
        setUseRecoveryCode(false);
        if (onClose) onClose();
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

    const toggleVerificationMode = () => {
        setUseRecoveryCode(!useRecoveryCode);
        setVerificationCode('');
        setError('');
    };

    if (isLoading) {
        return (
            <div className="flex items-center text-gray-400">
                <Loader2 className="animate-spin mr-2" size={20} />
                <span>Loading recovery codes info...</span>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-medium text-white flex items-center gap-2">
                        <Key size={20} />
                        Recovery Codes
                    </h3>
                    <p className="text-sm text-gray-400">
                        Backup codes for when you can't access your authenticator app.
                    </p>
                </div>
                <div className="text-right">
                    <div className="text-lg font-semibold text-white">{recoveryCodesCount}</div>
                    <div className="text-xs text-gray-400">codes remaining</div>
                </div>
            </div>

            {error && (
                <div className="bg-red-900/30 text-red-400 p-3 rounded-md flex items-center gap-2">
                    <AlertTriangle size={20} />
                    <span>{error}</span>
                </div>
            )}

            {newRecoveryCodes.length > 0 && (
                <div className="bg-green-900/20 border border-green-700 rounded-md p-4">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-green-400">New Recovery Codes Generated</h4>
                        <button onClick={() => setCodesVisible(!codesVisible)} className="text-gray-400 hover:text-gray-300">
                            {codesVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>
                    {codesVisible ? (
                        <div className="grid grid-cols-2 gap-2 font-mono text-sm mb-3">
                            {newRecoveryCodes.map((code, index) => (
                                <div key={index} className="bg-gray-700 p-2 rounded text-center text-gray-200">
                                    {code}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center text-gray-500 py-4">
                            <Eye size={24} className="mx-auto mb-2" />
                            <p>Codes hidden for security</p>
                        </div>
                    )}
                    <div className="flex gap-2">
                        <button onClick={copyRecoveryCodes} className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2">
                            <Copy size={16} />
                            {codesCopied ? 'Copied!' : 'Copy'}
                        </button>
                        <button onClick={downloadRecoveryCodes} className="flex-1 py-2 px-4 bg-green-600 hover:bg-green-700 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2">
                            <Download size={16} />
                            Download
                        </button>
                    </div>
                </div>
            )}

            {showVerificationForm && (
                <div className="bg-gray-800 rounded-md p-4 border border-gray-600">
                    <h4 className="font-semibold text-white mb-3">Verify to Generate New Codes</h4>
                    <p className="text-sm text-gray-400 mb-4">
                        Enter your current authenticator code or recovery code to generate new recovery codes.
                        This will invalidate all existing recovery codes.
                    </p>
                    <form onSubmit={handleRegenerate} className="space-y-4">
                        <div className="text-center mb-2">
                            <div className="flex items-center justify-center mb-2">
                                {useRecoveryCode ? (
                                    <Key className="text-yellow-400 mr-2" size={16} />
                                ) : (
                                    <Shield className="text-blue-400 mr-2" size={16} />
                                )}
                                <span className="text-sm font-medium">
                                    {useRecoveryCode ? 'Recovery Code' : 'Authenticator Code'}
                                </span>
                            </div>
                        </div>

                        <input
                            type="text"
                            value={verificationCode}
                            onChange={handleInputChange}
                            maxLength={useRecoveryCode ? 9 : 6}
                            placeholder={useRecoveryCode ? "XXXX-XXXX" : "123456"}
                            className="w-full px-4 py-2 text-center text-xl tracking-[0.3em] bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                            required
                            disabled={isRegenerating}
                            autoComplete="off"
                        />

                        <div className="text-center">
                            <button
                                type="button"
                                onClick={toggleVerificationMode}
                                className="text-sm text-blue-400 hover:text-blue-300 underline"
                                disabled={isRegenerating}
                            >
                                {useRecoveryCode
                                    ? 'Use authenticator app instead'
                                    : 'Use recovery code instead'
                                }
                            </button>
                        </div>

                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={handleCancel}
                                disabled={isRegenerating}
                                className="flex-1 py-2 font-medium text-gray-300 bg-gray-600 rounded-md hover:bg-gray-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isRegenerating || (useRecoveryCode ? verificationCode.length < 8 : verificationCode.length !== 6)}
                                className="flex-1 py-2 font-medium text-white bg-orange-600 rounded-md hover:bg-orange-700 disabled:bg-gray-500 transition-colors flex items-center justify-center gap-2"
                            >
                                {isRegenerating ? (
                                    <Loader2 className="animate-spin" size={16} />
                                ) : (
                                    <>
                                        <RefreshCw size={16} />
                                        Generate New
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {!showVerificationForm && newRecoveryCodes.length === 0 && (
                <div className="space-y-4">
                    <div className="bg-gray-800 rounded-md p-4">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-gray-300">Current Status:</span>
                            <span className={`font-semibold ${recoveryCodesCount > 3 ? 'text-green-400' : recoveryCodesCount > 0 ? 'text-yellow-400' : 'text-red-400'}`}>
                                {recoveryCodesCount} codes available
                            </span>
                        </div>
                        {recoveryCodesCount <= 3 && (
                            <div className="bg-yellow-900/30 text-yellow-300 p-3 rounded-md mb-3">
                                <AlertTriangle size={16} className="inline mr-2" />
                                {recoveryCodesCount === 0
                                    ? "You have no recovery codes left! Generate new ones immediately."
                                    : `You only have ${recoveryCodesCount} recovery codes left. Consider generating new ones.`
                                }
                            </div>
                        )}
                        <button
                            onClick={handleRegenerateRequest}
                            disabled={isLoading}
                            className="w-full py-2 px-4 bg-orange-600 hover:bg-orange-700 rounded-md text-white font-medium transition-colors flex items-center justify-center gap-2"
                        >
                            <RefreshCw size={16} />
                            Generate New Recovery Codes
                        </button>
                    </div>
                    <div className="bg-blue-900/20 border border-blue-700 rounded-md p-4 text-sm">
                        <h4 className="font-semibold text-blue-400 mb-2">About Recovery Codes</h4>
                        <ul className="text-gray-300 space-y-1">
                            <li>• Use these codes if you lose access to your authenticator app</li>
                            <li>• Each code can only be used once</li>
                            <li>• Generating new codes will invalidate all existing ones</li>
                            <li>• Store them securely (password manager, safe location)</li>
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RecoveryCodesManager;