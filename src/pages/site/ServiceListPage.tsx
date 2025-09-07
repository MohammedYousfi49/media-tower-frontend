// Fichier : src/pages/site/ServiceListPage.tsx (VERSION CORRIGÉE)

import { useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import ServiceCard from '../../components/site/ServiceCard'; // <-- Import du nouveau composant
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';

// Interfaces
interface Media {
    id: number;
    url: string;
    isPrimary: boolean;
}

interface Service {
    id: number;
    names: { [key: string]: string };
    descriptions: { [key: string]: string };
    price: number;
    images: Media[];
}

// Interface pour la réponse paginée du backend
interface PaginatedServicesResponse {
    content: Service[];
    totalPages: number;
    number: number;
}

const ServiceListPage = () => {
    const { t } = useTranslation();
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchServices = async () => {
            setLoading(true);
            try {
                // On attend une réponse paginée, pas un simple tableau
                const response = await axiosClient.get<PaginatedServicesResponse>('/services');
                // On extrait la liste du champ "content"
                setServices(response.data.content);
            } catch (error) {
                console.error('Failed to fetch services:', error);
                setServices([]);
            } finally {
                setLoading(false);
            }
        };
        void fetchServices();
    }, []);

    if (loading) return (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="animate-spin text-primary" size={48} />
        </div>
    );

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-4xl font-bold mb-8 text-center text-white">{t('ourServices')}</h1>

            {services.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {services.map(service => <ServiceCard key={service.id} service={service} />)}
                </div>
            ) : (
                <p className="text-center text-gray-400 mt-16">{t('noServicesFound')}</p>
            )}
        </div>
    );
};

export default ServiceListPage;