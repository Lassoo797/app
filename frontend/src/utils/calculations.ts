import { FuelPriceRecord, Settings, Trip, Vehicle, TripCalculation } from '../types';

export const calculateTripCosts = (
  trip: Trip,
  vehicle: Vehicle | undefined,
  settings: Settings,
  fuelPrices: FuelPriceRecord[]
): TripCalculation => {
  const start = new Date(trip.dateStart);
  const end = new Date(trip.dateEnd);
  
  // Calculate duration in hours
  const diffMs = end.getTime() - start.getTime();
  const durationHours = diffMs / (1000 * 60 * 60);

  // 1. Meal Allowance (Stravné)
  let mealAllowance = 0;
  if (durationHours >= 5 && durationHours < 12) {
    mealAllowance = settings.mealRateLow;
  } else if (durationHours >= 12 && durationHours <= 18) {
    mealAllowance = settings.mealRateMid;
  } else if (durationHours > 18) {
    mealAllowance = settings.mealRateHigh;
  }

  // 2. Travel Expenses
  let fuelCost = 0;
  let amortizationCost = 0;

  if (vehicle) {
    // Determine fuel price
    // Look for a specific fuel price record for the trip date
    // Sort by validity to ensure we check the correct period
    // The trip dateStart determines which period applies
    const tripDate = new Date(trip.dateStart);
    
    // Find matching record: validFrom <= tripDate <= validTo
    const matchingPriceRecord = fuelPrices.find(p => {
        const from = new Date(p.validFrom);
        const to = new Date(p.validTo);
        // Normalize comparison by stripping time or use timestamps
        return tripDate.getTime() >= from.getTime() && tripDate.getTime() <= to.getTime();
    });

    let price = 0;
    
    if (matchingPriceRecord) {
        switch(vehicle.fuelType) {
            case 'diesel': price = matchingPriceRecord.priceDiesel; break;
            case 'benzin': price = matchingPriceRecord.priceBenzin; break;
            case 'lpg': price = matchingPriceRecord.priceLpg; break;
            case 'electric': price = matchingPriceRecord.priceElectric; break;
        }
    } else {
        // WARNING: No fuel price found for this date!
        // In a real app, we might want to flag this.
        // For now, price remains 0 and cost will be 0.
        // The UI should alert the user.
        // console.warn(`No fuel price found for date ${tripDate.toISOString()} and type ${vehicle.fuelType}`);
    }
    
    // Fuel Cost = (Distance / 100) * Consumption * Price
    fuelCost = (trip.distanceKm / 100) * vehicle.consumption * price;

    // Amortization = Distance * Rate
    // ONLY for private vehicles. Company vehicles get 0 amortization.
    if (vehicle.ownershipType === 'private') {
      amortizationCost = trip.distanceKm * settings.amortizationRate;
    } else {
      amortizationCost = 0;
    }
  }

  // 3. Other Expenses
  let otherExpensesCost = 0;
  if (trip.expenses) {
    otherExpensesCost = trip.expenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }

  return {
    durationHours,
    mealAllowance,
    fuelCost,
    amortizationCost,
    otherExpensesCost,
    totalCost: mealAllowance + fuelCost + amortizationCost + otherExpensesCost,
  };
};

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('sk-SK', { style: 'currency', currency: 'EUR' }).format(amount);
};

export const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('sk-SK', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const formatRoute = (trip: Trip) => {
  // Extract city from address string (simple heuristic: take part before first comma if present, or whole string)
  const extractCity = (loc: string) => {
      if (!loc) return '';
      const parts = loc.split(',');
      // If contains comma, usually "Street 1, City, Zip", we want City? 
      // Actually standard format in this app is often "City" or "Street, City".
      // Let's try to be smart: if it has commas, usually the second part is city or the last part before country.
      // But user input varies. Let's just return the whole string for now if it's short, or try to simplify.
      
      // Better approach for this request: If user inputs "Bratislava, Ružinov", show "Bratislava".
      // If "Mlynské Nivy 1, Bratislava", show "Bratislava".
      
      // Heuristic: Check if there is a number. If yes, it's likely an address. 
      // Try to find the part that looks like a city name.
      // Simplest robust solution: If comma exists, take the part that has NO number.
      
      if (loc.includes(',')) {
          const segments = loc.split(',').map(s => s.trim());
          // Find segment with no digits (likely city)
          const citySegment = segments.find(s => !/\d/.test(s));
          return citySegment || segments[0]; // Fallback to first part
      }
      return loc;
  };

  const originCity = extractCity(trip.origin);
  const destCity = extractCity(trip.destination);

  const parts = [originCity];
  if (trip.waypoints && trip.waypoints.length > 0) {
    trip.waypoints.forEach(wp => parts.push(extractCity(wp.location)));
  }
  parts.push(destCity);
  return parts.join(' ➝ ');
};

export const getCountriesString = (trip: Trip) => {
  const set = new Set<string>();
  set.add(trip.originCountry || 'Slovensko');
  if (trip.waypoints) trip.waypoints.forEach(wp => set.add(wp.country));
  set.add(trip.destinationCountry || 'Slovensko');
  return Array.from(set).join(', ');
};