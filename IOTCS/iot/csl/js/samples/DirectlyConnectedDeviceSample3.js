/**
 * Copyright (c) 2015, 2016, Oracle and/or its affiliates. All rights reserved.
 *
 * This software is dual-licensed to you under the MIT License (MIT) and
 * the Universal Permissive License (UPL). See the LICENSE file in the root
 * directory for license terms. You may choose either license, or both.
 *
 */

/*
 * This sample presents a simple motion sensor to the IoT server.
 *
 * It uses the motion sensor device model for virtual device creation.
 *
 * It uses the virtual device API to update attributes, handle errors and
 * send custom data messages.
 *
 * The simple sensor is polled every 3 seconds and the motion detection is updated
 * on the server and custom data message with some raw data is sent.
 *
 * The client is a directly connected device using the virtual device API.
 */

dcl = require("device-library.node");
dcl = dcl({debug: true});

dcl.oracle.iot.tam.store = (process.argv[2]);
dcl.oracle.iot.tam.storePassword = 'changeit';

var motionModel;

function startVirtualMotion(device, id) {
    var virtualDev = device.createVirtualDevice(id, motionModel);

    var sensor = {
        detecting_motion: false
    };

    var send = function () {
        virtualDev.update(sensor);
        if (sensor.detecting_motion) {
            var data = virtualDev.createData('urn:com:oracle:iot:device:motion_sensor:rfid_detected');
            data.fields.raw_hex = '30700048440663802E185523';
            data.send();
        }
        sensor.detecting_motion = !sensor.detecting_motion;
    };

    setInterval(send, 5000);

    virtualDev.onError = function (tupple) {
        var show = {
            newValues: tupple.newValues,
            tryValues: tupple.tryValues,
            errorResponse: tupple.errorResponse
        };
        console.log('------------------ON ERROR MOTION-----------------------');
        console.log(JSON.stringify(show,null,4));
        console.log('--------------------------------------------------------');
        for (var key in tupple.newValues) {
            sensor[key] = tupple.newValues[key];
        }
    };

}

function getModelMotion(device){
    device.getDeviceModel('urn:com:oracle:iot:device:motion_sensor', function (response) {
        console.log('-----------------MOTION DEVICE MODEL------------------------');
        console.log(JSON.stringify(response,null,4));
        console.log('------------------------------------------------------------');
        motionModel = response;
        startVirtualMotion(device, device.getEndpointId());
    });
}

var dcd = new dcl.device.DirectlyConnectedDevice();
if (dcd.isActivated()) {
    getModelMotion(dcd);
} else {
    dcd.activate(['urn:com:oracle:iot:device:motion_sensor'], function (device) {
        dcd = device;
        console.log(dcd.isActivated());
        if (dcd.isActivated()) {
            getModelMotion(dcd);
        }
    });
}

