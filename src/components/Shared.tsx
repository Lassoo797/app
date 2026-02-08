import React from 'react';
import { LayoutDashboard, Map as MapIcon, Receipt, Users, Car, Briefcase, MapPin, Settings as SettingsIcon, X, Moon, Sun, Plus, AlertTriangle } from 'lucide-react';

// --- UI Primitives ---

export const Modal = ({ children, onClose, title }: { children?: React.ReactNode, onClose: () => void, title: string }) => {
  // Handle mouse down inside modal to prevent closing when dragging selection out
  const [isMouseDownInside, setIsMouseDownInside] = React.useState(false);

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" 
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setIsMouseDownInside(false);
      }}
      onMouseUp={(e) => {
        // Only close if mouse was NOT down inside the content (meaning simple click on overlay)
        // and if target is overlay
        if (e.target === e.currentTarget && !isMouseDownInside) {
          onClose();
        }
        setIsMouseDownInside(false); // Reset
      }}
    >
      <div 
        className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800 flex flex-col"
        onMouseDown={() => setIsMouseDownInside(true)}
      >
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center sticky top-0 bg-white dark:bg-slate-900 z-10">
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400"><X size={20}/></button>
        </div>
        <div className="p-6 text-slate-900 dark:text-slate-200 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
);
};

export const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message }: { isOpen: boolean, onClose: () => void, onConfirm: () => void, title: string, message: string }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fade-in" onClick={(e) => { if(e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-800 p-6">
        <div className="flex items-center gap-3 text-red-600 dark:text-red-400 mb-4">
          <AlertTriangle size={24} />
          <h3 className="text-lg font-bold">{title}</h3>
        </div>
        <p className="text-slate-600 dark:text-slate-300 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">Zrušiť</button>
          <button onClick={() => { onConfirm(); onClose(); }} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold shadow-lg shadow-red-900/20">Vymazať</button>
        </div>
      </div>
    </div>
  );
};

export const DetailRow = ({ label, value, className = "" }: { label: string, value: React.ReactNode, className?: string }) => (
  <div className={`flex flex-col sm:flex-row sm:justify-between sm:items-start py-2 border-b border-slate-100 dark:border-slate-800 last:border-0 ${className}`}>
    <span className="text-sm text-slate-500 dark:text-slate-400 font-medium shrink-0 mr-4">{label}</span>
    <span className="text-sm font-bold text-slate-800 dark:text-slate-200 text-right mt-1 sm:mt-0 break-words max-w-full">{value || '-'}</span>
  </div>
);

export const Card = ({ title, value, subValue, icon: Icon, colorClass, delay = 0 }: any) => (
  <div className={`bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 animate-fade-in`} style={{animationDelay: `${delay}ms`}}>
    <div className="flex justify-between items-start mb-4">
      <div>
        <p className="text-slate-500 dark:text-slate-400 text-xs uppercase font-bold tracking-wider">{title}</p>
        <h3 className="text-3xl font-extrabold text-slate-800 dark:text-white mt-1">{value}</h3>
      </div>
      <div className={`p-3 ${colorClass} bg-opacity-10 rounded-xl`}>
        <Icon size={24} className={colorClass.replace('bg-', 'text-')} />
      </div>
    </div>
    {subValue && <div className="text-sm text-slate-400 dark:text-slate-500 font-medium">{subValue}</div>}
  </div>
);

export const EntityListLayout = ({ title, onAdd, children, isAdding, addForm }: any) => (
    <div className="max-w-5xl mx-auto animate-fade-in">
        <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-bold text-slate-800 dark:text-white">{title}</h2><button onClick={onAdd} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg shadow-blue-900/20"><Plus size={18}/> Pridať</button></div>
        {isAdding && <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-blue-200 dark:border-blue-900 shadow-xl mb-6">{addForm}</div>}
        <div className="space-y-3">{children}</div>
    </div>
);

// --- Sidebar ---

export const Sidebar = ({ activeTab, setActiveTab, darkMode, toggleDarkMode }: any) => {
  const menuItems = [
    { id: 'dashboard', label: 'Prehľad', icon: LayoutDashboard },
    { id: 'trips', label: 'Pracovné cesty', icon: MapIcon },
    { id: 'settlements', label: 'Vyúčtovania', icon: Receipt },
    { id: 'employees', label: 'Zamestnanci', icon: Users },
    { id: 'vehicles', label: 'Vozidlá', icon: Car },
    { id: 'projects', label: 'Zákazky', icon: Briefcase },
    { id: 'locations', label: 'Adresár', icon: MapPin },
    { id: 'settings', label: 'Nastavenia', icon: SettingsIcon },
  ];

  return (
    <div className="w-64 bg-slate-900 dark:bg-slate-950 text-white flex-shrink-0 flex flex-col h-screen fixed left-0 top-0 z-20 shadow-xl border-r border-slate-800">
      <div className="p-6">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <span className="bg-blue-600 p-1 rounded-lg shadow-blue-500/50 shadow-lg">CP</span>
          Evidencia
        </h1>
        <p className="text-xs text-slate-400 mt-2 font-medium">Cestovné príkazy SK</p>
      </div>
      <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto">
        {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon size={18} />
                {item.label}
              </button>
            );
        })}
      </nav>
      <div className="p-4 border-t border-slate-800">
         <button onClick={toggleDarkMode} className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-lg text-sm font-medium transition-colors">
            {darkMode ? <><Sun size={16}/> Light Mode</> : <><Moon size={16}/> Dark Mode</>}
         </button>
      </div>
    </div>
  );
};

// --- Fullscreen Overlays ---

export const LoadingOverlay = ({ text = 'Načítavam...' }: { text?: string }) => (
    <div className="absolute inset-0 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
            <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-lg font-medium text-slate-600 dark:text-slate-300">{text}</p>
        </div>
    </div>
);

export const ErrorDisplay = ({ message }: { message: string }) => (
    <div className="p-8 text-center bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
        <div className="flex flex-col items-center justify-center text-red-700 dark:text-red-300">
            <AlertTriangle className="w-12 h-12 mb-4" />
            <h3 className="text-xl font-bold mb-2">Chyba</h3>
            <p className="text-sm max-w-md">{message}</p>
        </div>
    </div>
);