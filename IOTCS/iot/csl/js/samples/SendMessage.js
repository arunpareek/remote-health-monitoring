/*
 * This sample changes a message attribute on virtual device and triggers a message
 * to the Cloud Service with the updated attribute value.
 *
 * The client is a directly connected device using the virtual device API.
 */

dcl = require("device-library.node");
dcl = dcl({debug: true});

dcl.oracle.iot.tam.store = (process.argv[2]);
dcl.oracle.iot.tam.storePassword = (process.argv[3]);

var myModel;
var virtualDev;

function startVirtualHWDevice(device, id) {
    var virtualDev = device.createVirtualDevice(id, myModel);
    var newValues = {
        customerName: 'Arun',
        bloodPressureHigh: 120,
        bloodPressureLow: 80,
        timeStamp: new Date().toDateString()
    };

    virtualDev.update(newValues);
    virtualDev.close();
};

// Display the device model
function getHWModel(device){
    device.getDeviceModel('urn:test:myHealth', function (response) {
        console.log('-----------------MY DEVICE MODEL----------------------------');
        console.log(JSON.stringify(response,null,4));
        console.log('------------------------------------------------------------');
        myModel = response;
        startVirtualHWDevice(device, device.getEndpointId());
    });
}

// Create a directly connected device and activate it if not already activated
var dcd = new dcl.device.DirectlyConnectedDevice();
if (dcd.isActivated()) {
    getHWModel(dcd);
} else {
    dcd.activate(['urn:test:myHealth'], function (device) {
        dcd = device;
        console.log(dcd.isActivated());
        if (dcd.isActivated()) {
            getHWModel(dcd);
        }
    });
}