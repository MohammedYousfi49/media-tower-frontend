// Fichier : src/pages/admin/Promotions.tsx (SIMPLIFIÉ ET FINAL)

import { useEffect, useState, FormEvent } from 'react';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import Modal from '../../components/shared/Modal';

interface Promotion { id: number; code: string; description: string; discountType: 'PERCENTAGE' | 'FIXED_AMOUNT'; discountValue: number; isActive: boolean; startDate: string | null; endDate: string | null; applicableProductIds: number[]; applicableServiceIds: number[]; applicablePackIds: number[]; }
interface Item { id: number; names: { [key: string]: string }; }

const Promotions = () => {
    const [promotions, setPromotions] = useState<Promotion[]>([]);
    const [products, setProducts] = useState<Item[]>([]);
    const [services, setServices] = useState<Item[]>([]);
    const [packs, setPacks] = useState<Item[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentPromotion, setCurrentPromotion] = useState<Partial<Promotion>>({});

    useEffect(() => { void fetchData(); }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [promoRes, prodRes, servRes, packRes] = await Promise.all([
                axiosClient.get('/promotions'),
                axiosClient.get('/products/all'),
                axiosClient.get('/services/all'),
                axiosClient.get('/packs/all')
            ]);
            setPromotions(Array.isArray(promoRes.data) ? promoRes.data : []);
            setProducts(Array.isArray(prodRes.data) ? prodRes.data : []);
            setServices(Array.isArray(servRes.data) ? servRes.data : []);
            setPacks(Array.isArray(packRes.data) ? packRes.data : []);
        } catch (error) {
            console.error('Failed to fetch data', error);
            setProducts([]); setServices([]); setPacks([]);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (promo: Promotion | null = null) => {
        setCurrentPromotion(promo || { discountType: 'PERCENTAGE', applicableProductIds: [], applicableServiceIds: [], applicablePackIds: [] });
        setIsModalOpen(true);
    };

    const handleSave = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget;
        const formData = new FormData(form);

        const data = {
            id: currentPromotion?.id,
            description: formData.get('description') as string,
            code: formData.get('code') as string,
            discountType: formData.get('discountType') as string,
            discountValue: Number(formData.get('discountValue')),
            startDate: (formData.get('startDate') as string) ? new Date(formData.get('startDate') as string).toISOString() : null,
            endDate: (formData.get('endDate') as string) ? new Date(formData.get('endDate') as string).toISOString() : null,
            // La logique "isActive" est maintenant gérée par le backend
            applicableProductIds: products.filter(p => formData.get(`product-${p.id}`)).map(p => p.id),
            applicableServiceIds: services.filter(s => formData.get(`service-${s.id}`)).map(s => s.id),
            applicablePackIds: packs.filter(p => formData.get(`pack-${p.id}`)).map(p => p.id),
        };

        try {
            if (data.id) {
                await axiosClient.put(`/promotions/${data.id}`, data);
            } else {
                await axiosClient.post('/promotions', data);
            }
            await fetchData();
            setIsModalOpen(false);
        } catch (error) {
            console.error('Failed to save promotion', error);
            alert('Error saving promotion');
        }
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('Delete this promotion?')) {
            await axiosClient.delete(`/promotions/${id}`);
            await fetchData();
        }
    };

    const formatDateForInput = (dateString: string | null | undefined) => {
        if (!dateString) return '';
        return new Date(dateString).toISOString().split('T')[0];
    };

    return (
        <div>
            {/* ... Le header de la page ne change pas ... */}
            <div className="flex justify-between items-center mb-6"> <h1 className="text-3xl font-bold text-white">Manage Promotions</h1> <button onClick={() => handleOpenModal()} className="bg-primary text-white px-4 py-2 rounded-lg flex items-center"> <PlusCircle className="mr-2" size={20} /> Add Promotion </button> </div>
            <div className="bg-card p-4 rounded-lg border border-gray-700 overflow-x-auto">
                <table className="w-full text-left min-w-[800px]">
                    <thead> <tr className="border-b border-gray-600 text-sm text-gray-400"> <th className="p-3">Description</th> <th className="p-3">Code</th> <th className="p-3">Discount</th> <th className="p-3">Status</th> <th className="p-3">Actions</th> </tr> </thead>
                    <tbody>
                    {loading ? ( <tr><td colSpan={5} className="text-center p-4">Loading...</td></tr> ) : promotions.map(promo => ( <tr key={promo.id} className="border-b border-gray-700 text-sm"> <td className="p-3">{promo.description}</td> <td className="p-3 font-mono">{promo.code || 'Auto'}</td> <td className="p-3">{promo.discountType === 'PERCENTAGE' ? `${promo.discountValue}%` : `${promo.discountValue.toFixed(2)} DH`}</td> <td className="p-3">{promo.isActive ? <span className="text-green-400">Active</span> : <span className="text-gray-500">Inactive</span>}</td> <td className="p-3 flex space-x-2"> <button onClick={() => handleOpenModal(promo)} className="text-yellow-400"><Edit size={20} /></button> <button onClick={() => handleDelete(promo.id)} className="text-red-500"><Trash2 size={20} /></button> </td> </tr> ))}
                    </tbody>
                </table>
            </div>

            {isModalOpen && currentPromotion && (
                <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={currentPromotion.id ? 'Edit Promotion' : 'Add Promotion'}>
                    <form onSubmit={handleSave} className="space-y-4 max-h-[80vh] overflow-y-auto p-1">
                        {/* ... Tous les inputs restent les mêmes ... */}
                        <div> <label className="block text-sm text-gray-400 mb-1">Description</label> <input name="description" defaultValue={currentPromotion.description || ''} required className="w-full bg-gray-700 p-2 rounded"/> </div>
                        <div> <label className="block text-sm text-gray-400 mb-1">Promo Code (optional)</label> <input name="code" defaultValue={currentPromotion.code || ''} placeholder="E.g., SUMMER2025" className="w-full bg-gray-700 p-2 rounded font-mono"/> </div>
                        <div className="grid grid-cols-2 gap-4"> <div> <label className="block text-sm text-gray-400 mb-1">Discount Type</label> <select name="discountType" defaultValue={currentPromotion.discountType} className="w-full bg-gray-700 p-2 rounded"> <option value="PERCENTAGE">Percentage</option> <option value="FIXED_AMOUNT">Fixed Amount</option> </select> </div> <div> <label className="block text-sm text-gray-400 mb-1">Discount Value</label> <input name="discountValue" type="number" step="0.01" defaultValue={currentPromotion.discountValue || 0} required className="w-full bg-gray-700 p-2 rounded"/> </div> </div>
                        <div className="grid grid-cols-2 gap-4"> <div> <label className="block text-sm text-gray-400 mb-1">Start Date (optional)</label> <input name="startDate" type="date" defaultValue={formatDateForInput(currentPromotion.startDate)} className="w-full bg-gray-700 p-2 rounded"/> </div> <div> <label className="block text-sm text-gray-400 mb-1">End Date (optional)</label> <input name="endDate" type="date" defaultValue={formatDateForInput(currentPromotion.endDate)} className="w-full bg-gray-700 p-2 rounded"/> </div> </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4"> <div> <h3 className="font-bold mb-2 text-white">Applicable Products</h3> <div className="max-h-40 overflow-y-auto border border-gray-600 rounded p-2 space-y-1 bg-gray-800"> {products.map(p => ( <label key={p.id} className="flex items-center space-x-2"> <input type="checkbox" name={`product-${p.id}`} defaultChecked={currentPromotion.applicableProductIds?.includes(p.id)} /> <span>{p.names.en}</span> </label> ))} </div> </div> <div> <h3 className="font-bold mb-2 text-white">Applicable Services</h3> <div className="max-h-40 overflow-y-auto border border-gray-600 rounded p-2 space-y-1 bg-gray-800"> {services.map(s => ( <label key={s.id} className="flex items-center space-x-2"> <input type="checkbox" name={`service-${s.id}`} defaultChecked={currentPromotion.applicableServiceIds?.includes(s.id)} /> <span>{s.names.en}</span> </label> ))} </div> </div> <div> <h3 className="font-bold mb-2 text-white">Applicable Packs</h3> <div className="max-h-40 overflow-y-auto border border-gray-600 rounded p-2 space-y-1 bg-gray-800"> {packs.map(p => ( <label key={p.id} className="flex items-center space-x-2"> <input type="checkbox" name={`pack-${p.id}`} defaultChecked={currentPromotion.applicablePackIds?.includes(p.id)} /> <span>{p.names.en}</span> </label> ))} </div> </div> </div>

                        {/* ▼▼▼ LA CHECKBOX "ACTIVE" A ÉTÉ RETIRÉE D'ICI ▼▼▼ */}

                        <div className="flex justify-end pt-4 border-t border-gray-700">
                            <button type="submit" className="bg-primary px-4 py-2 rounded">Save</button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
};
export default Promotions;