// Fichier : src/contexts/CartContext.tsx (COMPLET ET PROFESSIONNEL)

import { createContext, useState, useEffect, useContext, useCallback, useMemo, ReactNode, useRef } from 'react';
import axiosClient from '../api/axiosClient';
import { useAuth } from './AuthContext';

// --- Interfaces ---
export interface Promotion {
    id: number;
    code: string;
    description: string;
    discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
    discountValue: number;
    applicableProductIds: number[];
    applicableServiceIds: number[];
    applicablePackIds: number[];
}

export interface CartItem {
    id: number;
    name: string;
    price: number;
    quantity: number;
    imageUrl?: string;
    type: 'PRODUCT' | 'SERVICE' | 'PACK';
}

interface CartContextType {
    cartItems: CartItem[];
    isCartLoaded: boolean;
    addToCart: (item: Omit<CartItem, 'quantity'>) => void;
    removeFromCart: (itemId: number, itemType: string) => void;
    updateQuantity: (itemId: number, itemType: string, quantity: number) => void;
    clearCart: () => void;
    cartCount: number;
    subtotal: number;
    discountAmount: number;
    finalPrice: number;
    appliedPromotion: Promotion | null;
    applyPromotionCode: (code: string) => Promise<Promotion>;
    removePromotionCode: () => void;
}

const CartContext = createContext<CartContextType>({} as CartContextType);

export const useCart = () => { return useContext(CartContext); };

