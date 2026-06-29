/**
 * SLOTS — the single source of truth for the dashboard data-field options.
 *
 * The same list of options is mirrored in five places that have to stay in
 * lockstep or the watch face and its simulator silently disagree:
 *
 *   - resources/settings/settings.xml  (per-slot <listEntry> numeric ids)
 *   - resources/strings/strings.xml    (the human-readable option labels)
 *   - source/View.mc                   (getDataFieldInfo headers, by numeric id)
 *   - app.js                           (getMetricDetails headers, by string key)
 *   - index.html                       (<option> values + labels)
 *
 * Rather than try to generate all five (XML/HTML/Monkey C), this module is the
 * authoritative definition and tests/slots.test.js asserts every file agrees
 * with it. Adding or renaming an option is a one-line change here; the test
 * then tells you exactly which file fell out of sync.
 *
 * Field meanings:
 *   id       Numeric value stored on-device (settings.xml listEntry value,
 *            Properties, and the type index in View.mc getDataFieldInfo).
 *   key      String value used by the simulator (app.js slots + index.html
 *            <option value>).
 *   stringId The strings.xml id, referenced from settings.xml as @Strings.<id>.
 *   label    Human-readable option text (strings.xml body AND index.html
 *            <option> text — these must match exactly).
 *   header   Short uppercase header drawn above the value on the face
 *            (View.mc getDataFieldInfo label AND app.js getMetricDetails label).
 *            null for the "None" sentinel, which draws nothing.
 *
 * Works in both the browser (attaches window.SLOTS) and Node (exports).
 */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.SLOTS = factory();
    }
})(typeof self !== 'undefined' ? self : this, function () {
    const SLOTS = [
        { id: 0,  key: 'steps',         stringId: 'DataSteps',         label: 'Steps',                header: 'STEPS' },
        { id: 1,  key: 'batt',          stringId: 'DataBattery',       label: 'Battery % or Days',    header: 'BATT' },
        { id: 2,  key: 'hr',            stringId: 'DataHR',            label: 'Heart Rate',           header: 'HR' },
        { id: 3,  key: 'weather',       stringId: 'DataWeather',       label: 'Weather Temp',         header: 'TEMP' },
        { id: 4,  key: 'cal',           stringId: 'DataCalories',      label: 'Calories',             header: 'CAL' },
        { id: 5,  key: 'mins',          stringId: 'DataActiveMinutes', label: 'Active Minutes',       header: 'MINS' },
        { id: 6,  key: 'dist',          stringId: 'DataDistance',      label: 'Distance',             header: 'DIST' },
        { id: 7,  key: 'graph',         stringId: 'DataHRGraph',       label: 'Heart Rate Graph',     header: 'HR TREND' },
        { id: 8,  key: 'solar',         stringId: 'DataSolar',         label: 'Solar Intensity',      header: 'SOLAR' },
        { id: 9,  key: 'stepGoalPct',   stringId: 'DataStepGoalPct',   label: 'Step Goal %',          header: 'STP%' },
        { id: 10, key: 'floors',        stringId: 'DataFloors',        label: 'Floors Climbed',       header: 'FLOORS' },
        { id: 11, key: 'floorsGoalPct', stringId: 'DataFloorsGoalPct', label: 'Floors Goal %',        header: 'FLR%' },
        { id: 12, key: 'activeMinsPct', stringId: 'DataActiveMinsPct', label: 'Active Mins %',        header: 'ACT%' },
        { id: 13, key: 'recovery',      stringId: 'DataRecovery',      label: 'Recovery Time',        header: 'RECOV' },
        { id: 14, key: 'stress',        stringId: 'DataStress',        label: 'Stress Score',         header: 'STRESS' },
        { id: 15, key: 'bodyBattery',   stringId: 'DataBodyBattery',   label: 'Body Battery',         header: 'BODY' },
        { id: 16, key: 'altitude',      stringId: 'DataAltitude',      label: 'Altitude',             header: 'ALT' },
        { id: 17, key: 'baro',          stringId: 'DataBaro',          label: 'Barometric Pressure',  header: 'BARO' },
        { id: 18, key: 'alarms',        stringId: 'DataAlarms',        label: 'Active Alarms',        header: 'ALARM' },
        { id: 19, key: 'notifications', stringId: 'DataNotifications', label: 'Notification Count',   header: 'MSG' },
        { id: 20, key: 'respiration',   stringId: 'DataRespiration',   label: 'Respiration Rate',     header: 'RESP' },
        // Options added after v1.3.0. They take ids 22+ so the "None" sentinel
        // can keep id 21 (renumbering it would silently change every saved
        // "hidden" slot). "None" stays last in this list so it renders last in
        // the settings dropdown regardless of its numeric id.
        { id: 22, key: 'feelsLike',     stringId: 'DataFeelsLike',     label: 'Feels-Like Temp',      header: 'FEELS' },
        { id: 23, key: 'humidity',      stringId: 'DataHumidity',      label: 'Humidity',             header: 'HUM' },
        { id: 24, key: 'wind',          stringId: 'DataWind',          label: 'Wind Speed',           header: 'WIND' },
        { id: 25, key: 'precip',        stringId: 'DataPrecip',        label: 'Precipitation Chance', header: 'RAIN' },
        { id: 26, key: 'spo2',          stringId: 'DataSpo2',          label: 'Pulse Ox (SpO2)',      header: 'SPO2' },
        { id: 27, key: 'moveBar',       stringId: 'DataMoveBar',       label: 'Move Bar',             header: 'MOVE' },
        { id: 28, key: 'intensity',     stringId: 'DataIntensity',     label: 'Intensity Mins (Today)', header: 'INTEN' },
        { id: 29, key: 'week',          stringId: 'DataWeek',          label: 'Week Number',          header: 'WEEK' },
        { id: 30, key: 'sunrise',       stringId: 'DataSunrise',       label: 'Sunrise',              header: 'RISE' },
        { id: 31, key: 'sunset',        stringId: 'DataSunset',        label: 'Sunset',               header: 'SET' },
        // 21 = the "hide this slot" sentinel. Handled specially in both
        // renderers (drawn as nothing) so it has no header. Kept last for the
        // dropdown; id 21 is frozen for backward compatibility.
        { id: 21, key: 'none',          stringId: 'DataNone',          label: 'None / Hidden',        header: null },
    ];

    // The id reserved for "hide this slot". Kept as a named constant so the
    // renderers and clamp logic don't sprinkle the magic number 21 around.
    const NONE_ID = 21;

    // Color themes — the ColorTheme setting is an index into this list. Mirrored
    // in settings.xml (listEntries), strings.xml (labels), View.mc
    // (mActiveColors hex array), app.js (themes map primary), and index.html
    // (theme buttons). The parity tests assert all of them agree.
    //   id       ColorTheme setting value / mActiveColors index
    //   key      simulator theme key (app.js themes map + index.html data-theme)
    //   stringId strings.xml id used by settings.xml
    //   label    human label (strings.xml body AND index.html button text)
    //   hex      accent color, uppercase RRGGBB (View.mc 0xRRGGBB, app.js #rrggbb)
    const THEMES = [
        { id: 0, key: 'cyan',    stringId: 'ThemeCyan',    label: 'Cyberpunk Cyan',   hex: '00FFFF' },
        { id: 1, key: 'pink',    stringId: 'ThemePink',    label: 'Neon Pink',        hex: 'FF00FF' },
        { id: 2, key: 'green',   stringId: 'ThemeGreen',   label: 'Radioactive Green', hex: '00FF00' },
        { id: 3, key: 'amber',   stringId: 'ThemeAmber',   label: 'Sci-Fi Amber',     hex: 'FF8800' },
        { id: 4, key: 'slate',   stringId: 'ThemeSlate',   label: 'Monochrome Slate', hex: 'FFFFFF' },
        { id: 5, key: 'ice',     stringId: 'ThemeIce',     label: 'Ice Blue',         hex: '33CCFF' },
        { id: 6, key: 'crimson', stringId: 'ThemeCrimson', label: 'Crimson',          hex: 'FF1144' },
        { id: 7, key: 'purple',  stringId: 'ThemePurple',  label: 'Royal Purple',     hex: 'BB66FF' },
        { id: 8, key: 'gold',    stringId: 'ThemeGold',    label: 'Gold',             hex: 'FFB300' },
        { id: 9, key: 'hazard',  stringId: 'ThemeHazard',  label: 'Hazard',           hex: 'CCFF33' },
    ];

    return {
        SLOTS: SLOTS,
        NONE_ID: NONE_ID,
        THEMES: THEMES,
    };
});
