import { Trip, Vehicle, Settings, Employee, Project, FuelPriceRecord } from '../types';
import { calculateTripCosts, formatCurrency, formatDate, formatRoute, getCountriesString } from '../utils/calculations';

// Declaration for jspdf loaded via CDN
declare const jspdf: any;

/**
 * Loads a font that supports Central European characters (UTF-8).
 */
const loadCustomFont = async (doc: any) => {
  // Using a reliable source for Roboto-Regular
  const fontUrl = "https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Regular.ttf";
  try {
    const response = await fetch(fontUrl);
    if (!response.ok) throw new Error("Font fetch failed");
    const buffer = await response.arrayBuffer();
    const base64String = btoa(
      new Uint8Array(buffer)
        .reduce((data, byte) => data + String.fromCharCode(byte), '')
    );
    
    const fontFileName = "Roboto-Regular.ttf";
    doc.addFileToVFS(fontFileName, base64String);
    doc.addFont(fontFileName, "Roboto", "normal");
    doc.setFont("Roboto", "normal"); // Always set to normal
  } catch (e) {
    console.error("Failed to load custom font, fallback to standard", e);
    doc.setFont("helvetica");
  }
};

/**
 * Internal helper to draw a single trip detail on the current PDF page.
 */
const drawTripDetail = (
  doc: any,
  trip: Trip,
  vehicle: Vehicle | undefined,
  employee: Employee | undefined,
  project: Project | undefined,
  settings: Settings,
  fuelPrices: FuelPriceRecord[]
) => {
  const calc = calculateTripCosts(trip, vehicle, settings, fuelPrices);
  const isCompanyCar = vehicle?.ownershipType === 'company';

  // Header
  doc.setFontSize(22);
  doc.setFont("Roboto", "normal");
  doc.text("Cestovný príkaz a vyúčtovanie", 105, 20, { align: "center" });

  doc.setFontSize(10);
  doc.text(`ID: ${trip.id.substring(0, 8)}`, 190, 15, { align: "right" });
  doc.text(`Vygenerované: ${new Date().toLocaleDateString('sk-SK')}`, 105, 30, { align: "center" });

  // Section 1: Basic Info
  let y = 45;
  doc.setDrawColor(200);
  doc.line(20, y - 5, 190, y - 5);
  
  doc.setFontSize(12);
  doc.text("Údaje o ceste a osobe", 20, y);
  y += 10;
  
  doc.setFontSize(10);
  const leftX = 20;
  const rightX = 110;
  
  // Employee Info
  if (employee) {
    doc.text(`Meno a priezvisko:`, leftX, y);
    doc.text(employee.name, leftX + 40, y);
    doc.text(`Adresa:`, rightX, y);
    doc.text(employee.address, rightX + 40, y);
    y += 10;
  }

  doc.text(`Začiatok cesty:`, leftX, y);
  doc.text(formatDate(trip.dateStart), leftX + 40, y);
  
  doc.text(`Koniec cesty:`, rightX, y);
  doc.text(formatDate(trip.dateEnd), rightX + 40, y);
  y += 10;

  // Route visualization
  doc.text(`Trasa:`, leftX, y);
  const routeStr = formatRoute(trip);
  const splitRoute = doc.splitTextToSize(routeStr, 150);
  doc.text(splitRoute, leftX + 40, y);
  y += (splitRoute.length * 5) + 5;

  doc.text(`Krajiny:`, leftX, y);
  doc.text(getCountriesString(trip), leftX + 40, y);
  y += 10;

  if (project) {
    doc.text(`Zákazka:`, leftX, y);
    doc.text(`${project.code} - ${project.name}`, leftX + 40, y);
    y += 10;
  }

  doc.text(`Účel cesty:`, leftX, y);
  doc.text(trip.purpose, leftX + 40, y);
  y += 15;

  // Section 2: Vehicle
  doc.line(20, y - 5, 190, y - 5);
  doc.setFontSize(12);
  doc.text("Vozidlo", 20, y);
  y += 10;

  doc.setFontSize(10);
  const vehicleTitle = vehicle 
    ? `${vehicle.name} (${vehicle.spz}) - ${vehicle.ownershipType === 'company' ? 'Firemné' : 'Súkromné'}`
    : 'Neznáme';
  
  doc.text(`Vozidlo: ${vehicleTitle}`, leftX, y);
  doc.text(`Vzdialenosť: ${trip.distanceKm} km`, rightX, y);
  y += 10;
  
  if(trip.odometerStart || trip.odometerEnd) {
      doc.text(`Tachometer Štart: ${trip.odometerStart || '-'} km`, leftX, y);
      doc.text(`Tachometer Koniec: ${trip.odometerEnd || '-'} km`, rightX, y);
      y += 10;
  }

  doc.text(`Spotreba: ${vehicle?.consumption || 0} l/100km`, leftX, y);
  y += 15;

  // Section 3: Calculation Details
  doc.line(20, y - 5, 190, y - 5);
  doc.setFontSize(12);
  doc.text("Vyúčtovanie náhrad", 20, y);
  y += 10;

  const headers = ["Položka", "Výpočet", "Suma"];
  const data = [
    ["Trvanie cesty", `${calc.durationHours.toFixed(2)} hod.`, "-"],
    ["Stravné (Diéty)", "Podľa trvania a sadzby", formatCurrency(calc.mealAllowance)],
    ["Spotreba PHM", `${trip.distanceKm}km * ${vehicle?.consumption}l/100 * cena`, formatCurrency(calc.fuelCost)],
  ];

  if (!isCompanyCar) {
    data.push(
      ["Amortizácia", `${trip.distanceKm}km * ${settings.amortizationRate}€`, formatCurrency(calc.amortizationCost)]
    );
  } else {
    data.push(
      ["Amortizácia", "Firemné vozidlo (0€)", formatCurrency(0)]
    );
  }

  // Add Expenses
  if (trip.expenses && trip.expenses.length > 0) {
    trip.expenses.forEach(ex => {
        const typeLabel = ex.type === 'parking' ? 'Parkovné' : ex.type === 'accommodation' ? 'Ubytovanie' : ex.type === 'toll' ? 'Mýto' : 'Iné';
        data.push([
            typeLabel, 
            ex.note || '-', 
            formatCurrency(Number(ex.amount) || 0)
        ]);
    });
  }

  if (doc.autoTable) {
    doc.autoTable({
      startY: y,
      head: [headers],
      body: data,
      theme: 'striped',
      headStyles: { fillColor: [63, 81, 181], font: "Roboto", fontStyle: 'normal' },
      styles: { font: "Roboto", fontStyle: "normal" }, 
      margin: { left: 20, right: 20 }
    });
    y = doc.lastAutoTable.finalY + 15;
  } else {
    doc.setFont("Roboto", "normal");
    data.forEach(row => {
        doc.text(`${row[0]}: ${row[2]}`, 20, y);
        y += 7;
    });
    y += 10;
  }

  // Total
  doc.setFontSize(14);
  doc.text(`Celkom k úhrade: ${formatCurrency(calc.totalCost)}`, 190, y, { align: "right" });
  
  y += 30;

  // Signatures
  doc.setFontSize(10);
  
  if (y > 250) {
    doc.addPage();
    y = 40;
  }
  
  doc.line(20, y, 80, y);
  doc.text("Podpis zamestnanca", 20, y + 5);

  doc.line(120, y, 180, y);
  doc.text("Schválil (Podpis nadriadeného)", 120, y + 5);
};

