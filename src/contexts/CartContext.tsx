// Chemin : src/contexts/CartContext.tsx

import { createContext, useState, useEffect, useContext, useCallback } from 'react';
import type { ReactNode } from 'react';

// Interfaces pour nos objets
interface CartItem {
    id: number;
    name: string;
    price: number;
    quantity: number;
    imageUrl?: string;
}

interface CartContextType {
    cartItems: CartItem[];
    addToCart: (product: { id: number; name: string; price: number; imageUrl?: string }) => void;
    removeFromCart: (productId: number) => void;
    updateQuantity: (productId: number, quantity: number) => void;
    clearCart: () => void;
    cartCount: number;
    totalPrice: number;
}

// Création du contexte
const CartContext = createContext<CartContextType>({} as CartContextType);

// Hook personnalisé
export const useCart = () => {
    return useContext(CartContext);
};

// Le fournisseur de contexte
export const CartProvider = ({ children }: { children: ReactNode }) => {
    const [cartItems, setCartItems] = useState<CartItem[]>(() => {
        try {
            const localData = localStorage.getItem('cartItems');
            return localData ? JSON.parse(localData) : [];
        } catch (error) {
            console.error("Failed to parse cart items from localStorage", error);
            return [];
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem('cartItems', JSON.stringify(cartItems));
        } catch (error) {
            console.error("Failed to save cart items to localStorage", error);
        }
    }, [cartItems]);

    // ================== CORRECTIONS AVEC useCallback ==================
    const addToCart = useCallback((product: { id: number; name: string; price: number; imageUrl?: string }) => {
        setCartItems(prevItems => {
            const existingItem = prevItems.find(item => item.id === product.id);
            if (existingItem) {
                return prevItems.map(item =>
                    item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            return [...prevItems, { ...product, quantity: 1 }];
        });
    }, []);

    const removeFromCart = useCallback((productId: number) => {
        setCartItems(prevItems => prevItems.filter(item => item.id !== productId));
    }, []);

    const updateQuantity = useCallback((productId: number, quantity: number) => {
        if (quantity < 1) {
            removeFromCart(productId);
        } else {
            setCartItems(prevItems =>
                prevItems.map(item => (item.id === productId ? { ...item, quantity } : item))
            );
        }
    }, [removeFromCart]);

    const clearCart = useCallback(() => {
        setCartItems([]);
    }, []);
    // =================================================================

    const cartCount = cartItems.reduce((count, item) => count + item.quantity, 0);
    const totalPrice = cartItems.reduce((total, item) => total + item.price * item.quantity, 0);

    const value = { cartItems, addToCart, removeFromCart, updateQuantity, clearCart, cartCount, totalPrice };

    return (
        <CartContext.Provider value={value}>
            {children}
        </CartContext.Provider>
    );
};