import Toybox.Graphics;
import Toybox.Lang;
import Toybox.System;
import Toybox.WatchUi;
import Toybox.Time;
import Toybox.Time.Gregorian;
import Toybox.ActivityMonitor;
import Toybox.Activity;
import Toybox.Application;
import Toybox.Weather;
import Toybox.SensorHistory;

class BinaryWatchView extends WatchUi.WatchFace {

    private var mScreenWidth as Number = 0;
    private var mScreenHeight as Number = 0;
    private var mCenterX as Number = 0;
    private var mCenterY as Number = 0;
    private var mDotRadius as Number = 0;
    private var mRowSpacing as Number = 0;
    private var mColGap as Number = 0;
    private var mGroupGap as Number = 0;
    private var mGridTop as Number = 0;
    private var mIsSleep as Boolean = true;
    
    // Configurable Settings (with defaults)
    private var mShowSecondsSetting as Boolean = true;
    private var mColorThemeSetting as Number = 0;
    private var mGridModeSetting as Number = 0;     // 0 = BCD, 1 = Pure Binary
    private var mDataLeftSetting as Number = 0;     // Default: Steps
    private var mDataCenterSetting as Number = 1;   // Default: Battery
    private var mDataRightSetting as Number = 2;    // Default: Heart Rate

    // Color themes active and glow mappings
    private var mActiveColors = [0x00FFFF, 0xFF00FF, 0x00FF00, 0xFF8800, 0xFFFFFF];
    private var mGlowColors = [0x005555, 0x550055, 0x005500, 0x552200, 0x555555];

    function initialize() {
        WatchFace.initialize();
        updateSettings();
    }

    function updateSettings() as Void {
        try {
            if (Application has :Properties) {
                mShowSecondsSetting = Application.Properties.getValue("ShowSeconds");
                mColorThemeSetting = Application.Properties.getValue("ColorTheme");
                mGridModeSetting = Application.Properties.getValue("GridMode");
                mDataLeftSetting = Application.Properties.getValue("DataLeft");
                mDataCenterSetting = Application.Properties.getValue("DataCenter");
                mDataRightSetting = Application.Properties.getValue("DataRight");
            } else {
                var app = Application.getApp();
                if (app != null) {
                    mShowSecondsSetting = app.getProperty("ShowSeconds");
                    mColorThemeSetting = app.getProperty("ColorTheme");
                    mGridModeSetting = app.getProperty("GridMode");
                    mDataLeftSetting = app.getProperty("DataLeft");
                    mDataCenterSetting = app.getProperty("DataCenter");
                    mDataRightSetting = app.getProperty("DataRight");
                }
            }
        } catch (e) {
            // keep defaults in case of error
        }
    }

    // Load your resources here
    function onLayout(dc as Dc) as Void {
        mScreenWidth = dc.getWidth();
        mScreenHeight = dc.getHeight();
        mCenterX = mScreenWidth / 2;
        mCenterY = mScreenHeight / 2;
    }

    // Called when this View is brought to the foreground. Restore
    // the state of this View and prepare it to be shown. This includes
    // loading resources into memory.
    function onShow() as Void {
        updateSettings();
    }

