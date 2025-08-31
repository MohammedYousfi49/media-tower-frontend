import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from 'react-i18next';
import axiosClient from '../../api/axiosClient';

import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';

const stripePromise = loadStripe('pk_test_51RkAjIDGKeXaOom7IpQa3vQoKsKWC9fXSxPmjJQbeEt6INjeZdWL7Vk5yYvvLnV8fR8C7jH4OeEyBuEq06HpoJPq00HsSLzEhc');
const PAYPAL_CLIENT_ID = 'AR7J4ROoRhXZn8p2rUXjjQTdboPHCS6IclEv05jscGuEAZhi6pFuUDjkaclTPgx8Jo-PRiHFhCy0v0zN';

const StripePaymentForm = ({ orderId }: { orderId: number }) => {
    const stripe = useStripe();
    const elements = useElements();
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    // const { clearCart } = useCart(); // <<< CORRECTION : Ligne supprimée

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!stripe || !elements) return;

        setLoading(true);
        setErrorMessage(null);

        try {
            const { error } = await stripe.confirmPayment({
                elements,
                confirmParams: {
                    return_url: `${window.location.origin}/order-confirmation/${orderId}?payment_method=stripe`,
                },
            });
            if (error) {
                console.error('Stripe payment error:', error);
                setErrorMessage(error.message || 'An unexpected error occurred.');
                setLoading(false);
            }
        } catch (error) {
            console.error('Stripe payment processing error:', error);
            setErrorMessage('Payment processing failed. Please try again.');
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <PaymentElement />
            <button
                disabled={!stripe || loading}
                className="w-full mt-6 bg-primary text-white font-bold py-3 rounded-lg hover:bg-blue-600 disabled:bg-gray-500"
            >
                {loading ? 'Processing...' : 'Pay with Card'}
            </button>
            {errorMessage && <div className="text-red-500 mt-2">{errorMessage}</div>}
        </form>
    );
};

