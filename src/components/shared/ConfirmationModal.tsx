import React from 'react';
import Modal from './Modal';
import { AlertTriangle } from 'lucide-react';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: React.ReactNode; // Permet de passer du JSX pour le message
    confirmText?: string;
    cancelText?: string;
    isLoading?: boolean;
}

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Delete', cancelText = 'Cancel', isLoading = false }: ConfirmationModalProps) => {
    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="">
            <div className="flex flex-col items-center text-center">
                <div className="bg-red-500/20 p-3 rounded-full mb-4">
                    <AlertTriangle className="text-red-500" size={32} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
                <p className="text-gray-400 mb-6">{message}</p>
                <div className="flex justify-center space-x-4 w-full">
                    <button
                        onClick={onClose}
                        className="w-full bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-500 transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isLoading}
                        className="w-full bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-500 disabled:opacity-50 transition-colors"
                    >
                        {isLoading ? 'Deleting...' : confirmText}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default ConfirmationModal;