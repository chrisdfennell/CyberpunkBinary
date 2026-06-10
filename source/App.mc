import Toybox.Application;
import Toybox.Lang;
import Toybox.WatchUi;

class BinaryWatchApp extends Application.AppBase {

    function initialize() {
        AppBase.initialize();
    }

    // onStart() is called on application start up
    function onStart(state as Dictionary?) as Void {
    }

    // onStop() is called when your application is exiting
    function onStop(state as Dictionary?) as Void {
    }

    function onSettingsChanged() as Void {
        WatchUi.requestUpdate();
    }

    // Return the initial view of your application here
    function getInitialView() as [Views] or [Views, InputDelegates] {
        return [ new BinaryWatchView() ];
    }

}

function getApp() as BinaryWatchApp {
    return Application.getApp() as BinaryWatchApp;
}