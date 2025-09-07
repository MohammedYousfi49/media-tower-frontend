import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle, Clock, AlertCircle, Download } from 'lucide-react';
import { useCart } from '../../contexts/CartContext';
import axiosClient from '../../api/axiosClient';

interface OrderStatus {
    orderId: string;
    status: string;
    totalAmount: number;
}

const OrderConfirmationPage = () => {
    const { orderId } = useParams<{ orderId: string }>();
    const [searchParams] = useSearchParams();
    const { t } = useTranslation();
    const { clearCart } = useCart();
    const navigate = useNavigate();

    const [orderStatus, setOrderStatus] = useState<OrderStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Effet n°1 : Vider le panier dès que la page se charge.
    useEffect(() => {
        // Cette logique s'exécute une seule fois, dès que le composant est monté.
        // Si l'utilisateur est sur cette page, la commande est considérée comme terminée.
        if (clearCart) {
            console.log('Page de confirmation chargée. Vidage immédiat du panier.');
            clearCart();
        }
    }, [clearCart]); // Le tableau de dépendances garantit que cela ne s'exécute qu'une seule fois.

    // Effet n°2 : Gérer la redirection et vérifier le statut final de la commande.
    useEffect(() => {
        const checkStatus = async () => {
            if (!orderId) {
                setError('Order ID not provided');
                setLoading(false);
                return;
            }

            const paymentMethod = searchParams.get('payment_method');
            const paymentIntent = searchParams.get('payment_intent');

            try {
                // Si c'est une redirection Stripe, on confirme le paiement côté serveur d'abord.
                // Cela garantit que le statut de la commande sera bien "CONFIRMED" lors du prochain appel.
                if (paymentMethod === 'stripe' && paymentIntent) {
                    await axiosClient.post('/payments/stripe/confirm-payment', {
                        paymentIntentId: paymentIntent,
                        orderId: orderId
                    });
                }

                // Ensuite, on récupère le statut final de la commande.
                const response = await axiosClient.get(`/payments/order-status/${orderId}`);
                setOrderStatus(response.data);

            } catch (err) {
                console.error('Failed to fetch order status:', err);
                setError('Failed to load order information. Please check your account page.');
            } finally {
                setLoading(false);
            }
        };

        // On utilise un petit délai pour s'assurer que les processus backend (comme les webhooks) ont le temps de s'exécuter.
        const timer = setTimeout(() => {
            void checkStatus();
        }, 1000);

        return () => clearTimeout(timer); // Nettoyage du timer
    }, [orderId, searchParams]);

    const handleGoToAccount = () => {
        navigate('/account');
    };

    const handleGoToHome = () => {
        navigate('/');
    };

    const getStatusDisplay = () => {
        if (loading) {
            return {
                icon: <Clock className="mx-auto h-24 w-24 text-yellow-500 animate-pulse" />,
                title: 'Verifying Order...',
                message: 'Please wait while we confirm your payment details.',
            };
        }

        if (error || !orderStatus) {
            return {
                icon: <AlertCircle className="mx-auto h-24 w-24 text-red-500" />,
                title: 'Order Information Unavailable',
                message: error || 'We were unable to retrieve your order details.',
            };
        }

        switch (orderStatus.status) {
            case 'CONFIRMED':
            case 'DELIVERED':
                return {
                    icon: <CheckCircle className="mx-auto h-24 w-24 text-green-500" />,
                    title: t('orderConfirmation') || 'Order Confirmed!',
                    message: t('orderSuccess') || 'Your payment has been processed and your order is complete.',
                };
            case 'PENDING':
                return {
                    icon: <Clock className="mx-auto h-24 w-24 text-yellow-500" />,
                    title: 'Payment Processing',
                    message: 'Your payment is still processing. We will notify you by email once it is complete.',
                };
            default: // Canceled, Failed, etc.
                return {
                    icon: <AlertCircle className="mx-auto h-24 w-24 text-red-500" />,
                    title: 'Order Issue',
                    message: `There was an issue with your order (Status: ${orderStatus.status}). Please contact support.`,
                };
        }
    };

    const statusDisplay = getStatusDisplay();
    const isOrderComplete = orderStatus?.status === 'DELIVERED' || orderStatus?.status === 'CONFIRMED';

    return (
        <div className="flex flex-col items-center justify-center text-center py-16 px-4">
            <div className="max-w-2xl w-full">
                {statusDisplay.icon}
                <h1 className="mt-4 text-4xl font-bold text-white">{statusDisplay.title}</h1>
                <p className="mt-2 text-lg text-gray-300">{statusDisplay.message}</p>

                {orderId && (
                    <p className="mt-2 text-gray-400">
                        {t('orderNumber') || 'Order Number'}: <span className="font-bold text-white">#{orderId}</span>
                    </p>
                )}

                {!loading && orderStatus && (
                    <div className="mt-6 mx-auto max-w-sm p-4 bg-gray-800 border border-gray-700 rounded-lg">
                        <div className="text-sm space-y-2">
                            <div className="flex justify-between">
                                <span className="text-gray-400">Status:</span>
                                <span className="font-semibold text-white">{orderStatus.status}</span>
                            </div>
                            {orderStatus.totalAmount >= 0 && (
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Total Paid:</span>
                                    <span className="font-semibold text-white">{orderStatus.totalAmount.toFixed(2)} DH</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className="mt-8 flex flex-col sm:flex-row justify-center items-center gap-4">
                    {isOrderComplete ? (
                        <>
                            <button
                                onClick={handleGoToAccount}
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-primary text-white font-bold px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors"
                            >
                                <Download className="w-5 h-5" />
                                Access My Products
                            </button>
                            <Link to="/" className="w-full sm:w-auto inline-block text-white font-bold px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors">
                                Back to Home
                            </Link>
                        </>
                    ) : (
                        <Link to="/" className="w-full sm:w-auto inline-block bg-primary text-white font-bold px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors">
                            Continue Shopping
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OrderConfirmationPage;