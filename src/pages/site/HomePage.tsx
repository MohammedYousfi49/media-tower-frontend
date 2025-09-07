// Fichier : src/pages/site/HomePage.tsx (VERSION CORRIGÉE)

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import ProductCard from '../../components/site/ProductCard';
import ServiceCard from '../../components/site/ServiceCard'; // On importe notre composant propre
import { Loader2 } from 'lucide-react';

// Interfaces
interface Media { id: number; url: string; isPrimary: boolean; }
interface Product { id: number; names: { [key: string]: string }; price: number; images: Media[]; categoryName: string; }
interface Service { id: number; names: { [key: string]: string }; descriptions: { [key: string]: string }; price: number; images: Media[]; }

// Interface pour la réponse paginée des services (uniquement pour cet appel)
interface PaginatedServicesResponse { content: Service[]; }

const HomePage = () => {
    const [popularProducts, setPopularProducts] = useState<Product[]>([]);
    const [featuredServices, setFeaturedServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [productsRes, servicesRes] = await Promise.all([
                    axiosClient.get<Product[]>('/products/popular'),
                    // On attend une réponse paginée pour les services
                    axiosClient.get<PaginatedServicesResponse>('/services'),
                ]);

                setPopularProducts(productsRes.data);

                // --- LA CORRECTION CLÉ EST ICI ---
                // On accède à .content AVANT de faire .slice()
                setFeaturedServices(servicesRes.data.content.slice(0, 3));

            } catch (error) {
                console.error("Failed to fetch homepage data:", error);
            } finally {
                setLoading(false);
            }
        };
        void fetchData();
    }, []);

    const renderLoadingSkeletons = (count: number, type: 'product' | 'service') => (
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${type === 'product' ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-6`}>
            {Array.from({ length: count }).map((_, index) => (
                <div key={index} className="bg-card rounded-lg border border-gray-700 h-80 animate-pulse"></div>
            ))}
        </div>
    );

    return (
        <div className="space-y-16 md:space-y-24">
            {/* ... (votre section Hero reste la même) ... */}
            <section className="text-center bg-card border border-border rounded-lg p-8 md:p-12 animate-fade-in">
                <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">Welcome to Media Tower</h1>
                <p className="text-lg md:text-xl text-foreground max-w-2xl mx-auto mb-8">
                    Discover a world of premium digital products and expert services to boost your project.
                </p>
                <Link to="/products" className="bg-primary text-primary-foreground font-bold px-8 py-3 rounded-lg hover:bg-opacity-80 transition-transform hover:scale-105 inline-block">
                    Browse All Offers
                </Link>
            </section>

            <section>
                <h2 className="text-3xl font-bold text-center mb-8 text-white">Popular Products</h2>
                {loading ? renderLoadingSkeletons(4, 'product') : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {popularProducts.map(product => <ProductCard key={product.id} product={product} />)}
                    </div>
                )}
            </section>

            <section>
                <h2 className="text-3xl font-bold text-center mb-8 text-white">Featured Services</h2>
                {loading ? renderLoadingSkeletons(3, 'service') : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {featuredServices.map(service => <ServiceCard key={service.id} service={service} />)}
                    </div>
                )}
            </section>
        </div>
    );
};

export default HomePage;