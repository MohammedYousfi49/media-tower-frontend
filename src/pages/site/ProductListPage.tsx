// Fichier : src/pages/site/ProductListPage.tsx (VERSION CORRIGÉE)

import { useEffect, useState, useCallback } from 'react';
import axiosClient from '../../api/axiosClient';
import ProductCard from '../../components/site/ProductCard';
import { useTranslation } from 'react-i18next';
import { useDebounce } from '../../hooks/useDebounce'; // Assurez-vous d'avoir ce hook, il est très utile !
import { Loader2 } from 'lucide-react';

// Interfaces (pas de changement ici)
interface Media {
    id: number;
    url: string;
    isPrimary: boolean;
}

interface Product {
    id: number;
    names: { [key: string]: string };
    price: number;
    images: Media[];
    categoryId: number;
    categoryName: string;
}

interface Category {
    id: number;
    names: { [key: string]: string };
}

// Interface pour la réponse paginée du backend
interface PaginatedProductsResponse {
    content: Product[];
    totalPages: number;
    number: number;
    totalElements: number;
}


const ProductListPage = () => {
    const { t, i18n } = useTranslation();
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>(''); // Gardez 'all' ou '' comme valeur par défaut

    // Utiliser un "debounce" pour ne pas surcharger l'API à chaque frappe
    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    // --- NOUVELLE FONCTION POUR RÉCUPÉRER LES DONNÉES ---
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // Préparation des paramètres pour l'API
            const params: { [key: string]: string } = {
                page: '0', // Pour l'instant on ne gère pas la pagination, on prend la première page
                size: '20', // On charge 20 produits par défaut
            };
            if (debouncedSearchTerm) {
                params.search = debouncedSearchTerm;
            }
            if (selectedCategory) {
                params.categoryId = selectedCategory;
            }

            // L'appel API utilise maintenant les paramètres
            const productsRes = await axiosClient.get<PaginatedProductsResponse>('/products', { params });

            // === LA CORRECTION CLÉ EST ICI ===
            // On récupère la liste des produits depuis le champ "content"
            setProducts(productsRes.data.content);

        } catch (error) {
            console.error("Failed to fetch products:", error);
            setProducts([]); // En cas d'erreur, vider la liste
        } finally {
            setLoading(false);
        }
    }, [debouncedSearchTerm, selectedCategory]); // Dépendances de la fonction

    // --- EFFET POUR LES DONNÉES DE PRODUITS ---
    useEffect(() => {
        void fetchData();
    }, [fetchData]); // On appelle fetchData quand les filtres changent

    // --- EFFET POUR LES CATÉGORIES (une seule fois au chargement) ---
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                // Assurez-vous que l'endpoint pour toutes les catégories est correct
                const categoriesRes = await axiosClient.get<Category[]>('/categories/all');
                setCategories(categoriesRes.data);
            } catch (error) {
                console.error("Failed to fetch categories:", error);
            }
        };
        void fetchCategories();
    }, []); // [] = s'exécute une seule fois

    if (loading) return (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="animate-spin text-primary" size={48} />
        </div>
    );

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-4xl font-bold mb-8 text-center">{t('products')}</h1>

            {/* Filtres */}
            <div className="flex flex-col md:flex-row gap-4 mb-8">
                <input
                    type="text"
                    placeholder={t('searchPlaceholder') || "Search products..."}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-grow bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-600 focus:ring-primary focus:border-primary"
                />
                <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-600 focus:ring-primary focus:border-primary"
                >
                    <option value="">{t('allCategories')}</option>
                    {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>
                            {cat.names[i18n.language] || cat.names.en}
                        </option>
                    ))}
                </select>
            </div>

            {/* Grille de produits */}
            {products.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {products.map(product => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>
            ) : (
                <p className="text-center text-gray-400 mt-16">{t('noProductsFound')}</p>
            )}
        </div>
    );
};

export default ProductListPage;