const CartProvider = ({ children }: { children: ReactNode }) => {
    const { currentUser } = useAuth();
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [appliedPromotion, setAppliedPromotion] = useState<Promotion | null>(null);
    const [isCartLoaded, setIsCartLoaded] = useState(false);
    const isInitialMount = useRef(true);

    const getCartKey = useCallback(() => (currentUser ? `cartItems_${currentUser.uid}` : 'cartItems_guest'), [currentUser]);
    const getPromoKey = useCallback(() => (currentUser ? `appliedPromotion_${currentUser.uid}` : 'appliedPromotion_guest'), [currentUser]);

    // Chargement initial depuis localStorage
    useEffect(() => {
        try {
            const cartKey = getCartKey();
            const localData = localStorage.getItem(cartKey);
            setCartItems(localData ? JSON.parse(localData) : []);

            const promoKey = getPromoKey();
            const promoData = localStorage.getItem(promoKey);
            setAppliedPromotion(promoData ? JSON.parse(promoData) : null);
        } catch (error) {
            console.warn('Erreur lors du chargement du panier:', error);
            setCartItems([]);
            setAppliedPromotion(null);
        } finally {
            setIsCartLoaded(true);
        }
        isInitialMount.current = true;
    }, [currentUser, getCartKey, getPromoKey]);

    // Sauvegarde du panier
    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }
        if (isCartLoaded) {
            localStorage.setItem(getCartKey(), JSON.stringify(cartItems));
        }
    }, [cartItems, getCartKey, isCartLoaded]);

    // Sauvegarde de la promotion
    useEffect(() => {
        if (isCartLoaded) {
            const promoKey = getPromoKey();
            if (appliedPromotion) {
                localStorage.setItem(promoKey, JSON.stringify(appliedPromotion));
            } else {
                localStorage.removeItem(promoKey);
            }
        }
    }, [appliedPromotion, getPromoKey, isCartLoaded]);

    // Fonctions du panier
    const addToCart = useCallback((itemToAdd: Omit<CartItem, 'quantity'>) => {
        if (!itemToAdd.type) {
            console.warn('Type d\'item manquant lors de l\'ajout au panier');
            return;
        }

        setCartItems(prev => {
            const existing = prev.find(i => i.id === itemToAdd.id && i.type === itemToAdd.type);
            if (existing) {
                return prev.map(i => (i.id === itemToAdd.id && i.type === itemToAdd.type)
                    ? { ...i, quantity: i.quantity + 1 }
                    : i);
            }
            return [...prev, { ...itemToAdd, quantity: 1 }];
        });

        console.log('Article ajouté au panier:', itemToAdd.name);
    }, []);

    const removeFromCart = useCallback((itemId: number, itemType: string) => {
        setCartItems(prev => prev.filter(i => !(i.id === itemId && i.type === itemType)));
    }, []);

    const updateQuantity = useCallback((itemId: number, itemType: string, quantity: number) => {
        if (quantity < 1) {
            removeFromCart(itemId, itemType);
        } else {
            setCartItems(prev => prev.map(i => (i.id === itemId && i.type === itemType)
                ? { ...i, quantity }
                : i));
        }
    }, [removeFromCart]);

    const removePromotionCode = useCallback(() => {
        console.log('Suppression du code promotionnel');
        setAppliedPromotion(null);
    }, []);

    // LOGIQUE PROFESSIONNELLE: Nettoyage intelligent du panier
    const clearCart = useCallback(() => {
        console.log('🛒 Vidage du panier - Comportement e-commerce professionnel');
        setCartItems([]);
        removePromotionCode();

        // Nettoyage localStorage immédiat pour cohérence
        if (isCartLoaded) {
            const cartKey = getCartKey();
            const promoKey = getPromoKey();
            localStorage.removeItem(cartKey);
            localStorage.removeItem(promoKey);
            console.log('Panier et promotions supprimés du stockage local');
        }
    }, [removePromotionCode, isCartLoaded, getCartKey, getPromoKey]);

    const applyPromotionCode = useCallback(async (code: string): Promise<Promotion> => {
        try {
            console.log('Application du code promotionnel:', code);
            const response = await axiosClient.post<Promotion>('/promotions/validate', { code });
            setAppliedPromotion(response.data);
            console.log('Code promotionnel appliqué avec succès');
            return response.data;
        } catch (error) {
            console.error('Erreur lors de l\'application du code promotionnel:', error);
            removePromotionCode();
            throw new Error("Code promotionnel invalide ou expiré.");
        }
    }, [removePromotionCode]);

    // Calculs du panier
    const cartCount = useMemo(() => cartItems.reduce((count, item) => count + item.quantity, 0), [cartItems]);

    const subtotal = useMemo(() => cartItems.reduce((total, item) => total + item.price * item.quantity, 0), [cartItems]);

    // LOGIQUE PROFESSIONNELLE: Calcul de réduction sur PRODUITS uniquement
    const discountAmount = useMemo(() => {
        if (!appliedPromotion) return 0;

        // Calculer le sous-total éligible (produits uniquement)
        const eligibleSubtotal = cartItems.reduce((total, item) => {
            // Seuls les produits sont éligibles aux promotions
            if (item.type !== 'PRODUCT') return total;

            const isGenericProductPromo = appliedPromotion.applicableProductIds.length === 0;
            const isSpecificProductPromo = appliedPromotion.applicableProductIds.includes(item.id);

            if (isGenericProductPromo || isSpecificProductPromo) {
                return total + (item.price * item.quantity);
            }
            return total;
        }, 0);

        if (eligibleSubtotal <= 0) return 0;

        let discount = 0;
        if (appliedPromotion.discountType === 'PERCENTAGE') {
            // Protection professionnelle: maximum 95% de réduction
            const maxDiscountRate = Math.min(appliedPromotion.discountValue, 95);
            discount = eligibleSubtotal * (maxDiscountRate / 100);
        } else { // FIXED_AMOUNT
            discount = Math.min(appliedPromotion.discountValue, eligibleSubtotal);
        }

        // La réduction ne peut pas dépasser le sous-total éligible
        return Math.min(discount, eligibleSubtotal);
    }, [appliedPromotion, cartItems]);

    const finalPrice = useMemo(() => {
        const result = subtotal - discountAmount;
        return Math.max(0, result); // Ne jamais avoir un prix négatif
    }, [subtotal, discountAmount]);

    const value = {
        cartItems,
        isCartLoaded,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartCount,
        subtotal,
        discountAmount,
        finalPrice,
        appliedPromotion,
        applyPromotionCode,
        removePromotionCode
    };

    return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export default CartProvider;