export const generateTripPDF = async (
  trip: Trip, 
  vehicle: Vehicle | undefined, 
  employee: Employee | undefined,
  project: Project | undefined,
  settings: Settings,
  fuelPrices: FuelPriceRecord[]
) => {
  if (!trip) return;
  const { jsPDF } = jspdf;
  const doc = new jsPDF();
  
  await loadCustomFont(doc);
  drawTripDetail(doc, trip, vehicle, employee, project, settings, fuelPrices);
  doc.save(`cp-${trip.id.substring(0,6)}.pdf`);
};

export const generateSummaryPDF = async (
  trips: Trip[],
  employees: Employee[],
  vehicles: Vehicle[],
  projects: Project[],
  settings: Settings,
  fuelPrices: FuelPriceRecord[],
  reportName: string = "Súhrnné vyúčtovanie",
  status: string = "Návrh" // e.g., 'Schválené'
) => {
  if (trips.length === 0) return;

  const { jsPDF } = jspdf;
  const doc = new jsPDF('p'); // Portrait for summary report usually looks better with cover page
  
  await loadCustomFont(doc);

  // --- CALCUALTE TOTALS ---
  let grandTotal = 0;
  let totalKm = 0;
  let totalMeal = 0;
  let totalFuel = 0;
  let totalAmort = 0;
  let totalOther = 0;
  
  let startOdometer = 0;
  let endOdometer = 0;

  // Sort trips by date to determine start/end odometer correctly
  const sortedTrips = [...trips].sort((a,b) => new Date(a.dateStart).getTime() - new Date(b.dateStart).getTime());
  
  if (sortedTrips.length > 0) {
      startOdometer = sortedTrips[0].odometerStart || 0;
      endOdometer = sortedTrips[sortedTrips.length - 1].odometerEnd || 0;
  }

  let minDate = new Date(sortedTrips[0].dateStart).getTime();
  let maxDate = new Date(sortedTrips[sortedTrips.length - 1].dateEnd).getTime();

  const tableBody = sortedTrips.map(trip => {
    const vehicle = vehicles.find(v => v.id === trip.vehicleId);
    const calc = calculateTripCosts(trip, vehicle, settings, fuelPrices);

    grandTotal += calc.totalCost;
    totalKm += trip.distanceKm;
    totalMeal += calc.mealAllowance;
    totalFuel += calc.fuelCost;
    totalAmort += calc.amortizationCost;
    totalOther += calc.otherExpensesCost;
    
    const tStart = new Date(trip.dateStart).getTime();
    const tEnd = new Date(trip.dateEnd).getTime();
    if(tStart < minDate) minDate = tStart;
    if(tEnd > maxDate) maxDate = tEnd;

    const dateStr = `${new Date(trip.dateStart).toLocaleDateString('sk-SK')}\n${new Date(trip.dateStart).toLocaleTimeString('sk-SK', {hour:'2-digit', minute:'2-digit'})} - ${new Date(trip.dateEnd).toLocaleTimeString('sk-SK', {hour:'2-digit', minute:'2-digit'})}\n(${calc.durationHours.toFixed(1)}h)`;
    
    return [
      dateStr,
      formatRoute(trip),
      trip.purpose,
      vehicle ? vehicle.spz : '?',
      trip.distanceKm,
      formatCurrency(calc.mealAllowance),
      formatCurrency(calc.fuelCost),
      formatCurrency(calc.amortizationCost),
      formatCurrency(calc.otherExpensesCost),
      formatCurrency(calc.totalCost)
    ];
  });

  tableBody.push([
    "", "", "", "SPOLU", 
    totalKm, 
    formatCurrency(totalMeal),
    formatCurrency(totalFuel),
    formatCurrency(totalAmort),
    formatCurrency(totalOther),
    formatCurrency(grandTotal)
  ]);

  // --- COVER PAGE SECTION ---
  let y = 30;

  // Header
  doc.setFontSize(24);
  doc.setFont("Roboto", "normal");
  doc.text("Súhrnné vyúčtovanie pracovných ciest", 105, y, { align: "center" });
  y += 20;

  // Meta Info Box
  doc.setDrawColor(220);
  doc.setFillColor(250, 250, 250);
  doc.roundedRect(20, y, 170, 95, 3, 3, 'FD'); // Increased height
  
  y += 15;
  doc.setFontSize(12);
  doc.text("Názov reportu:", 30, y);
  doc.setFontSize(12);
  doc.text(reportName, 80, y);
  
  y += 10;
  doc.setFontSize(12);
  doc.text("Dátum vyhotovenia:", 30, y);
  doc.text(new Date().toLocaleDateString('sk-SK'), 80, y);

  y += 10;
  doc.text("Obdobie ciest:", 30, y);
  doc.text(`${new Date(minDate).toLocaleDateString('sk-SK')} - ${new Date(maxDate).toLocaleDateString('sk-SK')}`, 80, y);

  y += 10;
  doc.text("Počet ciest:", 30, y);
  doc.text(`${trips.length}`, 80, y);

  y += 10;
  doc.text("Celkom najazdené:", 30, y);
  doc.text(`${totalKm} km`, 80, y);

  y += 10;
  doc.text("Stav tachometra:", 30, y);
  doc.text(`Začiatok: ${startOdometer} km  ➝  Koniec: ${endOdometer} km`, 80, y);

  y += 15;
  doc.line(30, y, 180, y); // Separator
  y += 10;

  // Detailed Totals in Header
  doc.setFontSize(10);
  const col1 = 30;
  const col2 = 80;
  const col3 = 130;
  
  doc.text("Stravné:", col1, y);
  doc.text(formatCurrency(totalMeal), col1 + 25, y);
  
  doc.text("PHM:", col2, y);
  doc.text(formatCurrency(totalFuel), col2 + 25, y);
  
  doc.text("Amortizácia:", col3, y);
  doc.text(formatCurrency(totalAmort), col3 + 30, y);
  
  y += 15;
  
  // Big Totals
  doc.setFontSize(14);
  doc.text("Celkom k úhrade:", 30, y);
  doc.setFontSize(18);
  doc.text(formatCurrency(grandTotal), 80, y);

  y += 20;

  // --- TRIPS TABLE ---
  doc.setFontSize(14);
  doc.text("Detailný rozpis ciest", 20, y);
  y += 5;

  const tableHead = [
    ["Dátum", "Trasa", "Účel", "Vozidlo", "Km", "Stravné", "PHM", "Amort.", "Iné", "Spolu"]
  ];

  if (doc.autoTable) {
    doc.autoTable({
      startY: y,
      head: tableHead,
      body: tableBody,
      theme: 'plain', // Plain theme to custom draw lines
      headStyles: { fillColor: [33, 33, 33], font: 'Roboto', fontStyle: 'normal', textColor: 255 },
      styles: { font: "Roboto", fontStyle: "normal", fontSize: 8, cellPadding: 2, valign: 'middle' },
      columnStyles: {
        0: { cellWidth: 26 }, // Date (Wider for time)
        1: { cellWidth: 'auto' }, // Route
        2: { cellWidth: 'auto' }, // Purpose
        3: { cellWidth: 15 }, // Vehicle
        4: { halign: 'right', cellWidth: 12 }, // Km
        5: { halign: 'right', cellWidth: 15 }, // Stravne
        6: { halign: 'right', cellWidth: 15 }, // PHM
        7: { halign: 'right', cellWidth: 15 }, // Amort
        8: { halign: 'right', cellWidth: 12 }, // Ine
        9: { halign: 'right', fontStyle: 'bold', cellWidth: 18 } // Spolu
      },
      didDrawCell: (data: any) => {
          const { doc, cell, row } = data;
          const isHeader = data.section === 'head';
          const isFooter = row.index === tableBody.length - 1;
          const isBody = data.section === 'body' && !isFooter;

          // Draw Vertical Lines
          doc.setDrawColor(220, 220, 220);
          doc.setLineWidth(0.1);
          doc.setLineDash([]);
          // Left border for first column, Right border for all
          if(data.column.index === 0) doc.line(cell.x, cell.y, cell.x, cell.y + cell.height);
          doc.line(cell.x + cell.width, cell.y, cell.x + cell.width, cell.y + cell.height);

          // Header Borders
          if (isHeader) {
             // Already handled by fill, but maybe bottom line?
          }

          // Body: Dashed Bottom Line
          if (isBody) {
              doc.setLineDash([2, 2], 0); // Dashed
              doc.line(cell.x, cell.y + cell.height, cell.x + cell.width, cell.y + cell.height);
              doc.setLineDash([]); // Reset
          }

          // Footer: Solid Top (separator from body) and Bottom
          if (isFooter) {
              doc.setDrawColor(100, 100, 100);
              doc.setLineWidth(0.2);
              // Top of footer
              doc.line(cell.x, cell.y, cell.x + cell.width, cell.y);
              // Bottom of footer
              doc.line(cell.x, cell.y + cell.height, cell.x + cell.width, cell.y + cell.height);
          }
      },
      didParseCell: (data: any) => {
          if (data.row.index === tableBody.length - 1) {
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.fillColor = [240, 240, 240];
          }
      }
    });
  }

  doc.save(`${reportName.replace(/\s+/g, '_').toLowerCase()}.pdf`);
};