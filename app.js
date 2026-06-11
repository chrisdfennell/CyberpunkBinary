/**
 * CYBERPUNK BINARY - Garmin Watch Face Simulator
 * Canvas-based rendering engine matching Garmin View.mc logic
 */

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('watch-canvas');
    const ctx = canvas.getContext('2d');

    // State Variables
    let currentTheme = 'cyan';
    let isAOD = false;
    let showSeconds = true;
    let showLabels = true;
    let gridMode = 'bcd'; // 'bcd' or 'pure'
    let freezeTime = false;

    // Slot settings (Left, Center, Right)
    const slots = {
        left: 'steps',
        center: 'batt',
        right: 'hr'
    };

    // Theme Accents Mapping
    const themes = {
        cyan: { primary: '#00ffff', glow: 'rgba(0, 255, 255, 0.25)', dim: '#005555', inactiveDot: '#1a282d', inactiveBorder: '#29434b' },
        pink: { primary: '#ff00ff', glow: 'rgba(255, 0, 255, 0.25)', dim: '#550055', inactiveDot: '#2d1a2d', inactiveBorder: '#4b294b' },
        green: { primary: '#00ff00', glow: 'rgba(0, 255, 0, 0.25)', dim: '#005500', inactiveDot: '#1a2d1a', inactiveBorder: '#294b29' },
        amber: { primary: '#ff8800', glow: 'rgba(255, 136, 0, 0.25)', dim: '#552200', inactiveDot: '#2d231a', inactiveBorder: '#4b3c29' },
        slate: { primary: '#ffffff', glow: 'rgba(255, 255, 255, 0.15)', dim: '#555555', inactiveDot: '#222225', inactiveBorder: '#3f3f45' }
    };

    // Live Simulated Metrics
    const metrics = {
        steps: 0,
        stepGoal: 10000,
        batt: 50,
        battDays: 5.0,
        hr: 72,
        weather: 72,
        cal: 420,
        mins: 28,
        dist: 4.2,
        solar: 50,
        notifications: 2,
        phoneConnected: true,
        hrHistory: [70, 71, 73, 72, 75, 76, 74, 72, 71, 73, 75, 78, 79, 74, 72],
        floors: 8,
        floorsGoal: 10,
        activeMinsGoal: 150,
        recovery: 18,
        stress: 35,
        bodyBattery: 78,
        altitude: 1240,
        baro: 1013,
        alarms: 2,
        respiration: 14
    };

    // AOD shift positions (to avoid burn in)
    let aodShiftX = 0;
    let aodShiftY = 0;

    // --- DOM Elements ---
    const themeBtns = document.querySelectorAll('.theme-btn');
    const gridModeSelect = document.getElementById('grid-mode-select');
    const aodToggle = document.getElementById('aod-toggle');
    const secondsToggle = document.getElementById('seconds-toggle');
    const labelsToggle = document.getElementById('labels-toggle');
    const freezeToggle = document.getElementById('freeze-toggle');

    const slotLeftSelect = document.getElementById('slot-left');
    const slotCenterSelect = document.getElementById('slot-center');
    const slotRightSelect = document.getElementById('slot-right');

    const triggerHrBtn = document.getElementById('trigger-hr');
    const triggerNotifyBtn = document.getElementById('trigger-notify');
    const phoneConnectedToggle = document.getElementById('phone-connected-toggle');
    
    const batterySlider = document.getElementById('battery-slider');
    const batteryValSpan = document.getElementById('batt-val');
    const stepsSlider = document.getElementById('steps-slider');
    const stepsValSpan = document.getElementById('steps-val');
    const solarSlider = document.getElementById('solar-slider');
    const solarValSpan = document.getElementById('solar-val');

    const bleStatusVal = document.getElementById('ble-status-val');
    const gridStatusVal = document.getElementById('grid-status-val');
    const aodStatusVal = document.getElementById('aod-status-val');

    // --- Init Event Handlers ---
    themeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            themeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentTheme = btn.dataset.theme;
            updateAccentColors();
        });
    });

    function updateAccentColors() {
        const theme = themes[currentTheme];
        document.documentElement.style.setProperty('--accent', theme.primary);
        document.documentElement.style.setProperty('--accent-glow', theme.glow);
    }

    gridModeSelect.addEventListener('change', (e) => {
        gridMode = e.target.value;
        gridStatusVal.textContent = gridMode.toUpperCase();
    });

    aodToggle.addEventListener('change', (e) => {
        isAOD = e.target.checked;
        aodStatusVal.textContent = isAOD ? "ACTIVE (AOD ACTIVE)" : "ACTIVE (STANDBY)";
        aodStatusVal.parentElement.style.borderBottomColor = isAOD ? "#ff00ff" : "#00ff00";
        if (isAOD) {
            aodShiftX = Math.random() > 0.5 ? 3 : -3;
            aodShiftY = Math.random() > 0.5 ? 3 : -3;
        } else {
            aodShiftX = 0;
            aodShiftY = 0;
        }
    });

    secondsToggle.addEventListener('change', (e) => {
        showSeconds = e.target.checked;
    });

    labelsToggle.addEventListener('change', (e) => {
        showLabels = e.target.checked;
    });

    freezeToggle.addEventListener('change', (e) => {
        freezeTime = e.target.checked;
    });

    slotLeftSelect.addEventListener('change', (e) => { slots.left = e.target.value; });
    slotCenterSelect.addEventListener('change', (e) => { slots.center = e.target.value; });
    slotRightSelect.addEventListener('change', (e) => { slots.right = e.target.value; });

    triggerHrBtn.addEventListener('click', () => {
        metrics.hr = 148;
        metrics.hrHistory.push(148);
        if (metrics.hrHistory.length > 15) metrics.hrHistory.shift();
        setTimeout(decayHeartRate, 5000);
    });

    function decayHeartRate() {
        if (metrics.hr > 75) {
            metrics.hr -= Math.floor(Math.random() * 8) + 4;
            if (metrics.hr < 72) metrics.hr = 72;
            metrics.hrHistory.push(metrics.hr);
            if (metrics.hrHistory.length > 15) metrics.hrHistory.shift();
            setTimeout(decayHeartRate, 1500);
        }
    }

    triggerNotifyBtn.addEventListener('click', () => {
        metrics.notifications += 1;
    });

    phoneConnectedToggle.addEventListener('change', (e) => {
        metrics.phoneConnected = e.target.checked;
        bleStatusVal.textContent = metrics.phoneConnected ? "CONNECTED" : "DISCONNECTED";
        bleStatusVal.parentElement.style.borderBottomColor = metrics.phoneConnected ? "#00ffff" : "#555A70";
    });

    batterySlider.addEventListener('input', (e) => {
        metrics.batt = parseInt(e.target.value);
        metrics.battDays = (metrics.batt / 10.0);
        batteryValSpan.textContent = metrics.batt + '%';
    });

    stepsSlider.addEventListener('input', (e) => {
        metrics.steps = parseInt(e.target.value);
        stepsValSpan.textContent = metrics.steps.toLocaleString() + ' / 10k';
    });

    solarSlider.addEventListener('input', (e) => {
        metrics.solar = parseInt(e.target.value);
        solarValSpan.textContent = metrics.solar + '%';
    });

    // --- Rendering Engine ---
    function draw() {
        // Clear background
        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(0, 0, 400, 400);

        const activeTheme = themes[currentTheme];
        
        // Background radial glow (only when not in AOD)
        if (!isAOD) {
            const bgGrad = ctx.createRadialGradient(200, 200, 20, 200, 200, 180);
            bgGrad.addColorStop(0, 'rgba(10, 11, 22, 0.8)');
            bgGrad.addColorStop(0.5, 'rgba(4, 5, 12, 0.9)');
            bgGrad.addColorStop(1, '#020205');
            ctx.fillStyle = bgGrad;
            ctx.fillRect(0, 0, 400, 400);

            // Subtle color glow backing
            ctx.fillStyle = activeTheme.glow;
            ctx.beginPath();
            ctx.arc(200, 200, 100, 0, Math.PI * 2);
            ctx.fill();
        }

        // Get Current Time
        const now = new Date();
        const hour = freezeTime ? 10 : now.getHours();
        const min = freezeTime ? 0 : now.getMinutes();
        const sec = freezeTime ? 0 : now.getSeconds();

        // 12h format calculation
        let displayHour = hour;
        // In this simulation we will mirror the 12-hour / 24-hour setting
        // Let's assume 12-hour format is active for visual parity (since 10:26 looks great)
        displayHour = displayHour % 12;
        if (displayHour === 0) displayHour = 12;

        // Render battery arc along the top (Only in active mode)
        if (!isAOD) {
            drawBatteryArc(ctx, metrics.batt);
        }

        // --- Grid Positioning Metrics ---
        const dotRadius = 9;
        let rowSpacing, colGap, groupGap, gridTop;

        if (gridMode === 'pure') {
            // Pure Binary (7 rows: 32 down to 0)
            rowSpacing = 22;
            colGap = 48;
            groupGap = 60;
            const gridHeight = rowSpacing * 6;
            gridTop = 200 - (gridHeight / 2) + aodShiftY - 10;

            drawPureBinaryGrid(displayHour, min, sec, gridTop, rowSpacing, groupGap, dotRadius, isAOD);
        } else {
            // BCD Mode (5 rows: 8 down to 0)
            rowSpacing = 26;
            colGap = 30;
            groupGap = 52;
            const gridHeight = rowSpacing * 4;
            gridTop = 200 - (gridHeight / 2) + aodShiftY - 10;

            drawBCDGrid(displayHour, min, sec, gridTop, rowSpacing, colGap, groupGap, dotRadius, isAOD);
        }

        // Render stats & date overlay (only if not AOD)
        if (!isAOD) {
            drawDateAndStatus(ctx, now);
            drawStats(ctx);
        }

        requestAnimationFrame(draw);
    }

    // --- Grid Drawing Utilities ---
    function drawBCDGrid(hour, min, sec, gridTop, rowSpacing, colGap, groupGap, dotRadius, isAOD) {
        const numCols = showSeconds ? 6 : 4;
        const hTens = Math.floor(hour / 10);
        const hOnes = hour % 10;
        const mTens = Math.floor(min / 10);
        const mOnes = min % 10;
        const sTens = Math.floor(sec / 10);
        const sOnes = sec % 10;

        let totalWidth;
        if (!showSeconds) {
            totalWidth = colGap * 2 + groupGap;
        } else {
            totalWidth = colGap * 3 + groupGap * 2;
        }
        const left = 200 - (totalWidth / 2) + aodShiftX;

        const colX = [];
        if (!showSeconds) {
            colX[0] = left;
            colX[1] = left + colGap;
            colX[2] = colX[1] + groupGap;
            colX[3] = colX[2] + colGap;
        } else {
            colX[0] = left;
            colX[1] = left + colGap;
            colX[2] = colX[1] + groupGap;
            colX[3] = colX[2] + colGap;
            colX[4] = colX[3] + groupGap;
            colX[5] = colX[4] + colGap;
        }

        const colValues = [hTens, hOnes, mTens, mOnes, sTens, sOnes];
        const rowBits = [8, 4, 2, 1, 0];

        // Draw left helper labels
        if (!isAOD) {
            ctx.fillStyle = '#555A70';
            ctx.font = "12px 'Share Tech Mono'";
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const labelX = colX[0] - colGap;
            for (let r = 0; r < 5; r++) {
                const rowY = gridTop + r * rowSpacing;
                ctx.fillText(rowBits[r].toString(), labelX, rowY);
            }
        }

        // Draw dots
        for (let c = 0; c < numCols; c++) {
            const val = colValues[c];
            let colStartRow = 0;
            if (c === 0) {
                colStartRow = 2; // Hour Tens has only 3 rows (bits 2, 1, 0)
            } else if (c === 2 || c === 4) {
                colStartRow = 1; // Minute Tens & Second Tens have 4 rows (bits 4, 2, 1, 0)
            }

            for (let r = colStartRow; r < 5; r++) {
                const bit = rowBits[r];
                let isActive = false;
                if (bit === 0) {
                    isActive = (val === 0);
                } else {
                    isActive = (val & bit) !== 0;
                }
                const x = colX[c];
                const y = gridTop + r * rowSpacing;

                drawDot(ctx, x, y, isActive, dotRadius, isAOD);
            }
        }

        // Draw digital helper readouts below grid
        if (!isAOD && showLabels) {
            ctx.fillStyle = '#CDD6F4';
            ctx.font = "14px 'Share Tech Mono'";
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const textY = gridTop + 4 * rowSpacing + rowSpacing * 0.75;
            for (let c = 0; c < numCols; c++) {
                ctx.fillText(colValues[c].toString(), colX[c], textY);
            }

            // Draw colons
            const colonX1 = (colX[1] + colX[2]) / 2;
            ctx.fillText(":", colonX1, textY - 1);
            if (showSeconds) {
                const colonX2 = (colX[3] + colX[4]) / 2;
                ctx.fillText(":", colonX2, textY - 1);
            }
        }
    }

    function drawPureBinaryGrid(hour, min, sec, gridTop, rowSpacing, groupGap, dotRadius, isAOD) {
        const numCols = showSeconds ? 3 : 2;
        const totalWidth = (numCols - 1) * groupGap;
        const left = 200 - (totalWidth / 2) + aodShiftX;

        const colX = [];
        colX[0] = left;
        colX[1] = left + groupGap;
        if (showSeconds) {
            colX[2] = colX[1] + groupGap;
        }

        const colValues = [hour, min, sec];
        const rowBits = [32, 16, 8, 4, 2, 1, 0];

        // Draw left helper labels
        if (!isAOD) {
            ctx.fillStyle = '#555A70';
            ctx.font = "12px 'Share Tech Mono'";
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const labelX = colX[0] - groupGap * 0.55;
            for (let r = 0; r < 7; r++) {
                const rowY = gridTop + r * rowSpacing;
                ctx.fillText(rowBits[r].toString(), labelX, rowY);
            }
        }

        // Draw dots
        for (let c = 0; c < numCols; c++) {
            const val = colValues[c];
            // Column 0 (Hours) only needs 6 rows (values 16 down to 0) -> starts at row index 1
            const startRow = (c === 0) ? 1 : 0;

            for (let r = startRow; r < 7; r++) {
                const bit = rowBits[r];
                let isActive = false;
                if (bit === 0) {
                    isActive = (val === 0);
                } else {
                    isActive = (val & bit) !== 0;
                }
                const x = colX[c];
                const y = gridTop + r * rowSpacing;

                drawDot(ctx, x, y, isActive, dotRadius, isAOD);
            }
        }

        // Draw digital helper readouts below grid
        if (!isAOD && showLabels) {
            ctx.fillStyle = '#CDD6F4';
            ctx.font = "14px 'Share Tech Mono'";
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const textY = gridTop + 6 * rowSpacing + rowSpacing * 0.75;
            for (let c = 0; c < numCols; c++) {
                let valStr = colValues[c].toString();
                if (c > 0 && colValues[c] < 10) {
                    valStr = "0" + valStr;
                }
                ctx.fillText(valStr, colX[c], textY);
            }

            // Draw colons
            const colonX1 = (colX[0] + colX[1]) / 2;
            ctx.fillText(":", colonX1, textY - 1);
            if (showSeconds) {
                const colonX2 = (colX[1] + colX[2]) / 2;
                ctx.fillText(":", colonX2, textY - 1);
            }
        }
    }

    function drawDot(ctx, x, y, isActive, radius, isAOD) {
        const activeTheme = themes[currentTheme];

        if (isActive) {
            if (isAOD) {
                // Dim outline for AOD active dots
                ctx.fillStyle = '#555555';
                ctx.beginPath();
                ctx.arc(x, y, radius - 1, 0, Math.PI * 2);
                ctx.fill();
            } else {
                // Neon glow layer
                ctx.fillStyle = activeTheme.primary;
                ctx.shadowColor = activeTheme.primary;
                ctx.shadowBlur = 12;
                ctx.beginPath();
                ctx.arc(x, y, radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0; // Reset

                // 3D Sphere glare highlight
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                const offset = Math.max(2, Math.floor(radius * 0.3));
                ctx.arc(x - offset, y - offset, offset, 0, Math.PI * 2);
                ctx.fill();
            }
        } else {
            // Inactive dot outline (nothing in AOD)
            if (!isAOD) {
                ctx.fillStyle = activeTheme.inactiveDot;
                ctx.beginPath();
                ctx.arc(x, y, radius, 0, Math.PI * 2);
                ctx.fill();

                ctx.strokeStyle = activeTheme.inactiveBorder;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(x, y, radius, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
    }

    // --- Battery Arc ---
    function drawBatteryArc(ctx, battery) {
        const radius = 188; // Curved along round screen bezel
        const cx = 200;
        const cy = 200;
        
        ctx.lineWidth = 3;
        
        // Background track (45 to 135 degrees)
        ctx.strokeStyle = '#1e222a';
        ctx.beginPath();
        // Convert to canvas arc angles (in radians). 0 is right.
        // Garmin 135 to 45 deg counter-clockwise maps to canvas radians:
        // 135 deg -> 225 deg (5/4 PI), 45 deg -> 315 deg (7/4 PI)
        ctx.arc(cx, cy, radius, 1.25 * Math.PI, 1.75 * Math.PI);
        ctx.stroke();

        // Active foreground arc
        let barColor = '#00ff88'; // green
        if (battery <= 20) barColor = '#ff5500'; // red
        else if (battery <= 50) barColor = '#ffaa00'; // yellow

        ctx.strokeStyle = barColor;
        const fillAngle = 1.25 * Math.PI + (0.5 * Math.PI * (battery / 100.0));
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 1.25 * Math.PI, fillAngle);
        ctx.stroke();
    }

    // --- Date and Status Badges ---
    function drawDateAndStatus(ctx, date) {
        const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
        const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
        const dateStr = `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;

        ctx.fillStyle = '#CDD6F4';
        ctx.font = "14px 'Rajdhani'";
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const dateY = 52;
        ctx.fillText(dateStr, 200, dateY);

        const textWidth = ctx.measureText(dateStr).width;

        // Bluetooth connection dot
        const phoneX = 200 - (textWidth / 2) - 16;
        if (metrics.phoneConnected) {
            ctx.fillStyle = '#00ffff';
            ctx.beginPath();
            ctx.arc(phoneX, dateY, 4, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.strokeStyle = '#555A70';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(phoneX, dateY, 4, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Notification count badge
        if (metrics.notifications > 0) {
            const noteX = 200 + (textWidth / 2) + 16;
            ctx.fillStyle = '#ff8800';
            ctx.beginPath();
            ctx.arc(noteX, dateY, 5, 0, Math.PI * 2);
            ctx.fill();

            // Draw small number
            ctx.fillStyle = '#000000';
            ctx.font = "9px 'Share Tech Mono'";
            ctx.fillText(metrics.notifications.toString(), noteX, dateY);
        }
    }

    // --- Stats Dashboard (Dynamically spaced based on XTINY fontHeight ~18px) ---
    function drawStats(ctx) {
        const statsY = 332;
        const offset = 104;
        const colX = [200 - offset, 200, 200 + offset];
        const activeTheme = themes[currentTheme];
        const fontHeight = 18;

        for (let i = 0; i < 3; i++) {
            const slotKey = i === 0 ? 'left' : (i === 1 ? 'center' : 'right');
            const type = slots[slotKey];
            const cx = colX[i];

            const details = getMetricDetails(type);

            // Draw headers
            ctx.fillStyle = '#555A70';
            ctx.font = "12px 'Rajdhani'";
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(details.label, cx, statsY - fontHeight + 2);

            // Draw values
            if (type === 'graph') {
                drawHRSparklineCanvas(ctx, cx, statsY + Math.floor(fontHeight * 0.3));
            } else if (type === 'solar') {
                const textColor = (i === 1) ? activeTheme.primary : '#CDD6F4';
                ctx.fillStyle = textColor;
                ctx.font = "13px 'Share Tech Mono'";
                
                const textWidth = ctx.measureText(details.val).width;
                const totalWidth = textWidth + 18;
                const iconX = cx - (totalWidth / 2) + 6;
                const textX = cx + 9;

                drawTinySunIconCanvas(ctx, iconX, statsY + Math.floor(fontHeight * 0.8) + 7, '#ffaa00');
                
                ctx.fillStyle = '#a9b1d6';
                ctx.fillText(details.val, textX, statsY + Math.floor(fontHeight * 0.8));
            } else if (type === 'batt' && metrics.solar > 0) {
                // Double slot center display: Battery days + Solar charging (if solar is configured)
                const textColor = (i === 1) ? activeTheme.primary : '#CDD6F4';
                ctx.fillStyle = textColor;
                ctx.font = "13px 'Share Tech Mono'";
                
                // Draw battery days slightly shifted up
                ctx.fillText(`${metrics.battDays.toFixed(1)}d`, cx, statsY - Math.floor(fontHeight * 0.15));

                // Draw solar % slightly shifted down
                const solarStr = `${metrics.solar}%`;
                const textWidth = ctx.measureText(solarStr).width;
                const totalWidth = textWidth + 18;
                const iconX = cx - (totalWidth / 2) + 6;
                const textX = cx + 9;

                drawTinySunIconCanvas(ctx, iconX, statsY + Math.floor(fontHeight * 0.8) + 7, '#ffaa00');
                
                ctx.fillStyle = '#a9b1d6';
                ctx.fillText(solarStr, textX, statsY + Math.floor(fontHeight * 0.8));
            } else {
                const textColor = (i === 1) ? activeTheme.primary : '#CDD6F4';
                ctx.fillStyle = textColor;
                ctx.font = "13px 'Share Tech Mono'";
                ctx.fillText(details.val, cx, statsY + 2);
            }
        }
    }

    function getMetricDetails(type) {
        switch(type) {
            case 'steps': return { label: 'STEPS', val: metrics.steps.toString() };
            case 'batt': return { label: 'BATT', val: metrics.batt + '%' };
            case 'hr': return { label: 'HR', val: metrics.hr.toString() };
            case 'weather': return { label: 'TEMP', val: metrics.weather + '°' };
            case 'cal': return { label: 'CAL', val: metrics.cal.toString() };
            case 'mins': return { label: 'MINS', val: metrics.mins.toString() };
            case 'dist': return { label: 'DIST', val: metrics.dist.toFixed(1) };
            case 'graph': return { label: 'HR TREND', val: 'GRAPH' };
            case 'solar': return { label: 'SOLAR', val: metrics.solar + '%' };
            case 'stepGoalPct': return { label: 'STP%', val: Math.floor((metrics.steps / metrics.stepGoal) * 100) + '%' };
            case 'floors': return { label: 'FLOORS', val: metrics.floors.toString() };
            case 'floorsGoalPct': return { label: 'FLR%', val: Math.floor((metrics.floors / metrics.floorsGoal) * 100) + '%' };
            case 'activeMinsPct': return { label: 'ACT%', val: Math.floor((metrics.mins / metrics.activeMinsGoal) * 100) + '%' };
            case 'recovery': return { label: 'RECOV', val: metrics.recovery + 'h' };
            case 'stress': return { label: 'STRESS', val: metrics.stress.toString() };
            case 'bodyBattery': return { label: 'BODY', val: metrics.bodyBattery.toString() };
            case 'altitude': return { label: 'ALT', val: metrics.altitude.toString() };
            case 'baro': return { label: 'BARO', val: metrics.baro.toString() };
            case 'alarms': return { label: 'ALARM', val: metrics.alarms.toString() };
            case 'notifications': return { label: 'MSG', val: metrics.notifications.toString() };
            case 'respiration': return { label: 'RESP', val: metrics.respiration.toString() };
            default: return { label: 'HUD', val: '--' };
        }
    }

    function drawHRSparklineCanvas(ctx, slotX, slotY) {
        const w = 54;
        const h = 13;
        const xStart = slotX - w/2;
        const yStart = slotY - h/2 - 3;

        // Background box
        ctx.fillStyle = '#1e222a';
        ctx.fillRect(xStart, yStart, w, h);
        ctx.strokeStyle = '#3a3f50';
        ctx.lineWidth = 1;
        ctx.strokeRect(xStart, yStart, w, h);

        const activeTheme = themes[currentTheme];
        ctx.strokeStyle = activeTheme.primary;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        
        const min = Math.min(...metrics.hrHistory);
        const max = Math.max(...metrics.hrHistory);
        const range = (max - min) || 10;
        const step = w / (metrics.hrHistory.length - 1);

        metrics.hrHistory.forEach((val, index) => {
            const px = xStart + w - (index * step);
            const py = yStart + h - ((val - min) / range * h);
            if (index === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        });
        ctx.stroke();
    }

    function drawTinySunIconCanvas(ctx, x, y, color) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = color;
        ctx.lineWidth = 1;

        // Orthogonal rays
        ctx.beginPath();
        ctx.moveTo(x, y - 5); ctx.lineTo(x, y - 7);
        ctx.moveTo(x, y + 5); ctx.lineTo(x, y + 7);
        ctx.moveTo(x - 5, y); ctx.lineTo(x - 7, y);
        ctx.moveTo(x + 5, y); ctx.lineTo(x + 7, y);
        
        // Diagonal rays
        ctx.moveTo(x - 4, y - 4); ctx.lineTo(x - 5, y - 5);
        ctx.moveTo(x + 4, y - 4); ctx.lineTo(x + 5, y - 5);
        ctx.moveTo(x - 4, y + 4); ctx.lineTo(x - 5, y + 5);
        ctx.moveTo(x + 4, y + 4); ctx.lineTo(x + 5, y + 5);
        ctx.stroke();
    }

    // Start render loops
    updateAccentColors();
    draw();

    // Fluctuate heart rate mockingly
    setInterval(() => {
        if (!isAOD) {
            metrics.hr += Math.random() > 0.5 ? 1 : -1;
            if (metrics.hr < 65) metrics.hr = 65;
            if (metrics.hr > 85) metrics.hr = 85;
            metrics.hrHistory.push(metrics.hr);
            if (metrics.hrHistory.length > 15) metrics.hrHistory.shift();
        }
    }, 2000);
});
