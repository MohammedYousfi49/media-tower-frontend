import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { AxiosError } from 'axios';
import { Loader2 } from 'lucide-react';

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!token) {
            setError("No reset token found. Please request a new link.");
        }
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        if (!token) {
            setError('No reset token found. Please request a new link.');
            return;
        }

        setIsLoading(true);
        try {
            const response = await axiosClient.post('/auth/reset-password', { token, password });
            setMessage(response.data.message + " Redirecting to login...");
            setTimeout(() => navigate('/login'), 4000);
        } catch (err) { // <<< CORRECTION LINTING : Utilisation d'un type spécifique
            if (err instanceof AxiosError) {
                setError(err.response?.data?.error || 'Failed to reset password. The link may be invalid or expired.');
            } else {
                setError('An unexpected error occurred.');
            }
            console.error("Reset password failed:", err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
            <div className="w-full max-w-md p-8 space-y-6 bg-card rounded-lg shadow-md">
                <div className="text-center">
                    <h2 className="text-3xl font-extrabold text-foreground">
                        Set a New Password
                    </h2>
                </div>

                {message && <p className="text-sm font-medium text-center text-green-500 bg-green-900/20 p-3 rounded-md">{message}</p>}
                {error && (
                    <div className="text-sm text-center text-red-500 bg-red-900/20 p-3 rounded-md">
                        <p>{error}</p>
                        {error.includes("token") &&
                            <Link to="/forgot-password" className="mt-2 font-medium text-primary hover:underline block">
                                Request a new link
                            </Link>
                        }
                    </div>
                )}

                {token && !message && (
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-400">New Password</label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-3 py-2 mt-1 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                                placeholder="Enter your new password"
                            />
                        </div>
                        <div>
                            <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-400">Confirm New Password</label>
                            <input
                                id="confirm-password"
                                name="confirm-password"
                                type="password"
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-3 py-2 mt-1 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                                placeholder="Confirm your new password"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-2 font-bold text-white bg-primary rounded-md hover:bg-blue-600 disabled:bg-gray-500 transition-colors flex justify-center items-center"
                        >
                            {isLoading ? <Loader2 className="animate-spin" /> : 'Reset Password'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default ResetPassword;