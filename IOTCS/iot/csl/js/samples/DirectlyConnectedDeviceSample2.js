/**
 * Copyright (c) 2015, 2016, Oracle and/or its affiliates. All rights reserved.
 *
 * This software is dual-licensed to you under the MIT License (MIT) and
 * the Universal Permissive License (UPL). See the LICENSE file in the root
 * directory for license terms. You may choose either license, or both.
 *
 */

/*
 * This sample presents a combined humidity sensor and temperature sensor to the IoT server.
 *
 * It uses the humidity and temperature device models on the same client as
 * directly connected device with two virtual devices created for each model.
 *
 * It uses the virtual device API to update attributes, raise alerts,
 * handle attribute updates and action requests from the server.
 *
 * The sensors are polled every 3 seconds and the humidity  and temperature is updated
 * on the server and alerts are raised if the alert condition is met.
 *
 * Also the temperature sensor can be powered on or off and the min and max temperature
 * can handle a reset.
 *
 * The client is a directly connected device using the virtual device API.
 */

dcl = require("device-library.node");
dcl = dcl({debug: true});

var storeFile = (process.argv[2]);
var storePassword = (process.argv[3]);

var temperatureModel;
var humidityModel;

function startVirtualTemperature(device, id) {
    var virtualDev = device.createVirtualDevice(id, temperatureModel);

    var sensor = {
        temp: 0,
        minTemp: 0,
        maxTemp: 0,
        unit: 'Cel',
        minThreshold: -20,
        maxThreshold: 80,
        startTime: 0
    };

    var send = function () {
        sensor.temp = Math.floor(Math.random() * 100 - 20);
        if (sensor.temp < sensor.minTemp) {
            sensor.minTemp = sensor.temp;
        }
        if (sensor.temp > sensor.maxTemp) {
            sensor.maxTemp = sensor.temp;
        }
        if (sensor.temp > sensor.maxThreshold) {
            var alert = virtualDev.createAlert('urn:com:oracle:iot:device:temperature_sensor:too_hot');
            alert.fields.temp = sensor.temp;
            alert.fields.maxThreshold = sensor.maxThreshold;
            alert.fields.unit = sensor.unit;
            alert.raise();
        }
        if (sensor.temp < sensor.minThreshold) {
            var alert = virtualDev.createAlert('urn:com:oracle:iot:device:temperature_sensor:too_cold');
            alert.fields.temp = sensor.temp;
            alert.fields.minThreshold = sensor.minThreshold;
            alert.fields.unit = sensor.unit;
            alert.raise();
        }
        virtualDev.update(sensor);
    };

    sensor.startTime = Date.now();
    var timer = setInterval(send, 3000);

    virtualDev.onChange = function (tupples) {
        tupples.forEach( function (tupple) {
            var show = {
                name: tupple.attribute.id,
                lastUpdate: tupple.attribute.lastUpdate,
                oldValue: tupple.oldValue,
                newValue: tupple.newValue
            };
            console.log('------------------ON CHANGE TEMPERATURE---------------------');
            console.log(JSON.stringify(show, null, 4));
            console.log('------------------------------------------------------------');
            sensor[tupple.attribute.id] = tupple.newValue;
        });
    };

    virtualDev.onError = function (tupple) {
        var show = {
            newValues: tupple.newValues,
            tryValues: tupple.tryValues,
            errorResponse: tupple.errorResponse
        };
        console.log('------------------ON ERROR TEMPERATURE---------------------');
        console.log(JSON.stringify(show,null,4));
        console.log('-----------------------------------------------------------');
        for (var key in tupple.newValues) {
            sensor[key] = tupple.newValues[key];
        }
    };

    virtualDev.reset.onExecute = function () {
        console.log('---------------ON EXECUTE RESET-----------------');
        console.log(JSON.stringify({value: 'none'},null,4));
        console.log('------------------------------------------------');
        sensor.minTemp = sensor.temp;
        sensor.maxTemp = sensor.temp;
        sensor.startTime = Date.now();
    };

    virtualDev.power.onExecute = function (arg) {
        console.log('---------------ON EXECUTE POWER-----------------');
        console.log(JSON.stringify({value: arg},null,4));
        console.log('------------------------------------------------');
        if (arg) {
            sensor.startTime = Date.now();
            timer = setInterval(send, 3000);
        } else {
            clearInterval(timer);
        }
    };

}

