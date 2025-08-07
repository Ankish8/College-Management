// Timetable Debugging Script
// Run this in your browser console on the timetable page

console.log("=== TIMETABLE DEBUG SCRIPT ===");

// 1. Check current week calculation
function debugWeekCalculation() {
    console.log("\n--- Week Calculation Debug ---");
    const currentDate = new Date();
    console.log("Current Date:", currentDate);
    console.log("Current Date String:", currentDate.toDateString());
    
    // Check startOfWeek calculation (similar to component)
    const startOfWeek = (date) => {
        const result = new Date(date);
        const day = result.getDay();
        const diff = result.getDate() - day + (day === 0 ? -6 : 1); // Monday = 1
        result.setDate(diff);
        return result;
    };
    
    const weekStart = startOfWeek(currentDate);
    console.log("Week Start (Monday):", weekStart);
    console.log("Week Start String:", weekStart.toDateString());
    
    const WEEKDAYS = [
        { key: 'MONDAY', label: 'Monday' },
        { key: 'TUESDAY', label: 'Tuesday' },
        { key: 'WEDNESDAY', label: 'Wednesday' },
        { key: 'THURSDAY', label: 'Thursday' },
        { key: 'FRIDAY', label: 'Friday' }
    ];
    
    const weekDays = WEEKDAYS.map((day, index) => {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + index);
        return {
            ...day,
            date: date,
            dateString: date.toDateString(),
            dayNumber: date.getDate()
        };
    });
    
    console.log("Week Days Mapping:");
    weekDays.forEach(day => {
        console.log(`${day.key}: ${day.dateString} (Day ${day.dayNumber})`);
    });
    
    return weekDays;
}

// 2. Check events and their dates
function debugEvents() {
    console.log("\n--- Events Debug ---");
    
    // Try to get events from the page
    const eventCards = document.querySelectorAll('[data-event-id]');
    console.log(`Found ${eventCards.length} event cards on page`);
    
    eventCards.forEach((card, index) => {
        const eventId = card.dataset.eventId;
        const eventText = card.textContent.trim();
        console.log(`Event ${index + 1}: ID=${eventId}, Text="${eventText}"`);
    });
    
    // Check if there's a global events array
    if (window.__TIMETABLE_EVENTS__) {
        console.log("Global events array found:", window.__TIMETABLE_EVENTS__);
    } else {
        console.log("No global events array found");
    }
}

// 3. Debug date click handling
function debugDateClicks() {
    console.log("\n--- Date Click Debug ---");
    
    // Find all plus buttons (for adding events)
    const plusButtons = document.querySelectorAll('button[data-testid*="add-event"], .grid button');
    console.log(`Found ${plusButtons.length} potential add buttons`);
    
    plusButtons.forEach((button, index) => {
        if (button.querySelector('svg') && button.querySelector('svg').classList.contains('lucide-plus')) {
            console.log(`Plus button ${index}: Parent element:`, button.parentElement);
            
            // Try to determine which day this belongs to
            const gridItem = button.closest('.grid > div');
            if (gridItem) {
                const gridIndex = Array.from(gridItem.parentElement.children).indexOf(gridItem);
                console.log(`Grid position: ${gridIndex}`);
            }
        }
    });
}

// 4. Debug API calls
function debugAPIInterception() {
    console.log("\n--- API Debug Setup ---");
    
    // Intercept fetch calls to timetable API
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
        const url = args[0];
        const options = args[1] || {};
        
        if (typeof url === 'string' && url.includes('/api/timetable')) {
            console.log("=== TIMETABLE API CALL ===");
            console.log("URL:", url);
            console.log("Method:", options.method || 'GET');
            
            if (options.body) {
                try {
                    const body = JSON.parse(options.body);
                    console.log("Request Body:", body);
                    
                    // Highlight date-related fields
                    if (body.date) console.log("🗓️ Date field:", body.date);
                    if (body.dayOfWeek) console.log("📅 Day of week:", body.dayOfWeek);
                } catch (e) {
                    console.log("Request Body (raw):", options.body);
                }
            }
            
            return originalFetch.apply(this, args).then(response => {
                console.log("Response Status:", response.status);
                
                if (!response.ok) {
                    response.clone().text().then(text => {
                        console.log("Error Response:", text);
                    });
                }
                
                return response;
            });
        }
        
        return originalFetch.apply(this, args);
    };
    
    console.log("API interception enabled. Now try creating an event.");
}

// 5. Check localStorage for debugging info
function debugStorage() {
    console.log("\n--- Storage Debug ---");
    
    const keys = Object.keys(localStorage);
    const timetableKeys = keys.filter(key => key.includes('timetable') || key.includes('calendar'));
    
    console.log("Timetable-related storage keys:", timetableKeys);
    timetableKeys.forEach(key => {
        console.log(`${key}:`, localStorage.getItem(key));
    });
}

