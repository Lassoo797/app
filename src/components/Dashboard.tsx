import React, { useMemo } from 'react';
import { DollarSign, CheckCircle, Lock, PieChart } from 'lucide-react';
import { Trip, Vehicle, Project, Settings, FuelPriceRecord } from '../types';
import { calculateTripCosts, formatCurrency } from '../utils/calculations';
import { Card } from './Shared';

interface DashboardProps {
  trips: Trip[];
  settings: Settings;
  vehicles: Vehicle[];
  projects: Project[];
  fuelPrices: FuelPriceRecord[];
}

export const Dashboard: React.FC<DashboardProps> = ({ trips, settings, vehicles, projects, fuelPrices }) => {
  const stats = useMemo(() => {
    let totalCost = 0;
    let settledCost = 0;
    let unsettledCost = 0;
    let totalKm = 0;
    const projectsMap: Record<string, number> = {}; // Rename for clarity

    trips.forEach((t: Trip) => {
      const v = vehicles.find((veh) => veh.id === t.vehicleId);
      // Calculate using fuel prices
      const c = calculateTripCosts(t, v, settings, fuelPrices);
      
      const tripTotal = c.totalCost;

      totalCost += tripTotal;
      totalKm += t.distanceKm;
      
      if (t.isSettled) {
        settledCost += tripTotal;
      } else {
        unsettledCost += tripTotal;
      }

      // Fix for "Property 'name' does not exist on type 'unknown'"
      // Ensure we are accessing the project name safely
      let pName = 'Bez projektu';
      if (t.projectId) {
          const proj = projects.find(p => p.id === t.projectId);
          if (proj) {
              pName = proj.name;
          }
      }

      if (!projectsMap[pName]) projectsMap[pName] = 0;
      projectsMap[pName] += tripTotal;
    });

    // Sort projects by cost
    const topProjects = Object.entries(projectsMap)
        .sort(([, costA], [, costB]) => costB - costA)
        .slice(0, 5); // Top 5

    return { 
      totalCost, 
      settledCost, 
      unsettledCost, 
      totalKm, 
      tripsCount: trips.length, 
      topProjects
    };
  }, [trips, settings, vehicles, projects, fuelPrices]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <h2 className="text-3xl font-bold text-slate-800 dark:text-white">Prehľad</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card title="Celkové Náklady" value={formatCurrency(stats.totalCost)} subValue={`${stats.tripsCount} ciest | ${stats.totalKm} km`} icon={DollarSign} colorClass="text-blue-600 bg-blue-600" />
        <Card title="Vyúčtované" value={formatCurrency(stats.settledCost)} subValue="Uzavreté" icon={CheckCircle} colorClass="text-green-600 bg-green-600" delay={100} />
        <Card title="Nevyúčtované" value={formatCurrency(stats.unsettledCost)} subValue="Otvorené" icon={Lock} colorClass="text-orange-500 bg-orange-500" delay={200} />
      </div>
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
         <h3 className="font-bold text-lg mb-6 text-slate-800 dark:text-white flex items-center gap-2"><PieChart size={20}/> Náklady podľa projektov</h3>
         <div className="space-y-4">
            {stats.topProjects.map(([name, amount]) => (
                <div key={name}>
                    <div className="flex justify-between text-sm font-medium mb-1 dark:text-slate-300">
                        <span>{name}</span>
                        <span>{formatCurrency(amount)}</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5">
                        <div className="bg-blue-600 h-2.5 rounded-full" style={{width: `${(amount / (stats.totalCost || 1)) * 100}%`}}></div>
                    </div>
                </div>
            ))}
            {stats.topProjects.length === 0 && <p className="text-slate-500 text-sm">Žiadne dáta na zobrazenie.</p>}
         </div>
      </div>
    </div>
  );
};