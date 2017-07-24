/*
 * This sample changes a message attribute on virtual device and triggers a message
 * to the Cloud Service with the updated attribute value.
 *
 * The client is a directly connected device using the virtual device API.
 */

dcl = require("device-library.node");
dcl = dcl({debug: true});

dcl.oracle.iot.tam.store = ("7EPNPRChcSydDec-provisioning-file.conf");
dcl.oracle.iot.tam.storePassword = ("#Musicrules12");

var myModel;
var virtualDev;

// Create a directly connected device and activate it if not already activated
var dcd = new dcl.device.DirectlyConnectedDevice();
if (dcd.isActivated()) {
    getHWModel(dcd);
} else {
    dcd.activate(['urn:demo:proximity'], function (device) {
        dcd = device;
        console.log(dcd.isActivated());
        if (dcd.isActivated()) {
            getHWModel(dcd);
        }
    });
}
// Display the device model
function getHWModel(device){
    device.getDeviceModel('urn:demo:proximity', function (response) {
        console.log('-----------------MY DEVICE MODEL----------------------------');
        console.log(JSON.stringify(response,null,4));
        console.log('------------------------------------------------------------');
        myModel = response;
        startVirtualHWDevice(device, device.getEndpointId());
    });
}
function startVirtualHWDevice(device, id) {
    var virtualDev = device.createVirtualDevice(id, myModel);
    var newValues = {
        patientName: "Bruce Wayne",
        regionId: "B9407F30-F5F8-466E-AFF9-25556B57FE6D",
		majorNumber: 55,
		minorNumber: 32,
		proximity: "near",
		ora_latitude: -37.817000,
		ora_longitude: 144.946000
    };
    virtualDev.update(newValues);
    virtualDev.close();
};

