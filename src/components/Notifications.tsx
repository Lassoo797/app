import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';

type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface Notification {
    id: string;
    type: NotificationType;
    message: string;
}

interface NotificationContextType {
    notify: (message: string, type?: NotificationType) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);

    const notify = useCallback((message: string, type: NotificationType = 'info') => {
        const id = Math.random().toString(36).substring(2, 9);
        setNotifications((prev) => [...prev, { id, type, message }]);

        // Auto remove after 5 seconds
        setTimeout(() => {
            setNotifications((prev) => prev.filter((n) => n.id !== id));
        }, 5000);
    }, []);

    const removeNotification = (id: string) => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
    };

    return (
        <NotificationContext.Provider value={{ notify }}>
            {children}
            
            {/* Notification Container */}
            <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full">
                {notifications.map((n) => (
                    <div 
                        key={n.id} 
                        className={`
                            pointer-events-auto flex items-start gap-3 p-4 rounded-lg shadow-lg border transition-all animate-fade-in-down
                            ${n.type === 'success' ? 'bg-white dark:bg-slate-900 border-l-4 border-l-green-500 dark:border-slate-800' : ''}
                            ${n.type === 'error' ? 'bg-white dark:bg-slate-900 border-l-4 border-l-red-500 dark:border-slate-800' : ''}
                            ${n.type === 'warning' ? 'bg-white dark:bg-slate-900 border-l-4 border-l-yellow-500 dark:border-slate-800' : ''}
                            ${n.type === 'info' ? 'bg-white dark:bg-slate-900 border-l-4 border-l-blue-500 dark:border-slate-800' : ''}
                        `}
                    >
                        <div className="flex-shrink-0 mt-0.5">
                            {n.type === 'success' && <CheckCircle size={20} className="text-green-500" />}
                            {n.type === 'error' && <AlertCircle size={20} className="text-red-500" />}
                            {n.type === 'warning' && <AlertTriangle size={20} className="text-yellow-500" />}
                            {n.type === 'info' && <Info size={20} className="text-blue-500" />}
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-medium text-slate-800 dark:text-white">{n.message}</p>
                        </div>
                        <button onClick={() => removeNotification(n.id)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                            <X size={16} />
                        </button>
                    </div>
                ))}
            </div>
        </NotificationContext.Provider>
    );
};