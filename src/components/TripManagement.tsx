import React, { useState } from 'react';
import { Trip, Vehicle, Project, Settings, Employee, SavedLocation, Settlement, Waypoint, TripExpense, FuelPriceRecord } from '../types';
import { calculateTripCosts, formatCurrency, formatDate, formatRoute } from '../utils/calculations';
import { generateTripPDF, generateSummaryPDF } from '../services/pdfService';
import { Modal, DetailRow, ConfirmModal } from './Shared';
import { Plus, Trash2, FileText, Lock, Eye, Pencil, CheckCircle, Gauge, AlertTriangle, ExternalLink, MapPin, X, Receipt, ParkingSquare, Bed, Coins } from 'lucide-react';

import { useNotification } from './Notifications';

// Helper to format Date or ISO string to datetime-local input value (YYYY-MM-DDTHH:mm)
const toLocalInputFormat = (dateInput?: string | Date) => {
    if (!dateInput) return '';
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return '';
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().slice(0, 16);
};

interface TripsViewProps {
    trips: Trip[];
    handlers: {
        add: (data: Partial<Trip>) => Promise<void>;
        update: (id: string, data: Partial<Trip>) => Promise<void>;
        delete: (id: string) => Promise<void>;
    };
    employees: Employee[];
    vehicles: Vehicle[];
    projects: Project[];
    locations: SavedLocation[];
    settings: Settings;
    fuelPrices: FuelPriceRecord[];
}

interface SettlementsViewProps {
    settlements: Settlement[];
    settlementHandlers: {
        add: (data: Partial<Settlement>) => Promise<void>;
        update: (id: string, data: Partial<Settlement>) => Promise<void>;
        delete: (id: string) => Promise<void>;
    };
    trips: Trip[];
    tripHandlers: {
        update: (id: string, data: Partial<Trip>) => Promise<void>;
    };
    employees: Employee[];
    vehicles: Vehicle[];
    projects: Project[];
    settings: Settings;
    fuelPrices: FuelPriceRecord[];
}

// --- TRIP FORM COMPONENT (Extracted for stability) ---

