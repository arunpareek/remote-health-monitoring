/**
 * Copyright (c) 2016, Oracle and/or its affiliates. All rights reserved.
 *
 * This software is dual-licensed to you under the MIT License (MIT) and
 * the Universal Permissive License (UPL). See the LICENSE file in the root
 * directory for license terms. You may choose either license, or both.
 *
 */

/*
 * This sample is a gateway that presents beacon sensors to the IoT server. 
 *
 * It detects both iBeacon and Eddystone format beacon packets and 
 * it uses the iBeacon and Eddystone device models to register indirectly connected devices
 * for each beacon detected.
 *
 * It uses the virtual device API to update attributes.
 * 
 * This sample requires bleacon and eddystone-beacon-scanner libraries and 
 * Bluetooth LE support to detect real beacons.
 * 
 *  Simulation of beacons is also supported in case beacons are not available. 
 *  In this case, the additional libraries are not required.  
 */

var verbose = false;

/**
 * Number of data points to average over for RSSI smoothing
 */
var WINDOW_SIZE = 100;

/**
 * Interval to wait between messages sent to the server, measured in number of data points
 * received from the beacon
 */
var SEND_INTERVAL = 10;

/**
 * Only information from beacons currently within this maximum distance in meters
 * will be reported.
 */
var MAX_DISTANCE = 100.0;

/**
 * Set simulated to true to use simulated beacons or false for real beacons.
 */
var simulated = false;

/**
 * Number of simulated beacons to create when doing beacon simulation.
 */
var DEFAULT_NUM_BEACONS = 2;

dcl = require("device-library.node");
dcl = dcl({debug: verbose});
var Bleacon;
var EddystoneBeaconScanner;

if (!simulated) {
    Bleacon = require('bleacon');
    EddystoneBeaconScanner = require('eddystone-beacon-scanner');
}

var ibeaconModelUrn = 'urn:com:oracle:iot:device:location:ibeacon';
var eddystoneModelUrn = 'urn:com:oracle:iot:device:location:eddystone-tlm-uid';

var storeFile = (process.argv[2]);
var storePassword = (process.argv[3]);

var ibeaconModel;
var eddystoneModel;

var beacons = [];
var virtualBeacons = [];

function smoothData(count, data) {
    var average;
    var len = count < data.length ? count : data.length;
    if (len < 1)
        return 0;

    //copy the data to include in the calculation
    var tempData = data.slice(0, len);
    tempData.sort();

    //calculate the mean of the middle 80% of data
    var sum = 0;
    var discard = Math.round(0.1 * len);
    for (var i = discard; i < len - discard; i++) {
        sum += tempData[i];
    }
    average = Math.round(sum * 1.0 / (len - 2 * discard));
    return average;
}

function calculateDistance(rssi, txPower) {
    if (rssi === 0) {
        return -1.0;
    }
    var ratio = rssi * 1.0 / txPower;
    if (ratio < 1.0) {
        return Math.pow(ratio, 10);
    } else {
        var accuracy = (0.89976) * Math.pow(ratio, 7.7095) + 0.111;
        /* 0.89976, 7.7095 and 0.111 are the three constants calculated when 
         * solving for a best fit curve to our measured data points. */
        return accuracy;
    }

}

