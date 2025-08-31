import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

interface ProtectedRouteProps {
    allowedRoles: string[];
    children: ReactNode;
}

const ProtectedRoute = ({ allowedRoles, children }: ProtectedRouteProps) => {
    const { currentUser, appUser, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen bg-gray-900 text-white">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (!currentUser || !appUser) {
        // Utilisateur pas du tout connecté, on renvoie au login
        const redirectTo = `/login?from=${encodeURIComponent(location.pathname + location.search)}`;
        return <Navigate to={redirectTo} replace />;
    }

    // === NOUVELLE VÉRIFICATION CRUCIALE POUR LE MFA ===
    // Si l'utilisateur a le MFA activé sur son compte,
    // MAIS que sa session actuelle n'a pas encore passé la vérification,
    // on le force à aller sur la page de vérification.
    if (appUser.mfaEnabled && !appUser.mfaVerified) {
        // On passe l'URL actuelle (`location`) en state pour pouvoir y retourner après.
        return <Navigate to="/verify-2fa" state={{ from: location }} replace />;
    }

    const userHasRequiredRole = allowedRoles.includes(appUser.role);

    if (userHasRequiredRole) {
        // L'utilisateur est connecté, a le bon rôle (et a passé le MFA si nécessaire)
        return <>{children}</>;
    } else {
        // L'utilisateur est connecté mais n'a pas le bon rôle
        return <Navigate to="/" replace />;
    }
};

export default ProtectedRoute;