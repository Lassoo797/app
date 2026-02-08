import React, { useState } from 'react';
import { Employee, Vehicle, Project, SavedLocation, Settings, Trip, FuelPriceRecord } from '../types';
import { EntityListLayout, Modal, ConfirmModal, DetailRow } from './Shared';
import { Users, Pencil, Trash2, Power, Eye, Car, Briefcase, MapPin, Save, ExternalLink, Calendar } from 'lucide-react';
import { FUEL_LABELS } from '../constants';
import { calculateTripCosts, formatCurrency } from '../utils/calculations';

import { useNotification } from './Notifications';

// --- SEPARATE COMPONENTS TO FIX FOCUS LOSS ---

const EmployeeForm = ({ data, onChange }: { data: Partial<Employee>, onChange: (d: Partial<Employee>) => void }) => (
    <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Meno a Priezvisko <span className="text-red-500">*</span></label>
                <input className="w-full border dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 rounded dark:text-white" placeholder="napr. Jozef Novák" value={data.name || ''} onChange={e => onChange({ ...data, name: e.target.value })} required />
            </div>
            <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Pozícia / Rola</label>
                 <input className="w-full border dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 rounded dark:text-white" placeholder="napr. Manažér" value={data.role || ''} onChange={e => onChange({ ...data, role: e.target.value })} />
            </div>
        </div>
        <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Adresa bydliska <span className="text-red-500">*</span></label>
            <input className="w-full border dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 rounded dark:text-white" placeholder="Ulica, Mesto, PSČ" value={data.address || ''} onChange={e => onChange({ ...data, address: e.target.value })} required />
        </div>
    </div>
);