function discover(device) {
    var uuid = 'b9407f30f5f8466eaff925556b57fe6d'; // estimote only

    var sensorData = [];
    var rssiCount = [];
    var lastSent = [];
    var txPower = [];

    Bleacon.startScanning(uuid);
    EddystoneBeaconScanner.startScanning(true);

    Bleacon.on('discover', function (bleacon) {
        if (verbose) {
            console.log('beacon found: ' + JSON.stringify(bleacon));
        }
        var major = ('0000' + bleacon.major.toString(16)).substr(-4);
        var minor = ('0000' + bleacon.minor.toString(16)).substr(-4);
        var beaconId = bleacon.uuid.concat(':', major, ':', minor);
        if (beacons[beaconId] === undefined) {
            if (calculateDistance(bleacon.rssi, bleacon.measuredPower) <= MAX_DISTANCE) {
                //Indicate that we are in the process of registering this id
                beacons[beaconId] = -1;

                var metadata = new Object();
                metadata[dcl.device.GatewayDevice.DeviceMetadata.MANUFACTURER] = 'Estimote';
                metadata[dcl.device.GatewayDevice.DeviceMetadata.DEVICE_CLASS] = 'LE';
                metadata[dcl.device.GatewayDevice.DeviceMetadata.PROTOCOL] = 'Bluetooth-LE';
                metadata[dcl.device.GatewayDevice.DeviceMetadata.PROTOCOL_DEVICE_CLASS] = 'iBeacon';
                metadata[dcl.device.GatewayDevice.DeviceMetadata.MODEL_NUMBER] = 'EST';
                metadata[dcl.device.GatewayDevice.DeviceMetadata.SERIAL_NUMBER] = major + ':' + minor;

                device.registerDevice(beaconId, metadata, [ibeaconModelUrn], function (id) {
                    if (id) {
                        console.log('\n-----------------------------DEVICE ENDPOINT------------------------------');
                        console.log('HardwareID: ' + beaconId + ', DeviceID: ' + id);
                        console.log('--------------------------------------------------------------------------\n');
                        beacons[beaconId] = id;
                        txPower[beaconId] = bleacon.measuredPower;
                        virtualBeacons[beaconId] = device.createVirtualDevice(id, ibeaconModel);
                        var sensor = {
                            ora_rssi: bleacon.rssi,
                            ora_txPower: bleacon.measuredPower
                        };
                        virtualBeacons[beaconId].update(sensor);
                        console.log(id + ': rssi: ' + bleacon.rssi + ' txPower: ' + bleacon.measuredPower);
                        sensorData[beaconId] = new Array(WINDOW_SIZE);
                        sensorData[beaconId][0] = bleacon.rssi;
                        rssiCount[beaconId] = 1;
                        lastSent[beaconId] = 0;
                    } else {
                        beacons[beaconId] = undefined;
                    }
                });
            }
        } else {
            if (virtualBeacons[beaconId] !== undefined) {
                sensorData[beaconId][rssiCount[beaconId]++ % WINDOW_SIZE] = bleacon.rssi;
                if (rssiCount[beaconId] === Number.MAX_SAFE_INTEGER) {
                    rssiCount[beaconId] = Number.MAX_SAFE_INTEGER % WINDOW_SIZE + WINDOW_SIZE;
                }
                if (++lastSent[beaconId] === SEND_INTERVAL) {
                    var average = smoothData(rssiCount[beaconId], sensorData[beaconId]);
                    if (calculateDistance(average, txPower[beaconId]) <= MAX_DISTANCE) {
                        var sensor = {
                            ora_rssi: average
                        };
                        console.log(beacons[beaconId] + ': rssi: ' + average);
                        virtualBeacons[beaconId].update(sensor);
                        lastSent[beaconId] = 0;
                    }
                }
            }
        }

    });

    EddystoneBeaconScanner.on('updated', function (beacon) {
        if (verbose) {
            console.log('beacon found: ' + JSON.stringify(beacon));
        }
        if (beacon.type === 'uid') {
            var beaconId = beacon.namespace + ':' + beacon.instance;
            if (beacons[beaconId] === undefined) {
                //convert txPower from 0m away to 1m away
                if (beacon.txPower !== undefined && calculateDistance(beacon.rssi, beacon.txPower - 41) <= MAX_DISTANCE) {
                    //Indicate that we are in the process of registering this id
                    beacons[beaconId] = -1;

                    var metadata = new Object();
                    metadata[dcl.device.GatewayDevice.DeviceMetadata.MANUFACTURER] = 'Estimote';
                    metadata[dcl.device.GatewayDevice.DeviceMetadata.DEVICE_CLASS] = 'LE';
                    metadata[dcl.device.GatewayDevice.DeviceMetadata.PROTOCOL] = 'Bluetooth-LE';
                    metadata[dcl.device.GatewayDevice.DeviceMetadata.PROTOCOL_DEVICE_CLASS] = 'Eddystone';
                    metadata[dcl.device.GatewayDevice.DeviceMetadata.MODEL_NUMBER] = 'EST';
                    metadata[dcl.device.GatewayDevice.DeviceMetadata.SERIAL_NUMBER] = beacon.instance;

                    device.registerDevice(beaconId, metadata, [eddystoneModelUrn], function (id) {
                        if (id) {
                            console.log('\n-----------------------------DEVICE ENDPOINT------------------------------');
                            console.log('HardwareID: ' + beaconId + ', DeviceID: ' + id);
                            console.log('--------------------------------------------------------------------------\n');
                            beacons[beaconId] = id;
                            txPower[beaconId] = beacon.txPower - 41; //convert txPower from 0m away to 1m away
                            virtualBeacons[beaconId] = device.createVirtualDevice(id, eddystoneModel);
                            var sensor = {
                                ora_rssi: beacon.rssi,
                                ora_txPower: txPower[beaconId]
                            };
                            virtualBeacons[beaconId].update(sensor);
                            console.log(id + ': rssi: ' + beacon.rssi + ' txPower: ' + sensor.ora_txPower);
                            sensorData[beaconId] = new Array(WINDOW_SIZE);
                            sensorData[beaconId][0] = beacon.rssi;
                            rssiCount[beaconId] = 1;
                            lastSent[beaconId] = 0;
                        } else {
                            beacons[beaconId] = undefined;
                        }
                    });
                }
            } else {
                if (virtualBeacons[beaconId] !== undefined) {
                    sensorData[beaconId][rssiCount[beaconId]++ % WINDOW_SIZE] = beacon.rssi;
                    if (rssiCount[beaconId] === Number.MAX_SAFE_INTEGER) {
                        rssiCount[beaconId] = Number.MAX_SAFE_INTEGER % WINDOW_SIZE + WINDOW_SIZE;
                    }
                    if (++lastSent[beaconId] === SEND_INTERVAL) {
                        var average = smoothData(rssiCount[beaconId], sensorData[beaconId]);
                        if (calculateDistance(average, txPower[beaconId]) <= MAX_DISTANCE) {
                            var sensor = {
                                ora_rssi: average
                            };

                            /* If telemetry data is present in the packet, also update:
                             * temperature in degrees Celsius, expressed in 8.8 fixed-point format
                             * and battery voltage in millivolts. */
                            if (beacon.tlm !== undefined) {
                                sensor.temperature = beacon.tlm.temp * 256;
                                sensor.batteryVoltage = beacon.tlm.vbatt;
                                console.log(beacons[beaconId] + ': rssi: ' + average + ', temp: ' 
                                        + beacon.tlm.temp + ' C, vbatt: ' + sensor.batteryVoltage + ' mV');
                            } else {
                                console.log(beacons[beaconId] + ': rssi: ' + average);
                            }
                            virtualBeacons[beaconId].update(sensor);
                            lastSent[beaconId] = 0;
                        } 
                    }
                }
            }
        }
    });
}

