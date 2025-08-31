import React, { useState, useEffect } from 'react';
import axiosClient from '../../api/axiosClient';
import { Loader2, ShieldCheck, AlertTriangle, Copy, Download, Eye, EyeOff } from 'lucide-react';
import { AxiosError } from 'axios'; // <<< NOUVEL IMPORT

interface MfaSetupModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const MfaSetupModal: React.FC<MfaSetupModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [qrCodeUri, setQrCodeUri] = useState<string | null>(null);
    const [secret, setSecret] = useState<string | null>(null);
    const [verificationCode, setVerificationCode] = useState('');
    const [error, setError] = useState('');
    const [step, setStep] = useState<'setup' | 'verify' | 'recovery'>('setup');
    const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
    const [codesCopied, setCodesCopied] = useState(false);
    const [codesVisible, setCodesVisible] = useState(true);

    // Charger les données du QR code quand le modal s'ouvre
    useEffect(() => {
        if (isOpen) {
            setIsLoading(true);
            setError('');
            setQrCodeUri(null);
            setSecret(null);
            setVerificationCode('');
            setStep('setup');
            setRecoveryCodes([]);
            setCodesCopied(false);
            setCodesVisible(true);

            const fetchMfaSetup = async () => {
                try {
                    const response = await axiosClient.get('/mfa/setup');
                    setQrCodeUri(response.data.qrCodeUri);
                    setSecret(response.data.secret);
                    setStep('verify');
                } catch (err) {
                    setError('Failed to load MFA setup data. Please try again.');
                    console.error(err);
                } finally {
                    setIsLoading(false);
                }
            };

            fetchMfaSetup();
        }
    }, [isOpen]);

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!verificationCode || verificationCode.length !== 6) {
            setError('Please enter a valid 6-digit code.');
            return;
        }

        setIsLoading(true);
        try {
            const response = await axiosClient.post('/mfa/verify', { code: verificationCode });

            if (response.data.recoveryCodes) {
                setRecoveryCodes(response.data.recoveryCodes);
                setStep('recovery');
            } else {
                onSuccess();
                onClose();
            }
        } catch (err: unknown) { // <<< CORRECTION APPLIQUÉE ICI
            if (err instanceof AxiosError && err.response?.status === 401) {
                setError('Invalid MFA code. Please check your app and try again.');
            } else {
                setError('An error occurred during verification. Please try again.');
            }
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const copyRecoveryCodes = async () => {
        try {
            const codesText = recoveryCodes.join('\n');
            await navigator.clipboard.writeText(codesText);
            setCodesCopied(true);
            setTimeout(() => setCodesCopied(false), 3000);
        } catch (err) {
            console.error('Failed to copy recovery codes:', err);
        }
    };

    const downloadRecoveryCodes = () => {
        const codesText = recoveryCodes.join('\n');
        const blob = new Blob([codesText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'mediatower-recovery-codes.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleFinish = () => {
        onSuccess();
        onClose();
    };

    const handleCancel = () => {
        setError('');
        setIsLoading(false);
        onClose();
    };

    if (!isOpen) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm">
            <div className="bg-card text-foreground rounded-lg shadow-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">

                {/* Étape 1: Chargement initial */}
                {step === 'setup' && (
                    <>
                        <h2 className="text-2xl font-bold mb-4 text-center">Set Up Two-Factor Authentication</h2>
                        <div className="flex justify-center items-center h-64">
                            <Loader2 className="animate-spin text-primary" size={48} />
                        </div>
                    </>
                )}

                {/* Étape 2: Configuration et vérification */}
                {step === 'verify' && (
                    <>
                        <h2 className="text-2xl font-bold mb-4 text-center">Set Up Two-Factor Authentication</h2>

                        {error && (
                            <div className="bg-red-900/30 text-red-400 p-3 rounded-md mb-4 flex items-center gap-2">
                                <AlertTriangle size={20} />
                                <p>{error}</p>
                            </div>
                        )}

                        {!isLoading && qrCodeUri && (
                            <>
                                <p className="text-center text-gray-400 mb-4">
                                    Scan the QR code below with an authenticator app (Google Authenticator, Authy, 1Password, etc.).
                                </p>

                                <div className="flex justify-center p-4 bg-white rounded-md">
                                    <img src={qrCodeUri} alt="MFA QR Code" className="max-w-full h-auto" />
                                </div>

                                <div className="text-center text-gray-500 text-xs mt-2">
                                    <p className="mb-2">Can't scan? Enter this code manually:</p>
                                    <code className="block bg-gray-700 p-2 rounded-md text-sm text-gray-200 tracking-widest break-all">
                                        {secret}
                                    </code>
                                </div>

                                <form onSubmit={handleVerify} className="mt-6">
                                    <label htmlFor="mfa-code" className="block text-sm font-medium text-gray-400 mb-2">
                                        Enter the 6-digit code from your app
                                    </label>
                                    <input
                                        id="mfa-code"
                                        type="text"
                                        value={verificationCode}
                                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                                        maxLength={6}
                                        placeholder="123456"
                                        className="w-full px-4 py-2 text-center text-2xl tracking-[0.5em] bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                                        required
                                        disabled={isLoading}
                                    />
                                    <div className="mt-6 flex gap-4">
                                        <button
                                            type="button"
                                            onClick={handleCancel}
                                            disabled={isLoading}
                                            className="w-full py-2 font-bold text-gray-300 bg-gray-600 rounded-md hover:bg-gray-700 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isLoading || verificationCode.length !== 6}
                                            className="w-full py-2 font-bold text-white bg-primary rounded-md hover:bg-blue-600 disabled:bg-gray-500 transition-colors flex justify-center items-center"
                                        >
                                            {isLoading ? (
                                                <Loader2 className="animate-spin" size={20} />
                                            ) : (
                                                <>
                                                    <ShieldCheck size={20} className="mr-2" />
                                                    Verify & Activate
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </>
                        )}
                    </>
                )}

                {/* Étape 3: Affichage des codes de récupération */}
                {step === 'recovery' && (
                    <>
                        <h2 className="text-2xl font-bold mb-4 text-center text-green-400">
                            2FA Enabled Successfully!
                        </h2>

                        <div className="bg-yellow-900/30 text-yellow-300 p-4 rounded-md mb-4">
                            <div className="flex items-start gap-2">
                                <AlertTriangle size={20} className="mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="font-semibold mb-2">Save Your Recovery Codes</p>
                                    <p className="text-sm">
                                        These codes can be used to access your account if you lose your authenticator device.
                                        Each code can only be used once.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gray-800 rounded-md p-4 mb-4">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="font-semibold text-gray-300">Recovery Codes</h3>
                                <button
                                    onClick={() => setCodesVisible(!codesVisible)}
                                    className="text-gray-400 hover:text-gray-300"
                                >
                                    {codesVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>

                            {codesVisible ? (
                                <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                                    {recoveryCodes.map((code, index) => (
                                        <div
                                            key={index}
                                            className="bg-gray-700 p-2 rounded text-center text-gray-200"
                                        >
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
                        </div>

                        <div className="flex gap-2 mb-6">
                            <button
                                onClick={copyRecoveryCodes}
                                className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2"
                            >
                                <Copy size={16} />
                                {codesCopied ? 'Copied!' : 'Copy'}
                            </button>
                            <button
                                onClick={downloadRecoveryCodes}
                                className="flex-1 py-2 px-4 bg-green-600 hover:bg-green-700 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2"
                            >
                                <Download size={16} />
                                Download
                            </button>
                        </div>

                        <div className="bg-red-900/30 text-red-300 p-3 rounded-md mb-4 text-sm">
                            <p className="font-semibold mb-1">Important Security Notes:</p>
                            <ul className="list-disc list-inside space-y-1">
                                <li>Store these codes in a secure location</li>
                                <li>Each code can only be used once</li>
                                <li>You can generate new codes anytime in your security settings</li>
                                <li>Never share these codes with anyone</li>
                            </ul>
                        </div>

                        <button
                            onClick={handleFinish}
                            className="w-full py-2 font-bold text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors"
                        >
                            I've Saved My Recovery Codes
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default MfaSetupModal;