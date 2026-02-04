import React from 'react';

export const Button = ({ children, onClick, type = 'button', className = '', variant = 'primary', ...props }) => {
    const baseStyles = "relative px-6 py-3 font-semibold rounded-xl text-white transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed focus:ring-4 focus:outline-none overflow-hidden group";

    const variants = {
        primary: "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-500/25 border border-transparent",
        secondary: "bg-slate-700 hover:bg-slate-600 border border-slate-600 shadow-lg",
        danger: "bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 shadow-lg shadow-red-500/25 border border-transparent",
        ghost: "bg-transparent hover:bg-white/5 border border-transparent text-slate-300 hover:text-white"
    };

    const variantClasses = variants[variant] || variants.primary;

    return (
        <button
            type={type}
            onClick={onClick}
            className={`${baseStyles} ${variantClasses} ${className}`}
            {...props}
        >
            <span className="relative z-10 flex items-center justify-center gap-2">{children}</span>
            {/* Glossy sheen effect */}
            <div className="absolute inset-0 h-full w-full scale-0 rounded-xl transition-all duration-300 group-hover:scale-100 group-hover:bg-white/10" />
        </button>
    );
};

export const Input = ({ label, type = 'text', value, onChange, className = '', ...props }) => (
    <div className={`mb-6 group ${className}`}>
        {label && (
            <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2 transition-colors group-focus-within:text-blue-400 ml-1">
                {label}
            </label>
        )}
        <div className="relative">
            <input
                type={type}
                value={value}
                onChange={onChange}
                className="w-full px-5 py-3.5 bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:bg-slate-900/80 transition-all duration-300 shadow-inner"
                {...props}
            />
            {/* Glow line at bottom */}
            <div className="absolute bottom-0 left-0 h-0.5 w-0 bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300 group-focus-within:w-full rounded-b-xl" />
        </div>
    </div>
);

export const Card = ({ children, title, subtitle, className = '' }) => (
    <div className={`glass rounded-2xl p-8 transform transition-all duration-500 hover:shadow-2xl hover:border-slate-600/50 ${className}`}>
        {title && (
            <div className="mb-8 text-center">
                <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">{title}</h2>
                {subtitle && <p className="text-slate-400 text-sm">{subtitle}</p>}
                <div className="h-1 w-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mx-auto mt-4" />
            </div>
        )}
        {children}
    </div>
);
