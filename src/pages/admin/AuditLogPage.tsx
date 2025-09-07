import { useState, useEffect } from 'react';
import { fetchAuditLogs, AuditLog, PaginatedResponse } from '../../api/axiosClient';
import { Loader2, ShieldAlert, ShieldCheck, ShieldClose, ShieldQuestion, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

const actionStyles: { [key: string]: { icon: React.ElementType, color: string, label: string } } = {
    LOGIN_SUCCESS: { icon: ShieldCheck, color: 'bg-green-500/20 text-green-400', label: 'Login Success' },
    MFA_VERIFICATION_SUCCESS: { icon: ShieldCheck, color: 'bg-green-500/20 text-green-400', label: '2FA Success' },
    MFA_ENABLED: { icon: ShieldCheck, color: 'bg-blue-500/20 text-blue-400', label: '2FA Enabled' },
    PASSWORD_CHANGE_SUCCESS: { icon: ShieldCheck, color: 'bg-blue-500/20 text-blue-400', label: 'Password Changed' },
    PASSWORD_RESET_SUCCESS: { icon: ShieldCheck, color: 'bg-blue-500/20 text-blue-400', label: 'Password Reset' },
    LOGIN_FAILED: { icon: ShieldAlert, color: 'bg-red-500/20 text-red-400', label: 'Login Failed' },
    MFA_VERIFICATION_FAILED: { icon: ShieldAlert, color: 'bg-red-500/20 text-red-400', label: '2FA Failed' },
    MFA_DISABLED: { icon: ShieldClose, color: 'bg-yellow-500/20 text-yellow-400', label: '2FA Disabled' },
    RECOVERY_CODES_REGENERATED: { icon: ShieldAlert, color: 'bg-yellow-500/20 text-yellow-400', label: 'Recovery Codes Regenerated' },
    PASSWORD_RESET_REQUEST: { icon: ShieldQuestion, color: 'bg-indigo-500/20 text-indigo-400', label: 'Password Reset Request' },
    LOGOUT: { icon: ShieldClose, color: 'bg-gray-500/20 text-gray-400', label: 'Logout' },
};

const AuditLogPage = () => {
    const [logs, setLogs] = useState<PaginatedResponse<AuditLog> | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [page, setPage] = useState(0);
    const pageSize = 15;

    useEffect(() => {
        const loadLogs = async () => {
            setIsLoading(true);
            try {
                const data = await fetchAuditLogs(page, pageSize);
                setLogs(data);
            } catch (error) {
                console.error("Failed to fetch audit logs:", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadLogs();
    }, [page]);

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-white">Security Audit Log</h1>
            <div className="bg-card border border-gray-700 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[800px]">
                        <thead>
                        <tr className="bg-gray-800 border-b border-gray-600">
                            <th className="p-3 text-sm font-semibold text-gray-300">Timestamp</th>
                            <th className="p-3 text-sm font-semibold text-gray-300">User</th>
                            <th className="p-3 text-sm font-semibold text-gray-300">Action</th>
                            <th className="p-3 text-sm font-semibold text-gray-300">IP Address</th>
                            <th className="p-3 text-sm font-semibold text-gray-300">Details</th>
                        </tr>
                        </thead>
                        <tbody>
                        {isLoading ? (
                            <tr><td colSpan={5} className="text-center p-8"><Loader2 className="animate-spin mx-auto text-primary" size={32} /></td></tr>
                        ) : logs && logs.content.length > 0 ? (
                            logs.content.map(log => {
                                const style = actionStyles[log.action] || { icon: ShieldQuestion, color: 'bg-gray-500/20 text-gray-400', label: log.action };
                                return (
                                    <tr key={log.id} className="border-b border-gray-700 last:border-b-0 hover:bg-gray-800/50 text-sm">
                                        <td className="p-3 text-gray-400">{format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm:ss')}</td>
                                        <td className="p-3 text-white font-medium">{log.user?.email || 'N/A'}</td>
                                        <td className="p-3">
                                                <span className={`flex items-center gap-2 px-2 py-1 rounded-full text-xs font-semibold ${style.color}`}>
                                                    <style.icon size={14} />
                                                    {style.label}
                                                </span>
                                        </td>
                                        <td className="p-3 text-gray-400 font-mono">{log.ipAddress}</td>
                                        <td className="p-3 text-gray-400">{log.details}</td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr><td colSpan={5} className="text-center p-8 text-gray-500">No audit logs found.</td></tr>
                        )}
                        </tbody>
                    </table>
                </div>
                {logs && logs.totalPages > 1 && (
                    <div className="p-3 bg-gray-800 border-t border-gray-600 flex justify-between items-center text-white">
                        <span className="text-sm text-gray-400">Page {logs.number + 1} of {logs.totalPages}</span>
                        <div className="flex gap-2">
                            <button onClick={() => setPage(p => p - 1)} disabled={page === 0} className="p-2 rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"><ChevronLeft size={20} /></button>
                            <button onClick={() => setPage(p => p + 1)} disabled={page >= logs.totalPages - 1} className="p-2 rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"><ChevronRight size={20} /></button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AuditLogPage;