    // Update the view
    function onUpdate(dc as Dc) as Void {
        updateSettings();
        
        // Clear screen with deep dark blue/black background
        dc.setColor(0x0A0A0F, 0x0A0A0F);
        dc.clear();
        
        var clockTime = System.getClockTime();
        var hour = clockTime.hour;
        var min = clockTime.min;
        var sec = clockTime.sec;
        
        // Determine whether we use 12 or 24 hour format
        var deviceSettings = System.getDeviceSettings();
        if (!deviceSettings.is24Hour) {
            hour = hour % 12;
            if (hour == 0) {
                hour = 12;
            }
        }
        
        // AMOLED Burn-in protection detection
        var burnInActive = false;
        var burnInX = 0;
        var burnInY = 0;
        if (deviceSettings has :requiresBurnInProtection && deviceSettings.requiresBurnInProtection && mIsSleep) {
            burnInActive = true;
            // Shift coordinates dynamically every minute to prevent screen burn-in
            var shift = min % 4;
            if (shift == 1) {
                burnInX = 3;
                burnInY = 3;
            } else if (shift == 2) {
                burnInX = -3;
                burnInY = 3;
            } else if (shift == 3) {
                burnInX = 3;
                burnInY = -3;
            }
        }
        
        // Recalculate grid sizing metrics dynamically depending on grid mode
        mDotRadius = (mScreenWidth * 0.025).toNumber();
        if (mDotRadius < 6) { mDotRadius = 6; }
        
        if (mGridModeSetting == 1) {
            // Pure Binary Mode (6 rows: 32 down to 1)
            mRowSpacing = (mScreenHeight * 0.065).toNumber();
            mColGap = (mScreenWidth * 0.12).toNumber();
            mGroupGap = (mScreenWidth * 0.15).toNumber();
            
            var gridHeight = mRowSpacing * 5; // 6 rows (5 intervals)
            mGridTop = mCenterY - (gridHeight / 2) + burnInY;
        } else {
            // BCD Mode (4 rows: 8 down to 1)
            mRowSpacing = (mScreenHeight * 0.085).toNumber();
            mColGap = (mScreenWidth * 0.075).toNumber();
            mGroupGap = (mScreenWidth * 0.13).toNumber();
            
            var gridHeight = mRowSpacing * 3; // 4 rows (3 intervals)
            mGridTop = mCenterY - (gridHeight / 2) + burnInY;
        }
        
        // Render binary grid
        drawBinaryGrid(dc, hour, min, sec, burnInActive, burnInX);
        
        // Render Date & Status Indicators (only if burn-in protection is not active)
        if (!burnInActive) {
            drawDateAndStatus(dc);
            drawBattery(dc);
            drawStats(dc);
        }
    }

    function drawBinaryGrid(dc as Dc, hour as Number, min as Number, sec as Number, burnInActive as Boolean, burnInX as Number) as Void {
        var showSeconds = !mIsSleep && mShowSecondsSetting;
        
        if (mGridModeSetting == 1) {
            // --- Pure Binary Mode (3 columns: Hours, Minutes, Seconds) ---
            var numCols = showSeconds ? 3 : 2;
            var totalWidth = (numCols - 1) * mGroupGap;
            var left = mCenterX - (totalWidth / 2) + burnInX;
            
            var colX = new [numCols];
            colX[0] = left;
            colX[1] = left + mGroupGap;
            if (showSeconds) {
                colX[2] = colX[1] + mGroupGap;
            }
            
            var colValues = new [numCols];
            colValues[0] = hour;
            colValues[1] = min;
            if (showSeconds) {
                colValues[2] = sec;
            }
            
            var rowBits = [32, 16, 8, 4, 2, 1];
            
            // Draw left helper labels (only if burn-in protection is not active)
            if (!burnInActive) {
                var labelX = colX[0] - (mGroupGap * 0.55).toNumber();
                dc.setColor(0x555A70, Graphics.COLOR_TRANSPARENT);
                for (var r = 0; r < 6; r++) {
                    var rowY = mGridTop + r * mRowSpacing;
                    dc.drawText(labelX, rowY - 8, Graphics.FONT_XTINY, rowBits[r].toString(), Graphics.TEXT_JUSTIFY_CENTER);
                }
            }
            
            for (var c = 0; c < numCols; c++) {
                var val = colValues[c];
                // Column 0 (Hours) only needs 5 rows (values 16, 8, 4, 2, 1) -> starts at row index 1
                var startRow = (c == 0) ? 1 : 0;
                
                for (var r = startRow; r < 6; r++) {
                    var bit = rowBits[r];
                    var isActive = (val & bit) != 0;
                    var x = colX[c];
                    var y = mGridTop + r * mRowSpacing;
                    
                    drawDot(dc, x, y, isActive, burnInActive);
                }
            }
        } else {
            // --- BCD Binary Mode (4 or 6 columns) ---
            var numCols = showSeconds ? 6 : 4;
            var hTens = hour / 10;
            var hOnes = hour % 10;
            var mTens = min / 10;
            var mOnes = min % 10;
            var sTens = sec / 10;
            var sOnes = sec % 10;
            
            var totalWidth = 0;
            if (!showSeconds) {
                totalWidth = mColGap * 2 + mGroupGap;
            } else {
                totalWidth = mColGap * 3 + mGroupGap * 2;
            }
            var left = mCenterX - (totalWidth / 2) + burnInX;
            
            var colX = new [numCols];
            if (!showSeconds) {
                colX[0] = left;
                colX[1] = left + mColGap;
                colX[2] = colX[1] + mGroupGap;
                colX[3] = colX[2] + mColGap;
            } else {
                colX[0] = left;
                colX[1] = left + mColGap;
                colX[2] = colX[1] + mGroupGap;
                colX[3] = colX[2] + mColGap;
                colX[4] = colX[3] + mGroupGap;
                colX[5] = colX[4] + mColGap;
            }
            
            var colValues = new [numCols];
            colValues[0] = hTens;
            colValues[1] = hOnes;
            colValues[2] = mTens;
            colValues[3] = mOnes;
            if (showSeconds) {
                colValues[4] = sTens;
                colValues[5] = sOnes;
            }
            
            var rowBits = [8, 4, 2, 1];
            
            if (!burnInActive) {
                var labelX = colX[0] - mColGap;
                dc.setColor(0x555A70, Graphics.COLOR_TRANSPARENT);
                for (var r = 0; r < 4; r++) {
                    var rowY = mGridTop + r * mRowSpacing;
                    dc.drawText(labelX, rowY - 8, Graphics.FONT_XTINY, rowBits[r].toString(), Graphics.TEXT_JUSTIFY_CENTER);
                }
            }
            
            for (var c = 0; c < numCols; c++) {
                var val = colValues[c];
                var colStartRow = 0;
                if (c == 0) {
                    colStartRow = 2; // Hour Tens has only 2 rows (bits 2, 1)
                } else if (c == 2 || c == 4) {
                    colStartRow = 1; // Minute Tens and Second Tens have 3 rows (bits 4, 2, 1)
                }
                
                for (var r = colStartRow; r < 4; r++) {
                    var bit = rowBits[r];
                    var isActive = (val & bit) != 0;
                    var x = colX[c];
                    var y = mGridTop + r * mRowSpacing;
                    
                    drawDot(dc, x, y, isActive, burnInActive);
                }
            }
        }
    }

