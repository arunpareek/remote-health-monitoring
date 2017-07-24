dcl = require("device-library.node");
dcl = dcl({debug: true});

dcl.oracle.iot.tam.store = ("iHealthSense-WA-UU112313-provisioning-file.conf");
dcl.oracle.iot.tam.storePassword = ("#Musicrules12");

var myModel;
var virtualDev;

// Create a directly connected device and activate it if not already activated
var dcd = new dcl.device.DirectlyConnectedDevice();
if (dcd.isActivated()) {
	console.log("Device is Activated");
    dcd.close();
} else {
    dcd.activate(['urn:demo:health'], function (device) {
        dcd = device;
        console.log(dcd.isActivated());
        if (dcd.isActivated()) {
            dcd.close();
        }
    });
}

