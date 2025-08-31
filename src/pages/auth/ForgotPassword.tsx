import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { Loader2, Clock } from 'lucide-react';
import { AxiosError } from 'axios';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [secondsRemaining, setSecondsRemaining] = useState(0);
    const [isRateLimited, setIsRateLimited] = useState(false);

    // Effet pour décompter les secondes restantes
    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (secondsRemaining > 0) {
            setIsRateLimited(true);
            interval = setInterval(() => {
                setSecondsRemaining((prev) => {
                    if (prev <= 1) {
                        setIsRateLimited(false);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }

        return () => {
            if (interval) {
                clearInterval(interval);
            }
        };
    }, [secondsRemaining]);

    // Fonction pour formater le temps restant
    const formatTimeRemaining = (seconds: number): string => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;

        if (minutes > 0) {
            return `${minutes}m ${remainingSeconds}s`;
        }
        return `${remainingSeconds}s`;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage('');
        setError('');
        setIsLoading(true);

        try {
            const response = await axiosClient.post('/auth/forgot-password', { email });
            setMessage(response.data.message);
        } catch (err) {
            console.error("Forgot password failed:", err);

            if (err instanceof AxiosError && err.response) {
                if (err.response.status === 429) {
                    // Rate limiting détecté
                    const data = err.response.data;
                    setError(data.message || "Too many requests. Please wait and try again.");

                    // Si le backend retourne les secondes restantes
                    if (data.secondsRemaining && typeof data.secondsRemaining === 'number') {
                        setSecondsRemaining(data.secondsRemaining);
                    } else {
                        // Fallback: 15 minutes par défaut
                        setSecondsRemaining(15 * 60);
                    }
                } else {
                    setError('An unexpected error occurred. Please try again.');
                }
            } else {
                setError('A network error occurred. Please check your connection.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
            <div className="w-full max-w-md p-8 space-y-6 bg-card rounded-lg shadow-md">
                <div className="text-center">
                    <h2 className="text-3xl font-extrabold text-foreground">
                        Forgot Password?
                    </h2>
                    <p className="mt-2 text-sm text-gray-400">
                        Enter your email and we'll send you a link to get back into your account.
                    </p>
                </div>

                {message && (
                    <p className="text-sm font-medium text-center text-green-500 bg-green-900/20 p-3 rounded-md">
                        {message}
                    </p>
                )}

                {error && (
                    <div className="text-sm text-center text-red-500 bg-red-900/20 p-3 rounded-md">
                        <p>{error}</p>
                        {isRateLimited && secondsRemaining > 0 && (
                            <div className="mt-2 flex items-center justify-center gap-2 text-orange-400">
                                <Clock size={16} />
                                <span>Try again in: {formatTimeRemaining(secondsRemaining)}</span>
                            </div>
                        )}
                    </div>
                )}

                <form className="space-y-6" onSubmit={handleSubmit}>
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-400">
                            Email Address
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-3 py-2 mt-1 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="you@example.com"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading || !!message || isRateLimited}
                        className="w-full py-2 font-bold text-white bg-primary rounded-md hover:bg-blue-600 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors flex justify-center items-center"
                    >
                        {isLoading ? (
                            <Loader2 className="animate-spin" />
                        ) : isRateLimited ? (
                            <>
                                <Clock size={16} className="mr-2" />
                                Wait {formatTimeRemaining(secondsRemaining)}
                            </>
                        ) : (
                            'Send Reset Link'
                        )}
                    </button>
                </form>

                <div className="text-sm text-center">
                    <Link to="/login" className="font-medium text-primary hover:underline">
                        Back to Login
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;