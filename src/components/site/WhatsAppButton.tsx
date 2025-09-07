// Fichier : src/components/site/WhatsAppButton.tsx (Code complet et final)

import { useState, useEffect } from 'react';
import { FaWhatsapp } from 'react-icons/fa'; // Importation de l'icône officielle WhatsApp

/**
 * Un composant "Floating Action Button" (FAB) qui redirige vers une conversation WhatsApp.
 * Il détecte si l'utilisateur est sur mobile ou ordinateur pour utiliser le lien le plus direct.
 */
const WhatsAppButton = () => {
    const [whatsappUrl, setWhatsappUrl] = useState('');

    // --- À CONFIGURER ---
    // Remplacez ce numéro par celui de votre entreprise.
    // IMPORTANT : Utilisez le format international SANS le '+' ni les espaces.
    const phoneNumber = '212699417726'; // J'ai repris le numéro de votre screenshot. Changez-le si nécessaire.

    // (Optionnel) Le message pré-rempli.
    const defaultMessage = "Bonjour, je vous contacte depuis votre site web.";

    useEffect(() => {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        let finalUrl = '';

        if (isMobile) {
            // Pour les mobiles, wa.me est le plus efficace pour ouvrir l'application.
            finalUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(defaultMessage)}`;
        } else {
            // --- MODIFICATION CLÉ : Utilisation de web.whatsapp.com pour le bureau ---
            // Ce lien force l'ouverture directe de WhatsApp Web sans page intermédiaire.
            finalUrl = `https://web.whatsapp.com/send?phone=${phoneNumber}&text=${encodeURIComponent(defaultMessage)}`;
        }

        setWhatsappUrl(finalUrl);
    }, [phoneNumber, defaultMessage]);


    return (
        <a
            href={whatsappUrl || '#'}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Contacter nous sur WhatsApp"
            className="group fixed bottom-6 right-6 z-50 flex items-center justify-center"
        >
            {/* Bulle d'aide (Tooltip) qui apparaît au survol */}
            <div className="absolute right-full mr-4 px-3 py-2 bg-gray-800 text-white text-sm font-semibold rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                Une question ?
                <div className="absolute right-[-4px] top-1/2 -translate-y-1/2 w-2 h-2 bg-gray-800 transform rotate-45"></div>
            </div>

            {/* Le bouton flottant principal */}
            <div
                className="bg-green-500 text-white rounded-full w-16 h-16 shadow-lg flex items-center justify-center transition-all duration-300 ease-in-out transform group-hover:scale-110 group-hover:bg-green-600"
            >
                <FaWhatsapp size={36} />
            </div>
        </a>
    );
};

export default WhatsAppButton;