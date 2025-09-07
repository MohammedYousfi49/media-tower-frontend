// src/components/layout/AdminLayout.tsx
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { LayoutDashboard, ShoppingBasket, Layers, Users, LogOut, Package, FileText, Settings as SettingsIcon, Tag, MessageSquare, Percent, Star, Box, Shield, ChevronDown, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { auth } from '../../lib/firebase';
import NotificationDropdown from '../admin/NotificationDropdown';

const AdminLayout = () => {
    const { appUser } = useAuth();
    const navigate = useNavigate();
    const [isProfileOpen, setProfileOpen] = useState(false);
    const profileMenuRef = useRef<HTMLDivElement>(null);

    const handleLogout = async () => {
        await auth.signOut();
        navigate('/login');
    };

    // Fermer le menu si on clique en dehors
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
                setProfileOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const navItems = [
        { name: 'Dashboard', icon: LayoutDashboard, path: '/admin/dashboard' },
        { name: 'Products', icon: ShoppingBasket, path: '/admin/products' },
        { name: 'Packs', icon: Box, path: '/admin/packs' },
        { name: 'Services', icon: ShoppingBasket, path: '/admin/services' },
        { name: 'Categories', icon: Layers, path: '/admin/categories' },
        { name: 'Tags', icon: Tag, path: '/admin/tags' },
        { name: 'Orders', icon: Package, path: '/admin/orders' },
        { name: 'Bookings', icon: Package, path: '/admin/bookings' },
        { name: 'Promotions', icon: Percent, path: '/admin/promotions' },
        { name: 'Inbox', icon: MessageSquare, path: '/admin/inbox' },
        { name: 'Product Reviews', icon: Star, path: '/admin/reviews' },
        { name: 'Users', icon: Users, path: '/admin/users' },
        { name: 'Content', icon: FileText, path: '/admin/content' },
        { name: 'Settings', icon: SettingsIcon, path: '/admin/settings' },
        { name: 'Audit Log', icon: Shield, path: '/admin/audit-logs' },
    ];

    return (
        <div className="flex h-screen bg-background text-foreground">
            {/* Sidebar */}
            <aside className="w-64 bg-card flex-shrink-0 border-r border-border overflow-y-auto">
                <div className="p-4">
                    <h1 className="text-2xl font-bold text-white">Media Tower</h1>
                </div>
                <nav className="mt-6">
                    {navItems.map((item) => (
                        <NavLink key={item.name} to={item.path} end={item.path === '/admin/dashboard'}
                                 className={({ isActive }) => `flex items-center px-4 py-3 text-gray-300 hover:bg-secondary hover:text-white transition-colors ${isActive ? 'bg-primary text-white' : ''}`}
                        >
                            <item.icon className="w-5 h-5 mr-3" />
                            {item.name}
                        </NavLink>
                    ))}
                </nav>
            </aside>
            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <header className="bg-card p-4 flex justify-between items-center border-b border-border z-10">
                    <div>{/* Espace pour barre de recherche future */}</div>
                    <div className="flex items-center space-x-6">
                        <NotificationDropdown />
                        <div className="relative" ref={profileMenuRef}>
                            <button onClick={() => setProfileOpen(!isProfileOpen)} className="flex items-center space-x-2">
                                <img
                                    className="w-10 h-10 rounded-full object-cover border-2 border-gray-600"
                                    // ==================== CORRECTION ICI ====================
                                    src={appUser?.profileImageUrl || `https://ui-avatars.com/api/?name=${appUser?.firstName}+${appUser?.lastName}&background=374151&color=fff`}
                                    // =======================================================
                                    alt="User Avatar"
                                />
                                <span className="text-gray-300 hidden md:block">{appUser?.firstName || appUser?.email}</span>
                                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {isProfileOpen && (
                                <div className="absolute right-0 mt-2 w-48 bg-card rounded-md shadow-lg border border-border py-1 animate-fade-in-down">
                                    <Link to="/account" onClick={() => setProfileOpen(false)} className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-secondary">
                                        <UserIcon className="w-4 h-4 mr-2" />
                                        My Account
                                    </Link>
                                    <button onClick={handleLogout} className="flex items-center w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-secondary">
                                        <LogOut className="w-4 h-4 mr-2" />
                                        Logout
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </header>
                {/* Page Content */}
                <main className="flex-1 overflow-y-auto p-6 bg-background">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;