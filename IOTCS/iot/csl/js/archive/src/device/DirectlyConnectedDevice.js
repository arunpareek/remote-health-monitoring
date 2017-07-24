/**
 * Copyright (c) 2015, 2016, Oracle and/or its affiliates. All rights reserved.
 *
 * This software is dual-licensed to you under the MIT License (MIT) and
 * the Universal Permissive License (UPL). See the LICENSE file in the root
 * directory for license terms. You may choose either license, or both.
 *
 */

/**
 * A directly-connected device is able to send messages to,
 * and receive messages from, the IoT server. When the
 * directly-connected device is activated on the server, the
 * server assigns a logical-endpoint identifier. This
 * logical-endpoint identifier is required for sending
 * messages to, and receiving messages from, the server.
 * <p>
 * The directly-connected device is able to activate itself using
 * the direct activation capability. The data required for activation
 * and authentication is retrieved from a TrustedAssetsStore generated
 * using the TrustedAssetsProvisioner tool using the Default TrustedAssetsManager.
 * <p>
 * This object represents the high level API for the directly-connected device
 * and uses the MessageDispatcher for sending/receiving messages.
 * Also it implements the message dispatcher, diagnostics and connectivity test
 * capabilities. Also it can be used for creating virtual devices.
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
 * @see {@link iotcs.device.util.MessageDispatcher}
 * @memberOf iotcs.device
 * @alias DirectlyConnectedDevice
 * @class
 * @extends iotcs.Client
 */
lib.device.DirectlyConnectedDevice = function (taStoreFile, taStorePassword, gateway) {
    lib.Client.call(this);

    Object.defineProperty(this, '_',{
        enumerable: false,
        configurable: false,
        writable: false,
        value: {}
    });

    Object.defineProperty(this._, 'internalDev',{
        enumerable: false,
        configurable: false,
        writable: false,
        value: (gateway ? new lib.device.util.GatewayDevice(taStoreFile, taStorePassword) : new lib.device.util.DirectlyConnectedDevice(taStoreFile, taStorePassword))
    });

    Object.defineProperty(this._, 'virtualDevices',{
        enumerable: false,
        configurable: false,
        writable: false,
        value: {}
    });

    var self = this;

    Object.defineProperty(this._, 'removeVirtualDevice',{
        enumerable: false,
        configurable: false,
        writable: false,
        value: function(device) {
            if (self._.virtualDevices[device.getEndpointId()]) {
                if (self._.virtualDevices[device.getEndpointId()][device.getDeviceModel().urn]) {
                    delete self._.virtualDevices[device.getEndpointId()][device.getDeviceModel().urn];
                }
                if (Object.keys(self._.virtualDevices[device.getEndpointId()]).length === 0) {
                    delete self._.virtualDevices[device.getEndpointId()];
                }
            }
        }
    });

    Object.defineProperty(this._, 'addVirtualDevice',{
        enumerable: false,
        configurable: false,
        writable: false,
        value: function(device){
            self._.removeVirtualDevice(device);
            if (!self._.virtualDevices[device.getEndpointId()]) {
                self._.virtualDevices[device.getEndpointId()] = {};
            }
            self._.virtualDevices[device.getEndpointId()][device.getDeviceModel().urn] = device;
        }
    });

    var messageResponseHandler = function (messages, exception) {

        var deviceMap = {};

        messages.forEach(function (messageObj) {
            var message = messageObj.getJSONObject();
            if ((message.type === lib.message.Message.Type.DATA) && message.payload.data
                && message.payload.format && (message.payload.format.indexOf(':attributes') > -1)) {
                var model = message.payload.format.substring(0, message.payload.format.indexOf(':attributes'));
                var devId = message.source;
                if (!(devId in deviceMap)) {
                    deviceMap[devId] = {};
                }
                if (!(model in deviceMap)) {
                    deviceMap[devId][model] = {};
                }
                for (var key in message.payload.data) {
                    deviceMap[devId][model][key] = message.payload.data[key];
                }
            } else if (((message.type === lib.message.Message.Type.ALERT) || (message.type === lib.message.Message.Type.DATA))
                && message.payload.format) {
                var devId1 = message.source;
                if (!(devId1 in deviceMap)) {
                    deviceMap[devId1] = {};
                }
                var format = message.payload.format;
                if (devId1 in self._.virtualDevices) {
                    for (var model1 in self._.virtualDevices[devId1]) {
                        if (format in self._.virtualDevices[devId1][model1]) {
                            if (!(model1 in deviceMap)) {
                                deviceMap[devId1][model1] = {};
                            }
                            deviceMap[devId1][model1][format] = message.payload.data;
                        }
                    }
                }
            }
        });

        for (var deviceId in deviceMap) {
            for (var deviceModel in deviceMap[deviceId]) {
                if ((deviceId in self._.virtualDevices) && (deviceModel in self._.virtualDevices[deviceId])) {
                    var device = self._.virtualDevices[deviceId][deviceModel];
                    var attributeNameValuePairs = deviceMap[deviceId][deviceModel];
                    var attrObj = {};
                    var newValObj = {};
                    var tryValObj = {};
                    for (var attributeName in attributeNameValuePairs) {
                        var attribute = device[attributeName];
                        if (attribute && (attribute instanceof $impl.Attribute)) {
                            attribute._.onUpdateResponse(exception);
                            attrObj[attribute.id] = attribute;
                            newValObj[attribute.id] = attribute.value;
                            tryValObj[attribute.id] = attributeNameValuePairs[attributeName];
                            if (exception && attribute.onError) {
                                var onAttributeErrorTuple = {
                                    attribute: attribute,
                                    newValue: attribute.value,
                                    tryValue: attributeNameValuePairs[attributeName],
                                    errorResponse: exception
                                };
                                attribute.onError(onAttributeErrorTuple);
                            }
                        }
                        else if (attribute && (attribute.type === 'ALERT')) {
                            attrObj[attribute.urn] = new lib.device.Alert(device, attribute.urn);
                            var data = attributeNameValuePairs[attributeName];
                            for(var key in data) {
                                attrObj[attribute.urn].fields[key] = data[key];
                            }
                        }
                        else if (attribute && (attribute.type === 'DATA')) {
                            attrObj[attribute.urn] = new lib.device.Data(device, attribute.urn);
                            var data1 = attributeNameValuePairs[attributeName];
                            for(var key1 in data1) {
                                attrObj[attribute.urn].fields[key1] = data1[key1];
                            }
                        }
                    }
                    if (exception && device.onError) {
                        var onDeviceErrorTuple = {
                            attributes: attrObj,
                            newValues: newValObj,
                            tryValues: tryValObj,
                            errorResponse: exception
                        };
                        device.onError(onDeviceErrorTuple);
                    }
                }
            }
        }

    };

    new lib.device.util.MessageDispatcher(this._.internalDev).onError = messageResponseHandler;
    new lib.device.util.MessageDispatcher(this._.internalDev).onDelivery = messageResponseHandler;


};

