/**
 * Copyright (c) 2015, 2016, Oracle and/or its affiliates. All rights reserved.
 *
 * This software is dual-licensed to you under the MIT License (MIT) and
 * the Universal Permissive License (UPL). See the LICENSE file in the root
 * directory for license terms. You may choose either license, or both.
 *
 */

/**
 * The Alert is an object that represents an alert type message format
 * define din the formats section of the device model. Alerts can be used
 * to send alert messages to the server.
 * <p>
 * The Alert API is specific to the device client library and the alerts
 * can be created by the VirtualDevice objects or using them.
 * For setting the fields of the alert as defined in the model, the fields
 * property of the alert will be used e.g.:<br>
 * <code>alert.fields.temp = 50;</code>
 * <p>
 * The constructor of the Alert should not be used directly but the
 * {@link iotcs.device.VirtualDevice#createAlert} method should be used
 * for creating alert objects.
 *
 * @memberOf iotcs.device
 * @alias Alert
 * @class
 *
 * @param {iotcs.device.VirtualDevice} virtualDevice - the virtual device that has
 * in it's device model the alert specification
 * @param {string} formatUrn - the urn format of the alert spec
 *
 * @see {@link iotcs.device.VirtualDevice#createAlert}
 */
lib.device.Alert = function (virtualDevice, formatUrn) {
    _mandatoryArg(virtualDevice, lib.device.VirtualDevice);
    _mandatoryArg(formatUrn, 'string');

    var alertSpec = virtualDevice[formatUrn];

    if (!alertSpec.urn || (alertSpec.type !== 'ALERT')) {
        lib.error('alert specification in device model is invalid');
        return;
    }

    this.device = virtualDevice;

    var spec = {
        urn: alertSpec.urn,
        description: (alertSpec.description || ''),
        name: (alertSpec.name || null)
    };


    if (alertSpec.value && alertSpec.value.fields && Array.isArray(alertSpec.value.fields)) {

        Object.defineProperty(this, 'fields', {
            enumerable: true,
            configurable: false,
            writable: false,
            value: {}
        });

        Object.defineProperty(this, '_', {
            enumerable: false,
            configurable: false,
            writable: false,
            value: {}
        });

        var self = this;

        alertSpec.value.fields.forEach(function (field) {

            self._[field.name] = {};
            self._[field.name].type = field.type.toUpperCase();
            self._[field.name].optional = field.optional;
            self._[field.name].name = field.name;
            self._[field.name].value = null;
            Object.defineProperty(self.fields, field.name, {
                enumerable: false,
                configurable: false,
                get: function () {
                    return self._[field.name].value;
                },
                set: function (newValue) {

                    if (!self._[field.name].optional && ((typeof newValue === 'undefined') || (newValue === null))) {
                        lib.error('trying to unset a mandatory field in the alert');
                        return;
                    }

                    newValue = _checkAndGetNewValue(newValue, self._[field.name]);

                    if (typeof newValue === 'undefined') {
                        lib.error('trying to set an invalid type of field in the alert');
                        return;
                    }

                    self._[field.name].value = newValue;
                }
            });

        });
    }

    // public members

    Object.defineProperty(this, 'urn', {
        enumerable: true,
        configurable: false,
        writable: false,
        value: spec.urn
    });

    Object.defineProperty(this, 'name', {
        enumerable: true,
        configurable: false,
        writable: false,
        value: spec.name
    });

    Object.defineProperty(this, 'description', {
        enumerable: true,
        configurable: false,
        writable: false,
        value: spec.description
    });

};

/**
 * This method is used to actually send the alert message to the server.
 * The default severity for the alert sent is SIGNIFICANT.
 * All mandatory fields (according to the device model definition)
 * must be set before sending, otherwise an error will be thrown.
 * Any error that can arise while sending will be handled by the
 * VirtualDevice.onError handler, if set.
 * <p>
 * After a successful raise all the values are reset so to raise
 * again the values must be first set.
 *
 * @see {@link iotcs.device.VirtualDevice}
 * @memberOf iotcs.device.Alert.prototype
 * @function raise
 */
lib.device.Alert.prototype.raise = function () {
    var message = lib.message.Message.AlertMessage.buildAlertMessage(this.urn, this.description, lib.message.Message.AlertMessage.Severity.SIGNIFICANT);
    message.source(this.device.getEndpointId());
    for (var key in this._) {
        var field = this._[key];
        if (!field.optional && ((typeof field.value === 'undefined') || (field.value === null))) {
            lib.error('all mandatory fields not set');
            return;
        }
        if ((typeof field.value !== 'undefined') && (field.value !== null)) {
            message.dataItem(key, field.value);
        }
    }
    new lib.device.util.MessageDispatcher(this.device.client._.internalDev).queue(message);
    for (var key1 in this._) {
        this._[key1].value = null;
    }
};
