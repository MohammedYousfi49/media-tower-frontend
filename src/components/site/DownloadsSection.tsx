import { useEffect, useState } from 'react';
import { UserProduct, fetchMyProducts, getDownloadLink } from '../../api/axiosClient';
import { AxiosError } from 'axios';

// Composant pour afficher un seul produit téléchargeable
const DownloadableProduct = ({ product }: { product: UserProduct }) => {
    const [isDownloading, setIsDownloading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleDownload = async () => {
        setIsDownloading(true);
        setError(null);
        try {
            const response = await getDownloadLink(product.productId);
            // Déclenche le téléchargement dans le navigateur
            window.location.href = response.downloadUrl;
        } catch (err) {
            console.error('Download error:', err);
            setError('Failed to get download link. Please try again.');
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="bg-gray-800 p-4 rounded-lg flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
                <img
                    src={product.thumbnailUrl || 'https://via.placeholder.com/100x100?text=No+Image'}
                    alt={product.names?.en || 'Product'}
                    className="w-16 h-16 object-cover rounded-md"
                />
                <div>
                    <h4 className="font-bold text-white">{product.names?.en || 'Unnamed Product'}</h4>
                    <p className="text-sm text-gray-400">
                        Purchased on: {new Date(product.purchaseDate).toLocaleDateString()}
                    </p>
                    {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
                </div>
            </div>
            <button
                onClick={handleDownload}
                disabled={isDownloading}
                className="bg-green-600 text-white font-semibold px-4 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
            >
                {isDownloading ? 'Loading...' : 'Download'}
            </button>
        </div>
    );
};


// Composant principal de la section
export const DownloadsSection = () => {
    const [products, setProducts] = useState<UserProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadProducts = async () => {
            try {
                const data = await fetchMyProducts();
                setProducts(data);
            } catch (err) {
                console.error('Failed to fetch downloadable products:', err);
                if (err instanceof AxiosError && err.response?.status === 403) {
                    setError('Session expired. Please log in again.');
                } else {
                    setError('Could not load your products. Please refresh the page.');
                }
            } finally {
                setLoading(false);
            }
        };

        void loadProducts();
    }, []);

    return (
        <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">My Downloads</h2>
            <div className="bg-card border border-gray-700 rounded-lg p-6">
                {loading && <p className="text-gray-400">Loading your digital products...</p>}
                {error && <p className="text-red-400">{error}</p>}
                {!loading && !error && (
                    products.length > 0 ? (
                        <div className="space-y-4">
                            {products.map(p => <DownloadableProduct key={p.productId} product={p} />)}
                        </div>
                    ) : (
                        <p className="text-gray-400">You have not purchased any downloadable products yet.</p>
                    )
                )}
            </div>
        </section>
    );
};