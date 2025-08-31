import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
// ================== CORRECTION ESLINT ==================
// L'import 'User' a été supprimé car il n'était pas utilisé
import { CheckCircle, Clock, AlertCircle, Download } from 'lucide-react';
// ========================================================
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
    const [stripeProcessing, setStripeProcessing] = useState(false);

    useEffect(() => {
        if (clearCart) {
            clearCart();
        }
    }, [clearCart]);

    useEffect(() => {
        const handleStripeRedirect = async () => {
            const paymentMethod = searchParams.get('payment_method');
            const paymentIntent = searchParams.get('payment_intent');
            const redirectStatus = searchParams.get('redirect_status');

            if (paymentMethod === 'stripe' && paymentIntent) {
                console.log('🔄 Processing Stripe redirect...');
                setStripeProcessing(true);

                try {
                    if (redirectStatus === 'succeeded') {
                        console.log('✅ Stripe payment succeeded, confirming...');
                        await axiosClient.post('/payments/stripe/confirm-payment', {
                            paymentIntentId: paymentIntent,
                            orderId: orderId
                        });
                        console.log('✅ Stripe payment confirmed on server');
                    } else {
                        console.error('Stripe redirect status:', redirectStatus);
                        setError('Payment was not completed successfully.');
                        setStripeProcessing(false);
                        return;
                    }
                } catch (confirmError) {
                    console.warn('Manual Stripe confirmation failed, checking via order status:', confirmError);
                }
                setStripeProcessing(false);
            }
        };

        handleStripeRedirect();
    }, [searchParams, orderId]);

    useEffect(() => {
        const checkOrderStatus = async () => {
            if (!orderId) {
                setError('Order ID not provided');
                setLoading(false);
                return;
            }

            if (stripeProcessing) return;

            try {
                console.log('🔍 Checking order status...');
                const response = await axiosClient.get(`/payments/order-status/${orderId}`);
                setOrderStatus(response.data);
                console.log('Order status:', response.data);
            } catch (err) {
                console.error('Failed to fetch order status:', err);
                setError('Failed to load order information');
            } finally {
                setLoading(false);
            }
        };

        const timer = setTimeout(checkOrderStatus, stripeProcessing ? 2000 : 500);
        return () => clearTimeout(timer);
    }, [orderId, stripeProcessing]);

    const handleGoToAccount = () => {
        navigate('/account');
    };

    const handleGoToHome = () => {
        navigate('/');
    };

    const handleGoToProducts = () => {
        navigate('/products');
    };

    const getStatusDisplay = () => {
        if (loading || stripeProcessing) {
            return {
                icon: <Clock className="mx-auto h-24 w-24 text-yellow-500 animate-pulse" />,
                title: stripeProcessing ? 'Processing Payment...' : 'Checking Order Status...',
                message: stripeProcessing
                    ? 'Stripe is processing your payment. Please wait...'
                    : 'Please wait while we verify your payment.',
                bgColor: 'bg-yellow-900',
                borderColor: 'border-yellow-700',
                textColor: 'text-yellow-200'
            };
        }

        if (error || !orderStatus) {
            return {
                icon: <AlertCircle className="mx-auto h-24 w-24 text-red-500" />,
                title: 'Order Information Unavailable',
                message: error || 'Unable to retrieve order information.',
                bgColor: 'bg-red-900',
                borderColor: 'border-red-700',
                textColor: 'text-red-200'
            };
        }

        switch (orderStatus.status) {
            case 'CONFIRMED':
                return {
                    icon: <CheckCircle className="mx-auto h-24 w-24 text-green-500" />,
                    title: t('orderConfirmation') || 'Order Confirmed!',
                    message: t('orderSuccess') || 'Your payment has been processed successfully.',
                    bgColor: 'bg-green-900',
                    borderColor: 'border-green-700',
                    textColor: 'text-green-200'
                };
            case 'DELIVERED':
                return {
                    icon: <CheckCircle className="mx-auto h-24 w-24 text-green-500" />,
                    title: '🎉 Order Complete & Delivered!',
                    message: 'Your digital products are now available in your account. Check your email for the confirmation!',
                    bgColor: 'bg-green-900',
                    borderColor: 'border-green-700',
                    textColor: 'text-green-200'
                };
            case 'PENDING':
                return {
                    icon: <Clock className="mx-auto h-24 w-24 text-yellow-500" />,
                    title: 'Payment Processing',
                    message: 'Your order is being processed. You will receive a confirmation shortly.',
                    bgColor: 'bg-yellow-900',
                    borderColor: 'border-yellow-700',
                    textColor: 'text-yellow-200'
                };
            default:
                return {
                    icon: <AlertCircle className="mx-auto h-24 w-24 text-orange-500" />,
                    title: 'Order Status Unknown',
                    message: `Order status: ${orderStatus.status}. Please contact support if you have concerns.`,
                    bgColor: 'bg-orange-900',
                    borderColor: 'border-orange-700',
                    textColor: 'text-orange-200'
                };
        }
    };

    const statusDisplay = getStatusDisplay();
    const isOrderComplete = orderStatus?.status === 'DELIVERED' || orderStatus?.status === 'CONFIRMED';

    return (
        <div className="text-center py-20">
            {statusDisplay.icon}
            <h1 className="mt-4 text-4xl font-bold text-white">{statusDisplay.title}</h1>
            <p className="mt-2 text-lg text-gray-300">{statusDisplay.message}</p>

            {orderId && (
                <p className="mt-2 text-gray-400">
                    {t('orderNumber') || 'Order Number'}: <span className="font-bold text-white">#{orderId}</span>
                </p>
            )}

            {orderStatus && (
                <div className={`mt-4 mx-auto max-w-md p-4 ${statusDisplay.bgColor} ${statusDisplay.textColor} border ${statusDisplay.borderColor} rounded-lg`}>
                    <div className="text-sm">
                        <div className="flex justify-between">
                            <span>Status:</span>
                            <span className="font-semibold">{orderStatus.status}</span>
                        </div>
                        {orderStatus.totalAmount > 0 && (
                            <div className="flex justify-between mt-1">
                                <span>Total:</span>
                                <span className="font-semibold">{orderStatus.totalAmount.toFixed(2)} DH</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="mt-8 space-x-4">
                {isOrderComplete ? (
                    <>
                        <button
                            onClick={handleGoToAccount}
                            className="inline-flex items-center gap-2 bg-green-600 text-white font-bold px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
                        >
                            <Download className="w-5 h-5" />
                            Access My Downloads
                        </button>
                        <button
                            onClick={handleGoToHome}
                            className="inline-block bg-gray-600 text-white font-bold px-6 py-3 rounded-lg hover:bg-gray-700"
                        >
                            {t('backToHome') || 'Back to Home'}
                        </button>
                    </>
                ) : (
                    <>
                        <button
                            onClick={handleGoToHome}
                            className="inline-block bg-gray-600 text-white font-bold px-6 py-3 rounded-lg hover:bg-gray-700"
                        >
                            {t('backToHome') || 'Back to Home'}
                        </button>
                        <button
                            onClick={handleGoToProducts}
                            className="inline-block bg-primary text-white font-bold px-6 py-3 rounded-lg hover:bg-blue-600"
                        >
                            Continue Shopping
                        </button>
                    </>
                )}
            </div>

            {orderStatus?.status === 'PENDING' && (
                <div className="mt-8 mx-auto max-w-2xl text-sm text-gray-400 bg-gray-800 p-4 rounded-lg">
                    <h3 className="font-semibold mb-2">What happens next?</h3>
                    <ul className="text-left space-y-1">
                        <li>• Your payment is being verified by our payment processor</li>
                        <li>• You will receive an email confirmation once the payment is complete</li>
                        <li>• This usually takes 1-2 minutes, but can take up to 10 minutes</li>
                        <li>• If you don't receive confirmation within 15 minutes, please contact support</li>
                    </ul>
                </div>
            )}

            {isOrderComplete && (
                <div className="mt-8 mx-auto max-w-2xl text-sm text-gray-400 bg-gray-800 p-4 rounded-lg">
                    <h3 className="font-semibold mb-2 text-green-400">🎯 Next Steps:</h3>
                    <ul className="text-left space-y-1">
                        <li>• Check your email for the download confirmation</li>
                        <li>• Visit your account page to access your digital products</li>
                        <li>• Your download links are valid for 2 years</li>
                        <li>• Need help? Contact our support team</li>
                    </ul>
                </div>
            )}

            {searchParams.get('payment_method') === 'stripe' && (
                <div className="mt-4 mx-auto max-w-md text-xs text-gray-500 bg-gray-800 p-3 rounded">
                    Payment processed via Stripe • Secure payment processing
                </div>
            )}
        </div>
    );
};

export default OrderConfirmationPage;