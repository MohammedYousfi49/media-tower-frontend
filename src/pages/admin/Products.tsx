// Fichier : src/pages/admin/Products.tsx (COMPLET ET FINAL AVEC AJUSTEMENTS DE STYLE)

import { useEffect, useState, useCallback, FormEvent, ChangeEvent } from 'react';
import { PlusCircle, Edit, Trash2, Loader2, XCircle, Search, FileText, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import Modal from '../../components/shared/Modal';
import ConfirmationModal from '../../components/shared/ConfirmationModal';
import { AxiosError } from 'axios';
import { useDebounce } from '../../hooks/useDebounce';

// --- Interfaces ---
interface Media { id: number; url: string; originalName: string; isPrimary: boolean; file?: File; isNew?: boolean; isDeleted?: boolean; }
interface Product { id: number; names: { [key: string]: string }; descriptions: { [key: string]: string }; price: number; stock: number; categoryName: string; images: Media[]; digitalAssets: Media[]; tagIds: number[]; categoryId: number; }
interface Category { id: number; names: { [key: string]: string }; }
interface Tag { id: number; name: string; }
interface PaginatedProductsResponse { content: Product[]; totalPages: number; number: number; totalElements: number; }
type SupportedLanguage = 'fr' | 'en';
const LANGUAGES: SupportedLanguage[] = ['fr', 'en'];

// --- Sous-composants ---
const StockBadge = ({ stock }: { stock: number }) => {
    let bgColor = 'bg-gray-700 text-gray-300'; let text = 'Out of Stock';
    if (stock > 10) { bgColor = 'bg-green-500/20 text-green-300'; text = 'In Stock'; }
    else if (stock > 0 && stock <= 10) { bgColor = 'bg-yellow-500/20 text-yellow-300'; text = 'Low Stock'; }
    return <span className={`px-3 py-1 rounded-full text-xs font-semibold ${bgColor}`}>{stock} <span className="hidden lg:inline">{text}</span></span>;
};

const ImageGalleryModal = ({ images, onClose, productName }: { images: Media[], onClose: () => void, productName: string }) => {
    const [mainImage, setMainImage] = useState(images.find(img => img.isPrimary) || images[0]);

    if (!mainImage) return (
        <Modal isOpen={true} onClose={onClose} title={`Images for ${productName}`}>
            <p className="text-center text-gray-400">This product has no images.</p>
        </Modal>
    );

    return (
        <Modal isOpen={true} onClose={onClose} title={`Images for ${productName}`}>
            <div className="flex flex-col gap-4">
                <div className="w-full h-96 bg-gray-900 rounded-lg flex items-center justify-center">
                    <img src={mainImage.url} alt={mainImage.originalName} className="max-w-full max-h-full object-contain rounded-md" />
                </div>
                {images.length > 1 && (
                    <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                        {images.map(image => (
                            <button key={image.id} onClick={() => setMainImage(image)} className={`rounded-md overflow-hidden border-2 ${mainImage.id === image.id ? 'border-primary' : 'border-transparent'}`}>
                                <img src={image.url} alt={image.originalName} className="w-full h-20 object-cover" />
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </Modal>
    );
};

// --- Composant Principal ---
const Products = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [tags, setTags] = useState<Tag[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [galleryProduct, setGalleryProduct] = useState<Product | null>(null);
    const [currentProduct, setCurrentProduct] = useState<Partial<Product>>({});
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 500);
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [stockFilter, setStockFilter] = useState<string>('all');

    const [currentPage, setCurrentPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    const fetchFilterData = useCallback(async () => {
        try {
            const [catRes, tagRes] = await Promise.all([
                axiosClient.get<Category[]>('/categories/all'),
                axiosClient.get<Tag[]>('/tags')
            ]);
            setCategories(catRes.data);
            setTags(tagRes.data);
        } catch (error) {
            console.error('Failed to fetch filter data:', error);
        }
    }, []);

    const fetchProducts = useCallback(async (page: number, search: string, category: string, stock: string) => {
        setLoading(true);
        try {
            const params: { [key: string]: string | number } = { page, size: 10, sort: 'createdAt,desc', search };
            if (category !== 'all') params.categoryId = category;
            if (stock !== 'all') params.stockStatus = stock;

            const response = await axiosClient.get<PaginatedProductsResponse>('/products', { params });
            setProducts(response.data.content || []);
            setTotalPages(response.data.totalPages || 0);
            setCurrentPage(response.data.number || 0);
        } catch (error) {
            console.error('Failed to fetch products:', error);
            setProducts([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void fetchFilterData();
    }, [fetchFilterData]);

    useEffect(() => {
        void fetchProducts(currentPage, debouncedSearchTerm, categoryFilter, stockFilter);
    }, [currentPage, debouncedSearchTerm, categoryFilter, stockFilter, fetchProducts]);

    const handleOpenModal = (product: Partial<Product> | null = null) => {
        const initialProduct: Partial<Product> = {
            names: {fr: '', en: ''}, descriptions: {fr: '', en: ''}, price: 0, stock: 0, tagIds: [],
            images: [], digitalAssets: [], categoryId: categories[0]?.id || 0
        };
        setCurrentProduct({ ...initialProduct, ...product, names: { ...initialProduct.names, ...product?.names },
            descriptions: { ...initialProduct.descriptions, ...product?.descriptions }, images: product?.images ? [...product.images] : [],
            digitalAssets: product?.digitalAssets ? [...product.digitalAssets] : [], tagIds: product?.tagIds ? [...product.tagIds] : [],
        });
        setIsModalOpen(true);
    };

    const handleOpenDeleteModal = (product: Product) => {
        setCurrentProduct(product);
        setIsDeleteModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setIsDeleteModalOpen(false);
        setCurrentProduct({});
    };

    const handleSave = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSaving(true);
        const form = e.currentTarget;
        const selectedTagIds = tags.filter(t => (form[`tag-${t.id}`] as HTMLInputElement)?.checked).map(t => t.id);
        const productDto = {
            names: { fr: (form.name_fr as HTMLInputElement).value, en: (form.name_en as HTMLInputElement).value },
            descriptions: { fr: (form.desc_fr as HTMLTextAreaElement).value, en: (form.desc_en as HTMLTextAreaElement).value },
            price: Number((form.price as HTMLInputElement).value),
            stock: Number((form.stock as HTMLInputElement).value),
            categoryId: Number((form.categoryId as HTMLSelectElement).value),
            tagIds: selectedTagIds
        };
        const formData = new FormData();
        formData.append("productDto", new Blob([JSON.stringify(productDto)], { type: "application/json" }));
        currentProduct.images?.filter(img => img.isNew && img.file).forEach(media => { if (media.file) formData.append("newImages", media.file); });
        currentProduct.digitalAssets?.filter(asset => asset.isNew && asset.file).forEach(media => { if (media.file) formData.append("newDigitalAssets", media.file); });
        try {
            if (currentProduct?.id) {
                await axiosClient.put(`/products/${currentProduct.id}`, formData);
            } else {
                await axiosClient.post('/products', formData);
            }
            void fetchProducts(currentPage, debouncedSearchTerm, categoryFilter, stockFilter);
            handleCloseModal();
        } catch (error) {
            console.error('Failed to save product', error);
            alert('Error saving product.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!currentProduct?.id) return;
        setSaving(true);
        try {
            await axiosClient.delete(`/products/${currentProduct.id}`);
            void fetchProducts(currentPage, debouncedSearchTerm, categoryFilter, stockFilter);
            handleCloseModal();
        } catch (error) {
            const axiosErr = error as AxiosError;
            alert(`Error deleting product: ${axiosErr.response?.data || axiosErr.message}`);
        } finally {
            setSaving(false);
        }
    };

    const handleImageFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const newMedia: Media[] = Array.from(e.target.files).map(file => ({
            id: Date.now() + Math.random(), url: URL.createObjectURL(file), originalName: file.name,
            isPrimary: false, file, isNew: true,
        }));
        setCurrentProduct(prev => {
            const currentImages = prev.images?.filter(img => !img.isDeleted) || [];
            const allImages = [...currentImages, ...newMedia];
            if (allImages.length > 0 && !allImages.some(img => img.isPrimary)) { allImages[0].isPrimary = true; }
            return { ...prev, images: allImages };
        });
    };

    const handleDigitalAssetFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const newMedia: Media[] = Array.from(e.target.files).map(file => ({
            id: Date.now() + Math.random(), url: '', originalName: file.name,
            isPrimary: false, file, isNew: true,
        }));
        setCurrentProduct(prev => ({ ...prev, digitalAssets: [...(prev.digitalAssets?.filter(asset => !asset.isDeleted) || []), ...newMedia] }));
    };

    const handleSetPrimaryImage = (id: number) => {
        setCurrentProduct(prev => ({ ...prev, images: prev.images?.map(img => ({ ...img, isPrimary: img.id === id })) || [] }));
    };

    const handleRemoveMedia = (id: number, type: 'image' | 'digitalAsset') => {
        setCurrentProduct(prev => {
            const mediaList = type === 'image' ? prev.images : prev.digitalAssets;
            const updatedList = mediaList?.map(media => media.id === id ? { ...media, isDeleted: true } : media).filter(media => !(media.isNew && media.isDeleted));
            if (type === 'image' && prev.images?.find(img => img.id === id)?.isPrimary) {
                const remainingImages = updatedList?.filter(img => !img.isDeleted);
                if (remainingImages && remainingImages.length > 0) { remainingImages[0].isPrimary = true; }
            }
            return { ...prev, [type === 'image' ? 'images' : 'digitalAssets']: updatedList };
        });
    };

    const renderPageNumbers = () => {
        const pageNumbers = [];
        const startPage = Math.max(0, currentPage - 2);
        const endPage = Math.min(totalPages - 1, currentPage + 2);

        if (startPage > 0) {
            pageNumbers.push(<button key={0} onClick={() => setCurrentPage(0)} className="pagination-number">1</button>);
            if (startPage > 1) pageNumbers.push(<span key="start-dots" className="pagination-dots">...</span>);
        }
        for (let i = startPage; i <= endPage; i++) {
            pageNumbers.push(<button key={i} onClick={() => setCurrentPage(i)} className={`pagination-number ${currentPage === i ? 'pagination-active' : ''}`}>{i + 1}</button>);
        }
        if (endPage < totalPages - 1) {
            if (endPage < totalPages - 2) pageNumbers.push(<span key="end-dots" className="pagination-dots">...</span>);
            pageNumbers.push(<button key={totalPages - 1} onClick={() => setCurrentPage(totalPages - 1)} className="pagination-number">{totalPages}</button>);
        }
        return pageNumbers;
    };

    return (
        <div className="p-6 bg-background min-h-screen text-white">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
                <h1 className="text-3xl font-bold">Manage Products</h1>
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="relative flex-grow">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setCurrentPage(0); }} placeholder="Search products..." className="w-full bg-card border border-gray-700 rounded-lg pl-10 pr-4 py-2" />
                    </div>
                    <button onClick={() => handleOpenModal()} disabled={categories.length === 0} className="bg-primary text-white px-4 py-2 rounded-lg flex items-center hover:bg-primary/90 whitespace-nowrap disabled:bg-gray-500 disabled:cursor-not-allowed">
                        <PlusCircle className="mr-2" size={20} /> Add New
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 mb-4">
                <select value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setCurrentPage(0); }} className="w-full bg-card border border-gray-700 rounded-lg px-4 py-2">
                    <option value="all">All Categories</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.names.en || c.names.fr}</option>)}
                </select>
                <select value={stockFilter} onChange={e => { setStockFilter(e.target.value); setCurrentPage(0); }} className="w-full bg-card border border-gray-700 rounded-lg px-4 py-2">
                    <option value="all">All Stock Statuses</option>
                    <option value="instock">In Stock ({'>'}10)</option>
                    <option value="lowstock">Low Stock (1-10)</option>
                    <option value="outofstock">Out of Stock (0)</option>
                </select>
            </div>

            <div className="bg-card rounded-lg border border-gray-700 overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-800/50">
                    <tr className="border-b border-gray-600">
                        {/* ▼▼▼ AJUSTEMENTS DE STYLE CI-DESSOUS ▼▼▼ */}
                        <th className="p-4 text-gray-300 w-24">Image</th>
                        <th className="p-4 text-gray-300">Name</th>
                        <th className="p-4 text-gray-300 w-48">Category</th>
                        <th className="p-4 text-gray-300 text-right w-40">Price (DH)</th>
                        <th className="p-4 text-gray-300 text-center w-40">Stock</th>
                        <th className="p-4 text-gray-300 text-center w-32">Actions</th>
                    </tr>
                    </thead>
                    <tbody>
                    {loading ? ( <tr><td colSpan={6} className="text-center p-8"><Loader2 className="animate-spin mx-auto text-primary" /></td></tr> )
                        : products.map(product => {
                            const primaryImage = product.images?.find(img => img.isPrimary) || product.images?.[0];
                            return (
                                <tr key={product.id} className="border-b border-gray-700 last:border-b-0 hover:bg-gray-800/50">
                                    <td className="p-4">
                                        <button onClick={() => setGalleryProduct(product)} className="relative group">
                                            <img src={primaryImage?.url || 'https://via.placeholder.com/48x48/161b22/30363d?text=N/A'} alt={product.names.en} className="w-12 h-12 rounded-md object-cover" />
                                            {(product.images?.length || 0) > 1 &&
                                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-md">
                                                    <Eye size={20} className="text-white"/>
                                                </div>
                                            }
                                        </button>
                                    </td>
                                    <td className="p-4 font-medium">{product.names.en}</td>
                                    <td className="p-4 text-gray-400">{product.categoryName}</td>
                                    <td className="p-4 text-right font-mono">{product.price.toFixed(2)}</td>
                                    <td className="p-4 text-center"><StockBadge stock={product.stock} /></td>
                                    <td className="p-4">
                                        <div className="flex justify-center items-center gap-4">
                                            <button onClick={() => handleOpenModal(product)} className="text-yellow-400 hover:text-yellow-300"><Edit size={18} /></button>
                                            <button onClick={() => handleOpenDeleteModal(product)} className="text-red-500 hover:text-red-400"><Trash2 size={18} /></button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {totalPages > 1 && (
                <div className="flex justify-between items-center mt-6 text-white">
                    <button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 0 || loading} className="pagination-arrow"><ChevronLeft size={20}/></button>
                    <div className="flex items-center">{renderPageNumbers()}</div>
                    <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage >= totalPages - 1 || loading} className="pagination-arrow"><ChevronRight size={20}/></button>
                </div>
            )}

            {galleryProduct && <ImageGalleryModal images={galleryProduct.images} onClose={() => setGalleryProduct(null)} productName={galleryProduct.names.en} />}

            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={currentProduct.id ? 'Edit Product' : 'Add New Product'}>
                <form onSubmit={handleSave} className="space-y-6 max-h-[80vh] overflow-y-auto p-2 scroll-bar-thin">
                    <div className="border border-border p-4 rounded-md">
                        <label className="block mb-3 font-semibold text-lg">Product Images</label>
                        <input type="file" multiple accept="image/*" onChange={handleImageFileChange} className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100" />
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                            {currentProduct.images?.filter(img => !img.isDeleted).map(img => (
                                <div key={img.id} className="relative group border rounded-lg overflow-hidden">
                                    <img src={img.url} alt={img.originalName} className="w-full h-24 object-cover"/>
                                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 p-2 text-center">
                                        <button type="button" onClick={() => handleRemoveMedia(img.id, 'image')} className="absolute top-1 right-1 text-red-400"><XCircle size={20} /></button>
                                        <button type="button" onClick={() => handleSetPrimaryImage(img.id)} className={`mt-4 px-2 py-1 text-xs rounded ${img.isPrimary ? 'bg-green-600 text-white' : 'bg-gray-300 text-black'}`}>{img.isPrimary ? 'Primary' : 'Set Primary'}</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    {LANGUAGES.map(lang => (
                        <div key={lang} className="p-3 border rounded-md">
                            <h3 className="font-bold mb-2">{lang.toUpperCase()}</h3>
                            <input name={`name_${lang}`} defaultValue={currentProduct.names?.[lang]} placeholder={`Name (${lang})`} required className="w-full bg-gray-700 p-2 rounded mb-2" />
                            <textarea name={`desc_${lang}`} defaultValue={currentProduct.descriptions?.[lang]} placeholder={`Description (${lang})`} rows={3} className="w-full bg-gray-700 p-2 rounded" />
                        </div>
                    ))}
                    <div className="grid grid-cols-2 gap-4">
                        <input name="price" type="number" step="0.01" defaultValue={currentProduct.price || 0} placeholder="Price" required className="w-full bg-gray-700 p-2 rounded" />
                        <input name="stock" type="number" defaultValue={currentProduct.stock || 0} placeholder="Stock" required className="w-full bg-gray-700 p-2 rounded" />
                    </div>
                    <select name="categoryId" defaultValue={currentProduct.categoryId || ''} required className="w-full bg-gray-700 p-2 rounded">
                        <option value="" disabled>Select Category</option>
                        {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.names.en || cat.names.fr}</option>)}
                    </select>

                    <div className="border border-border p-4 rounded-md">
                        <label className="block mb-3 font-semibold text-lg">Digital Files (Content)</label>
                        <input type="file" multiple onChange={handleDigitalAssetFileChange} className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                            {currentProduct.digitalAssets?.filter(asset => !asset.isDeleted).map(asset => (
                                <div key={asset.id} className="relative group border rounded-lg p-2 flex flex-col items-center text-center">
                                    <FileText size={32} className="text-blue-400"/>
                                    <span className="text-xs mt-2">{asset.originalName}</span>
                                    <button type="button" onClick={() => handleRemoveMedia(asset.id, 'digitalAsset')} className="absolute top-1 right-1 text-red-400"><XCircle size={20} /></button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="border border-border p-3 rounded-md">
                        <h3 className="font-bold mb-2">Tags</h3>
                        <div className="max-h-32 overflow-y-auto">
                            {tags.map(tag => (
                                <label key={tag.id} className="flex items-center space-x-2"><input type="checkbox" name={`tag-${tag.id}`} defaultChecked={currentProduct.tagIds?.includes(tag.id)} /><span>{tag.name}</span></label>
                            ))}
                        </div>
                    </div>
                    <div className="flex justify-end pt-4 gap-4">
                        <button type="button" onClick={handleCloseModal} className="bg-gray-600 px-4 py-2 rounded-lg hover:bg-gray-500">Cancel</button>
                        <button type="submit" disabled={saving} className="bg-primary px-4 py-2 rounded-lg flex items-center disabled:bg-gray-500">{saving && <Loader2 className="animate-spin mr-2"/>}{saving ? 'Saving...' : 'Save'}</button>
                    </div>
                </form>
            </Modal>
            <ConfirmationModal isOpen={isDeleteModalOpen} onClose={handleCloseModal} onConfirm={handleDelete} isLoading={saving} title="Delete Product" message={<>Delete <strong className="text-white">{currentProduct.names?.en}</strong>?</>} />
        </div>
    );
};

export default Products;