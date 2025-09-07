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
            // Créer un lien temporaire pour déclencher le téléchargement
            const link = document.createElement('a');
            link.href = response.downloadUrl;
            link.download = product.names?.en || 'download';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            console.error('Download error:', err);
            if (err instanceof AxiosError) {
                if (err.response?.status === 403) {
                    setError('Access denied. You may not have purchased this product or your access has expired.');
                } else if (err.response?.status === 404) {
                    setError('Download not found. Please contact support.');
                } else if (err.response?.status === 401) {
                    setError('Please log in again to download.');
                } else {
                    setError('Failed to get download link. Please try again.');
                }
            } else {
                setError('Network error. Please check your connection and try again.');
            }
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
                    onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = 'https://via.placeholder.com/100x100?text=No+Image';
                    }}
                />
                <div className="flex-1">
                    <h4 className="font-bold text-white">{product.names?.en || 'Unnamed Product'}</h4>
                    <p className="text-sm text-gray-400">
                        Purchased on: {new Date(product.purchaseDate).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-gray-500">
                        Downloads: {product.downloadCount} times
                    </p>
                    {product.accessExpiresAt && (
                        <p className="text-xs text-yellow-400">
                            Access expires: {new Date(product.accessExpiresAt).toLocaleDateString()}
                        </p>
                    )}
                    {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
                </div>
            </div>
            <button
                onClick={handleDownload}
                disabled={isDownloading}
                className="bg-green-600 text-white font-semibold px-4 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors min-w-[120px]"
            >
                {isDownloading ? (
                    <span className="flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Loading...
                    </span>
                ) : 'Download'}
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
                if (err instanceof AxiosError) {
                    if (err.response?.status === 403) {
                        setError('Session expired. Please log in again.');
                    } else if (err.response?.status === 401) {
                        setError('Please log in to view your products.');
                    } else {
                        setError('Could not load your products. Please refresh the page.');
                    }
                } else {
                    setError('Network error. Please check your connection.');
                }
            } finally {
                setLoading(false);
            }
        };

        void loadProducts();
    }, []);

    const refreshProducts = async () => {
        setError(null);
        setLoading(true);
        try {
            const data = await fetchMyProducts();
            setProducts(data);
        } catch (err) {
            console.error('Failed to refresh products:', err);
            setError('Failed to refresh products. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <section>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold text-white">My Downloads</h2>
                {!loading && products.length > 0 && (
                    <button
                        onClick={refreshProducts}
                        className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Refresh
                    </button>
                )}
            </div>

            <div className="bg-card border border-gray-700 rounded-lg p-6">
                {loading && (
                    <div className="flex items-center justify-center py-8">
                        <div className="flex items-center gap-2 text-gray-400">
                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Loading your digital products...
                        </div>
                    </div>
                )}

                {error && (
                    <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div className="flex-1">
                                <p className="text-red-400">{error}</p>
                                <div className="flex gap-2 mt-3">
                                    <button
                                        onClick={refreshProducts}
                                        className="text-sm text-red-300 hover:text-red-200 underline"
                                    >
                                        Retry
                                    </button>
                                    <button
                                        onClick={() => setError(null)}
                                        className="text-sm text-gray-400 hover:text-gray-300 underline"
                                    >
                                        Dismiss
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {!loading && !error && (
                    products.length > 0 ? (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between text-sm text-gray-400 border-b border-gray-700 pb-2">
                                <span>Product</span>
                                <span>Actions</span>
                            </div>
                            {products.map(p => (
                                <DownloadableProduct key={p.productId} product={p} />
                            ))}
                            <div className="mt-6 pt-4 border-t border-gray-700">
                                <div className="flex items-center justify-between text-sm text-gray-400">
                                    <span>Total Products: {products.length}</span>
                                    <span>Total Downloads: {products.reduce((sum, p) => sum + p.downloadCount, 0)}</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <div className="text-gray-400 mb-4">
                                <svg className="mx-auto h-16 w-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-medium text-gray-300 mb-2">No Digital Products Yet</h3>
                            <p className="text-gray-400 mb-4">You haven't purchased any downloadable products yet.</p>
                            <div className="space-y-2 text-sm text-gray-500">
                                <p>Browse our products to find:</p>
                                <ul className="list-disc list-inside space-y-1 text-left max-w-xs mx-auto">
                                    <li>E-books and digital guides</li>
                                    <li>Software and applications</li>
                                    <li>Templates and resources</li>
                                    <li>Digital art and media</li>
                                </ul>
                            </div>
                            <button
                                onClick={() => window.location.href = '/products'}
                                className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                </svg>
                                Browse Products
                            </button>
                        </div>
                    )
                )}
            </div>
        </section>
    );
};