var minRssiRange = -119;
var maxRssiRange = -0.1;
var amplitude =  minRssiRange * .10 + 1;
var numSteps = 10;
var minVoltRange = 0.1;
var maxVoltRange = 3000;
var amplitudeVolt = 0.1;
var minTempRange = 0;
var maxTempRange = 2560;
var amplitudeTemp = maxTempRange * .10 + 1;

function simulateBeacons(device) {
    for (var minor=0; minor<DEFAULT_NUM_BEACONS; minor++) {
        registerSimulatedBeacon(device, minor);
    }
    
    setInterval(updateSimulatedBeacons, 1000);
}

function registerSimulatedBeacon(device, minor) {
    var major = 'BEAC';
        var iBeacon = minor%2===0?true:false;
        var model, modelUrn;
        var minorStr = ('0000' + minor.toString(16)).substr(-4);
        var beaconId = gateway.getEndpointId() + '_Sample:' + major + ':' + minorStr;
        var metadata = new Object();
        metadata[dcl.device.GatewayDevice.DeviceMetadata.MANUFACTURER] = 'Sample';
        metadata[dcl.device.GatewayDevice.DeviceMetadata.DEVICE_CLASS] = 'LE';
        metadata[dcl.device.GatewayDevice.DeviceMetadata.PROTOCOL] = 'Bluetooth-LE';
        metadata[dcl.device.GatewayDevice.DeviceMetadata.SERIAL_NUMBER] = major + ':' + minorStr;
        if (iBeacon) {
            metadata[dcl.device.GatewayDevice.DeviceMetadata.PROTOCOL_DEVICE_CLASS] = 'iBeacon';
            metadata[dcl.device.GatewayDevice.DeviceMetadata.MODEL_NUMBER] = 'Sample iBeacon';
            model = ibeaconModel;
            modelUrn = ibeaconModelUrn;            
        }
        else {
            metadata[dcl.device.GatewayDevice.DeviceMetadata.PROTOCOL_DEVICE_CLASS] = 'Eddystone';
            metadata[dcl.device.GatewayDevice.DeviceMetadata.MODEL_NUMBER] = 'Sample Eddystone';
            model = eddystoneModel;
            modelUrn = eddystoneModelUrn;       
        }

        device.registerDevice(beaconId, metadata, [modelUrn], function (id) {
            if (id) {
                var x = Math.abs(hashCode(id))%360;
                var lastPoint = minRssiRange * (x + 1) / 360;
                var beac;
                if (iBeacon) {
                    beac = {
                        beaconId: beaconId,
                        eid: id,
                        rssi: 0,
                        txPower: -69,
                        x: x,
                        lastPoint: lastPoint,
                        step: 0,
                        nextPoint: 0,
                        type: 'iBeacon'
                    };
                } else {
                    var xTemp = Math.abs(hashCode(id))%360;
                    var lastTempPoint = maxTempRange * (xTemp + 1) / 360;
                    var xVolt = Math.abs(hashCode(id))%360;
                    beac = {
                        beaconId: beaconId,
                        eid: id,
                        rssi: 0,
                        txPower: -69,
                        x: x,
                        lastPoint: lastPoint,
                        step: 0,
                        nextPoint: 0,
                        type: 'Eddystone',
                        xVolt: xVolt,
                        lastVoltPoint: maxVoltRange,
                        xTemp: xTemp,
                        lastTempPoint: lastTempPoint
                    };
                }
                console.log('\n-----------------------------DEVICE ENDPOINT------------------------------');
                console.log('HardwareID: ' + beaconId + ', DeviceID: ' + id);
                console.log('--------------------------------------------------------------------------\n');
                beacons.push(beac);
                virtualBeacons[beaconId] = device.createVirtualDevice(id, model);
                var sensor = {
                    ora_rssi: beac.rssi,
                    ora_txPower: beac.txPower
                };
                virtualBeacons[beaconId].update(sensor);
                console.log(id + ': rssi: ' + beac.rssi + ' txPower: ' + beac.txPower);

            } else {
                beacons[minor] = undefined;
            }
        });
}

