import React, { useState, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Camera, Loader2 } from 'lucide-react';
import { uploadProfileImage } from '../../api/axiosClient';
import { AppUser } from '../../contexts/AuthContext';
import { UserProfileDto } from '../../dto/UserProfileDto';

const ProfileCard = () => {
    const { appUser, setAppUser } = useAuth();
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !appUser) return;

        setIsUploading(true);
        setError(null);

        try {
            const updatedUserDto: UserProfileDto = await uploadProfileImage(file);

            // === CORRECTION FINALE ===
            // Nous fusionnons les informations, et nous "castons" explicitement le rôle et le statut
            // pour correspondre parfaitement au type AppUser.
            const updatedAppUser: AppUser = {
                ...appUser,
                ...updatedUserDto,
                role: updatedUserDto.role as 'USER' | 'ADMIN' | 'SELLER', // On force le type
                status: updatedUserDto.status as 'ACTIVE' | 'BLOCKED',    // On force le type
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

    const API_BASE_URL = 'http://localhost:8080';
    const profileImageUrl = appUser.profileImageUrl
        ? `${API_BASE_URL}${appUser.profileImageUrl}`
        : `https://ui-avatars.com/api/?name=${encodeURIComponent(appUser.firstName)}+${encodeURIComponent(appUser.lastName)}&background=random`;

    return (
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

            <button className="mt-6 px-6 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-blue-600 transition-colors">
                Edit Profile
            </button>
        </section>
    );
};

export default ProfileCard;