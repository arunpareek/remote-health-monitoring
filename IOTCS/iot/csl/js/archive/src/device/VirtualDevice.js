/**
 * Copyright (c) 2015, 2016, Oracle and/or its affiliates. All rights reserved.
 *
 * This software is dual-licensed to you under the MIT License (MIT) and
 * the Universal Permissive License (UPL). See the LICENSE file in the root
 * directory for license terms. You may choose either license, or both.
 *
 */

/**
 * VirtualDevice is a representation of a device model
 * implemented by an endpoint. A device model is a
 * specification of the attributes, formats, and resources
 * available on the endpoint.
 * <p>
 * This VirtualDevice API is specific to the device
 * client. This implements the alerts defined in the
 * device model and can be used for raising alerts to
 * be sent to the server for the device. Also it has
 * action handlers for actions that come as requests
 * from the server side.
 * <p>
 * A device model can be obtained by it's afferent urn with the
 * DirectlyConnectedDevice if it is registered on the cloud.
 * <p>
 * The VirtualDevice has the attributes, actions and alerts of the device
 * model as properties and it provides functionality to the device
 * model in the following ways:
 * <p>
 * <b>Get the value of an attribute:</b><br>
 * <code>var value = device.temperature.value;</code><br>
 * <p>
 * <b>Get the last known value of an attribute:</b><br>
 * <code>var lastValue = device.temperature.lastKnownValue;</code><br>
 * <p>
 * <b>Set the value of an attribute (with update on cloud and error callback handling):</b><br>
 * <code>device.temperature.onError = function (errorTuple);</code><br>
 * <code>device.temperature.value = 27;</code><br>
 * where errorTuple is an object of the form
 * <code>{attribute: ... , newValue: ... , tryValue: ... , errorResponse: ...}</code>.
 * The library will throw an error in the value to update is invalid
 * according to the device model.
 * <p>
 * <b>Monitor a specific attribute for any value change (that comes from the cloud):</b><br>
 * <code>device.maxThreshold.onChange = function (changeTuple);</code><br>
 * where changeTuple is an object of the form
 * <code>{attribute: ... , newValue: ... , oldValue: ...}</code>.
 * To tell the cloud that the attribute update has failed
 * an exception must be thrown in the onChange function, otherwise the
 * library will send an OK response message to the cloud.
 * <p>
 * <b>Monitor a specific action that was requested from the server:</b><br>
 * <code>device.reset.onExecute = function (value);</code><br>
 * where value is an optional parameter given if the action has parameters
 * defined in the device model. To tell the cloud that an action has failed
 * an exception must be thrown in the onExecute function, otherwise the
 * library will send an OK response message to the cloud.
 * <p>
 * <b>Monitor all attributes for any value change (that comes from the cloud):</b><br>
 * <code>device.onChange = function (changeTuple);</code><br>
 * where changeTuple is an object with array type properties of the form
 * <code>[{attribute: ... , newValue: ... , oldValue: ...}]</code>.
 * To tell the cloud that the attribute update has failed
 * an exception must be thrown in the onChange function, otherwise the
 * library will send an OK response message to the cloud.
 * <p>
 * <b>Monitor all update errors:</b><br>
 * <code>device.onError = function (errorTuple);</code><br>
 * where errorTuple is an object with array type properties (besides errorResponse) of the form
 * <code>{attributes: ... , newValues: ... , tryValues: ... , errorResponse: ...}</code>.
 * <p>
 * <b>Raising alerts:</b><br>
 * <code>var alert = device.createAlert('urn:com:oracle:iot:device:temperature_sensor:too_hot');</code><br>
 * <code>alert.fields.temp = 100;</code><br>
 * <code>alert.fields.maxThreshold = 90;</code><br>
 * <code>alert.raise();</code><br>
 * If an alert was not sent the error is handled by the device.onError handler where errorTuple has
 * the following structure:<br>
 * <code>{attributes: ... , errorResponse: ...}</code><br>
 * where attributes are the alerts that failed with fields already set, so the alert can be retried
 * only by raising them.
 * <p>
 * <b>Sending custom data fields:</b><br>
 * <code>var data = device.createData('urn:com:oracle:iot:device:motion_sensor:rfid_detected');</code><br>
 * <code>data.fields.detecting_motion = true;</code><br>
 * <code>data.submit();</code><br>
 * If the custom data fields were not sent, the error is handled by the device.onError handler where errorTuple has
 * the following structure:<br>
 * <code>{attributes: ... , errorResponse: ...}</code><br>
 * where attributes are the Data objects that failed to be sent with fields already set, so the Data objects can be retried
 * only by sending them.
 * <p>
 * A VirtualDevice can also be created with the appropriate
 * parameters from the DirectlyConnectedDevice.
 *
 * @param {string} endpointId - The endpoint id of this device
 * @param {object} deviceModel - The device model object
 * holding the full description of that device model that this
 * device implements.
 * @param {iotcs.device.DirectlyConnectedDevice} client - The device client
 * used as message dispatcher for this virtual device.
 *
 * @see {@link iotcs.device.DirectlyConnectedDevice#getDeviceModel}
 * @see {@link iotcs.device.DirectlyConnectedDevice#createVirtualDevice}
 * @class
 * @memberOf iotcs.device
 * @alias VirtualDevice
 * @extends iotcs.AbstractVirtualDevice
 */
