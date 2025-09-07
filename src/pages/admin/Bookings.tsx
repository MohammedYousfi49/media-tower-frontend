// Fichier : src/pages/admin/Bookings.tsx (COMPLET ET CORRIGÉ)

import { useEffect, useState, useCallback } from 'react';
import { Eye, Check, X, Clock, PlayCircle, UserCheck, UserPlus, UserX, Search, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import Modal from '../../components/shared/Modal';
import { useAuth } from '../../hooks/useAuth';
import { useDebounce } from '../../hooks/useDebounce';

// --- Interfaces ---
type BookingStatus = 'PENDING' | 'PROCESSING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
type FilterType = 'NEW' | 'MY_QUEUE' | 'ALL';

interface Booking {
    id: number;
    customerName: string;
    customerEmail: string;
    serviceName: string;
    status: BookingStatus;
    assignedAdminName: string | null;
    customerNotes: string;
    createdAt: string;
}

interface PaginatedBookingsResponse {
    content: Booking[];
    totalPages: number;
    number: number;
}

const statusConfig: { [key in BookingStatus]: { color: string; icon: React.ElementType; label: string } } = {
    PENDING: { color: 'text-yellow-400 bg-yellow-900/50', icon: Clock, label: 'Pending Assignment' },
    PROCESSING: { color: 'text-blue-400 bg-blue-900/50', icon: PlayCircle, label: 'Processing' },
    CONFIRMED: { color: 'text-purple-400 bg-purple-900/50', icon: UserCheck, label: 'Awaiting Payment' },
    IN_PROGRESS: { color: 'text-teal-400 bg-teal-900/50 animate-pulse', icon: PlayCircle, label: 'In Progress' },
    COMPLETED: { color: 'text-green-400 bg-green-900/50', icon: Check, label: 'Completed' },
    CANCELLED: { color: 'text-red-400 bg-red-900/50', icon: X, label: 'Cancelled' },
};

const StatusBadge = ({ status }: { status: BookingStatus }) => {
    const config = statusConfig[status] || statusConfig.PENDING;
    const Icon = config.icon;
    return (
        <span className={`flex items-center justify-center text-xs font-medium px-2.5 py-0.5 rounded-full ${config.color}`}>
            <Icon size={14} className="mr-1.5"/>{config.label}
        </span>
    );
};

const Bookings = () => {
    const { appUser } = useAuth();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [activeFilter, setActiveFilter] = useState<FilterType>('NEW');

    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 500);
    const [currentPage, setCurrentPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    const fetchBookings = useCallback(async (page: number, search: string, filter: FilterType) => {
        setLoading(true);
        try {
            const response = await axiosClient.get<PaginatedBookingsResponse>('/bookings', {
                params: { page, size: 10, search, filter, sort: 'createdAt,desc' }
            });
            // ▼▼▼ LA CORRECTION EST ICI ▼▼▼
            // On utilise response.data.content et on enlève le .sort()
            setBookings(response.data.content || []);
            setTotalPages(response.data.totalPages || 0);
            setCurrentPage(response.data.number || 0);
        } catch (error) {
            console.error('Failed to fetch bookings:', error);
            setBookings([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void fetchBookings(currentPage, debouncedSearchTerm, activeFilter);
    }, [currentPage, debouncedSearchTerm, activeFilter, fetchBookings]);


    const handleAssign = async (bookingId: number) => {
        try {
            await axiosClient.put(`/bookings/${bookingId}/assign`);
            void fetchBookings(currentPage, debouncedSearchTerm, activeFilter);
        } catch (error) {
            console.error('Failed to assign booking:', error);
            alert('Failed to assign booking. It might already be processed or assigned.');
        }
    };

    const handleUnassign = async (bookingId: number) => {
        try {
            await axiosClient.put(`/bookings/${bookingId}/unassign`);
            void fetchBookings(currentPage, debouncedSearchTerm, activeFilter);
        } catch (error) { console.error('Failed to unassign booking:', error); }
    };

    const handleUpdateStatus = async (bookingId: number, status: BookingStatus) => {
        try {
            await axiosClient.put(`/bookings/${bookingId}/status`, { status });
            void fetchBookings(currentPage, debouncedSearchTerm, activeFilter);
            setIsModalOpen(false);
        } catch (error) { console.error('Failed to update status:', error); }
    };

    const handleFilterChange = (filter: FilterType) => {
        setActiveFilter(filter);
        setCurrentPage(0);
    };

    const FilterButton = ({ filter, label }: { filter: FilterType; label: string }) => (
        <button
            onClick={() => handleFilterChange(filter)}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
                activeFilter === filter ? 'bg-primary text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
        >
            {label}
        </button>
    );

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
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                <h1 className="text-3xl font-bold text-white">Manage Bookings</h1>
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="relative flex-grow">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setCurrentPage(0); }} placeholder="Search..." className="w-full bg-card border border-gray-700 rounded-lg pl-10 pr-4 py-2" />
                    </div>
                    <div className="flex space-x-2">
                        <FilterButton filter="NEW" label="New Requests" />
                        <FilterButton filter="MY_QUEUE" label="My Queue" />
                        <FilterButton filter="ALL" label="All Bookings" />
                    </div>
                </div>
            </div>

            <div className="bg-card rounded-lg border border-gray-700 overflow-x-auto">
                <table className="w-full text-left min-w-[800px]">
                    <thead className="bg-gray-800/50">
                    <tr className="border-b border-gray-600 text-sm text-gray-400">
                        <th className="p-3 font-semibold w-24">Order ID</th>
                        <th className="p-3 font-semibold">Customer</th>
                        <th className="p-3 font-semibold">Service</th>
                        <th className="p-3 font-semibold w-32">Date</th>
                        <th className="p-3 font-semibold text-center w-48">Status</th>
                        <th className="p-3 font-semibold">Assigned To</th>
                        <th className="p-3 font-semibold text-center w-40">Actions</th>
                    </tr>
                    </thead>
                    <tbody>
                    {loading ? (
                        <tr><td colSpan={7} className="text-center p-8"><Loader2 className="animate-spin mx-auto text-primary"/></td></tr>
                    ) : bookings.length === 0 ? (
                        <tr><td colSpan={7} className="text-center p-8 text-gray-500">No bookings in this category.</td></tr>
                    ) : bookings.map(booking => {
                        const adminFullName = appUser ? `${appUser.firstName} ${appUser.lastName}` : '';
                        const isAssignedToCurrentUser = booking.assignedAdminName === adminFullName;
                        const allowAssignmentActions = booking.status === 'PROCESSING';

                        return (
                            <tr key={booking.id} className="border-b border-gray-700 hover:bg-gray-800 text-sm">
                                <td className="p-3 font-mono">#{booking.id}</td>
                                <td className="p-3 font-medium">{booking.customerName}</td>
                                <td className="p-3 text-gray-300">{booking.serviceName}</td>
                                <td className="p-3 text-gray-400">{new Date(booking.createdAt).toLocaleDateString()}</td>
                                <td className="p-3"><StatusBadge status={booking.status} /></td>
                                <td className="p-3 text-gray-300">{booking.assignedAdminName || '-'}</td>
                                <td className="p-3 flex items-center justify-center space-x-3">
                                    <button onClick={() => { setSelectedBooking(booking); setIsModalOpen(true); }} className="hover:text-primary" title="View Details"><Eye size={18} /></button>

                                    {booking.status === 'PENDING' && (
                                        <button onClick={() => handleAssign(booking.id)} className="flex items-center text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700" title="Assign to me">
                                            <UserPlus size={14} className="mr-1"/> Assign
                                        </button>
                                    )}
                                    {isAssignedToCurrentUser && allowAssignmentActions && (
                                        <button onClick={() => handleUnassign(booking.id)} className="flex items-center text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700" title="Unassign">
                                            <UserX size={14} className="mr-1"/> Unassign
                                        </button>
                                    )}
                                </td>
                            </tr>
                        )
                    })}
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

            {selectedBooking && (
                <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`Booking Details #${selectedBooking.id}`}>
                    <div className="space-y-4 text-gray-300">
                        <div><h3 className="font-bold text-lg text-white">Customer</h3><p>{selectedBooking.customerName} ({selectedBooking.customerEmail})</p></div>
                        <div><h3 className="font-bold text-lg text-white">Service</h3><p>{selectedBooking.serviceName}</p></div>
                        <div className="bg-gray-800 p-3 rounded"><p className="text-sm text-gray-400 mb-1">Customer Notes:</p><p className="whitespace-pre-wrap">{selectedBooking.customerNotes || 'No notes provided by customer.'}</p></div>
                        <div className="flex items-center space-x-2"><h3 className="font-bold text-lg text-white">Status:</h3><StatusBadge status={selectedBooking.status} /></div>
                        {selectedBooking.assignedAdminName && <p><strong>Assigned To:</strong> {selectedBooking.assignedAdminName}</p>}

                        <div className="mt-4 pt-4 border-t border-gray-600">
                            <h3 className="font-bold text-lg text-white mb-2">Admin Actions</h3>
                            <div className="flex flex-wrap gap-2">
                                {(selectedBooking.status === 'PROCESSING') && (<button onClick={() => handleUpdateStatus(selectedBooking.id, 'CONFIRMED')} className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700">Confirm & Request Payment</button>)}
                                {selectedBooking.status === 'IN_PROGRESS' && (<button onClick={() => handleUpdateStatus(selectedBooking.id, 'COMPLETED')} className="bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700">Mark as Completed</button>)}
                                {(selectedBooking.status !== 'COMPLETED' && selectedBooking.status !== 'CANCELLED') && (<button onClick={() => handleUpdateStatus(selectedBooking.id, 'CANCELLED')} className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700">Cancel Booking</button>)}
                            </div>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default Bookings;