    function drawDot(dc as Dc, x as Number, y as Number, isActive as Boolean, burnInActive as Boolean) as Void {
        if (isActive) {
            var activeColor = mActiveColors[mColorThemeSetting];
            var glowColor = mGlowColors[mColorThemeSetting];
            
            if (burnInActive) {
                // AMOLED AOD Mode: draw plain dim colored dot (no glow)
                dc.setColor(0x555555, Graphics.COLOR_TRANSPARENT);
                dc.fillCircle(x, y, mDotRadius - 1);
            } else {
                // Outer glow circle
                dc.setColor(glowColor, Graphics.COLOR_TRANSPARENT);
                dc.fillCircle(x, y, mDotRadius + 3);
                
                // Inner neon filled circle
                dc.setColor(activeColor, Graphics.COLOR_TRANSPARENT);
                dc.fillCircle(x, y, mDotRadius);
                
                // Highlight dot (3D sphere look)
                dc.setColor(0xFFFFFF, Graphics.COLOR_TRANSPARENT);
                var offset = (mDotRadius * 0.3).toNumber();
                if (offset < 2) { offset = 2; }
                dc.fillCircle(x - offset, y - offset, offset);
            }
        } else {
            // Draw dim outline for inactive dot (AOD Mode draws absolutely nothing)
            if (!burnInActive) {
                dc.setColor(0x1F222B, Graphics.COLOR_TRANSPARENT);
                dc.fillCircle(x, y, mDotRadius);
                
                dc.setColor(0x3A3F50, Graphics.COLOR_TRANSPARENT);
                dc.setPenWidth(1);
                dc.drawCircle(x, y, mDotRadius);
            }
        }
    }

    function drawDateAndStatus(dc as Dc) as Void {
        var info = Gregorian.info(Time.now(), Time.FORMAT_MEDIUM);
        var dateStr = Lang.format("$1$, $2$ $3$", [info.day_of_week.toUpper(), info.month.toUpper(), info.day]);
        
        dc.setColor(0xCDD6F4, Graphics.COLOR_TRANSPARENT);
        var dateY = (mScreenHeight * 0.20).toNumber();
        dc.drawText(mCenterX, dateY - 12, Graphics.FONT_TINY, dateStr, Graphics.TEXT_JUSTIFY_CENTER);
        
        // Get date string width to position side indicators
        var dateWidth = dc.getTextWidthInPixels(dateStr, Graphics.FONT_TINY);
        var deviceSettings = System.getDeviceSettings();
        
        // 1. Phone Connection Status Indicator (Left of Date)
        var phoneX = mCenterX - (dateWidth / 2) - 16;
        var statusY = dateY - 4;
        if (deviceSettings.phoneConnected) {
            dc.setColor(0x00FFFF, Graphics.COLOR_TRANSPARENT); // Glowing cyan dot
            dc.fillCircle(phoneX, statusY, 4);
        } else {
            dc.setColor(0x555A70, Graphics.COLOR_TRANSPARENT); // Dim outline
            dc.setPenWidth(1);
            dc.drawCircle(phoneX, statusY, 4);
        }
        
        // 2. Notification Badge Indicator (Right of Date)
        var noteCount = deviceSettings.notificationCount;
        if (noteCount > 0) {
            var noteX = mCenterX + (dateWidth / 2) + 16;
            dc.setColor(0xFF8800, Graphics.COLOR_TRANSPARENT); // Neon Amber orange badge
            dc.fillCircle(noteX, statusY, 5);
            
            // Draw tiny count number
            dc.setColor(0x000000, Graphics.COLOR_TRANSPARENT);
            dc.drawText(noteX, statusY - 6, Graphics.FONT_XTINY, noteCount.toString(), Graphics.TEXT_JUSTIFY_CENTER);
        }
    }

