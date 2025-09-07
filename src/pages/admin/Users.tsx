// Fichier : src/pages/admin/Users.tsx (COMPLET ET FINAL CORRIGÉ)

import { useEffect, useState, useCallback } from 'react';
import { Edit, Trash2, UserX, UserCheck, MailCheck, MailX, ShieldCheck, ShieldOff, ChevronLeft, ChevronRight } from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import Modal from '../../components/shared/Modal';
import { useDebounce } from '../../hooks/useDebounce';

// Interface mise à jour pour inclure les nouveaux champs
interface AppUser {
    id: number;
    uid: string;
    email: string;
    firstName: string;
    lastName: string;
    role: 'USER' | 'ADMIN' | 'SELLER';
    status: 'ACTIVE' | 'BLOCKED';
    phoneNumber: string | null;
    address: string | null;
    createdAt: string; // C'est une chaîne de date ISO
    emailVerified: boolean;
    mfaEnabled: boolean;
}

// Interface pour la réponse paginée de l'API
interface PaginatedUsersResponse {
    content: AppUser[];
    totalPages: number;
    totalElements: number;
    number: number; // Numéro de la page actuelle (commence à 0)
    size: number;
}

const Users = () => {
    const [users, setUsers] = useState<AppUser[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
    const [selectedRole, setSelectedRole] = useState<'USER' | 'ADMIN' | 'SELLER'>('USER');

    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 500);

    const [loading, setLoading] = useState(true);

    const [currentPage, setCurrentPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalUsers, setTotalUsers] = useState(0);

    const fetchUsers = useCallback(async (page: number, search: string) => {
        setLoading(true);
        try {
            const response = await axiosClient.get<PaginatedUsersResponse>('/users', {
                params: { page, size: 10, sort: 'createdAt,desc', search }
            });
            setUsers(response.data.content);
            setTotalPages(response.data.totalPages);
            setCurrentPage(response.data.number);
            setTotalUsers(response.data.totalElements);
        } catch (error) {
            console.error('Failed to fetch users:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void fetchUsers(currentPage, debouncedSearchTerm);
    }, [debouncedSearchTerm, currentPage, fetchUsers]);

    const handleOpenModal = (user: AppUser) => {
        setCurrentUser(user);
        setSelectedRole(user.role);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setCurrentUser(null);
    };

    const handleRoleChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) return;
        try {
            await axiosClient.put(`/users/${currentUser.id}/role`, { role: selectedRole });
            void fetchUsers(currentPage, debouncedSearchTerm);
            handleCloseModal();
        } catch (error) {
            console.error('Failed to update user role:', error);
            alert('Failed to update role.');
        }
    };

    const handleToggleStatus = async (user: AppUser) => {
        const newStatus = user.status === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE';
        if (window.confirm(`Are you sure you want to set status to ${newStatus} for ${user.email}?`)) {
            try {
                await axiosClient.put(`/users/${user.id}/status`, { status: newStatus });
                void fetchUsers(currentPage, debouncedSearchTerm);
            } catch (error) {
                console.error('Failed to update user status:', error);
                alert('Failed to update status.');
            }
        }
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
            try {
                await axiosClient.delete(`/users/${id}`);
                void fetchUsers(currentPage, debouncedSearchTerm);
            } catch (error) {
                console.error('Failed to delete user:', error);
            }
        }
    };

    const RoleBadge = ({ role }: { role: string }) => {
        const roleStyles: { [key: string]: string } = {
            ADMIN: 'bg-red-500 text-white',
            SELLER: 'bg-yellow-500 text-black',
            USER: 'bg-blue-500 text-white',
        };
        return <span className={`px-2 py-1 text-xs font-bold rounded-full ${roleStyles[role]}`}>{role}</span>;
    };

    const StatusBadge = ({ status, user }: { status: string, user: AppUser }) => {
        const isActive = status === 'ACTIVE';
        return (
            <button onClick={() => handleToggleStatus(user)} title={`Set to ${isActive ? 'BLOCKED' : 'ACTIVE'}`}
                    className={`flex items-center text-sm font-semibold p-1 rounded-md transition-colors ${
                        isActive ? 'text-green-300 hover:bg-green-800' : 'text-red-400 hover:bg-red-800'
                    }`}
            >
                {isActive ? <UserCheck size={16} className="mr-1"/> : <UserX size={16} className="mr-1"/>}
                {status}
            </button>
        );
    };

    // Fonction pour générer les numéros de page
    const renderPageNumbers = () => {
        const pageNumbers = [];
        // ▼▼▼ CORRECTION : La variable 'maxPagesToShow' a été supprimée ▼▼▼
        const startPage = Math.max(0, currentPage - 2);
        const endPage = Math.min(totalPages - 1, currentPage + 2);

        if (startPage > 0) {
            pageNumbers.push(<button key={0} onClick={() => setCurrentPage(0)} className="pagination-number">1</button>);
            if (startPage > 1) {
                pageNumbers.push(<span key="start-dots" className="pagination-dots">...</span>);
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            pageNumbers.push(
                <button key={i} onClick={() => setCurrentPage(i)} className={`pagination-number ${currentPage === i ? 'pagination-active' : ''}`}>
                    {i + 1}
                </button>
            );
        }

        if (endPage < totalPages - 1) {
            if (endPage < totalPages - 2) {
                pageNumbers.push(<span key="end-dots" className="pagination-dots">...</span>);
            }
            pageNumbers.push(<button key={totalPages - 1} onClick={() => setCurrentPage(totalPages - 1)} className="pagination-number">{totalPages}</button>);
        }

        return pageNumbers;
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-white">Manage Users ({totalUsers})</h1>
                <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setCurrentPage(0);
                    }}
                    className="bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:outline-none"
                />
            </div>

            <div className="bg-card p-4 rounded-lg border border-gray-700 overflow-x-auto">
                <table className="w-full text-left min-w-[800px]">
                    <thead>
                    <tr className="border-b border-gray-600">
                        <th className="p-4">Full Name</th>
                        <th className="p-4">Email</th>
                        <th className="p-4">Role</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-center">Verified</th>
                        <th className="p-4 text-center">2FA</th>
                        <th className="p-4">Created At</th>
                        <th className="p-4 text-center">Actions</th>
                    </tr>
                    </thead>
                    <tbody>
                    {loading ? (
                        <tr><td colSpan={8} className="text-center p-8 text-gray-400">Loading users...</td></tr>
                    ) : users.length === 0 ? (
                        <tr><td colSpan={8} className="text-center p-8 text-gray-400">No users found.</td></tr>
                    ) : users.map((user) => (
                        <tr key={user.id} className="border-b border-gray-700 hover:bg-gray-800">
                            <td className="p-4">
                                <div className="relative group">
                                    <span>{`${user.firstName || ''} ${user.lastName || ''}`.trim() || <span className="text-gray-500">Not provided</span>}</span>
                                    <div className="absolute left-0 bottom-full mb-2 w-64 bg-gray-900 border border-gray-600 rounded-lg p-3 text-sm text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
                                        <p className="font-bold text-base">{`${user.firstName || ''} ${user.lastName || ''}`.trim()}</p>
                                        <hr className="border-gray-700 my-1"/>
                                        <p><strong className="text-gray-400">Phone:</strong> {user.phoneNumber || 'N/A'}</p>
                                        <p><strong className="text-gray-400">Address:</strong> {user.address || 'N/A'}</p>
                                    </div>
                                </div>
                            </td>
                            <td className="p-4 text-gray-300">{user.email}</td>
                            <td className="p-4"><RoleBadge role={user.role} /></td>
                            <td className="p-4"><StatusBadge status={user.status} user={user}/></td>
                            <td className="p-4 text-center">
                                {/* ▼▼▼ CORRECTION : L'icône est dans un span avec le title ▼▼▼ */}
                                <span title={user.emailVerified ? "Email Verified" : "Email Not Verified"}>
                                    {user.emailVerified ? <MailCheck size={20} className="text-green-500 mx-auto"/> : <MailX size={20} className="text-gray-500 mx-auto"/>}
                                </span>
                            </td>
                            <td className="p-4 text-center">
                                {/* ▼▼▼ CORRECTION : L'icône est dans un span avec le title ▼▼▼ */}
                                <span title={user.mfaEnabled ? "2FA Enabled" : "2FA Disabled"}>
                                    {user.mfaEnabled ? <ShieldCheck size={20} className="text-blue-500 mx-auto"/> : <ShieldOff size={20} className="text-gray-500 mx-auto"/>}
                                </span>
                            </td>
                            <td className="p-4 text-gray-400">{new Date(user.createdAt).toLocaleDateString()}</td>
                            <td className="p-4 flex justify-center space-x-4">
                                <button onClick={() => handleOpenModal(user)} title="Edit Role" className="text-yellow-400 hover:text-yellow-300"><Edit size={20} /></button>
                                <button onClick={() => handleDelete(user.id)} title="Delete User" className="text-red-500 hover:text-red-400"><Trash2 size={20} /></button>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>

            {totalPages > 1 && (
                <div className="flex justify-between items-center mt-6 text-white">
                    <button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 0 || loading} className="pagination-arrow">
                        <ChevronLeft size={20}/>
                    </button>
                    <div className="flex items-center">{renderPageNumbers()}</div>
                    <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage >= totalPages - 1 || loading} className="pagination-arrow">
                        <ChevronRight size={20}/>
                    </button>
                </div>
            )}

            {isModalOpen && currentUser && (
                <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={`Edit Role for ${currentUser?.email}`}>
                    <form onSubmit={handleRoleChange}>
                        <div className="mb-4">
                            <label className="block text-gray-400 mb-1">User Role</label>
                            <select defaultValue={currentUser.role} onChange={(e) => setSelectedRole(e.target.value as 'USER' | 'ADMIN' | 'SELLER')} className="w-full bg-gray-700 text-white p-2 rounded-md border border-gray-600">
                                <option value="USER">User</option>
                                <option value="SELLER">Seller</option>
                                <option value="ADMIN">Admin</option>
                            </select>
                        </div>
                        <div className="flex justify-end space-x-4 mt-6">
                            <button type="button" onClick={handleCloseModal} className="bg-gray-600 text-white px-4 py-2 rounded-lg">Cancel</button>
                            <button type="submit" className="bg-primary text-white px-4 py-2 rounded-lg">Save Role</button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
};

export default Users;