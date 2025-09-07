// src/pages/admin/Settings.tsx
import { useEffect, useState, FormEvent } from 'react';
import { Save, Facebook, Twitter, Instagram } from 'lucide-react'; // Import des icônes de réseaux sociaux
import axiosClient from '../../api/axiosClient';
import { AxiosError } from 'axios';

// --- Interface ---
interface Setting {
    key: string;
    value: string;
}

// --- Nouveau sous-composant pour les champs ---
const SocialInput = ({ icon: Icon, id, value, onChange }: { icon: React.ElementType, id: string, value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) => (
    <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon className="text-gray-400" size={20} />
        </div>
        <input
            type="url" // Utiliser le type "url" pour une meilleure sémantique
            id={id}
            value={value}
            onChange={onChange}
            placeholder={`https://...`}
            className="w-full bg-card border border-gray-600 rounded-lg p-3 pl-10 text-white focus:ring-primary focus:border-primary transition-colors"
        />
    </div>
);

// --- Composant Principal ---
const Settings = () => {
    const [settings, setSettings] = useState<Setting[]>([]);
    const [initialSettings, setInitialSettings] = useState<Setting[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        const fetchSettings = async () => {
            setLoading(true);
            try {
                const response = await axiosClient.get<Setting[]>('/api/settings');
                setSettings(response.data);
                setInitialSettings(response.data);
            } catch {
                setError('Failed to load settings.');
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleInputChange = (key: string, value: string) => {
        setSettings(currentSettings =>
            currentSettings.map(s => (s.key === key ? { ...s, value } : s))
        );
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        setSuccess('');
        try {
            // On ne sauvegarde que les paramètres des réseaux sociaux
            const socialSettings = settings.filter(s => s.key.startsWith('social_'));
            await axiosClient.put('/api/settings', socialSettings);
            setSuccess('Settings saved successfully!');
            setInitialSettings(settings);
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError((err as AxiosError).message || 'Failed to save settings.');
        } finally {
            setSaving(false);
        }
    };

    // Helper pour trouver une valeur de paramètre
    const getSettingValue = (key: string) => settings.find(s => s.key === key)?.value || '';

    if (loading) return <div className="text-center p-8 text-white">Loading...</div>;

    return (
        <div>
            <h1 className="text-3xl font-bold text-white mb-6">Site Settings</h1>
            <form onSubmit={handleSubmit} className="bg-card p-6 rounded-lg border border-gray-700 max-w-2xl mx-auto">
                <div>
                    <h2 className="text-xl font-semibold text-white border-b border-gray-600 pb-2 mb-6">Social Media Links</h2>
                    <div className="space-y-6">
                        <SocialInput
                            icon={Facebook}
                            id="social_facebook_url"
                            value={getSettingValue('social_facebook_url')}
                            onChange={(e) => handleInputChange('social_facebook_url', e.target.value)}
                        />
                        <SocialInput
                            icon={Twitter}
                            id="social_twitter_url"
                            value={getSettingValue('social_twitter_url')}
                            onChange={(e) => handleInputChange('social_twitter_url', e.target.value)}
                        />
                        <SocialInput
                            icon={Instagram}
                            id="social_instagram_url"
                            value={getSettingValue('social_instagram_url')}
                            onChange={(e) => handleInputChange('social_instagram_url', e.target.value)}
                        />
                    </div>
                </div>

                <div className="pt-6 border-t border-gray-700 mt-8">
                    {error && <p className="text-red-400 mb-4 text-center">{error}</p>}
                    {success && <p className="text-green-400 mb-4 text-center">{success}</p>}
                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={saving || JSON.stringify(initialSettings) === JSON.stringify(settings)}
                            className="bg-primary text-white px-6 py-2 rounded-lg flex items-center hover:bg-purple-700 transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed font-semibold"
                        >
                            <Save className="mr-2" size={20} />
                            {saving ? 'Saving...' : 'Save Settings'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default Settings;