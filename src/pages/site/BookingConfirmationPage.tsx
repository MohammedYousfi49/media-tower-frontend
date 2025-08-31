import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Clock, AlertCircle, Briefcase } from 'lucide-react';
import axiosClient from '../../api/axiosClient';

interface BookingStatusInfo {
    bookingId: string;
    status: string;
    serviceName: string;
}

const BookingConfirmationPage = () => {
    const { bookingId } = useParams<{ bookingId: string }>();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const [statusInfo, setStatusInfo] = useState<BookingStatusInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const confirmAndFetchStatus = async () => {
            if (!bookingId) {
                setError('Booking ID not found.');
                setLoading(false);
                return;
            }

            try {
                // Étape 1: Confirmer le paiement si nécessaire (Stripe/PayPal fallback)
                const stripePaymentIntent = searchParams.get('payment_intent');
                const paypalOrderId = searchParams.get('paypalOrderId');

                if (stripePaymentIntent) {
                    await axiosClient.post('/payments/stripe/confirm-payment', { paymentIntentId: stripePaymentIntent, bookingId });
                } else if (paypalOrderId) {
                    await axiosClient.post('/payments/paypal/capture-order', { paypalOrderId, bookingId });
                }

                // Étape 2: Récupérer le statut final de la réservation
                const response = await axiosClient.get(`/bookings/${bookingId}`);
                setStatusInfo({
                    bookingId: response.data.id,
                    status: response.data.status,
                    serviceName: response.data.serviceName,
                });
            } catch (err) {
                setError('Failed to confirm your booking. Please check your account or contact support.');
            } finally {
                setLoading(false);
            }
        };

        const timer = setTimeout(confirmAndFetchStatus, 1000); // Petit délai pour laisser le webhook arriver en premier
        return () => clearTimeout(timer);
    }, [bookingId, searchParams]);

    const getStatusDisplay = () => {
        if (loading) return { icon: <Clock className="mx-auto h-24 w-24 text-yellow-500 animate-pulse" />, title: 'Confirming Your Booking...', message: 'Please wait while we finalize your service booking.' };
        if (error) return { icon: <AlertCircle className="mx-auto h-24 w-24 text-red-500" />, title: 'Confirmation Error', message: error };
        if (!statusInfo) return { icon: <AlertCircle className="mx-auto h-24 w-24 text-red-500" />, title: 'Information Unavailable', message: 'Could not retrieve booking details.' };

        if (statusInfo.status === 'IN_PROGRESS') {
            return { icon: <CheckCircle className="mx-auto h-24 w-24 text-green-500" />, title: '🎉 Booking Confirmed!', message: `We have started working on your service: "${statusInfo.serviceName}". You will be notified upon completion.` };
        }
        return { icon: <Clock className="mx-auto h-24 w-24 text-yellow-500" />, title: 'Processing...', message: `Your booking is being processed. Current status: ${statusInfo.status}` };
    };

    const { icon, title, message } = getStatusDisplay();

    return (
        <div className="text-center py-20 text-white">
            {icon}
            <h1 className="mt-4 text-4xl font-bold">{title}</h1>
            <p className="mt-2 text-lg text-gray-300">{message}</p>
            {statusInfo && <p className="mt-2 text-gray-400">Booking Reference: <span className="font-bold">#{statusInfo.bookingId}</span></p>}
            <div className="mt-8">
                <button onClick={() => navigate('/account')} className="inline-flex items-center gap-2 bg-primary text-white font-bold px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors">
                    <Briefcase className="w-5 h-5" />
                    Go to My Services
                </button>
            </div>
        </div>
    );
};

export default BookingConfirmationPage;