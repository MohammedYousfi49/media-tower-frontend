// Fichier : src/pages/site/CartPage.tsx (COMPLET ET FINAL)

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import { useTranslation } from 'react-i18next';
import { Trash2, XCircle } from 'lucide-react';

const CartPage = () => {
    const { cartItems, removeFromCart, updateQuantity, cartCount, subtotal, discountAmount, finalPrice, appliedPromotion, applyPromotionCode, removePromotionCode } = useCart();
    const { t } = useTranslation();
    const [promoCode, setPromoCode] = useState('');
    const [promoMessage, setPromoMessage] = useState({ type: '', text: '' });
    const [isApplying, setIsApplying] = useState(false);

    const handleApplyPromotion = async () => {
        if (!promoCode.trim() || isApplying) return;
        setIsApplying(true);
        setPromoMessage({ type: '', text: '' });
        try {
            await applyPromotionCode(promoCode);
            setPromoMessage({ type: 'success', text: 'Promotion applied successfully!' });
        } catch { // ▼▼▼ CORRECTION ICI : la variable 'error' inutile a été retirée ▼▼▼
            setPromoMessage({ type: 'error', text: 'Invalid or expired promo code.' });
        } finally {
            setIsApplying(false);
        }
    };

    return (
        <div>
            <h1 className="text-4xl font-bold mb-8">{t('shoppingCart')} ({cartCount})</h1>
            {cartItems.length > 0 ? (
                <div className="grid md:grid-cols-3 gap-8">
                    <div className="md:col-span-2 space-y-4">
                        {cartItems.map(item => (
                            <div key={`${item.type}-${item.id}`} className="bg-card p-4 rounded-lg flex items-center justify-between border border-gray-700">
                                <div className="flex items-center gap-4">
                                    <img src={item.imageUrl || 'https://via.placeholder.com/80'} alt={item.name} className="w-20 h-20 rounded-md object-cover"/>
                                    <div>
                                        <h2 className="text-lg font-bold text-white">{item.name}</h2>
                                        <p className="text-gray-400">{item.price.toFixed(2)} DH</p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-4">
                                    <input type="number" value={item.quantity} onChange={(e) => updateQuantity(item.id, item.type, parseInt(e.target.value))} className="w-16 bg-gray-700 text-white text-center p-1 rounded-md border border-gray-600" min="1"/>
                                    <p className="font-bold w-24 text-right">{(item.price * item.quantity).toFixed(2)} DH</p>
                                    <button onClick={() => removeFromCart(item.id, item.type)} className="text-red-500 hover:text-red-400"><Trash2/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="md:col-span-1">
                        <div className="bg-card p-6 rounded-lg border border-gray-700 space-y-4">
                            <h2 className="text-2xl font-bold">Summary</h2>
                            <div className="flex justify-between text-lg border-b border-gray-700 pb-2">
                                <span>Subtotal</span>
                                <span>{subtotal.toFixed(2)} DH</span>
                            </div>
                            {appliedPromotion ? (
                                <div className="flex justify-between items-center text-green-400">
                                    <span>Discount ({appliedPromotion.code})</span>
                                    <span className="font-bold">- {discountAmount.toFixed(2)} DH</span>
                                    <button onClick={removePromotionCode} className="text-red-500 hover:text-red-400"><XCircle size={20} /></button>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <div className="flex gap-2">
                                        <input type="text" value={promoCode} onChange={(e) => setPromoCode(e.target.value.toUpperCase())} placeholder="Promo Code" className="flex-grow bg-gray-700 text-white p-2 rounded-md border border-gray-600"/>
                                        <button onClick={handleApplyPromotion} disabled={isApplying} className="bg-gray-600 text-white font-bold px-4 rounded-md hover:bg-gray-500 disabled:bg-gray-800">
                                            {isApplying ? '...' : 'Apply'}
                                        </button>
                                    </div>
                                    {promoMessage.text && <p className={`text-sm ${promoMessage.type === 'error' ? 'text-red-500' : 'text-green-500'}`}>{promoMessage.text}</p>}
                                </div>
                            )}
                            <div className="flex justify-between text-xl font-bold pt-2">
                                <span>{t('total')}</span>
                                <span>{finalPrice.toFixed(2)} DH</span>
                            </div>
                            <Link to="/checkout" className="block w-full text-center bg-primary text-white font-bold py-3 rounded-lg hover:bg-blue-600">
                                {t('proceedToCheckout')}
                            </Link>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="text-center py-16">
                    <p className="text-2xl text-gray-400">{t('emptyCart')}</p>
                    <Link to="/products" className="mt-4 inline-block bg-primary text-white font-bold px-6 py-2 rounded-lg">Browse Products</Link>
                </div>
            )}
        </div>
    );
};
export default CartPage;