const VehicleForm = ({ data, onChange }: { data: Partial<Vehicle>, onChange: (d: Partial<Vehicle>) => void }) => (
    <div className="space-y-4">
         <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Názov vozidla <span className="text-red-500">*</span></label>
                <input className="w-full border dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 rounded text-slate-900 dark:text-white" placeholder="napr. Škoda Octavia" value={data.name || ''} onChange={e=>onChange({...data, name:e.target.value})} required/>
             </div>
             <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">EČV (ŠPZ) <span className="text-red-500">*</span></label>
                <input className="w-full border dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 rounded text-slate-900 dark:text-white" placeholder="AA-000BB" value={data.spz || ''} onChange={e=>onChange({...data, spz:e.target.value})} required/>
             </div>
         </div>
         <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Spotreba (l/100km) <span className="text-red-500">*</span></label>
                <input type="number" step="0.1" className="w-full border dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 rounded text-slate-900 dark:text-white" placeholder="0.0" value={data.consumption} onChange={e=>onChange({...data, consumption: e.target.value as any})} required />
             </div>
             <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Palivo <span className="text-red-500">*</span></label>
                <select className="w-full border dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 rounded text-slate-900 dark:text-white" value={data.fuelType || 'diesel'} onChange={e=>onChange({...data, fuelType:e.target.value as any})}>{Object.entries(FUEL_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select>
             </div>
         </div>
         <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Typ vlastníctva</label>
            <div className="flex gap-4">
                <label className="flex items-center gap-2 dark:text-slate-300 cursor-pointer"><input type="radio" checked={data.ownershipType==='private'} onChange={()=>onChange({...data, ownershipType:'private'})}/> Súkromné (Nárok na amortizáciu)</label>
                <label className="flex items-center gap-2 dark:text-slate-300 cursor-pointer"><input type="radio" checked={data.ownershipType==='company'} onChange={()=>onChange({...data, ownershipType:'company'})}/> Firemné</label>
            </div>
         </div>
    </div>
);

const ProjectForm = ({ data, onChange }: { data: Partial<Project>, onChange: (d: Partial<Project>) => void }) => (
    <div className="grid grid-cols-3 gap-4">
        <div className="col-span-1">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Kód zákazky <span className="text-red-500">*</span></label>
            <input className="w-full border dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 rounded dark:text-white" placeholder="napr. 2024-01" value={data.code || ''} onChange={e => onChange({ ...data, code: e.target.value })} required />
        </div>
        <div className="col-span-2">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Názov projektu <span className="text-red-500">*</span></label>
            <input className="w-full border dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 rounded dark:text-white" placeholder="napr. Vývoj Webu" value={data.name || ''} onChange={e => onChange({ ...data, name: e.target.value })} required />
        </div>
    </div>
);

const LocationForm = ({ data, onChange }: { data: Partial<SavedLocation>, onChange: (d: Partial<SavedLocation>) => void }) => (
    <div className="space-y-4">
        <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Názov <span className="text-red-500">*</span></label>
            <input className="w-full border dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 rounded dark:text-white" placeholder="napr. Sídlo firmy" value={data.name || ''} onChange={e => onChange({ ...data, name: e.target.value })} required />
        </div>
        <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ulica a číslo <span className="text-red-500">*</span></label>
                <input className="w-full border dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 rounded dark:text-white" placeholder="Mlynské Nivy 1" value={data.street || ''} onChange={e => onChange({ ...data, street: e.target.value })} required />
            </div>
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mesto <span className="text-red-500">*</span></label>
                <input className="w-full border dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 rounded dark:text-white" placeholder="Bratislava" value={data.city || ''} onChange={e => onChange({ ...data, city: e.target.value })} required />
            </div>
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">PSČ <span className="text-red-500">*</span></label>
                <input className="w-full border dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 rounded dark:text-white" placeholder="821 09" value={data.zip || ''} onChange={e => onChange({ ...data, zip: e.target.value })} required />
            </div>
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Štát</label>
                <input className="w-full border dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 rounded dark:text-white" placeholder="Slovensko" value={data.country || 'Slovensko'} onChange={e => onChange({ ...data, country: e.target.value })} />
            </div>
        </div>
        <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Poznámka</label>
            <input className="w-full border dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 rounded dark:text-white" placeholder="Poschodie, kód brány..." value={data.note || ''} onChange={e => onChange({ ...data, note: e.target.value })} />
        </div>
    </div>
);

const FuelPriceForm = ({ data, onChange }: { data: Partial<FuelPriceRecord>, onChange: (d: Partial<FuelPriceRecord>) => void }) => (
    <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Platné od <span className="text-red-500">*</span></label>
                <input type="date" className="w-full border dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 rounded text-slate-900 dark:text-white" value={data.validFrom ? data.validFrom.split('T')[0] : ''} onChange={e=>onChange({...data, validFrom: e.target.value})} required/>
             </div>
             <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Platné do <span className="text-red-500">*</span></label>
                <input type="date" className="w-full border dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 rounded text-slate-900 dark:text-white" value={data.validTo ? data.validTo.split('T')[0] : ''} onChange={e=>onChange({...data, validTo: e.target.value})} required/>
             </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
             <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Diesel (€/l)</label>
                <input type="number" step="0.001" className="w-full border dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 rounded text-slate-900 dark:text-white" value={data.priceDiesel} onChange={e=>onChange({...data, priceDiesel: parseFloat(e.target.value)})} />
             </div>
             <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Benzín (€/l)</label>
                <input type="number" step="0.001" className="w-full border dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 rounded text-slate-900 dark:text-white" value={data.priceBenzin} onChange={e=>onChange({...data, priceBenzin: parseFloat(e.target.value)})} />
             </div>
             <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">LPG (€/l)</label>
                <input type="number" step="0.001" className="w-full border dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 rounded text-slate-900 dark:text-white" value={data.priceLpg} onChange={e=>onChange({...data, priceLpg: parseFloat(e.target.value)})} />
             </div>
             <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Elektro (€/kWh)</label>
                <input type="number" step="0.001" className="w-full border dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 rounded text-slate-900 dark:text-white" value={data.priceElectric} onChange={e=>onChange({...data, priceElectric: parseFloat(e.target.value)})} />
             </div>
        </div>
        <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Poznámka</label>
            <input className="w-full border dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 rounded text-slate-900 dark:text-white" placeholder="Zdroj..." value={data.note || ''} onChange={e=>onChange({...data, note: e.target.value})} />
        </div>
    </div>
);

// --- VIEWS ---


export const FuelPricesView = ({ fuelPrices, handlers }: any) => {
    const { notify } = useNotification();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<FuelPriceRecord>>({});
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const handleSave = async () => {
        if (!formData.validFrom || !formData.validTo) {
            notify("Dátumy Platné Od a Platné Do sú povinné.", "warning");
            return;
        }
        if (new Date(formData.validFrom) > new Date(formData.validTo)) {
             notify("Dátum 'Od' musí byť pred dátumom 'Do'.", "warning");
             return;
        }

        if (editingId === 'NEW') {
            await handlers.add(formData);
        } else if (editingId === 'EDIT_MODAL' && formData.id) {
            await handlers.update(formData.id, formData);
        }
        setEditingId(null); setFormData({});
    };

    const confirmDelete = async () => {
        if (deleteId) {
            await handlers.delete(deleteId);
            setDeleteId(null);
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('sk-SK');
    };

    return (
        <div className="max-w-4xl mx-auto animate-fade-in mt-12">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Ceny PHM (Štatistický úrad)</h2>
                <button onClick={() => { setEditingId('NEW'); setFormData({}); }} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold shadow-lg shadow-blue-900/20 flex items-center gap-2">
                    <Calendar size={18} /> Pridať týždeň
                </button>
            </div>

            {editingId === 'NEW' && (
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-lg border border-blue-100 dark:border-slate-800 mb-6">
                    <h3 className="text-lg font-bold mb-4 dark:text-white">Nový záznam cien paliva</h3>
                    <FuelPriceForm data={formData} onChange={setFormData} />
                    <div className="flex gap-2 mt-4">
                        <button onClick={handleSave} className="bg-green-600 text-white px-4 py-2 rounded">Uložiť</button>
                        <button onClick={() => setEditingId(null)} className="text-slate-500 px-4 py-2">Zrušiť</button>
                    </div>
                </div>
            )}

            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                {fuelPrices.length === 0 ? (
                     <div className="p-8 text-center text-slate-500">Zatiaľ žiadne záznamy o cenách paliva. Použijú sa predvolené ceny z nastavení.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 text-xs uppercase">
                                    <th className="p-4">Platnosť</th>
                                    <th className="p-4">Diesel</th>
                                    <th className="p-4">Benzín</th>
                                    <th className="p-4">LPG</th>
                                    <th className="p-4">Elektro</th>
                                    <th className="p-4">Poznámka</th>
                                    <th className="p-4 text-right">Akcie</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {fuelPrices.map((fp: FuelPriceRecord) => (
                                    <tr key={fp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                        <td className="p-4 text-slate-800 dark:text-white font-medium">
                                            {formatDate(fp.validFrom)} - {formatDate(fp.validTo)}
                                        </td>
                                        <td className="p-4 text-slate-600 dark:text-slate-300">{fp.priceDiesel?.toFixed(3)} €</td>
                                        <td className="p-4 text-slate-600 dark:text-slate-300">{fp.priceBenzin?.toFixed(3)} €</td>
                                        <td className="p-4 text-slate-600 dark:text-slate-300">{fp.priceLpg?.toFixed(3)} €</td>
                                        <td className="p-4 text-slate-600 dark:text-slate-300">{fp.priceElectric?.toFixed(3)} €</td>
                                        <td className="p-4 text-slate-500 text-sm">{fp.note}</td>
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => { setEditingId('EDIT_MODAL'); setFormData(fp); }} className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full" title="Upraviť"><Pencil size={16} /></button>
                                                <button onClick={() => setDeleteId(fp.id)} className="p-2 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full" title="Vymazať"><Trash2 size={16} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

             <ConfirmModal isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={confirmDelete} title="Vymazať ceny?" message="Naozaj chcete vymazať tento záznam cien paliva?" />

            {editingId === 'EDIT_MODAL' && (
                <Modal title="Upraviť ceny paliva" onClose={() => setEditingId(null)}>
                    <div className="space-y-4">
                        <FuelPriceForm data={formData} onChange={setFormData} />
                        <div className="flex justify-end gap-2 mt-4"><button onClick={() => setEditingId(null)} className="px-4 py-2 text-slate-500">Zrušiť</button><button onClick={handleSave} className="bg-blue-600 text-white px-6 py-2 rounded">Uložiť zmeny</button></div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export const EmployeesView = ({ employees, handlers, trips, settings, vehicles, fuelPrices }: any) => {
    const { notify } = useNotification();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null);
    const [formData, setFormData] = useState<Partial<Employee>>({});
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const handleSave = async () => {
        if (!formData.name || !formData.address) {
            notify("Meno a Adresa sú povinné polia.", "warning");
            return;
        }
        
        if (editingId === 'NEW') {
            await handlers.add({ ...formData, isActive: true });
        } else if (editingId === 'EDIT_MODAL' && formData.id) {
            await handlers.update(formData.id, formData);
        }
        setEditingId(null); setFormData({});
    };

    const confirmDelete = async () => {
        if (deleteId) {
            await handlers.delete(deleteId);
            setDeleteId(null);
        }
    };

    const handleDeleteClick = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const isUsed = trips.some((t: Trip) => t.employeeId === id);
        if (isUsed) {
            notify("Tento zamestnanec má priradené pracovné cesty. Nemožno ho vymazať. Namiesto toho ho deaktivujte.", "error");
            return;
        }
        setDeleteId(id);
    };

    const toggleActive = (e: Employee, event: React.MouseEvent) => {
        event.stopPropagation();
        handlers.update(e.id, { isActive: !e.isActive });
    };

    const getStats = (empId: string) => {
        const empTrips = trips.filter((t: Trip) => t.employeeId === empId);
        let totalCost = 0;
        let totalKm = 0;
        empTrips.forEach((t: Trip) => {
            const v = vehicles.find((veh: Vehicle) => veh.id === t.vehicleId);
            if (!v || !settings) return; // Add safety check
            const c = calculateTripCosts(t, v, settings, fuelPrices || []);
            totalCost += c.totalCost;
            totalKm += t.distanceKm;
        });
        return { count: empTrips.length, cost: totalCost, km: totalKm };
    };

    return (
        <EntityListLayout title="Zamestnanci" onAdd={() => { setEditingId('NEW'); setFormData({ isActive: true }); }} isAdding={editingId === 'NEW'} addForm={
            <div className="flex flex-col gap-4">
                <EmployeeForm data={formData} onChange={setFormData} />
                <div className="flex gap-2">
                     <button onClick={handleSave} className="bg-green-600 text-white px-4 py-2 rounded h-10">Uložiť</button>
                     <button onClick={() => setEditingId(null)} className="text-slate-500 px-4 py-2">Zrušiť</button>
                </div>
            </div>
        }>
            {employees.map((e: Employee) => (
                <div key={e.id} className={`bg-white dark:bg-slate-900 p-4 border dark:border-slate-800 rounded-lg flex justify-between items-center ${!e.isActive ? 'opacity-60 grayscale' : ''}`}>
                    <div className="text-slate-800 dark:text-white">
                        <div className="font-bold flex items-center gap-2">
                            {e.name}
                            {!e.isActive && <span className="text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-500 px-1.5 py-0.5 rounded">NEAKTÍVNY</span>}
                        </div>
                        <div className="text-sm text-slate-500">{e.address}</div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setViewingEmployee(e)} className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full" title="Detail"><Eye size={18} /></button>
                        <button onClick={(event) => toggleActive(e, event)} className={`p-2 rounded-full ${e.isActive ? 'text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`} title={e.isActive ? "Deaktivovať" : "Aktivovať"}><Power size={18} /></button>
                        <button onClick={(event) => { event.stopPropagation(); setEditingId('EDIT_MODAL'); setFormData(e); }} className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full" title="Upraviť"><Pencil size={18} /></button>
                        <button onClick={(event) => handleDeleteClick(e.id, event)} className="p-2 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full" title="Vymazať"><Trash2 size={18} /></button>
                    </div>
                </div>
            ))}
            
            <ConfirmModal isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={confirmDelete} title="Vymazať zamestnanca?" message="Táto akcia je nevratná." />

            {viewingEmployee && (
                <Modal title="Detail zamestnanca" onClose={() => setViewingEmployee(null)}>
                    <div className="space-y-4">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-300"><Users size={32} /></div>
                            <div>
                                <h4 className="text-2xl font-bold">{viewingEmployee.name}</h4>
                                <span className={`text-xs px-2 py-0.5 rounded ${viewingEmployee.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{viewingEmployee.isActive ? 'Aktívny' : 'Neaktívny'}</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                             <DetailRow label="ID" value={viewingEmployee.id} />
                             <DetailRow label="Adresa" value={viewingEmployee.address} />
                             <DetailRow label="Pozícia" value={viewingEmployee.role || '-'} />
                        </div>
                        <div className="mt-8 pt-6 border-t dark:border-slate-800">
                            <h5 className="font-bold text-lg mb-4">Štatistiky</h5>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg text-center"><div className="text-xs text-slate-500 uppercase font-bold">Počet ciest</div><div className="text-2xl font-bold">{getStats(viewingEmployee.id).count}</div></div>
                                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg text-center"><div className="text-xs text-slate-500 uppercase font-bold">Celkom Km</div><div className="text-2xl font-bold">{getStats(viewingEmployee.id).km.toFixed(0)}</div></div>
                                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg text-center"><div className="text-xs text-slate-500 uppercase font-bold">Náklady celkom</div><div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(getStats(viewingEmployee.id).cost)}</div></div>
                            </div>
                        </div>
                    </div>
                </Modal>
            )}

            {editingId === 'EDIT_MODAL' && (
                <Modal title="Upraviť zamestnanca" onClose={() => setEditingId(null)}>
                    <div className="space-y-4">
                        <EmployeeForm data={formData} onChange={setFormData} />
                        <div className="flex justify-end gap-2 mt-4"><button onClick={() => setEditingId(null)} className="px-4 py-2 text-slate-500">Zrušiť</button><button onClick={handleSave} className="bg-blue-600 text-white px-6 py-2 rounded">Uložiť zmeny</button></div>
                    </div>
                </Modal>
            )}
        </EntityListLayout>
    );
};

export const VehiclesView = ({ vehicles, handlers, trips, settings, fuelPrices }: any) => {
    const { notify } = useNotification();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [viewingVehicle, setViewingVehicle] = useState<Vehicle | null>(null);
    const [formData, setFormData] = useState<Partial<Vehicle>>({});
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const handleSave = async () => {
        if (!formData.name || !formData.spz || formData.consumption === undefined) {
             notify("Názov, ŠPZ a Spotreba sú povinné.", "warning");
             return;
        }
        
        const vehicleToSave = {
            ...formData,
            consumption: parseFloat(formData.consumption as any) || 0
        };

        if (editingId === 'NEW') {
            await handlers.add({ ...vehicleToSave, isActive: true });
        } else if (editingId === 'EDIT_MODAL' && formData.id) {
            await handlers.update(formData.id, vehicleToSave);
        }
        setEditingId(null); setFormData({});
    };

    const confirmDelete = async () => {
        if (deleteId) {
            await handlers.delete(deleteId);
            setDeleteId(null);
        }
    };

    const handleDeleteClick = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const isUsed = trips.some((t: Trip) => t.vehicleId === id);
        if (isUsed) {
            notify("Toto vozidlo je použité v cestách. Nemožno ho vymazať. Deaktivujte ho.", "error");
            return;
        }
        setDeleteId(id);
    };

    const toggleActive = (v: Vehicle, e: React.MouseEvent) => {
        e.stopPropagation();
        handlers.update(v.id, { isActive: !v.isActive });
    };

    const getStats = (vehId: string) => {
        const vehTrips = trips.filter((t: Trip) => t.vehicleId === vehId);
        let totalCost = 0;
        let totalKm = 0;
        vehTrips.forEach((t: Trip) => {
            const v = vehicles.find((veh: Vehicle) => veh.id === t.vehicleId);
            if (!v || !settings) return; // Add safety check
            const c = calculateTripCosts(t, v, settings, fuelPrices || []);
            totalCost += c.totalCost;
            totalKm += t.distanceKm;
        });
        return { count: vehTrips.length, cost: totalCost, km: totalKm };
    };

    return (
        <EntityListLayout title="Vozidlá" onAdd={() => { setEditingId('NEW'); setFormData({ isActive: true, fuelType: 'diesel', ownershipType: 'private' }); }} isAdding={editingId === 'NEW'} addForm={
            <>
                <VehicleForm data={formData} onChange={setFormData} />
                <div className="flex gap-2 mt-4"><button onClick={handleSave} className="bg-green-600 text-white px-4 py-2 rounded">Uložiť</button><button onClick={() => setEditingId(null)} className="text-slate-500 px-4 py-2">Zrušiť</button></div>
            </>
        }>
            {vehicles.map((v: Vehicle) => (
                <div key={v.id} className={`bg-white dark:bg-slate-900 p-4 border dark:border-slate-800 rounded-lg flex justify-between items-center ${!v.isActive ? 'opacity-60 grayscale' : ''}`}>
                    <div className="text-slate-800 dark:text-white">
                        <div className="font-bold flex items-center gap-2">{v.name} ({v.spz}){!v.isActive && <span className="text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-500 px-1.5 py-0.5 rounded">NEAKTÍVNE</span>}</div>
                        <div className="text-sm text-slate-500">{FUEL_LABELS[v.fuelType]} • {v.ownershipType==='company' ? 'Firemné' : 'Súkromné'}</div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setViewingVehicle(v)} className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full" title="Detail"><Eye size={18} /></button>
                        <button onClick={(e) => toggleActive(v, e)} className={`p-2 rounded-full ${v.isActive ? 'text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`} title={v.isActive ? "Deaktivovať" : "Aktivovať"}><Power size={18} /></button>
                        <button onClick={(e) => { e.stopPropagation(); setEditingId('EDIT_MODAL'); setFormData(v); }} className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full" title="Upraviť"><Pencil size={18} /></button>
                        <button onClick={(e) => handleDeleteClick(v.id, e)} className="p-2 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full" title="Vymazať"><Trash2 size={18} /></button>
                    </div>
                </div>
            ))}
            
            <ConfirmModal isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={confirmDelete} title="Vymazať vozidlo?" message="Naozaj chcete vymazať toto vozidlo? Táto akcia je nevratná." />

            {viewingVehicle && (
                <Modal title="Detail vozidla" onClose={() => setViewingVehicle(null)}>
                     <div className="space-y-4">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center text-orange-600 dark:text-orange-300"><Car size={32} /></div>
                            <div><h4 className="text-2xl font-bold">{viewingVehicle.name}</h4><span className="text-lg font-mono text-slate-600 dark:text-slate-300">{viewingVehicle.spz}</span></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                             <DetailRow label="ID" value={viewingVehicle.id} />
                             <DetailRow label="Spotreba" value={`${viewingVehicle.consumption} l/100km`} />
                             <DetailRow label="Palivo" value={FUEL_LABELS[viewingVehicle.fuelType]} />
                             <DetailRow label="Vlastníctvo" value={viewingVehicle.ownershipType === 'company' ? 'Firemné' : 'Súkromné'} />
                             <DetailRow label="Stav" value={viewingVehicle.isActive ? 'Aktívne' : 'Neaktívne'} />
                        </div>
                        <div className="mt-8 pt-6 border-t dark:border-slate-800">
                            <h5 className="font-bold text-lg mb-4">Využitie vozidla</h5>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg text-center"><div className="text-xs text-slate-500 uppercase font-bold">Počet ciest</div><div className="text-2xl font-bold">{getStats(viewingVehicle.id).count}</div></div>
                                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg text-center"><div className="text-xs text-slate-500 uppercase font-bold">Najazdené</div><div className="text-2xl font-bold">{getStats(viewingVehicle.id).km.toFixed(0)} km</div></div>
                                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg text-center"><div className="text-xs text-slate-500 uppercase font-bold">Náklady celkom</div><div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(getStats(viewingVehicle.id).cost)}</div></div>
                            </div>
                        </div>
                    </div>
                </Modal>
            )}
            {editingId === 'EDIT_MODAL' && (
                <Modal title="Upraviť vozidlo" onClose={() => setEditingId(null)}>
                    <VehicleForm data={formData} onChange={setFormData} />
                    <div className="flex justify-end gap-2 mt-4"><button onClick={() => setEditingId(null)} className="px-4 py-2 text-slate-500">Zrušiť</button><button onClick={handleSave} className="bg-blue-600 text-white px-6 py-2 rounded">Uložiť zmeny</button></div>
                </Modal>
            )}
        </EntityListLayout>
    );
};


export const ProjectsView = ({ projects, handlers, trips, settings, vehicles, fuelPrices }: any) => {
    const { notify } = useNotification();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [viewingProject, setViewingProject] = useState<Project | null>(null);
    const [formData, setFormData] = useState<Partial<Project>>({});
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const handleSave = async () => {
        if (!formData.name || !formData.code) {
             notify("Kód a Názov projektu sú povinné.", "warning");
             return;
        }
        if (editingId === 'NEW') {
            await handlers.add({ ...formData, isActive: true });
        } else if (editingId === 'EDIT_MODAL' && formData.id) {
            await handlers.update(formData.id, formData);
        }
        setEditingId(null); setFormData({});
    };

    const confirmDelete = async () => {
        if (deleteId) {
            await handlers.delete(deleteId);
            setDeleteId(null);
        }
    };

    const handleDeleteClick = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const isUsed = trips.some((t: Trip) => t.projectId === id);
        if (isUsed) {
            notify("Túto zákazku nemožno vymazať, je použitá v cestách. Deaktivujte ju.", "error");
            return;
        }
        setDeleteId(id);
    };

    const toggleActive = (p: Project, e: React.MouseEvent) => {
        e.stopPropagation();
        handlers.update(p.id, { isActive: !p.isActive });
    };

    const getStats = (projId: string) => {
        const projTrips = trips.filter((t: Trip) => t.projectId === projId);
        let totalCost = 0;
        let totalKm = 0;
        projTrips.forEach((t: Trip) => {
            const v = vehicles.find((veh: Vehicle) => veh.id === t.vehicleId);
            if (!v || !settings) return; // Add safety check
            const c = calculateTripCosts(t, v, settings, fuelPrices || []);
            totalCost += c.totalCost;
            totalKm += t.distanceKm;
        });
        return { count: projTrips.length, cost: totalCost, km: totalKm };
    };

    return (
        <EntityListLayout title="Zákazky" onAdd={() => { setEditingId('NEW'); setFormData({ isActive: true }); }} isAdding={editingId === 'NEW'} addForm={
            <div className="flex flex-col gap-4">
                 <ProjectForm data={formData} onChange={setFormData} />
                 <div className="flex gap-2">
                     <button onClick={handleSave} className="bg-green-600 text-white px-4 py-2 rounded">Uložiť</button>
                     <button onClick={() => setEditingId(null)} className="text-slate-500 px-4 py-2">Zrušiť</button>
                 </div>
            </div>
        }>
            {projects.map((p: Project) => (
                <div key={p.id} className={`bg-white dark:bg-slate-900 p-4 border dark:border-slate-800 rounded-lg flex justify-between items-center ${!p.isActive ? 'opacity-60 grayscale' : ''}`}>
                    <div className="text-slate-800 dark:text-white">
                        <div className="font-bold flex items-center gap-2"><span className="bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-xs px-2 py-0.5 rounded">{p.code}</span>{p.name}{!p.isActive && <span className="text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-500 px-1.5 py-0.5 rounded">NEAKTÍVNA</span>}</div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setViewingProject(p)} className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full" title="Detail"><Eye size={18} /></button>
                        <button onClick={(e) => toggleActive(p, e)} className={`p-2 rounded-full ${p.isActive ? 'text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`} title={p.isActive ? "Deaktivovať" : "Aktivovať"}><Power size={18} /></button>
                        <button onClick={(e) => { e.stopPropagation(); setEditingId('EDIT_MODAL'); setFormData(p); }} className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full" title="Upraviť"><Pencil size={18} /></button>
                        <button onClick={(e) => handleDeleteClick(p.id, e)} className="p-2 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full" title="Vymazať"><Trash2 size={18} /></button>
                    </div>
                </div>
            ))}
            
            <ConfirmModal isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={confirmDelete} title="Vymazať zákazku?" message="Naozaj chcete vymazať túto zákazku?" />

            {viewingProject && (
                <Modal title="Detail zákazky" onClose={() => setViewingProject(null)}>
                     <div className="space-y-4">
                        <div className="flex items-center gap-4 mb-6"><div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-300"><Briefcase size={32} /></div><div><h4 className="text-2xl font-bold">{viewingProject.name}</h4><span className="text-sm font-mono text-slate-500">{viewingProject.code}</span></div></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                             <DetailRow label="ID" value={viewingProject.id} />
                             <DetailRow label="Kód" value={viewingProject.code} />
                             <DetailRow label="Stav" value={viewingProject.isActive ? 'Aktívna' : 'Neaktívna'} />
                        </div>
                        <div className="mt-8 pt-6 border-t dark:border-slate-800">
                            <h5 className="font-bold text-lg mb-4">Štatistiky projektu</h5>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg text-center"><div className="text-xs text-slate-500 uppercase font-bold">Počet ciest</div><div className="text-2xl font-bold">{getStats(viewingProject.id).count}</div></div>
                                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg text-center"><div className="text-xs text-slate-500 uppercase font-bold">Celkom Km</div><div className="text-2xl font-bold">{getStats(viewingProject.id).km.toFixed(0)}</div></div>
                                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg text-center"><div className="text-xs text-slate-500 uppercase font-bold">Náklady celkom</div><div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(getStats(viewingProject.id).cost)}</div></div>
                            </div>
                        </div>
                    </div>
                </Modal>
            )}
            {editingId === 'EDIT_MODAL' && (
                <Modal title="Upraviť zákazku" onClose={() => setEditingId(null)}>
                    <div className="space-y-4">
                        <ProjectForm data={formData} onChange={setFormData} />
                        <div className="flex justify-end gap-2 mt-4"><button onClick={() => setEditingId(null)} className="px-4 py-2 text-slate-500">Zrušiť</button><button onClick={handleSave} className="bg-blue-600 text-white px-6 py-2 rounded">Uložiť zmeny</button></div>
                    </div>
                </Modal>
            )}
        </EntityListLayout>
    );
};

export const LocationsView = ({ locations, handlers }: any) => {
    const { notify } = useNotification();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [viewingLocation, setViewingLocation] = useState<SavedLocation | null>(null);
    const [formData, setFormData] = useState<Partial<SavedLocation>>({});
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const handleSave = async () => {
        if (!formData.name || !formData.street || !formData.city || !formData.zip) {
             notify("Názov, Ulica, Mesto a PSČ sú povinné.", "warning");
             return;
        }
        // Auto-generate full address for legacy compatibility/display
        const fullAddress = `${formData.street}, ${formData.zip} ${formData.city}, ${formData.country || ''}`.trim();
        const dataToSave = { ...formData, address: fullAddress };

        if (editingId === 'NEW') {
            await handlers.add(dataToSave);
        } else if (editingId === 'EDIT_MODAL' && formData.id) {
            await handlers.update(formData.id, dataToSave);
        }
        setEditingId(null); setFormData({});
    };

    const confirmDelete = async () => {
        if (deleteId) {
            await handlers.delete(deleteId);
            setDeleteId(null);
        }
    };

    const handleDeleteClick = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setDeleteId(id);
    };

    return (
        <EntityListLayout title="Adresár" onAdd={() => { setEditingId('NEW'); setFormData({}); }} isAdding={editingId === 'NEW'} addForm={
            <div className="flex flex-col gap-4">
                <LocationForm data={formData} onChange={setFormData} />
                <div className="flex gap-2">
                    <button onClick={handleSave} className="bg-green-600 text-white px-4 py-2 rounded">Uložiť</button>
                    <button onClick={() => setEditingId(null)} className="text-slate-500 px-4 py-2">Zrušiť</button>
                </div>
            </div>
        }>
            {locations.map((l: SavedLocation) => (
                <div key={l.id} className="bg-white dark:bg-slate-900 p-4 border dark:border-slate-800 rounded-lg flex justify-between items-center">
                    <div className="text-slate-800 dark:text-white">
                        <div className="font-bold">{l.name}</div>
                        <div className="text-sm text-slate-500">
                            {l.street}, {l.zip} {l.city}
                            {l.note && <span className="block text-xs text-slate-400 italic mt-1">{l.note}</span>}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setViewingLocation(l)} className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"><Eye size={18} /></button>
                        <button onClick={(e) => { e.stopPropagation(); setEditingId('EDIT_MODAL'); setFormData(l); }} className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full"><Pencil size={18} /></button>
                        <button onClick={(e) => handleDeleteClick(l.id, e)} className="p-2 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full"><Trash2 size={18} /></button>
                    </div>
                </div>
            ))}
            
            <ConfirmModal isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={confirmDelete} title="Vymazať adresu?" message="Naozaj chcete vymazať túto adresu?" />

            {viewingLocation && (
                <Modal title="Detail adresy" onClose={() => setViewingLocation(null)}>
                     <div className="space-y-4">
                        <div className="flex items-center gap-4 mb-6"><div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300"><MapPin size={32} /></div><div><h4 className="text-2xl font-bold">{viewingLocation.name}</h4></div></div>
                        <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg border dark:border-slate-700">
                            <p className="text-lg font-bold">{viewingLocation.street}</p>
                            <p className="text-lg">{viewingLocation.zip} {viewingLocation.city}</p>
                            <p className="text-gray-500">{viewingLocation.country}</p>
                            {viewingLocation.note && <p className="text-sm text-gray-400 mt-2 border-t pt-2 dark:border-slate-600">Poznámka: {viewingLocation.note}</p>}
                        </div>
                        <div className="flex justify-end gap-2 mt-4"><a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${viewingLocation.street}, ${viewingLocation.city}`)}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-blue-600 hover:underline"><ExternalLink size={16}/> Otvoriť v Google Maps</a></div>
                    </div>
                </Modal>
            )}
             {editingId === 'EDIT_MODAL' && (
                <Modal title="Upraviť adresu" onClose={() => setEditingId(null)}>
                    <div className="space-y-4">
                        <LocationForm data={formData} onChange={setFormData} />
                        <div className="flex justify-end gap-2 mt-4"><button onClick={() => setEditingId(null)} className="px-4 py-2 text-slate-500">Zrušiť</button><button onClick={handleSave} className="bg-blue-600 text-white px-6 py-2 rounded">Uložiť zmeny</button></div>
                    </div>
                </Modal>
            )}
        </EntityListLayout>
    );
};

// --- SETTINGS ---
export const SettingsView = ({ settings, onSave }: any) => {
  const { notify } = useNotification();
  // Store numbers as strings temporarily to allow editing (e.g. "5.")
  const [localSettings, setLocalSettings] = useState<any>(settings);

  const handleChange = (key: keyof Settings, value: string) => {
    setLocalSettings({ ...localSettings, [key]: value });
  };

  const save = () => {
    // Convert back to numbers on save
    const cleanSettings: any = { ...localSettings };
    for(const key in cleanSettings) {
        if(typeof cleanSettings[key] === 'string' && key !== 'id') {
            cleanSettings[key] = parseFloat(cleanSettings[key]) || 0;
        }
    }
    onSave(cleanSettings);
    // notify handled by parent
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">Nastavenia</h2>
      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-8">
        <div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 border-b dark:border-slate-800 pb-2">Stravné (Diéty)</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div><label className="block text-sm font-medium text-slate-500 mb-1">5 až 12 hodín (€)</label><input type="number" step="0.1" className="w-full border dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 rounded dark:text-white" value={localSettings.mealRateLow} onChange={e => handleChange('mealRateLow', e.target.value)} /></div>
            <div><label className="block text-sm font-medium text-slate-500 mb-1">12 až 18 hodín (€)</label><input type="number" step="0.1" className="w-full border dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 rounded dark:text-white" value={localSettings.mealRateMid} onChange={e => handleChange('mealRateMid', e.target.value)} /></div>
            <div><label className="block text-sm font-medium text-slate-500 mb-1">Nad 18 hodín (€)</label><input type="number" step="0.1" className="w-full border dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 rounded dark:text-white" value={localSettings.mealRateHigh} onChange={e => handleChange('mealRateHigh', e.target.value)} /></div>
          </div>
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 border-b dark:border-slate-800 pb-2">Amortizácia</h3>
          <div className="max-w-xs">
              <label className="block text-sm font-medium text-slate-500 mb-1">Sadzba za 1 km (€)</label>
              <input type="number" step="0.001" className="w-full border dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 rounded dark:text-white" value={localSettings.amortizationRate} onChange={e => handleChange('amortizationRate', e.target.value)} />
              <p className="text-xs text-slate-400 mt-1">Platí len pre súkromné vozidlá.</p>
          </div>
        </div>
        <div className="pt-4 flex justify-end">
          <button onClick={save} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-lg font-bold shadow-lg shadow-blue-900/20 flex items-center gap-2"><Save size={18}/> Uložiť nastavenia</button>
        </div>
      </div>
    </div>
  );
};
