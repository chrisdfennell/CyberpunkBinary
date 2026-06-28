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
        // 21 = the "hide this slot" sentinel. Handled specially in both
        // renderers (drawn as nothing) so it has no header.
        { id: 21, key: 'none',          stringId: 'DataNone',          label: 'None / Hidden',        header: null },
    ];

    // The id reserved for "hide this slot". Kept as a named constant so the
    // renderers and clamp logic don't sprinkle the magic number 21 around.
    const NONE_ID = 21;

    return {
        SLOTS: SLOTS,
        NONE_ID: NONE_ID,
    };
});