    function drawBattery(dc as Dc) as Void {
        var stats = System.getSystemStats();
        var battery = stats.battery;
        
        var isRound = System.getDeviceSettings().screenShape == System.SCREEN_SHAPE_ROUND;
        
        var barColor = 0x00FF88; // Neon Green
        if (battery <= 20.0) {
            barColor = 0xFF5500; // Neon Red/Orange
        }
        
        if (isRound) {
            // Draw curved progress arc along the top edge of circular watch
            var radius = mCenterX - 12;
            dc.setPenWidth(3);
            
            // Background arc: 135 degrees to 45 degrees
            dc.setColor(0x1E222A, Graphics.COLOR_TRANSPARENT);
            dc.drawArc(mCenterX, mCenterY, radius, Graphics.ARC_COUNTER_CLOCKWISE, 45, 135);
            
            // Foreground arc
            var arcRange = 90;
            var fillAngle = 135 - (arcRange * (battery / 100.0)).toNumber();
            dc.setColor(barColor, Graphics.COLOR_TRANSPARENT);
            dc.drawArc(mCenterX, mCenterY, radius, Graphics.ARC_COUNTER_CLOCKWISE, fillAngle, 135);
        } else {
            // Draw horizontal progress bar for square watch at the very top
            var batteryY = (mScreenHeight * 0.08).toNumber();
            var barWidth = 60;
            var barHeight = 4;
            var barX = mCenterX - (barWidth / 2);
            
            // Background bar
            dc.setColor(0x1E222A, Graphics.COLOR_TRANSPARENT);
            dc.fillRectangle(barX, batteryY, barWidth, barHeight);
            
            // Foreground bar
            var fillWidth = (barWidth * (battery / 100.0)).toNumber();
            if (fillWidth > 0) {
                dc.setColor(barColor, Graphics.COLOR_TRANSPARENT);
                dc.fillRectangle(barX, batteryY, fillWidth, barHeight);
            }
        }
    }

