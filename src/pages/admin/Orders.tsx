// Fichier : src/pages/admin/Orders.tsx (COMPLET ET FINAL AVEC SUPPRESSION DES ACTIONS)

import { useEffect, useState, useCallback } from 'react';
import { Clock, CheckCircle, Truck, XCircle, RefreshCcw, PackageCheck, Search, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import { useDebounce } from '../../hooks/useDebounce';

// --- Interfaces ---
interface OrderUser {
    firstName: string;
    lastName: string;
    email: string;
}

type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';

interface Order {
    id: number;
    user: OrderUser;
    orderDate: string;
    status: OrderStatus;
    totalAmount: number;
}

interface PaginatedOrdersResponse {
    content: Order[];
    totalPages: number;
    number: number;
}

const StatusBadge = ({ status }: { status: OrderStatus }) => {
    const statusConfig = {
        PENDING: { icon: Clock, color: 'text-yellow-400', label: 'Pending' },
        CONFIRMED: { icon: CheckCircle, color: 'text-blue-400', label: 'Confirmed' },
        PROCESSING: { icon: RefreshCcw, color: 'text-indigo-400', label: 'Processing' },
        SHIPPED: { icon: Truck, color: 'text-purple-400', label: 'Shipped' },
        DELIVERED: { icon: PackageCheck, color: 'text-green-400', label: 'Delivered' },
        CANCELLED: { icon: XCircle, color: 'text-red-400', label: 'Cancelled' },
        REFUNDED: { icon: XCircle, color: 'text-gray-400', label: 'Refunded' },
    };
    const config = statusConfig[status] || statusConfig.PENDING;
    const Icon = config.icon;

    return (
        <span className={`flex items-center justify-center text-sm font-medium ${config.color}`}>
            <Icon className="w-4 h-4 mr-2" />
            {config.label}
        </span>
    );
};

const Orders = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 500);
    const [currentPage, setCurrentPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    const fetchOrders = useCallback(async (page: number, search: string) => {
        setLoading(true);
        try {
            const response = await axiosClient.get<PaginatedOrdersResponse>('/orders', {
                params: { page, size: 10, search, sort: 'orderDate,desc' }
            });
            setOrders(response.data.content || []);
            setTotalPages(response.data.totalPages || 0);
            setCurrentPage(response.data.number || 0);
        } catch (error) {
            console.error('Failed to fetch orders:', error);
            setOrders([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void fetchOrders(currentPage, debouncedSearchTerm);
    }, [currentPage, debouncedSearchTerm, fetchOrders]);

    const renderPageNumbers = () => {
        const pageNumbers = [];
        const startPage = Math.max(0, currentPage - 2);
        const endPage = Math.min(totalPages - 1, currentPage + 2);

        if (startPage > 0) {
            pageNumbers.push(<button key={0} onClick={() => setCurrentPage(0)} className="pagination-number">1</button>);
            if (startPage > 1) pageNumbers.push(<span key="start-dots" className="pagination-dots">...</span>);
        }
        for (let i = startPage; i <= endPage; i++) {
            pageNumbers.push(<button key={i} onClick={() => setCurrentPage(i)} className={`pagination-number ${currentPage === i ? 'pagination-active' : ''}`}>{i + 1}</button>);
        }
        if (endPage < totalPages - 1) {
            if (endPage < totalPages - 2) pageNumbers.push(<span key="end-dots" className="pagination-dots">...</span>);
            pageNumbers.push(<button key={totalPages - 1} onClick={() => setCurrentPage(totalPages - 1)} className="pagination-number">{totalPages}</button>);
        }
        return pageNumbers;
    };


    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-white">Manage Orders</h1>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setCurrentPage(0); }} placeholder="Search by ID or customer..." className="w-full bg-card border border-gray-700 rounded-lg pl-10 pr-4 py-2" />
                </div>
            </div>

            <div className="bg-card rounded-lg border border-gray-700 overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-800/50">
                    <tr className="border-b border-gray-600">
                        <th className="p-4 text-gray-300 w-24">Order ID</th>
                        <th className="p-4 text-gray-300">Customer</th>
                        <th className="p-4 text-gray-300">Email</th>
                        <th className="p-4 text-gray-300 w-32">Date</th>
                        <th className="p-4 text-gray-300 text-right w-40">Total</th>
                        <th className="p-4 text-gray-300 text-center w-48">Status</th>
                        {/* ▼▼▼ COLONNE ACTIONS SUPPRIMÉE ▼▼▼ */}
                    </tr>
                    </thead>
                    <tbody>
                    {loading ? ( <tr><td colSpan={6} className="text-center p-8"><Loader2 className="animate-spin mx-auto text-primary" /></td></tr> )
                        : orders.map((order) => (
                            <tr key={order.id} className="border-b border-gray-700 last:border-b-0 hover:bg-gray-800/50">
                                <td className="p-4 font-mono">#{order.id}</td>
                                <td className="p-4 font-medium">{order.user.firstName} {order.user.lastName}</td>
                                <td className="p-4 text-gray-400">{order.user.email}</td>
                                <td className="p-4 text-gray-400">{new Date(order.orderDate).toLocaleDateString()}</td>
                                <td className="p-4 text-right font-mono">{order.totalAmount.toFixed(2)} DH</td>
                                <td className="p-4 text-center"><StatusBadge status={order.status} /></td>
                                {/* ▼▼▼ CELLULE ACTIONS SUPPRIMÉE ▼▼▼ */}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {totalPages > 1 && (
                <div className="flex justify-between items-center mt-6 text-white">
                    <button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 0 || loading} className="pagination-arrow"><ChevronLeft size={20}/></button>
                    <div className="flex items-center">{renderPageNumbers()}</div>
                    <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage >= totalPages - 1 || loading} className="pagination-arrow"><ChevronRight size={20}/></button>
                </div>
            )}
        </div>
    );
};

export default Orders;