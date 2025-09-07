import { useState, useEffect } from 'react';
import { fetchLoginHistory, fetchPasswordHistory, LoginHistory, PasswordHistory } from '../../api/axiosClient';
import { Loader2, Key, LogIn } from 'lucide-react';
import { format } from 'date-fns';

export const PasswordHistoryList = () => {
    const [history, setHistory] = useState<PasswordHistory[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchPasswordHistory()
            .then(data => setHistory(data))
            .finally(() => setIsLoading(false));
    }, []);

    if (isLoading) return <div className="flex items-center text-gray-400"><Loader2 className="animate-spin mr-2" /> Loading...</div>;

    return (
        <div>
            <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2"><Key size={20} /> Password Change History</h3>
            <ul className="space-y-3">
                {history.length === 0 ? (
                    <li className="text-gray-500">No password changes recorded yet.</li>
                ) : (
                    history.map((item, index) => (
                        <li key={index} className="text-sm text-gray-300 border-l-2 border-gray-600 pl-4">
                            <p><strong>{format(new Date(item.changeDate), 'PPpp')}</strong></p>
                            <p className="text-gray-400">Method: {item.changeMethod === 'BY_USER' ? 'Changed by you' : 'Password Reset'} | IP: {item.ipAddress}</p>
                        </li>
                    ))
                )}
            </ul>
        </div>
    );
};

export const LoginHistoryList = () => {
    const [history, setHistory] = useState<LoginHistory[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchLoginHistory()
            .then(data => setHistory(data))
            .finally(() => setIsLoading(false));
    }, []);

    if (isLoading) return <div className="flex items-center text-gray-400"><Loader2 className="animate-spin mr-2" /> Loading...</div>;

    return (
        <div>
            <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2"><LogIn size={20} /> Recent Login History</h3>
            <ul className="space-y-3">
                {history.length === 0 ? (
                    <li className="text-gray-500">No recent login activity.</li>
                ) : (
                    history.map((item, index) => (
                        <li key={index} className="text-sm text-gray-300 border-l-2 border-gray-600 pl-4">
                            <p><strong>{format(new Date(item.timestamp), 'PPpp')}</strong></p>
                            <p className="text-gray-400">Details: {item.details} | IP: {item.ipAddress}</p>
                        </li>
                    ))
                )}
            </ul>
        </div>
    );
};