    function getDataFieldInfo(type as Number) as [String, String] {
        var label = "";
        var valStr = "--";
        
        if (type == 0) {
            // Steps
            label = "STEPS";
            var steps = 0;
            var activityInfo = ActivityMonitor.getInfo();
            if (activityInfo != null && activityInfo.steps != null) {
                steps = activityInfo.steps;
            }
            valStr = steps.toString();
        } else if (type == 1) {
            // Battery
            label = "BATT";
            var stats = System.getSystemStats();
            if (stats has :batteryInDays && stats.batteryInDays != null) {
                valStr = stats.batteryInDays.format("%.1f") + "d";
            } else {
                valStr = stats.battery.toNumber().toString() + "%";
            }
        } else if (type == 2) {
            // Heart Rate
            label = "HR";
            var actInfo = Activity.getActivityInfo();
            if (actInfo != null && actInfo.currentHeartRate != null) {
                valStr = actInfo.currentHeartRate.toString();
            }
        } else if (type == 3) {
            // Weather Temp
            label = "TEMP";
            if (Toybox has :Weather) {
                var cond = Weather.getCurrentConditions();
                if (cond != null && cond.temperature != null) {
                    var temp = cond.temperature;
                    var settings = System.getDeviceSettings();
                    if (settings.temperatureUnits == System.UNIT_STATUTE) {
                        temp = (temp * 9.0 / 5.0) + 32.0;
                    }
                    valStr = temp.toNumber().toString() + "°";
                }
            }
        } else if (type == 4) {
            // Calories
            label = "CAL";
            var activityInfo = ActivityMonitor.getInfo();
            if (activityInfo != null && activityInfo.calories != null) {
                valStr = activityInfo.calories.toString();
            }
        } else if (type == 5) {
            // Active Minutes
            label = "MINS";
            var activityInfo = ActivityMonitor.getInfo();
            if (activityInfo != null) {
                var mins = 0;
                if (activityInfo has :activeMinutesDay && activityInfo.activeMinutesDay != null) {
                    mins = activityInfo.activeMinutesDay.total;
                } else if (activityInfo.activeMinutesWeek != null) {
                    mins = activityInfo.activeMinutesWeek.total;
                }
                valStr = mins.toString();
            }
        } else if (type == 6) {
            // Distance
            label = "DIST";
            var activityInfo = ActivityMonitor.getInfo();
            if (activityInfo != null && activityInfo.distance != null) {
                var dist = activityInfo.distance / 100000.0; // cm to km
                var settings = System.getDeviceSettings();
                if (settings.distanceUnits == System.UNIT_STATUTE) {
                    dist = dist * 0.621371; // km to miles
                }
                valStr = dist.format("%.1f");
            }
        } else if (type == 7) {
            // Heart Rate Graph Sparkline (returns label, value is drawn custom in drawStats)
            label = "HR TREND";
            valStr = "GRAPH";
        } else if (type == 8) {
            // Solar Charging Intensity
            label = "SOLAR";
            var stats = System.getSystemStats();
            if (stats has :solarIntensity && stats.solarIntensity != null) {
                valStr = stats.solarIntensity.toString() + "%";
            } else {
                valStr = "0%";
            }
        }
        
        return [label, valStr];
    }

    function drawStats(dc as Dc) as Void {
        var statsY = (mScreenHeight * 0.82).toNumber();
        
        var leftInfo = getDataFieldInfo(mDataLeftSetting);
        var centerInfo = getDataFieldInfo(mDataCenterSetting);
        var rightInfo = getDataFieldInfo(mDataRightSetting);
        
        // Center coordinates of the three columns
        var offset = (mScreenWidth * 0.26).toNumber();
        var colX = [mCenterX - offset, mCenterX, mCenterX + offset];
        var colInfos = [leftInfo, centerInfo, rightInfo];
        var colSettings = [mDataLeftSetting, mDataCenterSetting, mDataRightSetting];
        
        var themeColor = mActiveColors[mColorThemeSetting];
        
        for (var i = 0; i < 3; i++) {
            var info = colInfos[i];
            var setting = colSettings[i];
            var cx = colX[i];
            
            // Draw headers
            dc.setColor(0x555A70, Graphics.COLOR_TRANSPARENT);
            dc.drawText(cx, statsY - 18, Graphics.FONT_XTINY, info[0], Graphics.TEXT_JUSTIFY_CENTER);
            
            // Draw values
            if (setting == 7) {
                // Draw Heart Rate Sparkline Graph instead of text
                drawHRSparkline(dc, cx, statsY - 5);
            } else if (setting == 1 && System.getSystemStats() has :solarIntensity) {
                // If this is the battery slot and the watch has solar capability, draw battery and solar below it
                var stats = System.getSystemStats();
                var textColor = (i == 1) ? themeColor : 0xCDD6F4;
                dc.setColor(textColor, Graphics.COLOR_TRANSPARENT);
                
                // 1. Draw battery reading slightly shifted up
                dc.drawText(cx, statsY - 9, Graphics.FONT_XTINY, info[1], Graphics.TEXT_JUSTIFY_CENTER);
                
                // 2. Draw solar intensity directly below it
                var solarVal = (stats.solarIntensity != null) ? stats.solarIntensity : 0;
                var solarStr = solarVal.toString() + "%";
                var textWidth = dc.getTextWidthInPixels(solarStr, Graphics.FONT_XTINY);
                var totalWidth = textWidth + 12; // 6px icon + 6px gap
                var iconX = cx - (totalWidth / 2) + 3;
                var textX = cx + 6;
                
                // Draw tiny sun icon (Cyberpunk orange/yellow)
                drawTinySunIcon(dc, iconX, statsY + 13, 0xFFAA00);
                
                // Draw solar text
                dc.setColor(0xA9B1D6, Graphics.COLOR_TRANSPARENT); // Dimmer blue-grey for secondary stats
                dc.drawText(textX, statsY + 6, Graphics.FONT_XTINY, solarStr, Graphics.TEXT_JUSTIFY_CENTER);
            } else {
                // Highlight middle slot, else print standard text
                var textColor = (i == 1) ? themeColor : 0xCDD6F4;
                dc.setColor(textColor, Graphics.COLOR_TRANSPARENT);
                dc.drawText(cx, statsY - 5, Graphics.FONT_XTINY, info[1], Graphics.TEXT_JUSTIFY_CENTER);
            }
        }
    }

