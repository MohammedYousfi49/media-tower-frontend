// src/pages/auth/Register.tsx

import { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import axiosClient from '../../api/axiosClient';
import { FirebaseError } from 'firebase/app';
import { AxiosError } from 'axios';
import { Loader2, MailCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const Register = () => {
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [registrationSuccess, setRegistrationSuccess] = useState(false);

    const { setIsRegistering } = useAuth();

    const handleRegister = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (loading) {
            console.warn("RegisterPage: Submission already in progress, preventing duplicate.");
            return;
        }

        setError('');
        setLoading(true);

        const form = e.currentTarget;
        const firstName = (form.elements.namedItem('firstName') as HTMLInputElement).value;
        const lastName = (form.elements.namedItem('lastName') as HTMLInputElement).value;
        const email = (form.elements.namedItem('email') as HTMLInputElement).value;
        const password = (form.elements.namedItem('password') as HTMLInputElement).value;

        if (password.length < 6) {
            setError('Password must be at least 6 characters long.');
            setLoading(false);
            return;
        }

        try {
            setIsRegistering(true);
            console.log("RegisterPage: isRegistering set to true.");

            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const firebaseUser = userCredential.user;

            await signOut(auth);
            console.log("RegisterPage: Successfully created Firebase user, then signed out to prevent premature /users/me call.");

            const registrationData = {
                uid: firebaseUser.uid,
                email: email,
                password: password,
                firstName: firstName,
                lastName: lastName,
            };

            console.log("RegisterPage: Calling backend /auth/register...");
            await axiosClient.post('/auth/register', registrationData);
            console.log("RegisterPage: Backend registration successful.");

            setRegistrationSuccess(true);

        } catch (err) {
            if (err instanceof FirebaseError && err.code === 'auth/email-already-in-use') {
                setError('This email is already registered. Please try to log in.');
            } else if (err instanceof AxiosError && err.response) {
                const message = err.response?.data?.message || 'Registration failed.';
                setError(message);
            } else {
                setError('An unexpected error occurred during registration.');
            }
            console.error("Registration failed:", err);
        } finally {
            setLoading(false);
            setIsRegistering(false);
            console.log("RegisterPage: isRegistering set to false.");
        }
    };

    if (registrationSuccess) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
                <div className="w-full max-w-md p-8 space-y-6 text-center bg-card rounded-lg shadow-md">
                    <MailCheck className="mx-auto text-green-500" size={64} />
                    <h1 className="text-2xl font-bold text-foreground">Registration Successful!</h1>
                    <p className="text-gray-400">
                        We've sent a verification link to your email address. Please check your inbox (and spam folder) to complete your registration.
                    </p>
                    {/* CHANGEMENT: Supprimer le paramètre status=unverified */}
                    <Link to="/login" className="inline-block mt-4 text-primary hover:underline">
                        Back to Login
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
            <div className="w-full max-w-md p-8 space-y-6 bg-card rounded-lg shadow-md">
                <h1 className="text-2xl font-bold text-center text-foreground">Create an Account</h1>
                {error && <p className="text-red-500 text-center p-2 bg-red-900/20 rounded-md">{error}</p>}
                <form onSubmit={handleRegister} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400">First Name</label>
                        <input name="firstName" type="text" className="w-full px-3 py-2 mt-1 text-white bg-gray-700 border border-gray-600 rounded-md" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400">Last Name</label>
                        <input name="lastName" type="text" className="w-full px-3 py-2 mt-1 text-white bg-gray-700 border border-gray-600 rounded-md" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400">Email</label>
                        <input name="email" type="email" className="w-full px-3 py-2 mt-1 text-white bg-gray-700 border border-gray-600 rounded-md" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400">Password</label>
                        <input name="password" type="password" className="w-full px-3 py-2 mt-1 text-white bg-gray-700 border border-gray-600 rounded-md" required />
                    </div>
                    <button type="submit" disabled={loading} className="w-full py-2 font-bold text-white bg-primary rounded-md hover:bg-blue-600 disabled:bg-gray-500">
                        {loading ? <Loader2 className="animate-spin mx-auto"/> : 'Register'}
                    </button>
                </form>
                <p className="text-sm text-center text-gray-400">
                    Already have an account? <Link to="/login" className="font-medium text-primary hover:underline">Login</Link>
                </p>
            </div>
        </div>
    );
};

export default Register;