lib.device.VirtualDevice = function (endpointId, deviceModel, client) {
    _mandatoryArg(endpointId, 'string');
    _mandatoryArg(deviceModel, 'object');
    _mandatoryArg(client, lib.device.DirectlyConnectedDevice);

    lib.AbstractVirtualDevice.call(this, endpointId, deviceModel);

    this.client = client;

    var messageDispatcher = new lib.device.util.MessageDispatcher(this.client._.internalDev);

    var self = this;

    this.attributes = this;

    var attributeHandler = function (requestMessage) {
        var method = _getMethodForRequestMessage(requestMessage);
        if (!method || (method !== 'PUT')) {
            return lib.message.Message.buildResponseMessage(requestMessage, 405, {}, 'Method Not Allowed', '');
        }
        var urlAttribute = requestMessage.payload.url.substring(requestMessage.payload.url.lastIndexOf('/') + 1);
        if ((urlAttribute in self.attributes)
            && (self.attributes[urlAttribute] instanceof $impl.Attribute)) {
            try {
                var attribute = self.attributes[urlAttribute];
                var data = null;
                try {
                    data = JSON.parse($port.util.atob(requestMessage.payload.body));
                } catch (e) {
                    return lib.message.Message.buildResponseMessage(requestMessage, 400, {}, 'Bad Request', '');
                }
                var oldValue = attribute.value;
                if (!data || (typeof data.value === 'undefined') || !attribute._.remoteUpdate(data.value, true)) {
                    return lib.message.Message.buildResponseMessage(requestMessage, 400, {}, 'Bad Request', '');
                }
                var onChangeTuple = {
                    attribute: attribute,
                    newValue: data.value,
                    oldValue: oldValue
                };
                if (attribute.onChange) {
                    attribute.onChange(onChangeTuple);
                }
                if (self.onChange) {
                    self.onChange([onChangeTuple]);
                }
                var message = new lib.message.Message();
                message
                    .type(lib.message.Message.Type.DATA)
                    .source(self.getEndpointId())
                    .format(self.model.urn+":attributes");
                attribute._.remoteUpdate(data.value, false);
                message.dataItem(urlAttribute, data.value);
                messageDispatcher.queue(message);
                return lib.message.Message.buildResponseMessage(requestMessage, 200, {}, 'OK', '');
            } catch (e) {
                return lib.message.Message.buildResponseMessage(requestMessage, 400, {}, 'Bad Request', '');
            }
        } else {
            return lib.message.Message.buildResponseMessage(requestMessage, 404, {}, 'Not Found', '');
        }
    };

    var attributes = this.model.attributes;
    for (var indexAttr in attributes) {
        var attribute = new $impl.Attribute(attributes[indexAttr]);
        if (attributes[indexAttr].alias) {
            _link(attributes[indexAttr].alias, this, attribute);
            messageDispatcher.getRequestDispatcher().registerRequestHandler(endpointId, 'deviceModels/'+this.model.urn+'/attributes/'+attributes[indexAttr].alias, attributeHandler);
        }
        _link(attributes[indexAttr].name, this, attribute);
        messageDispatcher.getRequestDispatcher().registerRequestHandler(endpointId, 'deviceModels/'+this.model.urn+'/attributes/'+attributes[indexAttr].name, attributeHandler);
    }

    this.actions = this;

    var actionHandler = function (requestMessage) {
        var method = _getMethodForRequestMessage(requestMessage);
        var urlAction = requestMessage.payload.url.substring(requestMessage.payload.url.lastIndexOf('/') + 1);
        if (!method || (method !== 'POST')) {
            return lib.message.Message.buildResponseMessage(requestMessage, 405, {}, 'Method Not Allowed', '');
        }
        if ((urlAction in self.actions)
            && (self.actions[urlAction] instanceof $impl.Action)
            && self.actions[urlAction].onExecute) {
            try {
                var action = self.actions[urlAction];
                var data = null;
                try {
                    data = JSON.parse($port.util.atob(requestMessage.payload.body));
                } catch (e) {
                    return lib.message.Message.buildResponseMessage(requestMessage, 400, {}, 'Bad Request', '');
                }
                if (!data || !action.checkVarArg(data.value)) {
                    return lib.message.Message.buildResponseMessage(requestMessage, 400, {}, 'Bad Request', '');
                }
                action.onExecute(data.value);
                return lib.message.Message.buildResponseMessage(requestMessage, 200, {}, 'OK', '');
            } catch (e) {
                return lib.message.Message.buildResponseMessage(requestMessage, 500, {}, 'Internal Server Error', '');
            }
        } else {
            return lib.message.Message.buildResponseMessage(requestMessage, 404, {}, 'Not Found', '');
        }
    };

    var actions = this.model.actions;
    for (var indexAction in actions) {
        var action = new $impl.Action(actions[indexAction]);
        if (actions[indexAction].alias) {
            _link(actions[indexAction].alias, this.actions, action);
            messageDispatcher.getRequestDispatcher().registerRequestHandler(endpointId, 'deviceModels/'+this.model.urn+'/actions/'+actions[indexAction].alias, actionHandler);
        }
        _link(actions[indexAction].name, this.actions, action);
        messageDispatcher.getRequestDispatcher().registerRequestHandler(endpointId, 'deviceModels/'+this.model.urn+'/actions/'+actions[indexAction].name, actionHandler);
    }

    if (this.model.formats) {

        this.alerts = this;
        this.dataFormats = this;
        this.model.formats.forEach(function (format) {
            if (format.type && format.urn) {
                if (format.type === 'ALERT') {
                    self.alerts[format.urn] = format;
                }
                if (format.type === 'DATA') {
                    self.dataFormats[format.urn] = format;
                }
            }
        });

    }

    Object.defineProperty(this, '_',{
        enumerable: false,
        configurable: false,
        writable: false,
        value: {}
    });


    Object.defineProperty(this._, 'updateAttributes', {
        enumerable: false,
        configurable: false,
        writable: false,
        value: function (attributes) {
            var message = new lib.message.Message();
            message
                .type(lib.message.Message.Type.DATA)
                .source(self.getEndpointId())
                .format(self.model.urn+":attributes");

            for (var attribute in attributes) {
                var value = attributes[attribute];
                if (attribute in self.attributes) {
                    message.dataItem(attribute,value);
                } else {
                    lib.error('unknown attribute "'+attribute+'"');
                    return;
                }
            }

            messageDispatcher.queue(message);
        }
    });

    messageDispatcher.getRequestDispatcher().registerRequestHandler(endpointId, 'deviceModels/'+this.model.urn+'/attributes', function (requestMessage) {
        var method = _getMethodForRequestMessage(requestMessage);
        if (!method || (method !== 'PATCH')) {
            return lib.message.Message.buildResponseMessage(requestMessage, 405, {}, 'Method Not Allowed', '');
        }
        if (self.onChange){
            try {
                var data = null;
                try {
                    data = JSON.parse($port.util.atob(requestMessage.payload.body));
                } catch (e) {
                    return lib.message.Message.buildResponseMessage(requestMessage, 400, {}, 'Bad Request', '');
                }
                if (!data) {
                    return lib.message.Message.buildResponseMessage(requestMessage, 400, {}, 'Bad Request', '');
                }
                var tupleArray = [];
                for (var attributeName in data) {
                    var attribute = self.attributes[attributeName];
                    if (!attribute) {
                        return lib.message.Message.buildResponseMessage(requestMessage, 400, {}, 'Bad Request', '');
                    }
                    var oldValue = attribute.value;
                    if (!attribute._.remoteUpdate(data[attributeName], true)) {
                        return lib.message.Message.buildResponseMessage(requestMessage, 400, {}, 'Bad Request', '');
                    }
                    var onChangeTuple = {
                        attribute: attribute,
                        newValue: data[attributeName],
                        oldValue: oldValue
                    };
                    if (attribute.onChange) {
                        attribute.onChange(onChangeTuple);
                    }
                    tupleArray.push(onChangeTuple);
                }
                self.onChange(tupleArray);
                var message = new lib.message.Message();
                message
                    .type(lib.message.Message.Type.DATA)
                    .source(self.getEndpointId())
                    .format(self.model.urn+":attributes");
                for (var attributeName1 in data) {
                    var attribute1 = self.attributes[attributeName1];
                    attribute1._.remoteUpdate(data[attributeName1], false);
                    message.dataItem(attributeName1, data[attributeName1]);
                }
                messageDispatcher.queue(message);
                return lib.message.Message.buildResponseMessage(requestMessage, 200, {}, 'OK', '');
            } catch (e) {
                return lib.message.Message.buildResponseMessage(requestMessage, 500, {}, 'Internal Server Error', '');
            }
        } else {
            return lib.message.Message.buildResponseMessage(requestMessage, 404, {}, 'Not Found', '');
        }
    });

    // seal object
    Object.preventExtensions(this);

    this.client._.addVirtualDevice(this);

};

