import { useState, useEffect } from 'react';
import axiosClient from '../../api/axiosClient';
import MfaSetupModal from './MfaSetupModal';
import MfaDisableModal from './MfaDisableModal';
import RecoveryCodesManager from './RecoveryCodesManager';
import { Loader2, ShieldCheck, ShieldOff, AlertTriangle, Key } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { AxiosError } from 'axios';

interface MfaStatusResponse {
    enabled: boolean;
    hasRecoveryCodes: boolean;
    recoveryCodesCount: number;
}

const MfaManager = () => {
    const [mfaStatus, setMfaStatus] = useState<MfaStatusResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
    const [isDisableModalOpen, setIsDisableModalOpen] = useState(false);
    const [showRecoveryManager, setShowRecoveryManager] = useState(false);
    const [error, setError] = useState<string>('');
    const { currentUser } = useAuth();

    const fetchMfaStatus = async () => {
        if (!currentUser) {
            setIsLoading(false);
            return;
        }
        try {
            setError('');
            const token = await currentUser.getIdToken(true);
            const { data } = await axiosClient.get<MfaStatusResponse>('/mfa/status', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setMfaStatus(data);
        } catch (error) {
            console.error("Failed to fetch MFA status", error);
            if (error instanceof AxiosError) {
                if (error.response?.status === 401) {
                    setError('Authentication failed. Please refresh the page.');
                } else {
                    setError('Failed to load 2FA status.');
                }
            } else {
                setError('An unexpected error occurred.');
            }
            setMfaStatus({ enabled: false, hasRecoveryCodes: false, recoveryCodesCount: 0 });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchMfaStatus();
    }, [currentUser]);

    const handleSuccess = () => {
        fetchMfaStatus();
        setShowRecoveryManager(false);
    };

    const handleRetry = () => {
        setError('');
        setIsLoading(true);
        fetchMfaStatus();
    };

    if (isLoading) {
        return (
            <div className="flex items-center text-gray-400">
                <Loader2 className="animate-spin mr-2" size={20} />
                <span>Loading security status...</span>
            </div>
        );
    }

    if (!currentUser) {
        return (
            <div className="text-center p-4 text-gray-400">
                <p>You must be logged in to manage 2FA settings.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {error && (
                <div className="bg-red-900/30 text-red-400 p-3 rounded-md flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <AlertTriangle size={20} />
                        <span>{error}</span>
                    </div>
                    <button onClick={handleRetry} className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm font-medium transition-colors">
                        Retry
                    </button>
                </div>
            )}

            <div className="bg-gray-800 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-medium text-white">Two-Factor Authentication (2FA)</h3>
                        <p className="text-sm text-gray-400">Add an extra layer of security to your account.</p>
                    </div>
                    {mfaStatus?.enabled ? (
                        <div className="flex items-center gap-2 text-green-400 font-semibold p-2 bg-green-900/30 rounded-md">
                            <ShieldCheck size={20} />
                            <span>Enabled</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-yellow-400 font-semibold p-2 bg-yellow-900/30 rounded-md">
                            <ShieldOff size={20} />
                            <span>Disabled</span>
                        </div>
                    )}
                </div>

                <div className="border-t border-gray-700 pt-4">
                    {mfaStatus?.enabled ? (
                        <div className="space-y-4">
                            <p className="text-gray-400 text-sm">2FA is active. You will be asked for a code from your authenticator app when you log in.</p>
                            {mfaStatus.hasRecoveryCodes && (
                                <div className="bg-blue-900/20 border border-blue-700 rounded-md p-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Key size={16} className="text-blue-400" />
                                            <span className="text-blue-400 font-medium">Recovery Codes</span>
                                        </div>
                                        <span className={`text-sm font-medium ${mfaStatus.recoveryCodesCount > 3 ? 'text-green-400' : mfaStatus.recoveryCodesCount > 0 ? 'text-yellow-400' : 'text-red-400'}`}>
                                            {mfaStatus.recoveryCodesCount} remaining
                                        </span>
                                    </div>
                                    {mfaStatus.recoveryCodesCount <= 3 && (
                                        <p className="text-yellow-300 text-xs mt-2">
                                            {mfaStatus.recoveryCodesCount === 0 ? "⚠️ No recovery codes left! Generate new ones immediately." : "⚠️ Running low on recovery codes. Consider generating new ones."}
                                        </p>
                                    )}
                                </div>
                            )}
                            <div className="flex gap-3">
                                <button onClick={() => setShowRecoveryManager(!showRecoveryManager)} className="px-4 py-2 font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2" disabled={!!error}>
                                    <Key size={16} />
                                    Manage Recovery Codes
                                </button>
                                <button onClick={() => setIsDisableModalOpen(true)} className="px-4 py-2 font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors" disabled={!!error}>
                                    Disable 2FA
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button onClick={() => setIsSetupModalOpen(true)} className="px-4 py-2 font-semibold text-white bg-primary rounded-md hover:bg-blue-600 transition-colors" disabled={!!error}>
                            Enable 2FA
                        </button>
                    )}
                </div>
            </div>

            {showRecoveryManager && mfaStatus?.enabled && (
                <div className="bg-gray-800 rounded-lg p-6">
                    <RecoveryCodesManager onClose={() => setShowRecoveryManager(false)} />
                </div>
            )}

            <MfaSetupModal isOpen={isSetupModalOpen} onClose={() => setIsSetupModalOpen(false)} onSuccess={handleSuccess} />
            <MfaDisableModal isOpen={isDisableModalOpen} onClose={() => setIsDisableModalOpen(false)} onSuccess={handleSuccess} />
        </div>
    );
};

export default MfaManager;