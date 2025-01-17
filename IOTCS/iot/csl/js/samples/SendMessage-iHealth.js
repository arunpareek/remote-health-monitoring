dcl = require("device-library.node");
dcl = dcl({debug: true});

dcl.oracle.iot.tam.store = ("9CSNBNxyVvRg-provisioning-file.conf");
dcl.oracle.iot.tam.storePassword = ("#Musicrules12");

var myModel;
var virtualDev;

// Create a directly connected device and activate it if not already activated
var dcd = new dcl.device.DirectlyConnectedDevice();
if (dcd.isActivated()) {
    getHWModel(dcd);
} else {
    dcd.activate(['urn:demo:health'], function (device) {
        dcd = device;
        console.log(dcd.isActivated());
        if (dcd.isActivated()) {
            getHWModel(dcd);
        }
    });
}
// Display the device model
function getHWModel(device){
    device.getDeviceModel('urn:demo:health', function (response) {
        console.log('-----------------MY DEVICE MODEL----------------------------');
        console.log(JSON.stringify(response,null,4));
        console.log('------------------------------------------------------------');
        myModel = response;
        startVirtualHWDevice(device, device.getEndpointId());
    });
}
function startVirtualHWDevice(device, id) {
    var virtualDev = device.createVirtualDevice(id, myModel);
	var bpHigh = Math.floor(Math.random() * (180 - 100)) + 100;
	var bpLow = Math.floor(Math.random() * (120 - 60)) + 60;
	console.log('High BP'+ bpHigh);
    var newValues = {
		    bloodPressureHigh: bpHigh,
			bloodPressureLow: bpLow,
			patientName: "Arun Pareek",
			patientAge: 32,
			patientEmail: "arun.pareek@rubiconred.com",
			patientContactNumber: "0424978874",
			patientGender: "Male",
			pulse: 60,
			ora_latitude: -37.817000,
			ora_longitude: 144.946000
			//timeStamp: new Date().toDateString()
    };
    virtualDev.update(newValues);
    virtualDev.close();
};