const CheckoutPage = () => {
    const { cartItems, totalPrice, clearCart } = useCart();
    const { currentUser } = useAuth();
    const { t } = useTranslation();
    const navigate = useNavigate();

    const [paymentMethod, setPaymentMethod] = useState('STRIPE');
    const [loading, setLoading] = useState(false);
    const [createdOrder, setCreatedOrder] = useState<{ id: number } | null>(null);
    const [clientSecret, setClientSecret] = useState<string | null>(null);

    const createOrderInBackend = async () => {
        if (!currentUser) {
            alert(t('loginToCheckout'));
            navigate('/login');
            return null;
        }
        if (createdOrder) return createdOrder;

        setLoading(true);
        try {
            const orderDto = {
                orderItems: cartItems.map(item => ({ productId: item.id, quantity: item.quantity })),
            };
            const response = await axiosClient.post('/orders', orderDto);
            setCreatedOrder(response.data);
            console.log('✅ Order created:', response.data);
            return response.data;
        } catch (error) {
            console.error("Failed to create order:", error);
            alert("An error occurred while creating your order.");
            return null;
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const createStripeIntent = async () => {
            if (createdOrder && paymentMethod === 'STRIPE') {
                try {
                    const response = await axiosClient.post('/payments/stripe/create-payment-intent', {
                        orderId: createdOrder.id
                    });
                    setClientSecret(response.data.clientSecret);
                    console.log('✅ Stripe PaymentIntent created');
                } catch (error) {
                    console.error('Failed to create payment intent', error);
                }
            }
        };
        createStripeIntent();
    }, [createdOrder, paymentMethod]);

    const createPayPalOrder = async (): Promise<string> => {
        const order = createdOrder || await createOrderInBackend();
        if (!order) throw new Error("Order not created");
        const response = await axiosClient.post('/payments/paypal/create-order', { orderId: order.id });
        console.log('✅ PayPal order created:', response.data.orderId);
        return response.data.orderId;
    };

    const onApprovePayPal = async (data: { orderID: string }): Promise<void> => {
        try {
            console.log('🔄 Capturing PayPal payment...');
            const response = await axiosClient.post('/payments/paypal/capture-order', {
                paypalOrderId: data.orderID,
                orderId: createdOrder?.id.toString()
            });
            if (response.data.status === 'success') {
                console.log('✅ PayPal payment captured and confirmed');
                clearCart();
                navigate(`/order-confirmation/${createdOrder?.id}?payment_method=paypal`);
            } else {
                console.error('PayPal capture failed:', response.data);
                alert('There was an issue with your PayPal payment. Please try again.');
            }
        } catch (error) {
            console.error('PayPal capture failed:', error);
            alert('There was an issue processing your PayPal payment. Please try again.');
        }
    };

    if (cartItems.length === 0) {
        navigate('/products');
        return null;
    }

    return (
        <div>
            <h1 className="text-4xl font-bold mb-8">{t('checkout')}</h1>
            <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-card p-6 rounded-lg border border-gray-700">
                    <h2 className="text-2xl font-bold mb-4">Your Order</h2>
                    {cartItems.map(item => (
                        <div key={item.id} className="flex justify-between py-1">
                            <span>{item.name} x {item.quantity}</span>
                            <span>{(item.price * item.quantity).toFixed(2)} DH</span>
                        </div>
                    ))}
                    <div className="border-t border-gray-600 mt-4 pt-4 flex justify-between font-bold text-xl">
                        <span>{t('total')}</span>
                        <span>{totalPrice.toFixed(2)} DH</span>
                    </div>
                    {!createdOrder && (
                        <button onClick={createOrderInBackend} disabled={loading || totalPrice <= 0} className="w-full mt-6 bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-500">
                            {loading ? 'Creating Order...' : '1. Confirm Order Details'}
                        </button>
                    )}
                    {createdOrder && (
                        <div className="mt-4 p-3 bg-green-900 text-green-200 border border-green-700 rounded-lg text-center">
                            ✅ Order #{createdOrder.id} created. Please complete payment below.
                        </div>
                    )}
                </div>
                {createdOrder && (
                    <div className="bg-card p-6 rounded-lg border border-gray-700">
                        <h2 className="text-2xl font-bold mb-4">2. Choose Payment Method</h2>
                        <div className="space-y-3">
                            <label className="flex items-center p-3 border border-gray-600 rounded-lg">
                                <input type="radio" name="paymentMethod" value="STRIPE" checked={paymentMethod === 'STRIPE'} onChange={e => setPaymentMethod(e.target.value)} className="w-4 h-4 mr-3" />
                                <span>💳 Credit Card (Stripe)</span>
                            </label>
                            <label className="flex items-center p-3 border border-gray-600 rounded-lg">
                                <input type="radio" name="paymentMethod" value="PAYPAL" checked={paymentMethod === 'PAYPAL'} onChange={e => setPaymentMethod(e.target.value)} className="w-4 h-4 mr-3" />
                                <span>🅿️ PayPal</span>
                            </label>
                        </div>
                        <div className="mt-6">
                            {paymentMethod === 'STRIPE' && clientSecret && (
                                <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'night' } }}>
                                    <StripePaymentForm orderId={createdOrder.id} />
                                </Elements>
                            )}
                            {paymentMethod === 'PAYPAL' && (
                                <PayPalScriptProvider options={{ clientId: PAYPAL_CLIENT_ID, currency: "USD" }}>
                                    <PayPalButtons
                                        style={{ layout: "vertical" }}
                                        createOrder={createPayPalOrder}
                                        onApprove={onApprovePayPal}
                                        onError={(error) => { console.error('PayPal error:', error); alert('PayPal payment failed. Please try again.'); }}
                                        onCancel={() => { console.log('PayPal payment cancelled by user'); }}
                                    />
                                </PayPalScriptProvider>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CheckoutPage;