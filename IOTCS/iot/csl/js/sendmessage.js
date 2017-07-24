var express = require('express');
var os = require('os');
var bodyParser = require('body-parser');
var dateTime = require('node-datetime');


var PORT = process.env.PORT || 8089;
var HOST = os.hostname() || '0.0.0.0';

var app = express();

// application/json parser
app.use(bodyParser.json())
// application/x-www-form-urlencoded parser
app.use(bodyParser.urlencoded({ extended: false }));

dcl = require("device-library.node");
dcl = dcl({debug: true});

dcl.oracle.iot.tam.store = 'NodeApp001-provisioning-file.conf';
dcl.oracle.iot.tam.storePassword = 'Welcome1';

var dt = dateTime.create();
dt.format('Y/m/dTH:M:S');

var myModel;
var virtualDev;

function startVirtualHWDevice(device, id, req) {
    var virtualDev = device.createVirtualDevice(id, myModel);
    //console.log(req.bloodPressureHigh);
    var newValues = {
        customerName: req.customerName,
        bloodPressureHigh: parseInt(req.bloodPressureHigh),
        bloodPressureLow: parseInt(req.bloodPressureLow),
        timeStamp: new Date(dt.now())
    };

    virtualDev.update(newValues);
    console.log('connection closing')
    virtualDev.close();
    console.log('connection closed')
};

// Display the device model
function getHWModel(device, req){
    device.getDeviceModel('urn:test:myHealth', function (response) {
        //console.log('-----------------MY DEVICE MODEL----------------------------');
        //console.log(JSON.stringify(response,null,4));
        //console.log('------------------------------------------------------------');
        myModel = response;
        startVirtualHWDevice(device, device.getEndpointId(), req);
    });
}

// Create a directly connected device and activate it if not already activated
function sendMessage(req) {
    var dcd = new dcl.device.DirectlyConnectedDevice();
    if (dcd.isActivated()) {
        getHWModel(dcd, req);
    } else {
        dcd.activate(['urn:test:myHealth'], function (device) {
            dcd = device;
            console.log(dcd.isActivated());
            if (dcd.isActivated()) {
                getHWModel(dcd, req);
            }
        });
    }
}


app.post(
    '/iot/message',
    function(req, res) {
        if (!req.body) return res.sendStatus(400);

        sendMessage(req.body);
        res.sendStatus(200);
    }
);

app.listen(PORT, HOST);