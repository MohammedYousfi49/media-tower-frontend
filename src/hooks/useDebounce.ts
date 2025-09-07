import { useState, useEffect } from 'react';

/**
 * Hook personnalisé pour "retarder" la mise à jour d'une valeur.
 * Utile pour les barres de recherche, afin de n'envoyer la requête
 * qu'une fois que l'utilisateur a cessé de taper.
 * @param value La valeur à "débattre" (ex: le terme de recherche).
 * @param delay Le délai en millisecondes avant la mise à jour.
 * @returns La valeur "débattue".
 */
export const useDebounce = (value: string, delay: number): string => {
    // État pour stocker la valeur retardée
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        // Mettre en place un minuteur pour mettre à jour la valeur
        // après que le délai soit écoulé
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        // Nettoyer le minuteur si la valeur change (ou si le composant est démonté)
        // C'est ainsi que nous annulons le minuteur si l'utilisateur continue de taper
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]); // Ne ré-exécuter l'effet que si la valeur ou le délai change

    return debouncedValue;
};