const TripForm = ({ 
    trip, 
    onChange, 
    allTrips, 
    employees, 
    vehicles, 
    projects, 
    locations, 
    onSave, 
    onCancel,
    fuelPrices
}: { 
    trip: Partial<Trip>, 
    onChange: (t: Partial<Trip>) => void,
    allTrips: Trip[], 
    employees: Employee[],
    vehicles: Vehicle[],
    projects: Project[],
    locations: SavedLocation[],
    onSave: () => void,
    onCancel: () => void,
    fuelPrices: FuelPriceRecord[]
}) => {
    const { notify } = useNotification();
    const [priceWarning, setPriceWarning] = useState<string | null>(null);

    // Check if fuel price exists for the selected date and vehicle fuel type
    React.useEffect(() => {
        if (trip.dateStart && trip.vehicleId) {
            const vehicle = vehicles.find(v => v.id === trip.vehicleId);
            if (vehicle) {
                const tripDate = new Date(trip.dateStart);
                const matchingPriceRecord = fuelPrices.find(p => {
                    const from = new Date(p.validFrom);
                    const to = new Date(p.validTo);
                    return tripDate.getTime() >= from.getTime() && tripDate.getTime() <= to.getTime();
                });

                if (!matchingPriceRecord) {
                    setPriceWarning(`Pre dátum ${tripDate.toLocaleDateString('sk-SK')} neexistuje záznam o cene paliva!`);
                } else {
                    let price = 0;
                    switch (vehicle.fuelType) {
                        case 'diesel': price = matchingPriceRecord.priceDiesel; break;
                        case 'benzin': price = matchingPriceRecord.priceBenzin; break;
                        case 'lpg': price = matchingPriceRecord.priceLpg; break;
                        case 'electric': price = matchingPriceRecord.priceElectric; break;
                    }
                    if (!price) {
                         setPriceWarning(`Pre dátum ${tripDate.toLocaleDateString('sk-SK')} je cena paliva (${vehicle.fuelType}) nulová alebo neznáma!`);
                    } else {
                        setPriceWarning(null);
                    }
                }
            }
        } else {
            setPriceWarning(null);
        }
    }, [trip.dateStart, trip.vehicleId, vehicles, fuelPrices]);

    // Helper to find last odometer reading based on time context
    const getSuggestStartOdometer = (vehicleId: string, dateStartStr: string): number => {
        if (!vehicleId || !dateStartStr) return 0;
        const compareDate = new Date(dateStartStr).getTime();
        
        // Find trips that ended BEFORE the new trip starts
        const relevantTrips = allTrips.filter(t => 
            t.vehicleId === vehicleId && 
            t.id !== trip.id && 
            new Date(t.dateEnd).getTime() <= compareDate
        );

        if (relevantTrips.length === 0) return 0;
        
        // Sort by dateEnd descending (closest past trip)
        relevantTrips.sort((a, b) => new Date(b.dateEnd).getTime() - new Date(a.dateEnd).getTime());
        return relevantTrips[0].odometerEnd || 0;
    };

    // Helper for inputs
    const handleFieldChange = (field: keyof Trip, value: any) => {
        const updates: Partial<Trip> = { [field]: value };
        
        // Logic for automatic odometer updates
        if (field === 'vehicleId' || field === 'dateStart') {
            const vId = field === 'vehicleId' ? value : trip.vehicleId;
            const dStart = field === 'dateStart' ? value : trip.dateStart;
            
            if (vId && dStart) {
                const suggestedStart = getSuggestStartOdometer(vId, dStart);
                updates.odometerStart = suggestedStart;
                
                // If we have distance, shift the end odometer
                const currentDist = parseFloat(trip.distanceKm as any) || 0;
                if (currentDist > 0) {
                    updates.odometerEnd = suggestedStart + currentDist;
                } else {
                    // If no distance yet, just reset end to start (0 distance)
                    updates.odometerEnd = suggestedStart;
                }
            }
        }

        // Logic for auto-setting dateEnd to match dateStart day (if dateEnd is empty or just initialized)
        if (field === 'dateStart' && value) {
            const startDate = new Date(value);
            // Default behavior: Set end date to same day, maybe 1 hour later or same time if just day change desired?
            // User requested: "nastavim ... počiatoćný dátum, tak sa mi zvolí ten istý den automaticky aj ako koncový dátum"
            // Let's assume we preserve the time if dateEnd already has one, or default to start time + 1h if completely empty?
            // Simplest interpretation: Copy the full date-time to start with, or at least the date part.
            // Since input is datetime-local, we need full ISO-like string.
            
            // Current approach: Set dateEnd to the same value as dateStart if dateEnd is empty or user is setting start for the first time.
            // Better UX: If dateEnd is set, check if it's before new Start. If so, update it. 
            // Or strictly follow request: "zvolí ten istý den".
            
            // Let's try: If I pick "2024-03-10T08:00", auto-set End to "2024-03-10T08:00" (or current end time on that day).
            
            // If dateEnd is missing, just copy dateStart.
            if (!trip.dateEnd) {
                updates.dateEnd = value;
            } else {
                // If dateEnd exists, update its DATE part to match new Start DATE part, preserving Time.
                // But wait, if Start > End, we must update End regardless.
                // Let's just set End = Start for simplicity as a base, user can adjust time.
                // Or better: update only the YYYY-MM-DD part of dateEnd.
                
                const currentEnd = new Date(trip.dateEnd);
                if (!isNaN(currentEnd.getTime())) {
                    const newStart = new Date(value);
                    currentEnd.setFullYear(newStart.getFullYear(), newStart.getMonth(), newStart.getDate());
                    
                    // If result end is before start (time-wise), maybe just set equals to start?
                    if (currentEnd < newStart) {
                         updates.dateEnd = value;
                    } else {
                         // Convert back to local iso string for input
                         updates.dateEnd = toLocalInputFormat(currentEnd);
                    }
                } else {
                    updates.dateEnd = value;
                }
            }
        }

        onChange({ ...trip, ...updates });
    };

    const handleOdometerChange = (field: 'start' | 'end', val: string) => {
        const numVal = parseFloat(val);
        const updates: Partial<Trip> = { 
            [field === 'start' ? 'odometerStart' : 'odometerEnd']: val as any 
        };

        if (isNaN(numVal)) {
            onChange({ ...trip, ...updates });
            return;
        }

        if (field === 'start') {
            // Changed Start -> Update End based on Distance (Keep Distance constant if possible, or reset?)
            // Usually if I change start, I want to recalculate End if distance is set.
            const dist = parseFloat(trip.distanceKm as any);
            if (!isNaN(dist)) {
                updates.odometerEnd = numVal + dist;
            }
        } else {
            // Changed End -> Calculate Distance
            const start = parseFloat(trip.odometerStart as any);
            if (!isNaN(start)) {
                updates.distanceKm = Math.max(0, numVal - start); // Prevent negative
            }
        }
        onChange({ ...trip, ...updates });
    };
    
    const handleDistanceChange = (val: string) => {
        // Store raw string
        onChange({ ...trip, distanceKm: val as any });
        
        const dist = parseFloat(val);
        const updates: Partial<Trip> = { distanceKm: val as any };
        
        if (!isNaN(dist)) {
            const start = parseFloat(trip.odometerStart as any);
            if (!isNaN(start)) {
                updates.odometerEnd = start + dist;
            }
        }
        onChange({ ...trip, ...updates });
    };

    const addWaypoint = () => {
        const wp = [...(trip.waypoints || [])];
        wp.push({ location: '', country: 'Slovensko' });
        onChange({ ...trip, waypoints: wp });
    };

    const removeWaypoint = (index: number) => {
        const wp = [...(trip.waypoints || [])];
        wp.splice(index, 1);
        onChange({ ...trip, waypoints: wp });
    };

    const updateWaypoint = (index: number, field: keyof Waypoint, value: string) => {
        const wp = [...(trip.waypoints || [])];
        wp[index] = { ...wp[index], [field]: value };
        onChange({ ...trip, waypoints: wp });
    };

    // --- EXPENSES LOGIC ---
    const addExpense = () => {
        const ex = [...(trip.expenses || [])];
        ex.push({ id: crypto.randomUUID(), type: 'parking', amount: 0, note: '' });
        onChange({ ...trip, expenses: ex });
    };

    const removeExpense = (index: number) => {
        const ex = [...(trip.expenses || [])];
        ex.splice(index, 1);
        onChange({ ...trip, expenses: ex });
    };

    const updateExpense = (index: number, field: keyof TripExpense, value: any) => {
        const ex = [...(trip.expenses || [])];
        ex[index] = { ...ex[index], [field]: value };
        onChange({ ...trip, expenses: ex });
    };

    const openGoogleMaps = () => {
        if(!trip.origin || !trip.destination) {
          notify("Zadajte aspoň štart a cieľ.", "warning");
          return;
        }
        let url = `https://www.google.com/maps/dir/${encodeURIComponent(trip.origin || '')}`;
        if (trip.waypoints) {
          trip.waypoints.forEach(wp => {
            if(wp.location) url += `/${encodeURIComponent(wp.location)}`;
          });
        }
        url += `/${encodeURIComponent(trip.destination || '')}`;
        window.open(url, '_blank');
    };

    return (
        <>
            <datalist id="locs">
                {locations.map((l) => <option key={l.id} value={l.address}>{l.name}</option>)}
            </datalist>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Zamestnanec <span className="text-red-500">*</span></label>
                            <select className="w-full border dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 rounded dark:text-white" value={trip.employeeId || ''} onChange={e => handleFieldChange('employeeId', e.target.value)} required>
                                <option value="">Vyberte...</option>
                                {employees.filter((e) => e.isActive || e.id === trip.employeeId).map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                            </select>
                        </div>
                            <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Vozidlo <span className="text-red-500">*</span></label>
                            <select className="w-full border dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 rounded dark:text-white" value={trip.vehicleId || ''} onChange={e => handleFieldChange('vehicleId', e.target.value)} required>
                                <option value="">Vyberte...</option>
                                {vehicles.filter((v) => v.isActive || v.id === trip.vehicleId).map((v) => <option key={v.id} value={v.id}>{v.name} ({v.spz})</option>)}
                            </select>
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Zákazka (Projekt)</label>
                        <select className="w-full border dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 rounded dark:text-white" value={trip.projectId || ''} onChange={e => handleFieldChange('projectId', e.target.value)}>
                            <option value="">(Žiadna)</option>
                            {projects.filter((p)=>p.isActive || p.id === trip.projectId).map((p) => <option key={p.id} value={p.id}>{p.code} - {p.name}</option>)}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Odchod <span className="text-red-500">*</span></label>
                            <input type="datetime-local" className="w-full border dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 rounded dark:text-white" value={trip.dateStart || ''} onChange={e => handleFieldChange('dateStart', e.target.value)} required />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Príchod <span className="text-red-500">*</span></label>
                            <input type="datetime-local" className="w-full border dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 rounded dark:text-white" value={trip.dateEnd || ''} onChange={e => handleFieldChange('dateEnd', e.target.value)} required />
                        </div>
                    </div>
                        {priceWarning && (
                             <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 p-3 rounded-lg text-sm flex items-start gap-2">
                                <AlertTriangle size={16} className="mt-0.5 shrink-0"/>
                                <span>{priceWarning} <br/><span className="text-xs opacity-75">Prosím pridajte ceny paliva v nastaveniach pre tento dátum.</span></span>
                             </div>
                        )}
                        <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border dark:border-slate-800 space-y-3">
                        <label className="block text-xs font-bold text-slate-500 uppercase">Miesto štartu <span className="text-red-500">*</span></label>
                        <div className="flex gap-1">
                            <input list="locs" className="flex-1 border dark:border-slate-700 p-2 rounded dark:bg-slate-800 dark:text-white" value={trip.origin || ''} onChange={e => handleFieldChange('origin', e.target.value)} placeholder="Mesto/Adresa" required />
                            <input className="w-24 border dark:border-slate-700 p-2 rounded dark:bg-slate-800 dark:text-white" value={trip.originCountry || 'Slovensko'} onChange={e => handleFieldChange('originCountry', e.target.value)} placeholder="Štát" required />
                        </div>

                        {/* --- WAYPOINTS SECTION --- */}
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="block text-xs font-bold text-slate-500 uppercase">Zastávky (Prejazdové body)</label>
                                <button onClick={addWaypoint} className="text-xs flex items-center gap-1 text-blue-600 font-bold hover:underline"><Plus size={12}/> Pridať</button>
                            </div>
                            <div className="space-y-2">
                                {trip.waypoints?.map((wp, idx) => (
                                    <div key={idx} className="flex gap-1 items-center">
                                        <div className="bg-slate-200 dark:bg-slate-700 text-xs font-bold text-slate-500 w-6 h-9 flex items-center justify-center rounded">{idx+1}</div>
                                        <input list="locs" className="flex-1 border dark:border-slate-700 p-2 rounded dark:bg-slate-800 dark:text-white text-sm" value={wp.location} onChange={e => updateWaypoint(idx, 'location', e.target.value)} placeholder="Mesto/Zastávka" />
                                        <input className="w-24 border dark:border-slate-700 p-2 rounded dark:bg-slate-800 dark:text-white text-sm" value={wp.country} onChange={e => updateWaypoint(idx, 'country', e.target.value)} placeholder="Štát" />
                                        <button onClick={() => removeWaypoint(idx)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"><X size={16}/></button>
                                    </div>
                                ))}
                                {(!trip.waypoints || trip.waypoints.length === 0) && <p className="text-xs text-slate-400 italic">Žiadne zastávky.</p>}
                            </div>
                        </div>

                        <label className="block text-xs font-bold text-slate-500 uppercase border-t dark:border-slate-700 pt-2 mt-1">Cieľ cesty <span className="text-red-500">*</span></label>
                        <div className="flex gap-1">
                            <input list="locs" className="flex-1 border dark:border-slate-700 p-2 rounded dark:bg-slate-800 dark:text-white" value={trip.destination || ''} onChange={e => handleFieldChange('destination', e.target.value)} placeholder="Mesto/Adresa" required />
                            <input className="w-24 border dark:border-slate-700 p-2 rounded dark:bg-slate-800 dark:text-white" value={trip.destinationCountry || 'Slovensko'} onChange={e => handleFieldChange('destinationCountry', e.target.value)} placeholder="Štát" required />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Vzdialenosť (km) <span className="text-red-500">*</span></label>
                            <div className="flex items-center gap-2">
                                <input type="number" step="0.1" className="flex-1 border dark:border-slate-700 p-2 rounded dark:bg-slate-800 dark:text-white font-bold" value={trip.distanceKm ?? ''} onChange={e => handleDistanceChange(e.target.value)} required />
                                <button type="button" onClick={openGoogleMaps} className="p-2 bg-blue-50 text-blue-600 rounded"><ExternalLink size={18}/></button>
                            </div>
                        </div>
                        </div>
                </div>
                <div className="space-y-4">
                        <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Účel cesty <span className="text-red-500">*</span></label>
                        <textarea rows={3} className="w-full border dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 rounded dark:text-white" value={trip.purpose || ''} onChange={e => handleFieldChange('purpose', e.target.value)} required />
                    </div>
                    
                    {/* --- EXPENSES SECTION --- */}
                    <div className="border rounded-xl p-4 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><Receipt size={12}/> Iné náklady</h4>
                            <button onClick={addExpense} className="text-xs flex items-center gap-1 text-blue-600 font-bold hover:underline"><Plus size={12}/> Pridať náklad</button>
                        </div>
                        <div className="space-y-2">
                            {trip.expenses?.map((ex, idx) => (
                                <div key={ex.id || idx} className="grid grid-cols-12 gap-2 items-center bg-slate-50 dark:bg-slate-800/50 p-2 rounded">
                                    <div className="col-span-4">
                                        <select className="w-full text-xs border dark:border-slate-700 rounded p-1 dark:bg-slate-800 dark:text-white" value={ex.type} onChange={e => updateExpense(idx, 'type', e.target.value)}>
                                            <option value="parking">Parkovné</option>
                                            <option value="accommodation">Ubytovanie</option>
                                            <option value="toll">Mýto</option>
                                            <option value="other">Iné</option>
                                        </select>
                                    </div>
                                    <div className="col-span-3 relative">
                                        <input type="number" step="0.01" className="w-full text-xs border dark:border-slate-700 rounded p-1 dark:bg-slate-800 dark:text-white pr-4 text-right" placeholder="0.00" value={ex.amount} onChange={e => updateExpense(idx, 'amount', e.target.value as any)} />
                                        <span className="absolute right-1 top-1 text-[10px] text-slate-400">€</span>
                                    </div>
                                    <div className="col-span-4">
                                        <input className="w-full text-xs border dark:border-slate-700 rounded p-1 dark:bg-slate-800 dark:text-white" placeholder="Poznámka" value={ex.note || ''} onChange={e => updateExpense(idx, 'note', e.target.value)} />
                                    </div>
                                    <div className="col-span-1 flex justify-end">
                                        <button onClick={() => removeExpense(idx)} className="text-red-400 hover:text-red-600"><X size={14}/></button>
                                    </div>
                                </div>
                            ))}
                            {(!trip.expenses || trip.expenses.length === 0) && <p className="text-xs text-slate-400 italic text-center py-2">Žiadne ďalšie náklady.</p>}
                        </div>
                    </div>

                    <div>
                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1"><Gauge size={12}/> Tachometer (Voliteľné)</h4>
                        <div className="flex gap-2">
                            <input type="number" className="w-1/2 border dark:border-slate-700 p-2 rounded dark:bg-slate-800 dark:text-white text-sm" placeholder="Štart KM" value={trip.odometerStart ?? ''} onChange={e=>handleOdometerChange('start', e.target.value)} />
                            <input type="number" className="w-1/2 border dark:border-slate-700 p-2 rounded dark:bg-slate-800 dark:text-white text-sm" placeholder="Koniec KM" value={trip.odometerEnd ?? ''} onChange={e=>handleOdometerChange('end', e.target.value)} />
                        </div>
                    </div>
                </div>
            </div>
            <div className="mt-6 pt-4 border-t dark:border-slate-800 flex justify-end gap-3">
                <button onClick={onCancel} className="px-4 py-2 text-slate-500">Zrušiť</button>
                <button onClick={onSave} className="bg-blue-600 text-white px-6 py-2 rounded font-bold shadow-lg shadow-blue-900/20">Uložiť cestu</button>
            </div>
        </>
    );
};

// --- TRIPS VIEW ---

export const TripsView: React.FC<TripsViewProps> = ({ trips, handlers, employees, vehicles, projects, locations, settings, fuelPrices }) => {
    const { notify } = useNotification();
    const [isEditing, setIsEditing] = useState(false);
    const [viewingTrip, setViewingTrip] = useState<Trip | null>(null);
    const [currentTrip, setCurrentTrip] = useState<Partial<Trip>>({});
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const handleEdit = (tripToEdit?: Trip) => {
        if (tripToEdit) {
            setCurrentTrip({ 
                ...tripToEdit, 
                dateStart: toLocalInputFormat(tripToEdit.dateStart),
                dateEnd: toLocalInputFormat(tripToEdit.dateEnd),
                waypoints: tripToEdit.waypoints || [], 
                expenses: tripToEdit.expenses || [] 
            });
        } else {
             const now = new Date();
             const end = new Date(now.getTime() + 3600000); 
             
             // Find default vehicle and its last odometer reading
             const defaultVehicle = vehicles.find((v)=>v.isActive);
             let startOdo = 0;
             if (defaultVehicle) {
                const vehicleTrips = trips.filter(t => t.vehicleId === defaultVehicle.id);
                if (vehicleTrips.length > 0) {
                    vehicleTrips.sort((a, b) => new Date(b.dateEnd).getTime() - new Date(a.dateEnd).getTime());
                    startOdo = vehicleTrips[0].odometerEnd || 0;
                }
             }

            setCurrentTrip({
                dateStart: toLocalInputFormat(now),
                dateEnd: toLocalInputFormat(end),
                origin: '', originCountry: 'Slovensko',
                destination: '', destinationCountry: 'Slovensko',
                distanceKm: 0, 
                odometerStart: startOdo,
                odometerEnd: startOdo, // Default to no movement
                purpose: '', isSettled: false,
                waypoints: [],
                expenses: [],
                employeeId: employees.find((e)=>e.isActive)?.id || '',
                vehicleId: defaultVehicle?.id || ''
            });
        }
        setIsEditing(true);
    };

    const confirmDelete = async () => {
        if(deleteId) {
            await handlers.delete(deleteId);
            setDeleteId(null);
        }
    };

    const handleDeleteClick = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setDeleteId(id);
    };

    const saveTrip = async () => {
        if (!currentTrip.employeeId || !currentTrip.vehicleId || !currentTrip.dateStart || !currentTrip.dateEnd || !currentTrip.origin || !currentTrip.destination || !currentTrip.purpose) {
            notify("Vyplňte všetky povinné polia (Osoba, Vozidlo, Dátumy, Trasa, Účel).", "error");
            return;
        }

        // Clean up numbers from strings before saving
        const finalTrip: any = { ...currentTrip };
        finalTrip.distanceKm = parseFloat(finalTrip.distanceKm) || 0;
        finalTrip.odometerStart = finalTrip.odometerStart ? parseFloat(finalTrip.odometerStart) : 0;
        finalTrip.odometerEnd = finalTrip.odometerEnd ? parseFloat(finalTrip.odometerEnd) : 0;
        
        // --- VALIDATION LOGIC ---
        const startTime = new Date(finalTrip.dateStart).getTime();
        const endTime = new Date(finalTrip.dateEnd).getTime();

        if (startTime >= endTime) {
            notify("Dátum príchodu musí byť neskôr ako dátum odchodu.", "error");
            return;
        }

        if (finalTrip.odometerEnd < finalTrip.odometerStart) {
            notify("Konečný stav tachometra nemôže byť menší ako počiatočný.", "error");
            return;
        }

        // Check for overlaps with other trips for the same vehicle
        const vehicleTrips = trips.filter(t => t.vehicleId === finalTrip.vehicleId && t.id !== finalTrip.id);
        
        for (const existing of vehicleTrips) {
            const exStart = new Date(existing.dateStart).getTime();
            const exEnd = new Date(existing.dateEnd).getTime();
            const exOdoStart = existing.odometerStart || 0;
            const exOdoEnd = existing.odometerEnd || 0;

            // 1. Time Overlap Check
            if (Math.max(startTime, exStart) < Math.min(endTime, exEnd)) {
                notify(`Časová kolízia! V tomto čase už existuje iná cesta pre toto vozidlo (${formatDate(existing.dateStart)}).`, "error");
                return;
            }

            // 2. Odometer Consistency Check (Timeline logic)
            // If new trip is strictly AFTER existing trip
            if (startTime >= exEnd) {
                // New trip start Odo cannot be less than existing trip end Odo
                if (finalTrip.odometerStart < exOdoEnd) {
                    notify(`Chyba tachometra: Cesta začína po ceste z ${formatDate(existing.dateEnd)} (Stav: ${exOdoEnd} km), ale zadávate počiatočný stav ${finalTrip.odometerStart} km. Tachometer sa nemôže točiť dozadu.`, "error");
                    return;
                }
            }

            // If new trip is strictly BEFORE existing trip
            if (endTime <= exStart) {
                // New trip end Odo cannot be more than existing trip start Odo
                if (finalTrip.odometerEnd > exOdoStart) {
                    notify(`Chyba tachometra: Cesta končí pred cestou z ${formatDate(existing.dateStart)} (Stav: ${exOdoStart} km), ale zadávate konečný stav ${finalTrip.odometerEnd} km. Vznikol by prekryv kilometrov.`, "error");
                    return;
                }
            }
        }

        // Convert dates back to UTC ISO for backend
        if (finalTrip.dateStart) finalTrip.dateStart = new Date(finalTrip.dateStart).toISOString();
        if (finalTrip.dateEnd) finalTrip.dateEnd = new Date(finalTrip.dateEnd).toISOString();

        if(finalTrip.expenses) {
            finalTrip.expenses = finalTrip.expenses.map((ex: any) => ({
                ...ex,
                amount: parseFloat(ex.amount) || 0
            }));
        }

        if (finalTrip.id) {
            await handlers.update(finalTrip.id, finalTrip);
        } else {
            await handlers.add(finalTrip);
        }
        setIsEditing(false);
    };
    
    const renderTripDetail = () => {
        if(!viewingTrip) return null;
        const v = vehicles.find((x) => x.id === viewingTrip.vehicleId);
        const e = employees.find((x) => x.id === viewingTrip.employeeId);
        const p = projects.find((x) => x.id === viewingTrip.projectId);
        const calc = calculateTripCosts(viewingTrip, v, settings, fuelPrices);
        
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-start border-b dark:border-slate-800 pb-4">
                    <div>
                        <h4 className="text-xl font-bold text-slate-800 dark:text-white">Detail cesty</h4>
                        <span className="text-xs text-slate-500 font-mono">{viewingTrip.id}</span>
                    </div>
                    {viewingTrip.isSettled ? (
                         <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs px-2 py-1 rounded font-bold border border-green-200 dark:border-green-800 flex items-center gap-1"><Lock size={12}/> VYÚČTOVANÉ</span>
                    ) : (
                         <span className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs px-2 py-1 rounded font-bold border border-orange-200 dark:border-orange-800">OTVORENÉ</span>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                    <DetailRow label="Zamestnanec" value={e?.name || 'Neznámy'} />
                    <DetailRow label="Vozidlo" value={`${v?.name || '?'} (${v?.spz || '?'})`} />
                    <DetailRow label="Projekt" value={p ? `${p.code} - ${p.name}` : '-'} />
                    <DetailRow label="Účel" value={viewingTrip.purpose} />
                </div>

                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                    <h5 className="font-bold mb-3 text-sm uppercase text-slate-500">Čas a Trasa</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 mb-4">
                         <DetailRow label="Začiatok" value={formatDate(viewingTrip.dateStart)} />
                         <DetailRow label="Koniec" value={formatDate(viewingTrip.dateEnd)} />
                         <DetailRow label="Trvanie" value={`${calc.durationHours.toFixed(2)} hod.`} />
                         <DetailRow label="Vzdialenosť" value={`${viewingTrip.distanceKm} km`} />
                    </div>
                    <div className="text-sm font-medium border-t border-slate-200 dark:border-slate-700 pt-3">
                        <div className="flex items-center gap-2 mb-1 text-slate-500"><MapPin size={14}/> Trasa:</div>
                        {formatRoute(viewingTrip)}
                    </div>
                </div>

                <div>
                    <h5 className="font-bold mb-3 text-sm uppercase text-slate-500">Kalkulácia nákladov</h5>
                    <div className="border rounded-lg overflow-hidden dark:border-slate-700">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                <tr>
                                    <th className="p-3 text-left">Položka</th>
                                    <th className="p-3 text-right">Suma</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y dark:divide-slate-700">
                                <tr>
                                    <td className="p-3">Stravné (Diéty)</td>
                                    <td className="p-3 text-right font-mono">{formatCurrency(calc.mealAllowance)}</td>
                                </tr>
                                <tr>
                                    <td className="p-3">Spotreba PHM</td>
                                    <td className="p-3 text-right font-mono">{formatCurrency(calc.fuelCost)}</td>
                                </tr>
                                <tr>
                                    <td className="p-3">Amortizácia</td>
                                    <td className="p-3 text-right font-mono">{formatCurrency(calc.amortizationCost)}</td>
                                </tr>
                                {/* EXPENSES DETAILS */}
                                {viewingTrip.expenses?.map((ex, i) => (
                                    <tr key={i}>
                                        <td className="p-3 flex items-center gap-2">
                                            {ex.type === 'parking' && <ParkingSquare size={14} className="text-slate-400"/>}
                                            {ex.type === 'accommodation' && <Bed size={14} className="text-slate-400"/>}
                                            {ex.type === 'toll' && <Coins size={14} className="text-slate-400"/>}
                                            {ex.type === 'other' && <Receipt size={14} className="text-slate-400"/>}
                                            <span>
                                                {ex.type === 'parking' ? 'Parkovné' : ex.type === 'accommodation' ? 'Ubytovanie' : ex.type === 'toll' ? 'Mýto' : 'Iné'} 
                                                {ex.note && <span className="text-slate-400 text-xs ml-1">({ex.note})</span>}
                                            </span>
                                        </td>
                                        <td className="p-3 text-right font-mono">{formatCurrency(ex.amount)}</td>
                                    </tr>
                                ))}
                                <tr className="bg-blue-50 dark:bg-blue-900/20 font-bold text-blue-800 dark:text-blue-100">
                                    <td className="p-3">SPOLU</td>
                                    <td className="p-3 text-right text-lg">{formatCurrency(calc.totalCost)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                
                 <div className="flex justify-end gap-3 pt-4">
                     <button onClick={() => setViewingTrip(null)} className="px-4 py-2 text-slate-500">Zavrieť</button>
                     <button onClick={() => generateTripPDF(viewingTrip, v, e, p, settings, fuelPrices)} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"><FileText size={16}/> Stiahnuť PDF</button>
                 </div>
            </div>
        );
    };

    return (
        <div className="max-w-6xl mx-auto animate-fade-in">
             <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Pracovné cesty</h2>
                <button onClick={() => handleEdit()} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg shadow-blue-900/20"><Plus size={18}/> Nové cesta</button>
            </div>

            <ConfirmModal isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={confirmDelete} title="Vymazať cestu?" message="Naozaj chcete vymazať túto pracovnú cestu?" />

            {viewingTrip && (
                <Modal title="Detail cesty" onClose={() => setViewingTrip(null)}>
                    {renderTripDetail()}
                </Modal>
            )}

            {isEditing && (
                <Modal title={currentTrip.id ? "Upraviť cestu" : "Nová cesta"} onClose={() => setIsEditing(false)}>
                    <TripForm 
                        trip={currentTrip} 
                        onChange={setCurrentTrip} 
                        allTrips={trips}
                        employees={employees}
                        vehicles={vehicles}
                        projects={projects}
                        locations={locations}
                        fuelPrices={fuelPrices}
                        onSave={saveTrip}
                        onCancel={() => setIsEditing(false)}
                    />
                </Modal>
            )}

            <div className="space-y-4">
                {trips.length === 0 && <p className="text-center text-slate-500 py-10">Zatiaľ žiadne cesty. Pridajte novú.</p>}
                {trips.map((t) => {
                    const v = vehicles.find((veh) => veh.id === t.vehicleId);
                    const e = employees.find((emp) => emp.id === t.employeeId);
                    const cost = calculateTripCosts(t, v, settings, fuelPrices).totalCost;
                    return (
                        <div key={t.id} className="bg-white dark:bg-slate-900 p-4 border dark:border-slate-800 rounded-lg shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 transition-all hover:border-blue-300 dark:hover:border-blue-700">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-bold text-slate-800 dark:text-white">{formatDate(t.dateStart)}</span>
                                    {t.isSettled && <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] px-1.5 py-0.5 rounded border border-green-200 dark:border-green-800 font-bold flex items-center gap-1"><Lock size={8}/> VYÚČTOVANÉ</span>}
                                </div>
                                <div className="text-sm text-slate-600 dark:text-slate-400 font-medium">{formatRoute(t)} ({t.distanceKm} km)</div>
                                <div className="text-xs text-slate-400 mt-1 flex gap-2">
                                   <span>{e?.name || 'Neznámy'}</span>
                                   <span>•</span>
                                   <span>{v?.spz || 'Neznáme'}</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(cost)}</div>
                                <div className="text-xs text-slate-400">{t.purpose}</div>
                            </div>
                            <div className="flex gap-2">
                                 <button onClick={() => setViewingTrip(t)} className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors" title="Detail"><Eye size={18}/></button>
                                 <button onClick={(e) => { e.stopPropagation(); generateTripPDF(t, v, employees.find(emp=>emp.id===t.employeeId), projects.find(p=>p.id===t.projectId), settings, fuelPrices); }} className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors" title="Stiahnuť PDF"><FileText size={18}/></button>
                                 {!t.isSettled && (
                                     <>
                                        <button onClick={() => handleEdit(t)} className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors" title="Upraviť"><Pencil size={18}/></button>
                                        <button onClick={(e) => handleDeleteClick(t.id, e)} className="p-2 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors" title="Vymazať"><Trash2 size={18}/></button>
                                     </>
                                 )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// --- SETTLEMENTS VIEW ---
export const SettlementsView: React.FC<SettlementsViewProps> = ({ settlements, settlementHandlers, trips, tripHandlers, employees, vehicles, projects, settings, fuelPrices }) => {
    const { notify } = useNotification();
    const [isCreating, setIsCreating] = useState(false);
    const [viewingSettlement, setViewingSettlement] = useState<Settlement | null>(null);
    const [selectedTrips, setSelectedTrips] = useState<string[]>([]);
    const [settlementName, setSettlementName] = useState('');
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const unsettledTrips = trips.filter((t) => !t.isSettled);

    const toggleTripSelection = (id: string) => {
        if (selectedTrips.includes(id)) setSelectedTrips(selectedTrips.filter(x => x !== id));
        else setSelectedTrips([...selectedTrips, id]);
    };

    const createSettlement = async () => {
        if (selectedTrips.length === 0 || !settlementName) {
            notify("Vyberte aspoň jednu cestu a zadajte názov.", "warning");
            return;
        }

        const tripsToSettle = trips.filter((t) => selectedTrips.includes(t.id));
        let totalAmount = 0;
        tripsToSettle.forEach((t) => {
            const v = vehicles.find((veh) => veh.id === t.vehicleId);
            const c = calculateTripCosts(t, v, settings, fuelPrices);
            totalAmount += c.totalCost;
        });

        const newSettlement: Partial<Settlement> = {
            dateCreated: new Date().toISOString(),
            name: settlementName,
            status: 'draft',
            totalAmount,
            tripIds: selectedTrips
        };

        await settlementHandlers.add(newSettlement);
        
        // Update all settled trips
        const tripUpdatePromises = selectedTrips.map(tripId => 
            tripHandlers.update(tripId, { isSettled: true, settlementId: newSettlement.id })
        );
        await Promise.all(tripUpdatePromises);

        setIsCreating(false);
        setSettlementName('');
        setSelectedTrips([]);
    };
    
    const confirmDelete = async () => {
        if(deleteId) {
            const settlement = settlements.find((s) => s.id === deleteId);
            if(settlement) {
                // Update all unsettled trips
                const tripUpdatePromises = settlement.tripIds.map(tripId => 
                    tripHandlers.update(tripId, { isSettled: false, settlementId: undefined })
                );
                await Promise.all(tripUpdatePromises);

                await settlementHandlers.delete(deleteId);
            }
            setDeleteId(null);
        }
    };

    const handleDeleteClick = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setDeleteId(id);
    };

    const toggleStatus = (s: Settlement, e: React.MouseEvent) => {
        e.stopPropagation();
        const newStatus = s.status === 'draft' ? 'approved' : 'draft';
        settlementHandlers.update(s.id, { status: newStatus });
    };

    return (
        <div className="max-w-6xl mx-auto animate-fade-in">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Vyúčtovania</h2>
                <button onClick={() => setIsCreating(true)} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg shadow-blue-900/20"><Plus size={18}/> Nové vyúčtovanie</button>
            </div>

            {isCreating && (
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-xl border border-blue-200 dark:border-blue-900 mb-8">
                    <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-white">Vytvoriť hromadné vyúčtovanie</h3>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-slate-500 mb-1">Názov (napr. Február 2024)</label>
                        <input className="w-full border dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 rounded dark:text-white" value={settlementName} onChange={e => setSettlementName(e.target.value)} />
                    </div>
                    
                    <div className="mb-4 max-h-60 overflow-y-auto border dark:border-slate-800 rounded-lg">
                        <table className="w-full text-sm text-left text-slate-600 dark:text-slate-400">
                            <thead className="bg-slate-100 dark:bg-slate-800 font-bold sticky top-0">
                                <tr>
                                    <th className="p-3 w-10"><input type="checkbox" onChange={(e) => {
                                        if(e.target.checked) setSelectedTrips(unsettledTrips.map((t) => t.id));
                                        else setSelectedTrips([]);
                                    }} checked={selectedTrips.length === unsettledTrips.length && unsettledTrips.length > 0}/></th>
                                    <th className="p-3">Dátum</th>
                                    <th className="p-3">Osoba</th>
                                    <th className="p-3">Trasa</th>
                                    <th className="p-3 text-right">Suma</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {unsettledTrips.length === 0 ? <tr><td colSpan={5} className="p-4 text-center">Žiadne nevyúčtované cesty.</td></tr> : 
                                unsettledTrips.map((t) => {
                                    const v = vehicles.find((veh) => veh.id === t.vehicleId);
                                    const e = employees.find((emp) => emp.id === t.employeeId);
                                    const c = calculateTripCosts(t, v, settings, fuelPrices);
                                    return (
                                        <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer" onClick={() => toggleTripSelection(t.id)}>
                                            <td className="p-3"><input type="checkbox" checked={selectedTrips.includes(t.id)} readOnly /></td>
                                            <td className="p-3">{formatDate(t.dateStart)}</td>
                                            <td className="p-3">{e?.name || '-'}</td>
                                            <td className="p-3">{formatRoute(t)}</td>
                                            <td className="p-3 text-right font-mono">{formatCurrency(c.totalCost)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex justify-end gap-3">
                         <button onClick={() => setIsCreating(false)} className="px-4 py-2 text-slate-500">Zrušiť</button>
                         <button onClick={createSettlement} className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold">Vytvoriť ({selectedTrips.length})</button>
                    </div>
                </div>
            )}

            <div className="space-y-4">
                {settlements.length === 0 && <p className="text-center text-slate-500 py-10">Zatiaľ žiadne vyúčtovania.</p>}
                {settlements.map((s) => (
                    <div key={s.id} className="bg-white dark:bg-slate-900 p-4 border dark:border-slate-800 rounded-lg shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 transition-all hover:border-blue-300 dark:hover:border-blue-700">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="font-bold text-slate-800 dark:text-white text-lg cursor-pointer hover:text-blue-600" onClick={() => setViewingSettlement(s)}>{s.name}</span>
                                <button onClick={(e) => toggleStatus(s, e)} className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold flex items-center gap-1 hover:brightness-95 transition-all border ${s.status === 'approved' ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800' : 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800'}`} title="Kliknite pre zmenu stavu">
                                    {s.status === 'approved' ? <><CheckCircle size={10}/> Schválené</> : <><Lock size={10}/> Návrh</>}
                                </button>
                            </div>
                            <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                <span>Vytvorené: {formatDate(s.dateCreated)}</span>
                                <span>•</span>
                                <span>{s.tripIds.length} ciest</span>
                            </div>
                        </div>
                        
                        <div className="text-right">
                            <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(s.totalAmount)}</div>
                        </div>

                        <div className="flex gap-2">
                            <button onClick={() => setViewingSettlement(s)} className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors" title="Detail"><Eye size={18}/></button>
                            <button onClick={(e) => { e.stopPropagation(); generateSummaryPDF(trips.filter(t=>s.tripIds.includes(t.id)), employees, vehicles, projects, settings, fuelPrices, s.name, s.status==='approved'?'Schválené':'Návrh'); }} className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors" title="Stiahnuť PDF"><FileText size={18}/></button>
                            <button onClick={(e) => handleDeleteClick(s.id, e)} className="p-2 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors" title="Vymazať"><Trash2 size={18}/></button>
                        </div>
                    </div>
                ))}
            </div>

            <ConfirmModal isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={confirmDelete} title="Vymazať vyúčtovanie?" message="Cesty v tomto vyúčtovaní budú opäť označené ako nevyúčtované (otvorené)." />

             {viewingSettlement && (
                <Modal title="Detail vyúčtovania" onClose={() => setViewingSettlement(null)}>
                     <div className="space-y-6">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b dark:border-slate-800 pb-4 gap-4">
                            <div>
                                <h4 className="text-2xl font-bold">{viewingSettlement.name}</h4>
                                <div className="text-sm text-slate-500">
                                    Vytvorené: {formatDate(viewingSettlement.dateCreated)}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">{formatCurrency(viewingSettlement.totalAmount)}</div>
                                <span className={`text-xs px-2 py-1 rounded font-bold uppercase ${viewingSettlement.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                    {viewingSettlement.status === 'approved' ? 'Schválené' : 'Návrh'}
                                </span>
                            </div>
                        </div>
                        <div>
                            <h5 className="font-bold text-lg mb-4">Zahrnuté cesty</h5>
                            <div className="border rounded-lg overflow-hidden dark:border-slate-800">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase font-bold text-xs">
                                        <tr>
                                            <th className="p-3">Dátum</th>
                                            <th className="p-3">Zamestnanec</th>
                                            <th className="p-3">Trasa</th>
                                            <th className="p-3 text-right">Suma</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y dark:divide-slate-800">
                                        {trips.filter(t => viewingSettlement.tripIds && viewingSettlement.tripIds.includes(t.id)).map(t => {
                                            const v = vehicles.find((veh) => veh.id === t.vehicleId);
                                            const e = employees.find((emp) => emp.id === t.employeeId);
                                            const cost = calculateTripCosts(t, v, settings, fuelPrices).totalCost;
                                            return (
                                                <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                    <td className="p-3 font-medium">{formatDate(t.dateStart)}</td>
                                                    <td className="p-3">{e?.name || '-'}</td>
                                                    <td className="p-3">{formatRoute(t)}</td>
                                                    <td className="p-3 text-right font-mono">{formatCurrency(cost)}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-4 border-t dark:border-slate-800">
                            <button onClick={() => setViewingSettlement(null)} className="px-4 py-2 text-slate-500">Zavrieť</button>
                            <button onClick={() => generateSummaryPDF(trips.filter(t=>viewingSettlement.tripIds && viewingSettlement.tripIds.includes(t.id)), employees, vehicles, projects, settings, fuelPrices, viewingSettlement.name, viewingSettlement.status==='approved'?'Schválené':'Návrh')} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"><FileText size={16}/> Stiahnuť PDF</button>
                        </div>
                     </div>
                </Modal>
            )}
        </div>
    );
};