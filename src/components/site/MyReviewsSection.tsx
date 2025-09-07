// Fichier : src/components/site/MyReviewsSection.tsx (NOUVEAU FICHIER)

import { useEffect, useState, useCallback } from 'react';
import axiosClient from '../../api/axiosClient';
import { Loader2, Star, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';

// Interfaces pour les données d'avis
interface ProductReview {
    id: number;
    productId: number;
    productName: string;
    rating: number;
    comment: string;
    reviewDate: string;
}

interface ServiceReview {
    id: number;
    serviceId: number;
    serviceName: string;
    rating: number;
    comment: string;
    reviewDate: string;
}

// Composant réutilisable pour afficher une carte d'avis
const ReviewCard = ({ review, type, onDelete }: { review: ProductReview | ServiceReview, type: 'product' | 'service', onDelete: (type: 'product' | 'service', id: number) => void }) => {
    const sourceName = type === 'product' ? (review as ProductReview).productName : (review as ServiceReview).serviceName;
    const sourceUrl = type === 'product' ? `/products/${(review as ProductReview).productId}` : `/services/${(review as ServiceReview).serviceId}`;

    return (
        <div className="bg-card border border-gray-700 rounded-lg p-4 flex flex-col">
            <div className="flex justify-between items-start">
                <div>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${type === 'product' ? 'bg-blue-800 text-blue-200' : 'bg-green-800 text-green-200'}`}>
                        {type === 'product' ? 'Product' : 'Service'}
                    </span>
                    <Link to={sourceUrl} className="font-bold text-white text-lg mt-1 block hover:text-primary">{sourceName}</Link>
                </div>
                <div className="flex items-center gap-2">
                    {[...Array(5)].map((_, i) => (
                        <Star key={i} size={16} className={i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-600'} />
                    ))}
                </div>
            </div>
            <p className="text-gray-300 my-3 flex-grow">{review.comment || 'No comment.'}</p>
            <div className="flex justify-between items-center text-sm text-gray-500 pt-2 border-t border-gray-700">
                <span>{new Date(review.reviewDate).toLocaleDateString()}</span>
                <button
                    onClick={() => onDelete(type, review.id)}
                    className="text-red-500 hover:text-red-400 transition-colors flex items-center gap-1"
                    title="Delete this review"
                >
                    <Trash2 size={14} /> Delete
                </button>
            </div>
        </div>
    );
};


export const MyReviewsSection = () => {
    const [productReviews, setProductReviews] = useState<ProductReview[]>([]);
    const [serviceReviews, setServiceReviews] = useState<ServiceReview[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchReviews = useCallback(async () => {
        setLoading(true);
        try {
            const [pReviewsRes, sReviewsRes] = await Promise.all([
                axiosClient.get('/reviews/me'),
                axiosClient.get('/service-reviews/me')
            ]);
            setProductReviews(pReviewsRes.data);
            setServiceReviews(sReviewsRes.data);
        } catch (error) {
            console.error("Failed to fetch user's reviews:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void fetchReviews();
    }, [fetchReviews]);

    const handleDelete = async (type: 'product' | 'service', id: number) => {
        if (window.confirm("Are you sure you want to delete this review? This action cannot be undone.")) {
            try {
                if (type === 'product') {
                    await axiosClient.delete(`/reviews/${id}`);
                } else {
                    await axiosClient.delete(`/service-reviews/${id}`);
                }
                // Recharger les avis après suppression
                await fetchReviews();
            } catch (error) {
                console.error(`Failed to delete ${type} review:`, error);
                alert(`Could not delete the ${type} review.`);
            }
        }
    };


    if (loading) {
        return (
            <section>
                <h2 className="text-2xl font-semibold mb-4 text-white">My Reviews</h2>
                <div className="flex justify-center items-center h-48 bg-card border border-gray-700 rounded-lg">
                    <Loader2 className="animate-spin text-primary" size={32} />
                </div>
            </section>
        );
    }

    const allReviewsCount = productReviews.length + serviceReviews.length;

    return (
        <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">My Reviews ({allReviewsCount})</h2>
            {allReviewsCount === 0 ? (
                <div className="text-center p-8 text-gray-400 bg-card border border-gray-700 rounded-lg">
                    You have not written any reviews yet.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {productReviews.map(review => (
                        <ReviewCard key={`product-${review.id}`} review={review} type="product" onDelete={handleDelete} />
                    ))}
                    {serviceReviews.map(review => (
                        <ReviewCard key={`service-${review.id}`} review={review} type="service" onDelete={handleDelete} />
                    ))}
                </div>
            )}
        </section>
    );
};