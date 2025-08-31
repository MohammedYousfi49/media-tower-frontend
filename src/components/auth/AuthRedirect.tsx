// src/components/auth/AuthRedirect.tsx

import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const LOGIN_REDIRECT_KEY = 'loginRedirect';

const AuthRedirect = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { appUser, loading: authLoading } = useAuth(); // Récupérer l'état de chargement d'AuthContext

    useEffect(() => {
        // Si AuthContext est encore en train de charger l'utilisateur, attendre.
        // Cela évite les redirections prématurées avant que appUser ne soit complètement déterminé.
        if (authLoading) {
            console.log("AuthRedirect: AuthContext is still loading user data, waiting...");
            return;
        }

        const fromUrl = searchParams.get('from');
        const fromSession = sessionStorage.getItem(LOGIN_REDIRECT_KEY);
        sessionStorage.removeItem(LOGIN_REDIRECT_KEY); // Nettoyer immédiatement

        const finalDestination = fromUrl || fromSession;

        // Si appUser est défini (utilisateur validé par le backend), alors rediriger.
        if (appUser) {
            console.log(`AuthRedirect: appUser is loaded. Redirecting to: ${finalDestination || (appUser.role === 'ADMIN' ? '/admin/dashboard' : '/')}`);
            if (finalDestination) {
                navigate(finalDestination, { replace: true });
            } else if (appUser.role === 'ADMIN') {
                navigate('/admin/dashboard', { replace: true });
            } else {
                navigate('/', { replace: true });
            }
        } else {
            // Si appUser est NULL et que le chargement est terminé,
            // cela signifie que l'utilisateur n'est PAS authentifié/validé par le backend.
            // On ne doit PAS rediriger vers /login ICI, car AuthContext le fait déjà
            // avec le statut approprié (unverified, unauthorized, etc.).
            // Le rôle de AuthRedirect est de rediriger APRES une connexion réussie, pas de gérer les échecs.
            console.log("AuthRedirect: appUser is null after loading. Letting AuthContext handle redirection if any.");
            // Pas de redirection par défaut ici pour éviter le conflit.
            // La page actuelle (login) devrait déjà afficher le message d'erreur approprié.
        }

    }, [navigate, searchParams, appUser, authLoading]); // Ajouter authLoading aux dépendances

    // Afficher un loader pendant que AuthContext est en train de déterminer l'état de l'utilisateur
    if (authLoading) {
        return (
            <div className="flex justify-center items-center h-screen bg-gray-900 text-white">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p>Loading user session...</p>
                </div>
            </div>
        );
    }

    // Si pas en chargement et pas d'appUser, cela signifie que la redirection a été gérée ailleurs
    // (par exemple, par AuthContext vers /login?status=unverified)
    // Ou que l'utilisateur est sur une page publique.
    // Ne rien afficher par défaut ici si la redirection n'est pas encore décidée.
    return null;
};

export default AuthRedirect;