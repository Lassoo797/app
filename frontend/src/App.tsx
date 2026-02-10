import React, { useState, useEffect } from 'react';
import { Trip, Vehicle, Settings, Employee, SavedLocation, Project, Settlement, FuelPriceRecord } from './types';
import pb from './services/db';
import { DEFAULT_SETTINGS } from './constants';
import { Sidebar, LoadingOverlay, ErrorDisplay, MobileHeader } from './components/Shared';
import { Dashboard } from './components/Dashboard';
import { TripsView, SettlementsView } from './components/TripManagement';
import { EmployeesView, VehiclesView, ProjectsView, LocationsView, SettingsView, FuelPricesView } from './components/Resources';
import { NotificationProvider, useNotification } from './components/Notifications';

// Wrapper component to use hooks
const AppContent = () => {
    const { notify } = useNotification();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Theme Management
    const [darkMode, setDarkMode] = useState(() => {
        if (typeof window !== 'undefined') {
             const saved = localStorage.getItem('theme');
             if (saved) return saved === 'dark';
             return window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
        return false;
    });

    useEffect(() => {
        const root = window.document.documentElement;
        if (darkMode) {
            root.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            root.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [darkMode]);

    // Data State
    const [trips, setTrips] = useState<Trip[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [locations, setLocations] = useState<SavedLocation[]>([]);
    const [settlements, setSettlements] = useState<Settlement[]>([]);
    const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
    const [fuelPrices, setFuelPrices] = useState<FuelPriceRecord[]>([]);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [
                tripsRes,
                employeesRes,
                vehiclesRes,
                projectsRes,
                locationsRes,
                settlementsRes,
                settingsRes,
                fuelPricesRes,
            ] = await Promise.all([
                pb.collection('trips').getFullList<Trip>({ sort: '-dateStart' }),
                pb.collection('employees').getFullList<Employee>({ sort: 'name' }),
                pb.collection('vehicles').getFullList<Vehicle>({ sort: 'name' }),
                pb.collection('projects').getFullList<Project>({ sort: 'code' }),
                pb.collection('saved_locations').getFullList<SavedLocation>({ sort: 'name' }),
                pb.collection('settlements').getFullList<Settlement>({ sort: '-created' }),
                pb.collection('settings').getFullList<Settings>({}),
                pb.collection('fuel_prices').getFullList<FuelPriceRecord>({ sort: '-validFrom' }),
            ]);

            setTrips(tripsRes);
            setEmployees(employeesRes);
            setVehicles(vehiclesRes);
            setProjects(projectsRes);
            setLocations(locationsRes);
            setSettlements(settlementsRes);
            setFuelPrices(fuelPricesRes);

            if (settingsRes.length > 0) {
                setSettings(settingsRes[0]);
            } else {
                const newSettings = await pb.collection('settings').create<Settings>(DEFAULT_SETTINGS);
                setSettings(newSettings);
            }
        } catch (err: any) {
            setError(`Chyba pri načítaní dát: ${err.message}. Skontrolujte pripojenie k PocketBase a či je URL správne nastavená v .env súbore.`);
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // --- CRUD Handlers ---
    const handleCrud = async (operation: Promise<any>, successMessage = 'Operácia bola úspešná') => {
        setLoading(true);
        try {
            await operation;
            await fetchData(); // Refetch all data
            notify(successMessage, 'success');
        } catch (err: any) {
            notify(`Chyba: ${err.message}`, 'error');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const tripHandlers = {
        add: (data: Partial<Trip>) => handleCrud(pb.collection('trips').create(data), 'Cesta bola uložená'),
        update: (id: string, data: Partial<Trip>) => handleCrud(pb.collection('trips').update(id, data), 'Cesta bola aktualizovaná'),
        delete: (id: string) => handleCrud(pb.collection('trips').delete(id), 'Cesta bola vymazaná'),
    };

    const settlementHandlers = {
        add: (data: Partial<Settlement>) => handleCrud(pb.collection('settlements').create(data), 'Vyúčtovanie vytvorené'),
        update: (id: string, data: Partial<Settlement>) => handleCrud(pb.collection('settlements').update(id, data), 'Vyúčtovanie aktualizované'),
        delete: (id: string) => handleCrud(pb.collection('settlements').delete(id), 'Vyúčtovanie zmazané'),
    };

    const employeeHandlers = {
        add: (data: Partial<Employee>) => handleCrud(pb.collection('employees').create(data), 'Zamestnanec pridaný'),
        update: (id: string, data: Partial<Employee>) => handleCrud(pb.collection('employees').update(id, data), 'Zamestnanec aktualizovaný'),
    };

    const vehicleHandlers = {
        add: (data: Partial<Vehicle>) => handleCrud(pb.collection('vehicles').create(data), 'Vozidlo pridané'),
        update: (id: string, data: Partial<Vehicle>) => handleCrud(pb.collection('vehicles').update(id, data), 'Vozidlo aktualizované'),
    };
    
    const projectHandlers = {
        add: (data: Partial<Project>) => handleCrud(pb.collection('projects').create(data), 'Projekt pridaný'),
        update: (id: string, data: Partial<Project>) => handleCrud(pb.collection('projects').update(id, data), 'Projekt aktualizovaný'),
    };
    
    const locationHandlers = {
        add: (data: Partial<SavedLocation>) => handleCrud(pb.collection('saved_locations').create(data), 'Adresa pridaná'),
        update: (id: string, data: Partial<SavedLocation>) => handleCrud(pb.collection('saved_locations').update(id, data), 'Adresa aktualizovaná'),
        delete: (id: string) => handleCrud(pb.collection('saved_locations').delete(id), 'Adresa zmazaná'),
    };

    const settingsHandlers = {
        update: (id: string, data: Partial<Settings>) => handleCrud(pb.collection('settings').update(id, data), 'Nastavenia uložené'),
    };

    const fuelPriceHandlers = {
        add: (data: Partial<FuelPriceRecord>) => handleCrud(pb.collection('fuel_prices').create(data), 'Záznam o cene pridaný'),
        update: (id: string, data: Partial<FuelPriceRecord>) => handleCrud(pb.collection('fuel_prices').update(id, data), 'Záznam o cene aktualizovaný'),
        delete: (id: string) => handleCrud(pb.collection('fuel_prices').delete(id), 'Záznam o cene vymazaný'),
        refresh: () => fetchData(), // Added refresh method
    };

    const renderContent = () => {
        if (loading && !error) {
            return <LoadingOverlay text="Načítavam dáta..." />;
        }
        if (error) {
            return <ErrorDisplay message={error} />;
        }

        switch (activeTab) {
            case 'dashboard': 
                return <Dashboard trips={trips} settings={settings} vehicles={vehicles} projects={projects} fuelPrices={fuelPrices} />;
            case 'trips': 
                return <TripsView trips={trips} handlers={tripHandlers} employees={employees} vehicles={vehicles} projects={projects} locations={locations} settings={settings} fuelPrices={fuelPrices} />;
            case 'settlements': 
                return <SettlementsView settlements={settlements} settlementHandlers={settlementHandlers} trips={trips} tripHandlers={tripHandlers} employees={employees} vehicles={vehicles} projects={projects} settings={settings} fuelPrices={fuelPrices} />;
            case 'employees': 
                return <EmployeesView employees={employees} handlers={employeeHandlers} trips={trips} settings={settings} vehicles={vehicles} fuelPrices={fuelPrices} />;
            case 'vehicles': 
                return <VehiclesView vehicles={vehicles} handlers={vehicleHandlers} trips={trips} settings={settings} fuelPrices={fuelPrices} />;
            case 'projects': 
                return <ProjectsView projects={projects} handlers={projectHandlers} trips={trips} settings={settings} vehicles={vehicles} fuelPrices={fuelPrices} />;
            case 'locations': 
                return <LocationsView locations={locations} handlers={locationHandlers} />;
            case 'settings': 
                return (
                    <div className="space-y-12">
                        <SettingsView settings={settings} onSave={(data) => settings.id && settingsHandlers.update(settings.id, data)} />
                        <FuelPricesView fuelPrices={fuelPrices} handlers={fuelPriceHandlers} />
                    </div>
                );
            default: 
                return <Dashboard trips={trips} settings={settings} vehicles={vehicles} projects={projects} fuelPrices={fuelPrices} />;
        }
    };

    const getActiveTitle = () => {
         switch (activeTab) {
            case 'dashboard': return 'Prehľad';
            case 'trips': return 'Pracovné cesty';
            case 'settlements': return 'Vyúčtovania';
            case 'employees': return 'Zamestnanci';
            case 'vehicles': return 'Vozidlá';
            case 'projects': return 'Zákazky';
            case 'locations': return 'Adresár';
            case 'settings': return 'Nastavenia';
            default: return 'Cestovné príkazy';
         }
    };

    return (
        <div className={'min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-200 flex flex-col lg:flex-row'}>
            <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} darkMode={darkMode} toggleDarkMode={() => setDarkMode(!darkMode)} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                <MobileHeader onOpenSidebar={() => setSidebarOpen(true)} title={getActiveTitle()} />
                
                <main className="flex-1 p-4 md:p-8 overflow-y-auto">
                    {renderContent()}
                </main>
            </div>
        </div>
    );
};

const App = () => {
    return (
        <NotificationProvider>
            <AppContent />
        </NotificationProvider>
    );
};

export default App;