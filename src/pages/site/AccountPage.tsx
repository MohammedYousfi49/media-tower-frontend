import { useEffect, useState, useCallback, useRef } from 'react';
import axiosClient, { UserBooking } from '../../api/axiosClient';
import { useAuth } from '../../hooks/useAuth';
import { AxiosError } from 'axios';
import { DownloadsSection } from '../../components/site/DownloadsSection';
import { MyServicesSection } from '../../components/site/MyServicesSection';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import MfaManager from '../../components/site/MfaManager';
import ProfileCard from '../../components/site/ProfileCard'; // <-- NOUVEL IMPORT

interface OrderHistory {
    id: number;
    orderDate: string;
    status: string;
    totalAmount: number;
}

const AccountPage = () => {
    const { appUser, currentUser } = useAuth();
    const [orders, setOrders] = useState<OrderHistory[]>([]);
    const [bookings, setBookings] = useState<UserBooking[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [downloadsVersion, setDownloadsVersion] = useState(0);
    const prevOrdersRef = useRef<OrderHistory[]>([]);
    const retryCountRef = useRef(0);
    const maxRetries = 3;

    useEffect(() => {
        prevOrdersRef.current = orders;
    });

    const fetchData = useCallback(async (isInitialLoad = false) => {
        if (!currentUser) {
            if (isInitialLoad) setLoading(false);
            return;
        }

        if (isInitialLoad) {
            setLoading(true);
            setError(null);
            retryCountRef.current = 0;
        }

        try {
            const [ordersRes, bookingsRes] = await Promise.all([
                axiosClient.get<OrderHistory[]>('/orders/me'),
                axiosClient.get<UserBooking[]>('/bookings/me')
            ]);

            const newOrders = ordersRes.data;
            setOrders(newOrders);
            setBookings(bookingsRes.data);

            const previouslyPending = prevOrdersRef.current.filter(o => o.status === 'PENDING').map(o => o.id);
            if (previouslyPending.length > 0) {
                const nowDelivered = newOrders.find(o => previouslyPending.includes(o.id) && o.status === 'DELIVERED');
                if (nowDelivered) {
                    setDownloadsVersion(v => v + 1);
                }
            }

            retryCountRef.current = 0;
            setError(null);

        } catch (err: unknown) {
            console.error('Failed to fetch user data:', err);

            if (err instanceof AxiosError) {
                if ((err.response?.status === 401 || err.response?.status === 403) && isInitialLoad) {
                    setError('Your session has expired. Please log in again.');
                }
                else if (!err.response && retryCountRef.current < maxRetries) {
                    retryCountRef.current++;
                    setTimeout(() => fetchData(isInitialLoad), 2000 * retryCountRef.current);
                    return;
                }
                else if (isInitialLoad) {
                    setError(err.response?.data?.message || 'Could not load your account data at this time.');
                }
            } else {
                if (isInitialLoad) {
                    setError('An unexpected error occurred. Please try again.');
                }
            }
        } finally {
            if (isInitialLoad) setLoading(false);
        }
    }, [currentUser]);

    useEffect(() => {
        fetchData(true);
        const intervalId = window.setInterval(() => fetchData(false), 45000);
        return () => clearInterval(intervalId);
    }, [fetchData]);

    const handleRetry = () => {
        setError(null);
        fetchData(true);
    };

    if (loading) {
        return <div className="text-center p-8 text-gray-400">Loading your account...</div>;
    }

    if (!appUser) {
        return <div className="text-center p-8 text-gray-400">You must be logged in to view this page.</div>;
    }

    return (
        <div className="space-y-12">
            <h1 className="text-4xl font-bold text-white">My Account</h1>

            {error && (
                <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 text-red-400">
                    <div className="flex items-center justify-between">
                        <span>{error}</span>
                        <button
                            onClick={handleRetry}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium transition-colors"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            )}

            {/* ▼▼▼ NOUVELLE MISE EN PAGE AVEC LA CARTE DE PROFIL ▼▼▼ */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

                {/* --- Colonne de Gauche : Carte de Profil --- */}
                <div className="lg:col-span-1">
                    <ProfileCard />
                </div>

                {/* --- Colonne de Droite : Autres Sections --- */}
                <div className="lg:col-span-2 space-y-8">
                    <section className="bg-card border border-gray-700 rounded-lg p-6">
                        <h2 className="text-2xl font-semibold mb-4 text-white">My Profile Details</h2>
                        <div className="space-y-2 text-gray-300">
                            <p><strong>First Name:</strong> {appUser.firstName || 'Not set'}</p>
                            <p><strong>Last Name:</strong> {appUser.lastName || 'Not set'}</p>
                            <p><strong>Email:</strong> {appUser.email}</p>
                            <div className="flex items-center pt-2">
                                <strong className="mr-2">Email Status:</strong>
                                {appUser.emailVerified
                                    ? <span className="flex items-center gap-2 font-semibold text-green-400"><CheckCircle size={18} /> Verified</span>
                                    : <span className="flex items-center gap-2 font-semibold text-yellow-400"><AlertTriangle size={18} /> Not Verified</span>
                                }
                            </div>
                        </div>
                    </section>

                    <section className="bg-card border border-gray-700 rounded-lg p-6">
                        <h2 className="text-2xl font-semibold mb-4 text-white">Account Security</h2>
                        <MfaManager />
                    </section>
                </div>
            </div>

            <DownloadsSection key={downloadsVersion} />
            <MyServicesSection bookings={bookings} isLoading={loading} />

            <section>
                <h2 className="text-2xl font-semibold mb-4 text-white">Order History (Products)</h2>
                <div className="bg-card border border-gray-700 rounded-lg p-4 overflow-x-auto">
                    <table className="w-full text-left min-w-[600px]">
                        <thead>
                        <tr className="border-b border-gray-600">
                            <th className="p-3">Order ID</th>
                            <th className="p-3">Date</th>
                            <th className="p-3">Status</th>
                            <th className="p-3 text-right">Total</th>
                        </tr>
                        </thead>
                        <tbody>
                        {orders.length === 0 ? (
                            <tr><td colSpan={4} className="text-center p-8 text-gray-400">You have no product orders yet.</td></tr>
                        ) : (
                            orders.map(order => (
                                <tr key={order.id} className="border-b border-gray-700 last:border-b-0 hover:bg-gray-800">
                                    <td className="p-3 font-mono">#{order.id}</td>
                                    <td className="p-3">{new Date(order.orderDate).toLocaleDateString()}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                            order.status === 'DELIVERED' ? 'bg-green-500 text-green-900' :
                                                order.status === 'PENDING' ? 'bg-yellow-500 text-yellow-900 animate-pulse' :
                                                    'bg-gray-500 text-gray-900'
                                        }`}>
                                            {order.status}
                                        </span>
                                    </td>
                                    <td className="p-3 text-right font-medium">{order.totalAmount.toFixed(2)} DH</td>
                                </tr>
                            ))
                        )}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
};

export default AccountPage;