import React from 'react';
import { Toaster, toast } from 'react-hot-toast';

// Brutalist-styled toast configuration
export const toastConfig = {
    duration: 4000,
    style: {
        background: '#000',
        color: '#fff',
        border: '2px solid #000',
        borderRadius: '0',
        fontFamily: 'Inter, sans-serif',
        fontSize: '14px',
        fontWeight: '600',
        padding: '12px 16px',
        boxShadow: '4px 4px 0px 0px rgba(0,0,0,0.2)',
    },
    success: {
        icon: '✓',
        style: {
            background: '#fff',
            color: '#16a34a',
            border: '2px solid #16a34a',
        },
    },
    error: {
        icon: '✕',
        style: {
            background: '#fff',
            color: '#D94545',
            border: '2px solid #D94545',
        },
        duration: 5000,
    },
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
        <>
            {children}
            <Toaster
                position="bottom-right"
                toastOptions={toastConfig}
                containerStyle={{
                    bottom: 24,
                    right: 24,
                }}
            />
        </>
    );
};

// Export toast for use in components
export { toast };

export default ToastProvider;
