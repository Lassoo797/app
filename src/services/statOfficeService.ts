import { FuelPriceRecord } from '../types';
import pb from './db';

const PB_API_URL = "/api/update-fuel-prices";

export interface DiffResult {
    dateStr: string;
    existingRecord: FuelPriceRecord;
    newRecord: Partial<FuelPriceRecord>; // Proposed changes
    diffs: { field: string; oldVal: number; newVal: number }[];
}

export interface FetchResult {
    newRecords: Partial<FuelPriceRecord>[];
    conflicts: DiffResult[];
}

// NOTE: This function now calls the Backend Hook instead of external API directly
export const fetchFuelPricesFromAPI = async (
    monthsBack: number, 
    existingRecords: FuelPriceRecord[],
    // pb instance is now imported directly
): Promise<FetchResult> => {
    try {
        // ZMENA: Posielame monthsBack ako parameter v URL (?months=...), nie v body.
        // Je to spoľahlivejšie pre čítanie v JS hookoch.
        const response = await pb.send(`${PB_API_URL}?months=${monthsBack}`, {
             method: 'POST',
             body: {} // Body môže byť prázdne
        });

        console.log("Fuel prices update response:", response);

        // The backend handles the update directly. 
        return { newRecords: [], conflicts: [] };

    } catch (error: any) {
        console.error("Error fetching fuel prices from backend:", error);
        
        if (error.status === 404) {
             console.error("Endpoint not found. Did you restart PocketBase after adding the hook?");
        }
        throw error;
    }
};

// Deprecated helper (kept if needed elsewhere, but logic moved to backend)
export const getWeekRange = (yearWeek: string) => {
    const match = yearWeek.match(/(\d{4}).*(\d{1,2})/);
    if (!match) return null;
    const year = parseInt(match[1], 10);
    const week = parseInt(match[2], 10);
    const simple = new Date(year, 0, 1 + (week - 1) * 7);
    const dayOfWeek = simple.getDay();
    const ISOweekStart = simple;
    if (dayOfWeek <= 4)
        ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
    else
        ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
    const validFrom = new Date(ISOweekStart);
    const validTo = new Date(ISOweekStart);
    validTo.setDate(validTo.getDate() + 6);
    return {
        validFrom: validFrom.toISOString(),
        validTo: validTo.toISOString()
    };
};

