// Fichier : src/pages/admin/Categories.tsx (COMPLET ET CORRIGÉ POUR L'ERREUR 'length')

import { useEffect, useState, useCallback, FormEvent } from 'react';
import { PlusCircle, Edit, Trash2, Search, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import Modal from '../../components/shared/Modal';
import ConfirmationModal from '../../components/shared/ConfirmationModal';
import { useDebounce } from '../../hooks/useDebounce';

// --- Interfaces ---
interface Category {
    id: number;
    names: { [key: string]: string };
    descriptions: { [key: string]: string };
    productCount: number;
}

interface PaginatedCategoriesResponse {
    content: Category[];
    totalPages: number;
    totalElements: number;
    number: number;
}

const Categories = () => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [currentCategory, setCurrentCategory] = useState<Category | null>(null);
    const [formData, setFormData] = useState({ names: { fr: '', en: '', ar: '' }, descriptions: { fr: '', en: '', ar: '' } });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 500);

    const [currentPage, setCurrentPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    const fetchCategories = useCallback(async (page: number, search: string) => {
        setLoading(true);
        try {
            const response = await axiosClient.get<PaginatedCategoriesResponse>('/categories', {
                params: { page, size: 10, sort: 'id,desc', search }
            });
            // ▼▼▼ CORRECTION PRINCIPALE : Assurer que `categories` est toujours un tableau ▼▼▼
            setCategories(response.data.content || []);
            setTotalPages(response.data.totalPages || 0);
            setCurrentPage(response.data.number || 0);
        } catch (error) {
            console.error('Failed to fetch categories:', error);
            // ▼▼▼ CORRECTION SECONDAIRE : Réinitialiser l'état en cas d'erreur ▼▼▼
            setCategories([]);
            setTotalPages(0);
            setCurrentPage(0);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void fetchCategories(currentPage, debouncedSearchTerm);
    }, [currentPage, debouncedSearchTerm, fetchCategories]);


    const handleOpenEditModal = (category: Category | null = null) => {
        setCurrentCategory(category);
        if (category) {
            setFormData({
                names: { fr: category.names.fr || '', en: category.names.en || '', ar: category.names.ar || '' },
                descriptions: { fr: category.descriptions.fr || '', en: category.descriptions.en || '', ar: category.descriptions.ar || '' },
            });
        } else {
            setFormData({ names: { fr: '', en: '', ar: '' }, descriptions: { fr: '', en: '', ar: '' } });
        }
        setIsEditModalOpen(true);
    };

    const handleOpenDeleteModal = (category: Category) => {
        setCurrentCategory(category);
        setIsDeleteModalOpen(true);
    };

    const handleCloseModals = () => {
        setIsEditModalOpen(false);
        setIsDeleteModalOpen(false);
        setCurrentCategory(null);
    };

    const handleSave = async (e: FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (currentCategory) {
                await axiosClient.put(`/categories/${currentCategory.id}`, formData);
            } else {
                await axiosClient.post('/categories', formData);
            }
            void fetchCategories(currentPage, debouncedSearchTerm);
            handleCloseModals();
        } catch (error) {
            console.error('Failed to save category:', error);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!currentCategory) return;
        setSaving(true);
        try {
            await axiosClient.delete(`/categories/${currentCategory.id}`);
            void fetchCategories(currentPage, debouncedSearchTerm);
            handleCloseModals();
        } catch (error) {
            console.error('Failed to delete category:', error);
            alert('This category cannot be deleted because it is associated with products.');
        } finally {
            setSaving(false);
        }
    };

    const handleInputChange = (lang: string, field: 'names' | 'descriptions', value: string) => {
        setFormData(prev => ({ ...prev, [field]: { ...prev[field], [lang]: value } }));
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
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Manage Categories</h1>
                <button onClick={() => handleOpenEditModal()} className="bg-primary text-white px-4 py-2 rounded-lg flex items-center hover:bg-primary/90 transition-colors"><PlusCircle className="mr-2" size={20} /> Add New</button>
            </div>
            <div className="mb-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input type="text" placeholder="Search categories..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-card border border-gray-700 rounded-lg pl-10 pr-4 py-2" />
                </div>
            </div>
            <div className="bg-card rounded-lg border border-gray-700 overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-800/50">
                    <tr className="border-b border-gray-600">
                        <th className="p-4 text-gray-300">Name (FR)</th>
                        <th className="p-4 text-gray-300">Name (EN)</th>
                        <th className="p-4 text-gray-300 text-center">Products</th>
                        <th className="p-4 text-gray-300 text-center">Actions</th>
                    </tr>
                    </thead>
                    <tbody>
                    {loading ? (
                        <tr><td colSpan={4} className="text-center p-8"><Loader2 className="animate-spin mx-auto text-primary" size={32} /></td></tr>
                    ) : categories.length === 0 ? (
                        <tr><td colSpan={4} className="text-center p-8 text-gray-500">No categories found.</td></tr>
                    ) : categories.map((cat) => (
                        <tr key={cat.id} className="border-b border-gray-700 last:border-b-0 hover:bg-gray-800/50">
                            <td className="p-4 font-medium">{cat.names.fr || '-'}</td>
                            <td className="p-4">{cat.names.en || '-'}</td>
                            <td className="p-4 text-center"><span className={`px-3 py-1 rounded-full text-xs ${cat.productCount > 0 ? 'bg-blue-500/20 text-blue-300' : 'bg-gray-600/50 text-gray-400'}`}>{cat.productCount}</span></td>
                            <td className="p-4">
                                <div className="flex justify-center items-center gap-4">
                                    <button onClick={() => handleOpenEditModal(cat)} className="text-yellow-400 hover:text-yellow-300"><Edit size={20} /></button>
                                    <button onClick={() => handleOpenDeleteModal(cat)} className="text-red-500 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed" disabled={cat.productCount > 0}><Trash2 size={20} /></button>
                                </div>
                            </td>
                        </tr>
                    ))}
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

            <Modal isOpen={isEditModalOpen} onClose={handleCloseModals} title={currentCategory ? 'Edit Category' : 'Add New Category'}>
                <form onSubmit={handleSave}>
                    {['fr', 'en', 'ar'].map(lang => (
                        <div key={lang} className="mb-4">
                            <h3 className="font-bold mb-2">{lang.toUpperCase()}</h3>
                            <div className="mb-2"><label className="block text-gray-400 mb-1">Name ({lang})</label><input type="text" value={formData.names[lang as keyof typeof formData.names]} onChange={(e) => handleInputChange(lang, 'names', e.target.value)} className="w-full bg-gray-700 p-2 rounded" required={lang === 'fr' || lang === 'en'} /></div>
                            <div><label className="block text-gray-400 mb-1">Description ({lang})</label><textarea value={formData.descriptions[lang as keyof typeof formData.descriptions]} onChange={(e) => handleInputChange(lang, 'descriptions', e.target.value)} className="w-full bg-gray-700 p-2 rounded" rows={3} /></div>
                        </div>
                    ))}
                    <div className="flex justify-end gap-4 mt-6 pt-4 border-t border-gray-700">
                        <button type="button" onClick={handleCloseModals} className="bg-gray-600 px-4 py-2 rounded">Cancel</button>
                        <button type="submit" disabled={saving} className="bg-primary px-4 py-2 rounded flex items-center">{saving && <Loader2 className="animate-spin mr-2" size={16} />}{saving ? 'Saving...' : 'Save'}</button>
                    </div>
                </form>
            </Modal>

            <ConfirmationModal isOpen={isDeleteModalOpen} onClose={handleCloseModals} onConfirm={handleDelete} isLoading={saving} title="Delete Category" message={<>Are you sure you want to delete the category <strong className="text-white">{currentCategory?.names.en}</strong>? This action cannot be undone.</>} />
        </div>
    );
};

export default Categories;