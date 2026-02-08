 export interface Vehicle {
  id: string;
  name: string; // e.g. "Škoda Octavia"
  spz: string; // License Plate
  consumption: number; // l/100km
  fuelType: 'diesel' | 'benzin' | 'lpg' | 'electric';
  ownershipType: 'private' | 'company';
  isActive: boolean; // New: Soft delete/archive
}

export interface Employee {
  id: string;
  name: string;
  address: string;
  role?: string; // e.g. "Manažér"
  isActive: boolean; // New
}

export interface Waypoint {
  location: string;
  country: string;
}

export interface TripExpense {
  id: string;
  type: 'accommodation' | 'parking' | 'toll' | 'other';
  amount: number;
  note?: string;
}

export interface SavedLocation {
  id: string;
  name: string; // e.g. "Sídlo firmy", "Klient A"
  // Detailed address fields
  street: string; // e.g. "Mlynské Nivy 1"
  city: string; // e.g. "Bratislava"
  zip: string; // e.g. "821 09"
  country: string; // e.g. "Slovensko"
  note?: string; // Optional note
  
  // Legacy field (can be kept for backward compatibility or computed)
  address?: string; 
}

export interface Project {
  id: string;
  code: string; // e.g. "2024-001"
  name: string; // e.g. "Vývoj Web Aplikácie"
  isActive: boolean; // New
}

export interface Settlement {
  id: string;
  dateCreated: string;
  name: string; // e.g. "Vyúčtovanie Február 2026"
  status: 'draft' | 'approved'; // draft = editable, approved = closed/paid
  totalAmount: number;
  tripIds: string[];
}

export interface Trip {
  id: string;
  vehicleId: string;
  employeeId: string;
  projectId?: string; // Linked Project
  
  dateStart: string; // ISO string
  dateEnd: string; // ISO string
  
  // Route details
  origin: string; // Start point
  originCountry: string;
  
  waypoints: Waypoint[]; // Intermediate stops
  
  destination: string; // End point
  destinationCountry: string;

  // Odometer details
  odometerStart?: number;
  odometerEnd?: number;
  distanceKm: number;
  
  purpose: string;
  notes?: string;

  // Additional expenses
  expenses?: TripExpense[];

  // Settlement status
  isSettled: boolean; // If true, belongs to an approved settlement
  settlementId?: string;
}

export interface Settings {
  // Meal allowances (Stravné)
  mealRateLow: number; // 5-12h
  mealRateMid: number; // 12-18h
  mealRateHigh: number; // 18h+
  
  // Amortization (Basic compensation for using private car)
  amortizationRate: number; // EUR/km
}

export interface FuelPriceRecord {
    id: string;
    validFrom: string; // ISO date string
    validTo: string; // ISO date string
    priceDiesel: number;
    priceBenzin: number;
    priceLpg: number;
    priceElectric: number;
    note?: string;
}

export interface TripCalculation {

  durationHours: number;

  mealAllowance: number;

  fuelCost: number;

  amortizationCost: number;

  otherExpensesCost: number;

  totalCost: number;

}



// --- PocketBase TypeSafe SDK ---

import PocketBase, { type RecordService } from 'pocketbase';



export type TCollections = {

    vehicles: Vehicle;

    employees: Employee;

    projects: Project;

    saved_locations: SavedLocation;

    settlements: Settlement;

    trips: Trip;

    settings: Settings;

    fuel_prices: FuelPriceRecord;

}



export type TypedPocketBase = PocketBase & {

    collection(idOrName: 'vehicles'): RecordService<Vehicle>;

    collection(idOrName: 'employees'): RecordService<Employee>;

    collection(idOrName: 'projects'): RecordService<Project>;

    collection(idOrName: 'saved_locations'): RecordService<SavedLocation>;

    collection(idOrName: 'settlements'): RecordService<Settlement>;

    collection(idOrName: 'trips'): RecordService<Trip>;

    collection(idOrName: 'settings'): RecordService<Settings>;

    collection(idOrName: 'fuel_prices'): RecordService<FuelPriceRecord>;

}
