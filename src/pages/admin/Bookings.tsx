import { useEffect, useState, useMemo } from 'react';
import { Eye, Check, X, Clock, PlayCircle, UserCheck, UserPlus, UserX } from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import Modal from '../../components/shared/Modal';
import { useAuth } from '../../hooks/useAuth';

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
        <span className={`flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full ${config.color}`}>
            <Icon size={14} className="mr-1.5"/>{config.label}
        </span>
    );
};

const Bookings = () => {
    const { appUser } = useAuth();
    const adminFullName = useMemo(() => appUser ? `${appUser.firstName} ${appUser.lastName}` : '', [appUser]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [activeFilter, setActiveFilter] = useState<FilterType>('NEW');

    useEffect(() => {
        fetchBookings();
    }, []);

    const fetchBookings = async () => {
        setLoading(true); // Toujours mettre à jour le loading au début du fetch
        try {
            const response = await axiosClient.get<Booking[]>('/bookings');
            setBookings(response.data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        } catch (error) { console.error('Failed to fetch bookings:', error); }
        finally { setLoading(false); }
    };

    const handleAssign = async (bookingId: number) => {
        try {
            await axiosClient.put(`/bookings/${bookingId}/assign`);
            await fetchBookings(); // Rafraîchissement automatique
        } catch (error) {
            console.error('Failed to assign booking:', error);
            alert('Failed to assign booking. It might already be processed or assigned.');
        }
    };

    const handleUnassign = async (bookingId: number) => {
        try {
            await axiosClient.put(`/bookings/${bookingId}/unassign`);
            await fetchBookings(); // Rafraîchissement automatique
        } catch (error) { console.error('Failed to unassign booking:', error); }
    };

    const handleUpdateStatus = async (bookingId: number, status: BookingStatus) => {
        try {
            await axiosClient.put(`/bookings/${bookingId}/status`, { status });
            await fetchBookings();
            setIsModalOpen(false);
        } catch (error) { console.error('Failed to update status:', error); }
    };

    const filteredBookings = useMemo(() => {
        switch (activeFilter) {
            case 'NEW':
                return bookings.filter(b => b.status === 'PENDING');
            case 'MY_QUEUE':
                return bookings.filter(b => b.assignedAdminName === adminFullName && (b.status === 'PROCESSING' || b.status === 'IN_PROGRESS'));
            case 'ALL':
            default:
                return bookings;
        }
    }, [bookings, activeFilter, adminFullName]);

    const FilterButton = ({ filter, label }: { filter: FilterType; label: string }) => (
        <button
            onClick={() => setActiveFilter(filter)}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
                activeFilter === filter ? 'bg-primary text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
        >
            {label}
        </button>
    );

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-white">Manage Bookings</h1>
                <div className="flex space-x-2">
                    <FilterButton filter="NEW" label="New Requests" />
                    <FilterButton filter="MY_QUEUE" label="My Queue" />
                    <FilterButton filter="ALL" label="All Bookings" />
                </div>
            </div>

            <div className="bg-card p-4 rounded-lg border border-gray-700 overflow-x-auto">
                <table className="w-full text-left min-w-[800px]">
                    <thead>
                    <tr className="border-b border-gray-600 text-sm text-gray-400">
                        <th className="p-3 font-semibold">Order ID</th>
                        <th className="p-3 font-semibold">Customer</th>
                        <th className="p-3 font-semibold">Service</th>
                        <th className="p-3 font-semibold">Date</th>
                        <th className="p-3 font-semibold">Status</th>
                        <th className="p-3 font-semibold">Assigned To</th>
                        <th className="p-3 font-semibold text-center">Actions</th>
                    </tr>
                    </thead>
                    <tbody>
                    {loading ? (
                        <tr><td colSpan={7} className="text-center p-4">Loading bookings...</td></tr>
                    ) : filteredBookings.length === 0 ? (
                        <tr><td colSpan={7} className="text-center p-8 text-gray-500">No bookings in this category.</td></tr>
                    ) : filteredBookings.map(booking => {
                        const isAssignedToCurrentUser = booking.assignedAdminName === adminFullName;
                        const allowAssignmentActions = booking.status === 'PENDING' || booking.status === 'PROCESSING';

                        return (
                            <tr key={booking.id} className="border-b border-gray-700 hover:bg-gray-800 text-sm">
                                <td className="p-3 font-mono">#{booking.id}</td>
                                <td className="p-3">{booking.customerName}</td>
                                <td className="p-3">{booking.serviceName}</td>
                                <td className="p-3">{new Date(booking.createdAt).toLocaleDateString()}</td>
                                <td className="p-3"><StatusBadge status={booking.status} /></td>
                                <td className="p-3">{booking.assignedAdminName || '-'}</td>
                                <td className="p-3 flex items-center justify-center space-x-3">
                                    <button onClick={() => { setSelectedBooking(booking); setIsModalOpen(true); }} className="hover:text-primary" title="View Details"><Eye /></button>

                                    {/* --- LOGIQUE D'AFFICHAGE FINALE --- */}
                                    {/* Si la tâche est en attente (PENDING), tous les admins voient le bouton "Assign" */}
                                    {booking.status === 'PENDING' && (
                                        <button onClick={() => handleAssign(booking.id)} className="flex items-center text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700" title="Assign to me">
                                            <UserPlus size={14} className="mr-1"/> Assign
                                        </button>
                                    )}
                                    {/* Si la tâche est assignée à l'utilisateur actuel ET qu'elle n'est pas encore payée, il peut se désassigner */}
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
                                {(selectedBooking.status === 'PENDING' || selectedBooking.status === 'PROCESSING') && (<button onClick={() => handleUpdateStatus(selectedBooking.id, 'CONFIRMED')} className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700">Confirm & Request Payment</button>)}
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