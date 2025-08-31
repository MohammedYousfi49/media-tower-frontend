import { type UserBooking } from '../../api/axiosClient'; // CORRECTION DE L'IMPORT

const ServiceStatusBadge = ({ status }: { status: string }) => {
    const statusClasses: { [key: string]: string } = {
        PENDING: 'bg-yellow-500 text-yellow-900',
        PROCESSING: 'bg-blue-500 text-blue-900',
        CONFIRMED: 'bg-purple-500 text-purple-900',
        IN_PROGRESS: 'bg-teal-500 text-teal-900 animate-pulse',
        COMPLETED: 'bg-green-500 text-green-900',
        CANCELLED: 'bg-gray-500 text-gray-900',
    };
    return (
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusClasses[status] || 'bg-gray-500'}`}>
            {status}
        </span>
    );
};

interface MyServicesSectionProps {
    bookings: UserBooking[];
    isLoading: boolean;
}

export const MyServicesSection = ({ bookings, isLoading }: MyServicesSectionProps) => {
    return (
        <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">My Services</h2>
            <div className="bg-card border border-gray-700 rounded-lg p-6">
                {isLoading && <p className="text-gray-400">Loading your services...</p>}
                {!isLoading && (
                    bookings.length > 0 ? (
                        <div className="space-y-4">
                            {bookings.map(booking => (
                                <div key={booking.id} className="bg-gray-800 p-4 rounded-lg flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-4 flex-grow">
                                        <img
                                            src={booking.serviceImageUrl || 'https://via.placeholder.com/150'}
                                            alt={booking.serviceName}
                                            className="w-16 h-16 object-cover rounded-md flex-shrink-0"
                                        />
                                        <div>
                                            <h4 className="font-bold text-white">{booking.serviceName}</h4>
                                            <p className="text-sm text-gray-400">
                                                Requested on: {new Date(booking.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex-shrink-0">
                                        <ServiceStatusBadge status={booking.status} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-400">You have not requested any services yet.</p>
                    )
                )}
            </div>
        </section>
    );
};