function startVirtualHumidity(device, id) {
    var virtualDev = device.createVirtualDevice(id, humidityModel);

    var sensor = {
        humidity: 0,
        maxThreshold: 100
    };

    var send = function () {
        sensor.humidity = Math.floor(Math.random() * 100);
        if (sensor.humidity > sensor.maxThreshold) {
            var alert = virtualDev.createAlert('urn:com:oracle:iot:device:humidity_sensor:too_humid');
            alert.fields.humidity = sensor.humidity;
            alert.raise();
        }
        virtualDev.update(sensor);
    };

    setInterval(send, 3000);

    virtualDev.onChange = function (tupples) {
        tupples.forEach( function (tupple) {
            var show = {
                name: tupple.attribute.id,
                lastUpdate: tupple.attribute.lastUpdate,
                oldValue: tupple.oldValue,
                newValue: tupple.newValue
            };
            console.log('------------------ON CHANGE HUMIDITY---------------------');
            console.log(JSON.stringify(show, null, 4));
            console.log('---------------------------------------------------------');
            sensor[tupple.attribute.id] = tupple.newValue;
        });
    };

    virtualDev.onError = function (tupple) {
        var show = {
            newValues: tupple.newValues,
            tryValues: tupple.tryValues,
            errorResponse: tupple.errorResponse
        };
        console.log('------------------ON ERROR HUMIDITY---------------------');
        console.log(JSON.stringify(show,null,4));
        console.log('--------------------------------------------------------');
        for (var key in tupple.newValues) {
            sensor[key] = tupple.newValues[key];
        }
    };

}

function getModelHumidity(device){
    device.getDeviceModel('urn:com:oracle:iot:device:humidity_sensor', function (response, error) {
        if (error) {
            console.log('-------------ERROR ON GET HUMIDITY DEVICE MODEL-------------');
            console.log(error.message);
            console.log('------------------------------------------------------------');
            return;
        }
        console.log('-----------------HUMIDITY DEVICE MODEL----------------------');
        console.log(JSON.stringify(response,null,4));
        console.log('------------------------------------------------------------');
        humidityModel = response;
        getModelTemperature(device);
    });
}

function getModelTemperature(device){
    device.getDeviceModel('urn:com:oracle:iot:device:temperature_sensor', function (response, error) {
        if (error) {
            console.log('-------------ERROR ON GET TEMPERATURE DEVICE MODEL----------');
            console.log(error.message);
            console.log('------------------------------------------------------------');
            return;
        }
        console.log('-----------------TEMPERATURE DEVICE MODEL-------------------');
        console.log(JSON.stringify(response,null,4));
        console.log('------------------------------------------------------------');
        temperatureModel = response;
        startVirtualHumidity(device, device.getEndpointId());
        startVirtualTemperature(device, device.getEndpointId());
    });
}

var dcd = new dcl.device.DirectlyConnectedDevice(storeFile, storePassword);
if (dcd.isActivated()) {
    getModelHumidity(dcd);
} else {
    dcd.activate(['urn:com:oracle:iot:device:humidity_sensor', 'urn:com:oracle:iot:device:temperature_sensor'], function (device, error) {
        if (error) {
            console.log('-----------------ERROR ON ACTIVATION------------------------');
            console.log(error.message);
            console.log('------------------------------------------------------------');
            return;
        }
        dcd = device;
        console.log(dcd.isActivated());
        if (dcd.isActivated()) {
            getModelHumidity(dcd);
        }
    });
}