function hashCode(str) {
    var hash = 0;
    if (str.length === 0) {
        return 0;
    }
    for (var i = 0; i < str.length; i++) {
        var ch = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + ch;
    }
    return hash;
};

function updateSimulatedBeacons() {
    beacons.forEach(function (beacon) {
        var rssi = simulateRSSI(beacon);
        var sensor = {
            ora_rssi: rssi
        };
        if(beacon.type === 'Eddystone') {
            var temp = getSimulatedTemperature(beacon);
            var volt = getSimulatedVoltage(beacon);
            sensor.temperature = temp;
            sensor.batteryVoltage = volt;
            console.log(beacon.eid + ': rssi: ' + rssi + ', temp: ' 
                + Math.round(temp/2.56)/100 + ' C, vbatt: ' + volt + ' mV');
        } else {
            console.log(beacon.eid + ': rssi: ' + rssi);
        }
        virtualBeacons[beacon.beaconId].update(sensor);
        
    });
}

function simulateRSSI(beacon) {
    if (beacon.step === 0) {
        var delta = amplitude * Math.sin(toRadians(beacon.x));
        beacon.x += 14;
        var rssi = beacon.lastPoint + delta;

        if (rssi > maxRssiRange || rssi < minRssiRange)
            rssi = beacon.lastPoint - delta;

        beacon.nextPoint = rssi;
    }

    var incrementalRssi = beacon.lastPoint + (beacon.nextPoint - beacon.lastPoint) / numSteps * (beacon.step + 1);

    if (beacon.step === numSteps - 1) {
        beacon.step = 0;
        beacon.lastPoint = beacon.nextPoint;
    } else {
        beacon.step++;
    }

    return Math.round(incrementalRssi);
}

function toRadians(deg) {
    return deg * Math.PI/180;
}

function getSimulatedTemperature(beacon) {
    var delta = amplitudeTemp * Math.sin(toRadians(beacon.xTemp));
    beacon.xTemp += 14;
    var temp = beacon.lastTempPoint + delta;

    if (temp > maxTempRange || temp < minTempRange)
        temp = beacon.lastTempPoint - delta;

    beacon.lastTempPoint = temp;

    return Math.round(temp);
}

function getSimulatedVoltage(beacon) {
    var delta = Math.abs(amplitudeVolt * Math.sin(toRadians(beacon.xVolt)));
    beacon.xVolt += 14;
    var volt = beacon.lastVoltPoint - delta;
    if (volt < minVoltRange)
        volt = minVoltRange;
    beacon.lastVoltPoint = volt;
    return Math.round(volt);
}

function getBeaconModel(device) {
    device.getDeviceModel(ibeaconModelUrn, function (response) {
        if (verbose) {
            console.log('\n------------------------------DEVICE MODEL--------------------------------');
            console.log(JSON.stringify(response, null, 4));
            console.log('--------------------------------------------------------------------------\n');
        }
        ibeaconModel = response;
        
        device.getDeviceModel(eddystoneModelUrn, function (response) {
            if (verbose) {
                console.log('\n------------------------------DEVICE MODEL--------------------------------');
                console.log(JSON.stringify(response, null, 4));
                console.log('--------------------------------------------------------------------------\n');
            }
            eddystoneModel = response;
            
            if (!simulated) {
                discover(device);
            } else {
                simulateBeacons(device);
            }
        });
    });
    
}

function showUsage(){
    console.log("Usage: \n");
    console.log("node " + process.argv[1]);
    console.log(" <trusted assets file> <trusted assets password>\n");
}

if (process.argv.length !== 4) {
    showUsage();
    return;
}

var gateway = new dcl.device.GatewayDevice(storeFile, storePassword);
if (!gateway.isActivated()) {
    gateway.activate([], function (device) {
        gateway = device;
        console.log('Gateway ACTIVATED.');
        if (gateway.isActivated()) {
            getBeaconModel(gateway);
        }
    });
} else {
    console.log('Gateway was already activated.');
    getBeaconModel(gateway);
}