lib.device.DirectlyConnectedDevice.prototype = Object.create(lib.Client.prototype);
lib.device.DirectlyConnectedDevice.constructor = lib.device.DirectlyConnectedDevice;

/**
 * Activate the device. The device will be activated on the
 * server if necessary. When the device is activated on the
 * server. The activation would tell the server the models that
 * the device implements. Also the activation can generate
 * additional authorization information that will be stored in
 * the TrustedAssetsStore and used for future authentication
 * requests. This can be a time/resource consuming operation for
 * some platforms.
 * <p>
 * If the device is already activated, this method will throw
 * an exception. The user should call the isActivated() method
 * prior to calling activate.
 *
 * @param {string[]} deviceModelUrns - an array of deviceModel
 * URNs implemented by this directly connected device
 * @param {function} callback - the callback function. This
 * function is called with this object but in the activated
 * state. If the activation is not successful then the object
 * will be null and an error object is passed in the form
 * callback(device, error) and the reason can be taken from
 * error.message
 *
 * @memberOf iotcs.device.DirectlyConnectedDevice.prototype
 * @function activate
 */
lib.device.DirectlyConnectedDevice.prototype.activate = function (deviceModelUrns, callback) {

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
    deviceModels.push('urn:oracle:iot:dcd:capability:diagnostics');
    deviceModels.push('urn:oracle:iot:dcd:capability:message_dispatcher');
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
 * This will return the directly connected device state.
 *
 * @returns {boolean} whether the device is activated.
 *
 * @memberof iotcs.device.DirectlyConnectedDevice.prototype
 * @function isActivated
 */
lib.device.DirectlyConnectedDevice.prototype.isActivated = function () {
    return this._.internalDev.isActivated();
};

/**
 * Return the logical-endpoint identifier of this
 * directly-connected device. The logical-endpoint identifier
 * is assigned by the server as part of the activation
 * process.
 *
 * @returns {string} the logical-endpoint identifier of this
 * directly-connected device.
 *
 * @memberof iotcs.device.DirectlyConnectedDevice.prototype
 * @function getEndpointId
 */
lib.device.DirectlyConnectedDevice.prototype.getEndpointId = function () {
    return this._.internalDev.getEndpointId();
};

/**@inheritdoc*/
lib.device.DirectlyConnectedDevice.prototype.getDeviceModel = function (deviceModelUrn, callback) {
    return this._.internalDev.getDeviceModel(deviceModelUrn, callback);
};

/**
 * Create a VirtualDevice instance with the given device model
 * for the given device identifier. This method creates a new
 * VirtualDevice instance for the given parameters. The client
 * library does not cache previously created VirtualDevice
 * objects.
 * <p>
 * A device model can be obtained by it's afferent urn with the
 * DirectlyConnectedDevice if it is registered on the cloud.
 *
 * @param {string} endpointId - The endpoint identifier of the
 * device being modeled.
 * @param {object} deviceModel - The device model object
 * holding the full description of that device model that this
 * device implements.
 * @returns {iotcs.device.VirtualDevice} The newly created virtual device
 *
 * @see {@link iotcs.device.DirectlyConnectedDevice#getDeviceModel}
 * @memberof lib.device.DirectlyConnectedDevice.prototype
 * @function createVirtualDevice
 */
lib.device.DirectlyConnectedDevice.prototype.createVirtualDevice = function (endpointId, deviceModel) {
    _mandatoryArg(endpointId, 'string');
    _mandatoryArg(deviceModel, 'object');
    return new lib.device.VirtualDevice(endpointId, deviceModel, this);
};

/**
 * This method will close this directly connected device (client) and
 * all it's resources. All monitors required by the message dispatcher
 * associated with this client will be stopped and all created virtual
 * devices will be removed.
 *
 * @memberof iotcs.device.DirectlyConnectedDevice.prototype
 * @function close
 */
lib.device.DirectlyConnectedDevice.prototype.close = function () {
    this._.internalDev.close();
    for (var key in this._.virtualDevices) {
        for (var key1 in this._.virtualDevices[key]) {
            this._.virtualDevices[key][key1].close();
        }
    }
};