lib.device.VirtualDevice.prototype = Object.create(lib.AbstractVirtualDevice.prototype);
lib.device.VirtualDevice.constructor = lib.device.VirtualDevice;

/**
 * This method returns an Alert object created based on the
 * format given as parameter. An Alert object can be used to
 * send alerts to the server by calling the raise method,
 * after all mandatory fields of the alert are set.
 *
 * @param {string} formatUrn - the urn format of the alert spec
 * as defined in the device model that this virtual device represents
 *
 * @returns {iotcs.device.Alert} The Alert instance
 *
 * @memberOf iotcs.device.VirtualDevice.prototype
 * @function createAlert
 */
lib.device.VirtualDevice.prototype.createAlert = function (formatUrn) {
    return new lib.device.Alert(this, formatUrn);
};

/**
 * This method returns a Data object created based on the
 * format given as parameter. A Data object can be used to
 * send custom data fields to the server by calling the submit method,
 * after all mandatory fields of the data object are set.
 *
 * @param {string} formatUrn - the urn format of the custom data spec
 * as defined in the device model that this virtual device represents
 *
 * @returns {iotcs.device.Data} The Data instance
 *
 * @memberOf iotcs.device.VirtualDevice.prototype
 * @function createData
 */
lib.device.VirtualDevice.prototype.createData = function (formatUrn) {
    return new lib.device.Data(this, formatUrn);
};

/**@inheritdoc */
lib.device.VirtualDevice.prototype.update = function (attributes) {
    _mandatoryArg(attributes, 'object');
    if (Object.keys(attributes).length === 0) {
        return;
    }
    for (var attribute in attributes) {
        var value = attributes[attribute];
        if (attribute in this.attributes) {
            this.attributes[attribute]._.localUpdate(value, true); //XXX not clean
        } else {
            lib.error('unknown attribute "'+attribute+'"');
            return;
        }
    }
    this._.updateAttributes(attributes);
};

/**@inheritdoc */
lib.device.VirtualDevice.prototype.close = function () {
    if (this.client) {
        this.client._.removeVirtualDevice(this);
    }
    this.endpointId = null;
    this.onChange = function (arg) {};
    this.onError = function (arg) {};
};