// 6. Main debug function
function debugTimetable() {
    console.clear();
    console.log("🔍 Starting Timetable Debug...");
    
    const weekDays = debugWeekCalculation();
    debugEvents();
    debugDateClicks();
    debugStorage();
    debugAPIInterception();
    
    console.log("\n=== DEBUG COMPLETE ===");
    console.log("📝 Week days mapping saved to window.__DEBUG_WEEK_DAYS__");
    window.__DEBUG_WEEK_DAYS__ = weekDays;
    
    console.log("🔧 API interception is now active");
    console.log("💡 Try clicking on different days to add events and check the console");
}

// 7. Debug date clicking and event creation
function debugEventCreation() {
    console.log("\n--- Event Creation Debug ---");
    
    // Find all plus buttons and add click listeners
    const plusButtons = document.querySelectorAll('button');
    let addButtons = [];
    
    plusButtons.forEach(button => {
        const svg = button.querySelector('svg');
        if (svg && (svg.classList.contains('lucide-plus') || svg.querySelector('path[d*="M12 5v14"]'))) {
            addButtons.push(button);
        }
    });
    
    console.log(`Found ${addButtons.length} potential add buttons`);
    
    // Add debug info to each button
    addButtons.forEach((button, index) => {
        const rect = button.getBoundingClientRect();
        const gridCell = button.closest('.grid > div');
        let cellInfo = 'Unknown';
        
        if (gridCell) {
            const gridParent = gridCell.parentElement;
            const cellIndex = Array.from(gridParent.children).indexOf(gridCell);
            
            // Try to figure out which day/time this represents
            const timeSlot = button.closest('div[data-timeslot]')?.dataset.timeslot;
            const dayKey = button.closest('div[data-day]')?.dataset.day;
            
            cellInfo = `Grid position: ${cellIndex}, TimeSlot: ${timeSlot || 'N/A'}, Day: ${dayKey || 'N/A'}`;
        }
        
        console.log(`Add button ${index + 1}: ${cellInfo}`);
        
        // Add visual indicator
        button.style.outline = '2px solid red';
        button.title = `DEBUG: Button ${index + 1} - ${cellInfo}`;
        
        // Override click handler to log info
        const originalClick = button.onclick;
        button.onclick = function(e) {
            console.log(`\n🎯 BUTTON CLICKED: ${index + 1}`);
            console.log('Click position:', { x: e.clientX, y: e.clientY });
            console.log('Button info:', cellInfo);
            console.log('Event target:', e.target);
            
            // Call original handler if it exists
            if (originalClick) {
                originalClick.call(this, e);
            }
        };
    });
}

// 8. Monitor for popup creation
function monitorPopups() {
    console.log("\n--- Popup Monitor Setup ---");
    
    // Watch for popup elements being added to DOM
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === 1) { // Element node
                    // Check if it's a popup or modal
                    if (node.classList?.contains('popup') || 
                        node.classList?.contains('modal') ||
                        node.querySelector?.('[data-testid*="popup"]') ||
                        node.textContent?.includes('Quick Create')) {
                        
                        console.log('🎪 POPUP DETECTED:', node);
                        
                        // Log popup content
                        const inputs = node.querySelectorAll('input, select, textarea');
                        console.log('Popup inputs:', inputs.length);
                        
                        inputs.forEach((input, i) => {
                            console.log(`Input ${i + 1}:`, {
                                type: input.type || input.tagName,
                                value: input.value,
                                name: input.name || input.id,
                                placeholder: input.placeholder
                            });
                        });
                    }
                }
            });
        });
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    console.log('👀 Popup monitoring started');
}

// Updated main debug function
function debugTimetable() {
    console.clear();
    console.log("🔍 Starting Enhanced Timetable Debug...");
    
    const weekDays = debugWeekCalculation();
    debugEvents();
    debugDateClicks();
    debugStorage();
    debugAPIInterception();
    debugEventCreation();
    monitorPopups();
    
    console.log("\n=== DEBUG COMPLETE ===");
    console.log("📝 Week days mapping saved to window.__DEBUG_WEEK_DAYS__");
    window.__DEBUG_WEEK_DAYS__ = weekDays;
    
    console.log("🔧 API interception is now active");
    console.log("👀 Popup monitoring is active");
    console.log("🎯 Add buttons are highlighted in red");
    console.log("💡 Try clicking on different days to add events and check the console");
}

// Auto-run the debug
debugTimetable();

// Export functions to window for manual testing
window.debugTimetable = debugTimetable;
window.debugWeekCalculation = debugWeekCalculation;
window.debugEvents = debugEvents;
window.debugDateClicks = debugDateClicks;
window.debugEventCreation = debugEventCreation;
window.monitorPopups = monitorPopups;