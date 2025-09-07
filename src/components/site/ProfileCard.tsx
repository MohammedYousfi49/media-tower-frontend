// src/components/site/ProfileCard.tsx
import React, { useState, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Camera, Loader2, X } from 'lucide-react';
import { uploadProfileImage, updateUserProfile } from '../../api/axiosClient';
import { AppUser } from '../../contexts/AuthContext';
import { UserProfileDto } from '../../dto/UserProfileDto';

// --- Le composant Modal reste identique ---
const EditProfileModal = ({ isOpen, onClose, user, onUpdate }: { isOpen: boolean, onClose: () => void, user: AppUser, onUpdate: (updatedUser: AppUser) => void }) => {
    // ... (aucun changement dans ce composant interne)
    const [formData, setFormData] = useState({
        firstName: user.firstName,
        lastName: user.lastName || '',
        phoneNumber: user.phoneNumber || '',
        address: user.address || ''
    });
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setError('');
        try {
            const updatedUserDto = await updateUserProfile(formData);
            const updatedAppUser: AppUser = {
                ...user,
                ...updatedUserDto,
                role: updatedUserDto.role as 'USER' | 'ADMIN' | 'SELLER',
                status: updatedUserDto.status as 'ACTIVE' | 'BLOCKED',
            };
            onUpdate(updatedAppUser);
            onClose();
        } catch (err) {
            setError('Failed to update profile. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm">
            <div className="bg-card border border-gray-700 rounded-lg p-6 w-full max-w-md relative animate-fade-in-up">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"><X size={24} /></button>
                <h3 className="text-xl font-bold mb-4 text-white">Edit Profile</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400">First Name</label>
                        <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} className="w-full bg-gray-800 border border-gray-600 rounded-md p-2 mt-1 focus:ring-primary focus:border-primary" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400">Last Name</label>
                        <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} className="w-full bg-gray-800 border border-gray-600 rounded-md p-2 mt-1 focus:ring-primary focus:border-primary" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400">Phone Number</label>
                        <input type="tel" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} className="w-full bg-gray-800 border border-gray-600 rounded-md p-2 mt-1 focus:ring-primary focus:border-primary" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400">Address</label>
                        <textarea name="address" value={formData.address} onChange={handleChange} className="w-full bg-gray-800 border border-gray-600 rounded-md p-2 mt-1 min-h-[80px] focus:ring-primary focus:border-primary" />
                    </div>
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    <button type="submit" disabled={isSaving} className="w-full py-2 bg-primary text-white font-semibold rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors">
                        {isSaving ? <Loader2 className="animate-spin mx-auto" /> : 'Save Changes'}
                    </button>
                </form>
            </div>
        </div>
    );
};


const ProfileCard = () => {
    const { appUser, setAppUser } = useAuth();
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !appUser) return;
        setIsUploading(true);
        setError(null);
        try {
            const updatedUserDto: UserProfileDto = await uploadProfileImage(file);
            const updatedAppUser: AppUser = {
                ...appUser,
                ...updatedUserDto,
                role: updatedUserDto.role as 'USER' | 'ADMIN' | 'SELLER',
                status: updatedUserDto.status as 'ACTIVE' | 'BLOCKED',
            };
            setAppUser(updatedAppUser);
        } catch (err) {
            console.error("Profile image upload failed:", err);
            setError("Failed to upload image. Please try again.");
        } finally {
            setIsUploading(false);
        }
    };

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    if (!appUser) {
        return null;
    }

    // ==================== CORRECTION ICI ====================
    // Le backend renvoie déjà une URL complète. Il ne faut plus préfixer.
    const profileImageUrl = appUser.profileImageUrl
        ? appUser.profileImageUrl // On utilise directement l'URL du backend
        : `https://ui-avatars.com/api/?name=${encodeURIComponent(appUser.firstName)}+${encodeURIComponent(appUser.lastName)}&background=0D8ABC&color=fff&font-size=0.5`;
    // =======================================================

    return (
        <>
            <section className="bg-card border border-gray-700 rounded-lg p-6 flex flex-col items-center text-center">
                <div className="relative group">
                    <img
                        src={profileImageUrl}
                        alt="Profile"
                        className="w-32 h-32 rounded-full object-cover border-4 border-gray-600 group-hover:opacity-60 transition-opacity"
                    />
                    <div
                        className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        onClick={handleAvatarClick}
                    >
                        {isUploading ? (
                            <Loader2 className="animate-spin text-white" size={32} />
                        ) : (
                            <Camera className="text-white" size={32} />
                        )}
                    </div>
                </div>
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/png, image/jpeg, image/gif"
                    onChange={handleImageUpload}
                    disabled={isUploading}
                />
                <h2 className="text-2xl font-bold text-white mt-4">{appUser.firstName} {appUser.lastName}</h2>
                <p className="text-gray-400">{appUser.email}</p>
                {error && <p className="text-red-500 mt-2 text-sm">{error}</p>}
                <button onClick={() => setIsModalOpen(true)} className="mt-6 px-6 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-blue-600 transition-colors">
                    Edit Profile
                </button>
            </section>
            <EditProfileModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                user={appUser}
                onUpdate={(updatedUser) => setAppUser(updatedUser)}
            />
        </>
    );
};

export default ProfileCard;