// Fichier : src/pages/admin/Services.tsx (COMPLET ET FINAL AVEC AJUSTEMENTS DE STYLE)

import { useEffect, useState, useCallback, FormEvent, ChangeEvent } from 'react';
import { PlusCircle, Edit, Trash2, Loader2, XCircle, Search, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import Modal from '../../components/shared/Modal';
import ConfirmationModal from '../../components/shared/ConfirmationModal';
import { AxiosError } from 'axios';
import { useDebounce } from '../../hooks/useDebounce';

// --- Interfaces ---
interface Media { id: number; url: string; originalName: string; isPrimary: boolean; file?: File; isNew?: boolean; isDeleted?: boolean; }
interface Service { id: number; names: { [key: string]: string }; descriptions: { [key: string]: string }; price: number; images: Media[]; bookingCount: number; }
interface PaginatedServicesResponse { content: Service[]; totalPages: number; number: number; }
const LANGUAGES: Array<'fr' | 'en'> = ['fr', 'en'];

// --- Sous-composant pour la Galerie d'Images ---
const ImageGalleryModal = ({ images, onClose, serviceName }: { images: Media[], onClose: () => void, serviceName: string }) => {
    const [mainImage, setMainImage] = useState(images.find(img => img.isPrimary) || images[0]);

    if (!mainImage) return (
        <Modal isOpen={true} onClose={onClose} title={`Images for ${serviceName}`}>
            <p className="text-center text-gray-400">This service has no images.</p>
        </Modal>
    );

    return (
        <Modal isOpen={true} onClose={onClose} title={`Images for ${serviceName}`}>
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
const Services = () => {
    const [services, setServices] = useState<Service[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [galleryService, setGalleryService] = useState<Service | null>(null);
    const [currentService, setCurrentService] = useState<Partial<Service>>({});
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 500);
    const [currentPage, setCurrentPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    const fetchServices = useCallback(async (page: number, search: string) => {
        setLoading(true);
        try {
            const response = await axiosClient.get<PaginatedServicesResponse>('/services', {
                params: { page, size: 10, search }
            });
            setServices(response.data.content || []);
            setTotalPages(response.data.totalPages || 0);
            setCurrentPage(response.data.number || 0);
        } catch (error) {
            console.error('Failed to fetch services:', error);
            setServices([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void fetchServices(currentPage, debouncedSearchTerm);
    }, [currentPage, debouncedSearchTerm, fetchServices]);

    const handleOpenModal = (service: Partial<Service> | null = null) => {
        const initialService: Partial<Service> = { names: { fr: '', en: '' }, descriptions: { fr: '', en: '' }, price: 0, images: [] };
        setCurrentService({ ...initialService, ...service, names: { ...initialService.names, ...service?.names }, descriptions: { ...initialService.descriptions, ...service?.descriptions }, images: service?.images ? [...service.images] : [] });
        setIsModalOpen(true);
    };

    const handleOpenDeleteModal = (service: Service) => {
        setCurrentService(service);
        setIsDeleteModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setIsDeleteModalOpen(false);
        setCurrentService({});
    };

    const handleSave = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSaving(true);
        const form = e.currentTarget;
        const serviceDto = {
            names: { fr: (form.name_fr as HTMLInputElement).value, en: (form.name_en as HTMLInputElement).value },
            descriptions: { fr: (form.desc_fr as HTMLTextAreaElement).value, en: (form.desc_en as HTMLTextAreaElement).value },
            price: Number((form.price as HTMLInputElement).value),
        };
        const formData = new FormData();
        formData.append("serviceDto", new Blob([JSON.stringify(serviceDto)], { type: "application/json" }));
        currentService.images?.filter(img => img.isNew && img.file).forEach(media => { if (media.file) formData.append("newImages", media.file); });
        try {
            if (currentService?.id) { await axiosClient.put(`/services/${currentService.id}`, formData); }
            else { await axiosClient.post('/services', formData); }
            void fetchServices(currentPage, debouncedSearchTerm);
            handleCloseModal();
        } catch (error) { console.error('Failed to save service', error); alert('Error saving service.'); }
        finally { setSaving(false); }
    };

    const handleDelete = async () => {
        if (!currentService?.id) return;
        setSaving(true);
        try {
            await axiosClient.delete(`/services/${currentService.id}`);
            void fetchServices(currentPage, debouncedSearchTerm);
            handleCloseModal();
        } catch (error) { alert(`Error: ${(error as AxiosError).message}`); }
        finally { setSaving(false); }
    };

    const handleImageFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const newMedia: Media[] = Array.from(e.target.files).map(file => ({ id: Date.now() + Math.random(), url: URL.createObjectURL(file), originalName: file.name, isPrimary: false, file, isNew: true }));
        setCurrentService(prev => {
            const currentImages = prev.images?.filter(img => !img.isDeleted) || [];
            const allImages = [...currentImages, ...newMedia];
            if (allImages.length > 0 && !allImages.some(img => img.isPrimary)) { allImages[0].isPrimary = true; }
            return { ...prev, images: allImages };
        });
    };

    const handleSetPrimaryImage = (id: number) => {
        setCurrentService(prev => ({ ...prev, images: prev.images?.map(img => ({ ...img, isPrimary: img.id === id })) || [] }));
    };

    const handleRemoveMedia = (id: number) => {
        setCurrentService(prev => {
            const updatedList = prev.images?.map(media => media.id === id ? { ...media, isDeleted: true } : media).filter(media => !(media.isNew && media.isDeleted));
            if (prev.images?.find(img => img.id === id)?.isPrimary) {
                const remainingImages = updatedList?.filter(img => !img.isDeleted);
                if (remainingImages && remainingImages.length > 0) { remainingImages[0].isPrimary = true; }
            }
            return { ...prev, images: updatedList };
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
                <h1 className="text-3xl font-bold">Manage Services</h1>
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="relative flex-grow">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setCurrentPage(0); }} placeholder="Search services..." className="w-full bg-card border border-gray-700 rounded-lg pl-10 pr-4 py-2" />
                    </div>
                    <button onClick={() => handleOpenModal()} className="bg-primary text-white px-4 py-2 rounded-lg flex items-center hover:bg-primary/90 whitespace-nowrap">
                        <PlusCircle className="mr-2" size={20} /> Add New Service
                    </button>
                </div>
            </div>
            <div className="bg-card rounded-lg border border-gray-700 overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-800/50">
                    <tr className="border-b border-gray-600">
                        {/* ▼▼▼ AJUSTEMENTS DE STYLE CI-DESSOUS ▼▼▼ */}
                        <th className="p-4 text-gray-300 w-24">Image</th>
                        <th className="p-4 text-gray-300">Name</th>
                        <th className="p-4 text-gray-300 text-center w-32">Bookings</th>
                        <th className="p-4 text-gray-300 text-right w-40">Price (DH)</th>
                        <th className="p-4 text-gray-300 text-center w-32">Actions</th>
                    </tr>
                    </thead>
                    <tbody>
                    {loading ? ( <tr><td colSpan={5} className="text-center p-8"><Loader2 className="animate-spin mx-auto text-primary" /></td></tr> )
                        : services.map(service => {
                            const primaryImage = service.images?.find(img => img.isPrimary) || service.images?.[0];
                            return (
                                <tr key={service.id} className="border-b border-gray-700 last:border-b-0 hover:bg-gray-800/50">
                                    <td className="p-4">
                                        <button onClick={() => setGalleryService(service)} className="relative group">
                                            <img src={primaryImage?.url || 'https://via.placeholder.com/48x48/161b22/30363d?text=N/A'} alt={service.names.en} className="w-12 h-12 rounded-md object-cover" />
                                            {(service.images?.length || 0) > 1 &&
                                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-md">
                                                    <Eye size={20} className="text-white"/>
                                                </div>
                                            }
                                        </button>
                                    </td>
                                    <td className="p-4 font-medium">{service.names.en}</td>
                                    <td className="p-4 text-center text-gray-400 font-mono">{service.bookingCount}</td>
                                    <td className="p-4 text-right font-mono">{service.price.toFixed(2)}</td>
                                    <td className="p-4">
                                        <div className="flex justify-center items-center gap-4">
                                            <button onClick={() => handleOpenModal(service)} className="text-yellow-400 hover:text-yellow-300"><Edit size={18} /></button>
                                            <button onClick={() => handleOpenDeleteModal(service)} className="text-red-500 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed" disabled={service.bookingCount > 0}><Trash2 size={18} /></button>
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

            {galleryService && <ImageGalleryModal images={galleryService.images} onClose={() => setGalleryService(null)} serviceName={galleryService.names.en} />}

            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={currentService.id ? 'Edit Service' : 'Add New Service'}>
                <form onSubmit={handleSave} className="space-y-6 max-h-[80vh] overflow-y-auto p-2 scrollbar-thin">
                    <div className="border border-border p-4 rounded-md">
                        <label className="block mb-3 font-semibold text-lg">Service Images</label>
                        <input type="file" multiple accept="image/*" onChange={handleImageFileChange} className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100" />
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                            {currentService.images?.filter(img => !img.isDeleted).map(img => (
                                <div key={img.id} className="relative group border rounded-lg overflow-hidden">
                                    <img src={img.url} alt={img.originalName} className="w-full h-24 object-cover"/>
                                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 p-2 text-center">
                                        <button type="button" onClick={() => handleRemoveMedia(img.id)} className="absolute top-1 right-1 text-red-400"><XCircle size={20} /></button>
                                        <button type="button" onClick={() => handleSetPrimaryImage(img.id)} className={`mt-4 px-2 py-1 text-xs rounded ${img.isPrimary ? 'bg-green-600 text-white' : 'bg-gray-300 text-black'}`}>{img.isPrimary ? 'Primary' : 'Set Primary'}</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    {LANGUAGES.map(lang => (
                        <div key={lang} className="p-3 border rounded-md">
                            <h3 className="font-bold mb-2">{lang.toUpperCase()}</h3>
                            <input name={`name_${lang}`} defaultValue={currentService.names?.[lang]} placeholder={`Name (${lang})`} required className="w-full bg-gray-700 p-2 rounded mb-2" />
                            <textarea name={`desc_${lang}`} defaultValue={currentService.descriptions?.[lang]} placeholder={`Description (${lang})`} rows={3} className="w-full bg-gray-700 p-2 rounded" />
                        </div>
                    ))}
                    <input name="price" type="number" step="0.01" defaultValue={currentService.price || 0} placeholder="Price" required className="w-full bg-gray-700 p-2 rounded" />
                    <div className="flex justify-end pt-4 gap-4">
                        <button type="button" onClick={handleCloseModal} className="bg-gray-600 px-4 py-2 rounded-lg hover:bg-gray-500">Cancel</button>
                        <button type="submit" disabled={saving} className="bg-primary px-4 py-2 rounded-lg flex items-center disabled:bg-gray-500">{saving && <Loader2 className="animate-spin mr-2"/>}{saving ? 'Saving...' : 'Save Service'}</button>
                    </div>
                </form>
            </Modal>
            <ConfirmationModal isOpen={isDeleteModalOpen} onClose={handleCloseModal} onConfirm={handleDelete} isLoading={saving} title="Delete Service" message={<>Are you sure you want to delete <strong className="text-white">{currentService.names?.en}</strong>?</>} />
        </div>
    );
};

export default Services;