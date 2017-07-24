/**
 * Copyright (c) 2015, 2016, Oracle and/or its affiliates. All rights reserved.
 *
 * This software is dual-licensed to you under the MIT License (MIT) and
 * the Universal Permissive License (UPL). See the LICENSE file in the root
 * directory for license terms. You may choose either license, or both.
 *
 */

/**@ignore*/
$impl.DeviceModelFactory = function () {

    if ($impl.DeviceModelFactory.prototype._singletonInstance) {
        return $impl.DeviceModelFactory.prototype._singletonInstance;
    }
    $impl.DeviceModelFactory.prototype._singletonInstance = this;

    this.cache = this.cache || {};
    this.cache.deviceModels = {};
};

/**@ignore*/
$impl.DeviceModelFactory.prototype.getDeviceModel = function (dcd, deviceModelUrn, callback) {

    _mandatoryArg(dcd, lib.device.util.DirectlyConnectedDevice);

    if (!dcd.isActivated()) {
        lib.error('device not activated yet');
        return;
    }

    _mandatoryArg(deviceModelUrn, 'string');
    _mandatoryArg(callback, 'function');

    var deviceModel = this.cache.deviceModels[deviceModelUrn];
    if (deviceModel) {
        callback(deviceModel);
        return;
    }

    var options = {
        path: $impl.reqroot + '/deviceModels/' + deviceModelUrn,
        method: 'GET',
        headers: {
            'Authorization': dcd._.internalDev._.bearer,
            'X-EndpointId': dcd._.internalDev._.tam.getEndpointId()
        },
        tam: dcd._.internalDev._.tam
    };

    var self = this;
    $impl.protocolReq(options, '', function (response, error) {
        if(!response || !(response.urn) || error){
            callback(null, lib.createError('invalid response on get device model',error));
            return;
        }
        var deviceModel = response;

        if(!lib.oracle.iot.client.device.allowDraftDeviceModels && deviceModel.draft) {
            callback(null, lib.createError('draft device model and library is not configured for draft models'));
            return;
        }

        Object.freeze(deviceModel);
        self.cache.deviceModels[deviceModelUrn] = deviceModel;
        callback(deviceModel);
    }, function () {
        self.getDeviceModel(dcd, deviceModelUrn, callback);
    }, dcd._.internalDev);
};