/**
 * Copyright (c) 2015, 2016, Oracle and/or its affiliates. All rights reserved.
 *
 * This software is dual-licensed to you under the MIT License (MIT) and
 * the Universal Permissive License (UPL). See the LICENSE file in the root
 * directory for license terms. You may choose either license, or both.
 *
 */

/**
 * This represents a GatewayDevice in the low level API.
 * It has the exact same specifications and capabilities as
 * a directly connected device from the low level API and additionally
 * it has the capability to register indirectly connected devices.
 *
 * @param {string} [taStoreFile] - trusted assets store file path
 * to be used for trusted assets manager creation. This is optional.
 * If none is given the default global library parameter is used:
 * lib.oracle.iot.tam.store
 * @param {string} [taStorePassword] - trusted assets store file password
 * to be used for trusted assets manager creation. This is optional.
 * If none is given the default global library parameter is used:
 * lib.oracle.iot.tam.storePassword
 *
 * @memberOf iotcs.device.util
 * @alias GatewayDevice
 * @class
 * @extends iotcs.device.util.DirectlyConnectedDevice
 */
lib.device.util.GatewayDevice = function (taStoreFile, taStorePassword) {
    lib.device.util.DirectlyConnectedDevice.call(this, taStoreFile, taStorePassword, true);
};

lib.device.util.GatewayDevice.prototype = Object.create(lib.device.util.DirectlyConnectedDevice.prototype);
lib.device.util.GatewayDevice.constructor = lib.device.util.GatewayDevice;

/** @inheritdoc */
lib.device.util.GatewayDevice.prototype.activate = function (deviceModelUrns, callback) {

    if (this.isActivated()) {
        lib.error('cannot activate an already activated device');
        return;
    }

    _mandatoryArg(deviceModelUrns, 'array');
    _mandatoryArg(callback, 'function');

    deviceModelUrns.forEach(function (urn) {
        _mandatoryArg(urn, 'string');
    });

    var deviceModels = deviceModelUrns;
    deviceModels.push('urn:oracle:iot:dcd:capability:direct_activation');
    deviceModels.push('urn:oracle:iot:dcd:capability:indirect_activation');
    var self = this;
    this._.internalDev.activate(deviceModels, function(activeDev, error) {
        if (!activeDev || error) {
            callback(null, error);
            return;
        }
        callback(self);
    });
};

/**
 * Register an indirectly-connected device with the cloud
 * service. An indirectly-connected device only needs to be
 * registered once. After registering the indirectly-connected
 * device, the caller is responsible for keeping track of what
 * devices have been registered, the metadata, and for
 * persisting the endpoint id. On subsequent boots, the same
 * endpoint id is to be used for the indirectly-connected
 * device. Registering an indirectly-connected device that has
 * already been registered will result in an error given by the
 * server.
 * <p>
 * The hardwareId is a unique identifier within the Cloud
 * Service instance. The metadata argument should typically contain all the standard
 * metadata (the constants documented in This object) along
 * with any other vendor defined metadata.
 *
 * @param {string} hardwareid - an identifier unique within
 * the Cloud Service instance
 * @param {Object} metadata - the metadata of the device
 * @param {string[]} deviceModelUrns - array of device model
 * URNs supported by the indirectly connected device
 * @param {function(Object)} callback - the callback function. This
 * function is called with the following argument: the endpoint id
 * of the indirectly-connected device is the registration was successful
 * or null and an error object as the second parameter: callback(id, error).
 * The reason can be retrieved from error.message and it represents
 * the actual response from the server or any other network or framework
 * error that can appear.
 *
 * @memberof iotcs.device.util.GatewayDevice.prototype
 * @function registerDevice
 */
lib.device.util.GatewayDevice.prototype.registerDevice = function (hardwareId, metaData, deviceModelUrns, callback) {

    if (!this.isActivated()) {
        lib.error('device not activated yet');
        return;
    }

    _mandatoryArg(hardwareId, 'string');
    _mandatoryArg(metaData, 'object');
    _mandatoryArg(callback, 'function');

    deviceModelUrns.forEach(function (urn) {
        _mandatoryArg(urn, 'string');
    });

    var payload = metaData;
    payload.hardwareId = hardwareId;
    payload.deviceModels = deviceModelUrns;

    var self = this;

    var indirect_request;

    indirect_request = function () {
        var options = {
            path: $impl.reqroot + '/activation/indirect/device'
                    + (lib.oracle.iot.client.device.allowDraftDeviceModels ? '' : '?createDraft=false'),
            method: 'POST',
            headers: {
                'Authorization': self._.internalDev._.bearer,
                'X-EndpointId': self._.internalDev._.tam.getEndpointId()
            },
            tam: self._.internalDev._.tam
        };
        $impl.protocolReq(options, JSON.stringify(payload), function (response_body, error) {

            if (!response_body || error || !response_body.endpointState) {
                callback(null, lib.createError('invalid response on indirect registration', error));
                return;
            }

            if(response_body.endpointState !== 'ACTIVATED') {
                callback(null, lib.createError('endpoint not activated: '+JSON.stringify(response_body)));
                return;
            }

            callback(response_body.endpointId);

        },indirect_request, self._.internalDev);
    };

    indirect_request();

};
