routerAdd("POST", "/api/update-fuel-prices", (e) => {
    // Premenoval som 'c' na 'e' (event), lebo to je technicky presnejšie v novej verzii
    
    function log(msg) {
        console.log(`[FuelUpdate] ${msg}`);
    }

    function getWeekCode(date) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
        const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1)/7);
        return `${d.getUTCFullYear()}${String(weekNo).padStart(2, '0')}`;
    }

    try {
        // --- 1. ČÍTANIE VSTUPU Z URL (v0.23+ Safe Mode) ---
        let months = 3; // Predvolená hodnota, ak čítanie zlyhá
        
        try {
            // V novej verzii je 'e.request' štandardný Go http.Request
            // Musíme sa prebiť cez URL a Query metódy
            if (e.request && e.request.url) {
                // Skúsime získať query parametre. 
                // GoJa (JS engine) niekedy vyžaduje presný názov metódy (Query vs query).
                const queryObj = e.request.url.query(); 
                const val = queryObj.get("months");
                
                if (val) {
                    const parsed = parseInt(val);
                    if (!isNaN(parsed) && parsed > 0) {
                        months = parsed;
                        log(`Parameter prijatý: ${months} mesiacov`);
                    }
                }
            }
        } catch (err) {
            log(`Nepodarilo sa prečítať parameter '?months=', používam default ${months}. Info: ${err}`);
        }

        // Prepočet: 1 mesiac = cca 4.5 týždňa + rezerva
        const WEEKS_LIMIT = Math.ceil(months * 4.5) + 2;

        log(`Začínam aktualizáciu (Rozsah: ${WEEKS_LIMIT} týždňov)...`);

        // --- 2. GENERUJEME TÝŽDNE ---
        const weeksToFetch = [];
        const today = new Date();
        for (let i = 1; i <= WEEKS_LIMIT; i++) {
            const d = new Date();
            d.setDate(today.getDate() - (i * 7)); 
            weeksToFetch.push(getWeekCode(d));
        }
        const weeksString = weeksToFetch.reverse().join(",");
        
        // --- 3. DATA FETCH ---
        const dataUrl = `https://data.statistics.sk/api/v2/dataset/sp0207ts/${weeksString}/all?lang=sk`;
        // log(`URL: ${dataUrl}`);

        const headers = {
            "Accept": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        };

        const res = $http.send({ url: dataUrl, method: "GET", headers: headers, timeout: 60 });

        if (res.statusCode !== 200) {
            throw new Error(`API chyba: ${res.statusCode}`);
        }

        const json = res.json;
        if (!json.value || json.value.length === 0) {
            return e.json(200, { success: true, message: "API vrátilo prázdne dáta." });
        }

        // --- 4. IDENTIFIKÁCIA KÓDOV ---
        const dims = json.dimension;
        let fuelDimId = json.id.find(id => id.toLowerCase().includes("ukaz")) || json.id[1];
        let timeDimId = json.id.find(id => id.toLowerCase().includes("tyz")) || json.id[0];

        const fuelLabels = dims[fuelDimId].category.label; 
        const fuelIndices = dims[fuelDimId].category.index;
        const timeIndices = dims[timeDimId].category.index;

        let code95 = null;
        let codeDiesel = null;
        let codeLPG = null;

        for (let code in fuelLabels) {
            const name = fuelLabels[code].toLowerCase();
            if (name.includes("95") && name.includes("benzín")) code95 = code;
            if (name.includes("nafta")) codeDiesel = code;
            if (name.includes("lpg") || name.includes("skvapalnený")) codeLPG = code;
        }

        if (!code95) code95 = "FR02011"; 
        if (!codeDiesel) codeDiesel = "FR02012"; 
        if (!codeLPG) codeLPG = "FR02016"; 

        const dbMap = {};
        if (code95 && fuelIndices[code95] !== undefined) dbMap[code95] = "priceBenzin";
        if (codeDiesel && fuelIndices[codeDiesel] !== undefined) dbMap[codeDiesel] = "priceDiesel";
        if (codeLPG && fuelIndices[codeLPG] !== undefined) dbMap[codeLPG] = "priceLpg";

        // --- 5. SPRACOVANIE ---
        const values = json.value;
        const processedWeeks = {};
        
        const timeDimIdx = json.id.indexOf(timeDimId);
        const fuelDimIdx = json.id.indexOf(fuelDimId);
        const sizeTime = json.size[timeDimIdx];
        const sizeFuel = json.size[fuelDimIdx];

        Object.keys(timeIndices).forEach(weekCode => {
            const tIdx = timeIndices[weekCode];
            const year = parseInt(weekCode.substring(0, 4));
            const week = parseInt(weekCode.substring(4, 6));

            const simple = new Date(year, 0, 1 + (week - 1) * 7);
            const dayOfWeek = simple.getDay();
            const ISOweekStart = simple;
            if (dayOfWeek <= 4) ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
            else ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
            
            const validFrom = new Date(ISOweekStart);
            const validTo = new Date(validFrom);
            validTo.setDate(validTo.getDate() + 6);

            const dateStrKey = validFrom.toISOString().split('T')[0];
            const validFromPB = validFrom.toISOString().replace("T", " ").replace("Z", "");
            const validToPB = validTo.toISOString().replace("T", " ").replace("Z", "");

            processedWeeks[dateStrKey] = {
                validFrom: validFromPB,
                validTo: validToPB,
                prices: {}
            };

            for (let code in dbMap) {
                const fIdx = fuelIndices[code];
                let flatIndex = 0;
                if (timeDimIdx === 0) {
                     flatIndex = (tIdx * sizeFuel) + fIdx;
                } else {
                     flatIndex = (fIdx * sizeTime) + tIdx;
                }

                let val = values[flatIndex];
                if (!Array.isArray(values) && values) val = values[flatIndex.toString()];

                if (val !== null && val !== undefined) {
                    processedWeeks[dateStrKey].prices[dbMap[code]] = val;
                }
            }
        });

        // --- 6. ULOŽENIE ---
        let collection;
        try { collection = $app.findCollectionByNameOrId("fuel_prices"); } catch(ex) {}

        let stats = { created: 0, updated: 0 };

        if (collection) {
            $app.runInTransaction((txApp) => {
                for (let dateStr in processedWeeks) {
                    const entry = processedWeeks[dateStr];
                    if (Object.keys(entry.prices).length === 0) continue;

                    let existing = [];
                    try {
                        existing = txApp.findRecordsByFilter("fuel_prices", `validFrom ~ '${entry.validFrom.substring(0, 10)}'`);
                    } catch(ex) {}

                    const record = existing.length > 0 ? existing[0] : null;

                    if (record) {
                        let changed = false;
                        for (let field in entry.prices) {
                            if (Math.abs(record.getFloat(field) - entry.prices[field]) > 0.001) {
                                record.set(field, entry.prices[field]);
                                changed = true;
                            }
                        }
                        if (changed) { 
                            txApp.save(record); 
                            stats.updated++; 
                        }
                    } else {
                        const newRec = new Record(collection);
                        newRec.set("validFrom", entry.validFrom);
                        newRec.set("validTo", entry.validTo);
                        newRec.set("note", "API Import");
                        for (let field in entry.prices) {
                            newRec.set(field, entry.prices[field]);
                        }
                        txApp.save(newRec);
                        stats.created++;
                    }
                }
            });
        }

        log(`Hotovo. Spracované: ${months} mesiacov. Vytvorené: ${stats.created}, Aktualizované: ${stats.updated}`);
        return e.json(200, { success: true, ...stats });

    } catch (err) {
        log(`ERROR: ${err.toString()}`);
        return e.json(500, { error: err.toString() });
    }
});