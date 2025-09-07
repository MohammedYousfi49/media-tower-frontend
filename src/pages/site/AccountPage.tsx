// Fichier : src/pages/site/AccountPage.tsx (COMPLET ET MIS À JOUR)

import { useEffect, useState, useCallback, useRef } from 'react';
import axiosClient, { UserBooking } from '../../api/axiosClient';
import { useAuth } from '../../hooks/useAuth';
import { DownloadsSection } from '../../components/site/DownloadsSection';
import { MyServicesSection } from '../../components/site/MyServicesSection';
import MfaManager from '../../components/site/MfaManager';
import ProfileCard from '../../components/site/ProfileCard';
import { LoginHistoryList, PasswordHistoryList } from '../../components/site/HistoryLists';
import { MyReviewsSection } from '../../components/site/MyReviewsSection'; // <-- AJOUTER CET IMPORT

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
    const [activeTab, setActiveTab] = useState('profile');
    const [downloadsVersion, setDownloadsVersion] = useState(0);
    const prevOrdersRef = useRef<OrderHistory[]>([]);

    useEffect(() => { prevOrdersRef.current = orders; });

    const fetchData = useCallback(async () => {
        if (!currentUser) {
            setLoading(false);
            return;
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
                if (nowDelivered) setDownloadsVersion(v => v + 1);
            }
        } catch (err) {
            console.error('Failed to fetch user data:', err);
        } finally {
            setLoading(false);
        }
    }, [currentUser]);

    useEffect(() => {
        setLoading(true);
        void fetchData();
    }, [fetchData]);

    if (loading && !appUser) {
        return <div className="text-center p-8 text-gray-400">Loading your account...</div>;
    }

    if (!appUser) {
        return <div className="text-center p-8 text-gray-400">You must be logged in to view this page.</div>;
    }

    const ordersTable = (
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
    );

    return (
        <div className="space-y-8">
            <h1 className="text-4xl font-bold text-white">My Account</h1>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
                <div className="lg:col-span-1 lg:sticky lg:top-8">
                    <nav className="bg-card p-2 rounded-lg border border-gray-700 space-y-1">
                        <TabButton label="Profile" activeTab={activeTab} setActiveTab={setActiveTab} tabName="profile" />
                        <TabButton label="Security" activeTab={activeTab} setActiveTab={setActiveTab} tabName="security" />
                        <TabButton label="My Purchases" activeTab={activeTab} setActiveTab={setActiveTab} tabName="purchases" />
                        {/* ▼▼▼ NOUVEL ONGLET AJOUTÉ ▼▼▼ */}
                        <TabButton label="My Reviews" activeTab={activeTab} setActiveTab={setActiveTab} tabName="reviews" />
                    </nav>
                </div>

                <div className="lg:col-span-3">
                    {activeTab === 'profile' && <ProfileCard />}

                    {activeTab === 'security' && (
                        <div className="space-y-8">
                            <section className="bg-card border border-gray-700 rounded-lg p-6">
                                <h2 className="text-2xl font-semibold mb-4 text-white">Two-Factor Authentication</h2>
                                <MfaManager />
                            </section>
                            <section className="bg-card border border-gray-700 rounded-lg p-6">
                                <h2 className="text-2xl font-semibold mb-6 text-white">Activity History</h2>
                                <div className="space-y-6">
                                    <LoginHistoryList />
                                    <div className="border-t border-gray-700 pt-6">
                                        <PasswordHistoryList />
                                    </div>
                                </div>
                            </section>
                        </div>
                    )}

                    {activeTab === 'purchases' && (
                        <div className="space-y-12">
                            <DownloadsSection key={downloadsVersion} />
                            <MyServicesSection bookings={bookings} isLoading={false} />
                            <section>
                                <h2 className="text-2xl font-semibold mb-4 text-white">Order History (Products)</h2>
                                {ordersTable}
                            </section>
                        </div>
                    )}

                    {/* ▼▼▼ NOUVELLE SECTION AJOUTÉE ▼▼▼ */}
                    {activeTab === 'reviews' && <MyReviewsSection />}
                </div>
            </div>
        </div>
    );
};

const TabButton = ({ label, activeTab, setActiveTab, tabName }: { label: string, activeTab: string, setActiveTab: (name: string) => void, tabName: string }) => (
    <button
        onClick={() => setActiveTab(tabName)}
        className={`w-full text-left p-3 rounded-md transition-colors text-white font-medium ${activeTab === tabName ? 'bg-primary' : 'hover:bg-gray-700'}`}
    >
        {label}
    </button>
);

export default AccountPage;