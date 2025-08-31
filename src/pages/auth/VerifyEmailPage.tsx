// src/pages/auth/VerifyEmailPage.tsx

import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { AxiosError } from 'axios';

type Status = 'loading' | 'success' | 'error';

const VerifyEmailPage = () => {
    const { token } = useParams<{ token: string }>();
    const [status, setStatus] = useState<Status>('loading');
    const [message, setMessage] = useState('');
    const hasAttemptedRef = useRef(false);

    console.log("VerifyEmailPage: Token from useParams:", token);

    useEffect(() => {
        if (!token) {
            console.error("VerifyEmailPage: No verification token found from useParams.");
            setStatus('error');
            setMessage('No verification token found. Please check the link from your email.');
            return;
        }

        // Utiliser useRef pour éviter les appels multiples même avec StrictMode
        if (hasAttemptedRef.current) {
            console.log("VerifyEmailPage: Already attempted verification, skipping duplicate request.");
            return;
        }

        hasAttemptedRef.current = true;

        const verifyToken = async () => {
            console.log(`VerifyEmailPage: Initiating API call for token: ${token}`);
            try {
                const response = await axiosClient.get(`/auth/verify-email/${token}`);

                setStatus('success');
                setMessage(response.data.message || 'Your email has been verified successfully!');
                console.log("VerifyEmailPage: Email verification successful!");

            } catch (error) {
                console.error("VerifyEmailPage: Verification failed:", error);
                setStatus('error');

                if (error instanceof AxiosError) {
                    const backendMessage = error.response?.data?.message || 'No specific message from backend.';
                    const statusCode = error.response?.status || 'unknown';
                    setMessage(backendMessage);
                    console.error(`VerifyEmailPage: API call failed with status ${statusCode}: ${backendMessage}`);
                } else {
                    setMessage('Verification failed. An unexpected error occurred.');
                    console.error("VerifyEmailPage: Unexpected error:", error);
                }
            }
        };

        verifyToken();
    }, [token]);

    const renderContent = () => {
        switch (status) {
            case 'loading':
                return (
                    <>
                        <Loader2 className="mx-auto animate-spin text-blue-500" size={64} />
                        <h1 className="text-2xl font-bold mt-4">Verifying your email...</h1>
                        <p className="text-gray-400 mt-2">Please wait a moment.</p>
                    </>
                );
            case 'success':
                return (
                    <>
                        <CheckCircle className="mx-auto text-green-500" size={64} />
                        <h1 className="text-2xl font-bold mt-4">Verification Successful!</h1>
                        <p className="text-gray-400 mt-2">{message}</p>
                        <Link
                            to="/login"
                            className="inline-block mt-6 px-6 py-2 font-bold text-white bg-blue-600 rounded-md hover:bg-blue-700"
                        >
                            Proceed to Login
                        </Link>
                    </>
                );
            case 'error':
                return (
                    <>
                        <XCircle className="mx-auto text-red-500" size={64} />
                        <h1 className="text-2xl font-bold mt-4">Verification Failed</h1>
                        <p className="text-gray-400 mt-2">{message}</p>
                        <div className="space-y-3 mt-6">
                            <Link
                                to="/register"
                                className="block w-full px-4 py-2 text-center text-blue-500 border border-blue-500 rounded hover:bg-blue-500 hover:text-white transition-colors"
                            >
                                Register Again
                            </Link>
                            <Link
                                to="/login"
                                className="block w-full px-4 py-2 text-center text-gray-400 hover:text-white transition-colors"
                            >
                                Back to Login
                            </Link>
                        </div>
                    </>
                );
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
            <div className="w-full max-w-md p-8 space-y-6 text-center bg-gray-800 rounded-lg shadow-md">
                {renderContent()}
            </div>
        </div>
    );
};

export default VerifyEmailPage;