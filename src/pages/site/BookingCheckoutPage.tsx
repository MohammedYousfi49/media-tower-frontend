import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from 'react-i18next';
import axiosClient from '../../api/axiosClient';

import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';

// Remplacez par vos clés réelles
const stripePromise = loadStripe('pk_test_51RkAjIDGKeXaOom7IpQa3vQoKsKWC9fXSxPmjJQbeEt6INjeZdWL7Vk5yYvvLnV8fR8C7jH4OeEyBuEq06HpoJPq00HsSLzEhc');
const PAYPAL_CLIENT_ID = 'AR7J4ROoRhXZn8p2rUXjjQTdboPHCS6IclEv05jscGuEAZhi6pFuUDjkaclTPgx8Jo-PRiHFhCy0v0zN';

interface BookingDetails {
    id: number;
    serviceName: string;
    servicePrice: number;
}

const StripePaymentForm = ({ bookingId }: { bookingId: number }) => {
    const stripe = useStripe();
    const elements = useElements();
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!stripe || !elements) return;
        setLoading(true);

        const { error } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                return_url: `${window.location.origin}/booking-confirmation/${bookingId}`,
            },
        });

        if (error) {
            setErrorMessage(error.message || 'An unexpected error occurred.');
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <PaymentElement />
            <button disabled={!stripe || loading} className="w-full mt-6 bg-primary text-white font-bold py-3 rounded-lg hover:bg-blue-600 disabled:bg-gray-500">
                {loading ? 'Processing...' : 'Pay with Card'}
            </button>
            {errorMessage && <div className="text-red-500 mt-2">{errorMessage}</div>}
        </form>
    );
};

const BookingCheckoutPage = () => {
    const { bookingId } = useParams<{ bookingId: string }>();
    const { currentUser } = useAuth();
    const { t } = useTranslation();
    const navigate = useNavigate();

    const [paymentMethod, setPaymentMethod] = useState('STRIPE');
    const [loading, setLoading] = useState(true);
    const [bookingDetails, setBookingDetails] = useState<BookingDetails | null>(null);
    const [clientSecret, setClientSecret] = useState<string | null>(null);

    useEffect(() => {
        if (!currentUser || !bookingId) {
            navigate('/login');
            return;
        }
        const fetchBookingDetails = async () => {
            try {
                const response = await axiosClient.get(`/bookings/${bookingId}`);
                setBookingDetails(response.data);
            } catch (error) {
                console.error("Failed to fetch booking details:", error);
                alert("Could not load booking details. You may not have permission or the booking does not exist.");
                navigate('/account');
            }
        };
        fetchBookingDetails();
    }, [bookingId, currentUser, navigate]);

    useEffect(() => {
        if (bookingDetails) {
            if (paymentMethod === 'STRIPE') {
                setLoading(true); // Afficher le spinner pendant la création de l'intent
                axiosClient.post('/payments/stripe/create-booking-intent', { bookingId: bookingDetails.id })
                    .then(response => setClientSecret(response.data.clientSecret))
                    .catch(error => console.error('Failed to create stripe intent', error))
                    .finally(() => setLoading(false));
            } else {
                setClientSecret(null); // Réinitialiser si on change de méthode
            }
        }
    }, [bookingDetails, paymentMethod]);

    const createPayPalOrder = async (): Promise<string> => {
        if (!bookingDetails) throw new Error("Booking details not loaded");
        const response = await axiosClient.post('/payments/paypal/create-booking-order', { bookingId: bookingDetails.id });
        return response.data.orderId;
    };

    const onApprovePayPal = async (data: { orderID: string }): Promise<void> => {
        navigate(`/booking-confirmation/${bookingId}?paypalOrderId=${data.orderID}`);
    };

    if (!bookingDetails) {
        return <div className="text-center p-8 text-white">Loading Booking Details...</div>;
    }

    return (
        <div className="max-w-4xl mx-auto py-8">
            <h1 className="text-4xl font-bold mb-8 text-white">{t('checkout')} for Service</h1>
            <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-card p-6 rounded-lg border border-gray-700">
                    <h2 className="text-2xl font-bold mb-4 text-white">Booking Summary</h2>
                    <div className="flex justify-between py-2 text-gray-300">
                        <span>Service: {bookingDetails.serviceName}</span>
                        <span>{bookingDetails.servicePrice.toFixed(2)} DH</span>
                    </div>
                    <div className="border-t border-gray-600 mt-4 pt-4 flex justify-between font-bold text-xl text-white">
                        <span>Total</span>
                        <span>{bookingDetails.servicePrice.toFixed(2)} DH</span>
                    </div>
                </div>

                <div className="bg-card p-6 rounded-lg border border-gray-700">
                    <h2 className="text-2xl font-bold mb-4 text-white">Complete Payment</h2>
                    <div className="space-y-3">
                        <label className="flex items-center p-3 border border-gray-600 rounded-lg text-white cursor-pointer">
                            <input type="radio" name="paymentMethod" value="STRIPE" checked={paymentMethod === 'STRIPE'} onChange={e => setPaymentMethod(e.target.value)} className="w-4 h-4 mr-3" />
                            <span>💳 Credit Card (Stripe)</span>
                        </label>
                        <label className="flex items-center p-3 border border-gray-600 rounded-lg text-white cursor-pointer">
                            <input type="radio" name="paymentMethod" value="PAYPAL" checked={paymentMethod === 'PAYPAL'} onChange={e => setPaymentMethod(e.target.value)} className="w-4 h-4 mr-3" />
                            <span>🅿️ PayPal</span>
                        </label>
                    </div>
                    <div className="mt-6">
                        {loading && <div className="text-center p-4">Initializing payment...</div>}

                        {!loading && paymentMethod === 'STRIPE' && clientSecret && (
                            <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'night' } }}>
                                <StripePaymentForm bookingId={bookingDetails.id} />
                            </Elements>
                        )}
                        {!loading && paymentMethod === 'PAYPAL' && (
                            <PayPalScriptProvider options={{ clientId: PAYPAL_CLIENT_ID, currency: "USD" }}>
                                <PayPalButtons style={{ layout: "vertical" }} createOrder={createPayPalOrder} onApprove={onApprovePayPal} />
                            </PayPalScriptProvider>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BookingCheckoutPage;