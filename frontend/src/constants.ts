import { Settings, Employee, Vehicle, Project, SavedLocation } from './types';

// Based on Slovak legislation valid around late 2024/2025 (Estimates for demo)
export const DEFAULT_SETTINGS: Settings = {
  mealRateLow: 7.80,   // 5 až 12 hodín
  mealRateMid: 11.60,  // 12 až 18 hodín
  mealRateHigh: 17.40, // nad 18 hodín
  
  amortizationRate: 0.252, // Sadzba základnej náhrady za 1 km (osobné auto)
};

export const FUEL_LABELS: Record<string, string> = {
  diesel: 'Nafta',
  benzin: 'Benzín',
  lpg: 'LPG',
  electric: 'Elektrina',
};

// --- SEED DATA ---

export const SEED_EMPLOYEES: Employee[] = [
  {
    id: 'emp-001',
    name: 'Ladislav Tóth',
    address: 'Hlavná 123, 040 01 Košice',
    role: 'Obchodný zástupca',
    isActive: true
  }
];

export const SEED_VEHICLES: Vehicle[] = [
  {
    id: 'veh-001',
    name: 'Opel Grandland',
    spz: 'NR-168MH',
    consumption: 6.5,
    fuelType: 'diesel',
    ownershipType: 'private',
    isActive: true
  },
  {
    id: 'veh-002',
    name: 'Škoda Superb (Firemná)',
    spz: 'BA-123XY',
    consumption: 7.2,
    fuelType: 'diesel',
    ownershipType: 'company',
    isActive: true
  }
];

export const SEED_PROJECTS: Project[] = [
  { id: 'proj-001', code: 'INT-2026', name: 'Interná réžia', isActive: true },
  { id: 'proj-002', code: 'ZAK-105', name: 'Implementácia ERP - Klient A', isActive: true }
];

export const SEED_LOCATIONS: SavedLocation[] = [
  { id: 'loc-001', name: 'Sídlo Firmy', street: 'Prievozská 4D', city: 'Bratislava', zip: '82109', country: 'Slovensko', address: 'Prievozská 4D, Bratislava' },
  { id: 'loc-002', name: 'Klient A (Výroba)', street: 'Strojárenská 5', city: 'Trnava', zip: '91701', country: 'Slovensko', address: 'Strojárenská 5, Trnava' }
];