    function drawHRSparkline(dc as Dc, slotX as Number, slotY as Number) as Void {
        var graphWidth = 54;
        var graphHeight = 13;
        var xStart = slotX - (graphWidth / 2);
        var yStart = slotY - (graphHeight / 2) - 3;
        
        // Draw background box for graph
        dc.setColor(0x1F222B, Graphics.COLOR_TRANSPARENT);
        dc.fillRectangle(xStart, yStart, graphWidth, graphHeight);
        dc.setColor(0x3A3F50, Graphics.COLOR_TRANSPARENT);
        dc.drawRectangle(xStart, yStart, graphWidth, graphHeight);
        
        // Fallback HR current value if history is not available
        var currentHR = null;
        var actInfo = Activity.getActivityInfo();
        if (actInfo != null && actInfo.currentHeartRate != null) {
            currentHR = actInfo.currentHeartRate;
        }
        
        if (Toybox has :SensorHistory && SensorHistory has :getHeartRateHistory) {
            var history = SensorHistory.getHeartRateHistory({ :period => 20, :order => SensorHistory.ORDER_NEWEST_FIRST });
            if (history != null) {
                var hrValues = new [20];
                var count = 0;
                var sample = history.next();
                while (sample != null && count < 20) {
                    if (sample.data != null) {
                        hrValues[count] = sample.data;
                        count++;
                    }
                    sample = history.next();
                }
                
                if (count > 1) {
                    var minHR = 200;
                    var maxHR = 40;
                    for (var i = 0; i < count; i++) {
                        var v = hrValues[i];
                        if (v < minHR) { minHR = v; }
                        if (v > maxHR) { maxHR = v; }
                    }
                    if (minHR == maxHR) {
                        minHR = maxHR - 10;
                    }
                    
                    var xStep = graphWidth / (count - 1.0);
                    dc.setColor(mActiveColors[mColorThemeSetting], Graphics.COLOR_TRANSPARENT);
                    dc.setPenWidth(1);
                    
                    for (var i = 0; i < count - 1; i++) {
                        var x1 = (xStart + graphWidth - (i * xStep)).toNumber();
                        var y1 = (yStart + graphHeight - ((hrValues[i] - minHR) * graphHeight / (maxHR - minHR))).toNumber();
                        
                        var x2 = (xStart + graphWidth - ((i + 1) * xStep)).toNumber();
                        var y2 = (yStart + graphHeight - ((hrValues[i+1] - minHR) * graphHeight / (maxHR - minHR))).toNumber();
                        
                        dc.drawLine(x1, y1, x2, y2);
                    }
                    return; // Draw completed successfully!
                }
            }
        }
        
        // Fallback HR text inside the graph box if graph cannot be built
        var hrStr = (currentHR != null) ? currentHR.toString() : "--";
        dc.setColor(0x787D90, Graphics.COLOR_TRANSPARENT);
        dc.drawText(slotX, slotY - 8, Graphics.FONT_XTINY, hrStr, Graphics.TEXT_JUSTIFY_CENTER);
    }

    function drawTinySunIcon(dc as Dc, x as Number, y as Number, color as Number) as Void {
        dc.setColor(color, Graphics.COLOR_TRANSPARENT);
        dc.setPenWidth(1);
        dc.fillCircle(x, y, 2);
        dc.drawPoint(x, y - 3);
        dc.drawPoint(x, y + 3);
        dc.drawPoint(x - 3, y);
        dc.drawPoint(x + 3, y);
    }

    // Called when this View is removed from the screen. Save the
    // state of this View here. This includes freeing resources from
    // memory.
    function onHide() as Void {
    }

    // The user has just looked at their watch. Timers and animations may be started here.
    function onExitSleep() as Void {
        mIsSleep = false;
        WatchUi.requestUpdate();
    }

    // Terminate any active timers and prepare for slow updates.
    function onEnterSleep() as Void {
        mIsSleep = true;
        WatchUi.requestUpdate();
    }

}
