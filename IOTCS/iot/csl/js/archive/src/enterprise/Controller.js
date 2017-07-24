/**
 * Copyright (c) 2015, 2016, Oracle and/or its affiliates. All rights reserved.
 *
 * This software is dual-licensed to you under the MIT License (MIT) and 
 * the Universal Permissive License (UPL). See the LICENSE file in the root
 * directory for license terms. You may choose either license, or both.
 *
 */

//@TODO: a little more JSDOC is needed

/**
 * @param {function()} callback - function associated to this monitor
 * @class
 */
/** @ignore */
$impl.Controller = function (device) {
    _mandatoryArg(device, lib.AbstractVirtualDevice);
    this.device = device;
    this.requestMonitors = {};
};

/**
 * @TODO: MISSING DESCRIPTION
 *
 * @param {Object} attributeNameValuePairs - map of attribute names to update with
 * associated values. e.g. { name1:value1, name2:value2, ...}
 *
 * @memberof iotcs.util.Controller.prototype
 * @function updateAttributes
 */
$impl.Controller.prototype.updateAttributes = function (attributeNameValuePairs, singleAttribute) {
    _mandatoryArg(attributeNameValuePairs, 'object');

    if (Object.keys(attributeNameValuePairs).length === 0) {
        return;
    }
    for(var attributeName in attributeNameValuePairs) {
        if (!this.device[attributeName]) {
            lib.error('device model attribute mismatch');
            return;
        }
    }
    var endpointId = this.device.getEndpointId();
    var deviceModelUrn = this.device.getDeviceModel().urn;
    var selfDevice = this.device;
    var self = this;

    _checkIfDeviceIsDeviceApp(this.device, function () {

        $impl.https.bearerReq({
            method: (singleAttribute ? 'PUT' : 'POST'),
            headers: (singleAttribute ? {} : {
                'X-HTTP-Method-Override': 'PATCH'
            }),
            path: $impl.reqroot
            + '/apps/' + self.device.client.appid
            + ((self.device._.isDeviceApp === 2) ? '/deviceApps/' : '/devices/') + endpointId
            + '/deviceModels/' + deviceModelUrn
            + '/attributes'
            + (singleAttribute ? ('/'+Object.keys(attributeNameValuePairs)[0]) : '')
        }, (singleAttribute ? JSON.stringify({value: attributeNameValuePairs[Object.keys(attributeNameValuePairs)[0]]}) : JSON.stringify(attributeNameValuePairs)), function (response, error) {
            if (!response || error || !(response.id)) {
                _attributeUpdateResponseProcessor(null, selfDevice, attributeNameValuePairs, lib.createError('invalid response on update async request', error));
                return;
            }
            var reqId = response.id;

            try {
                var monitor = new $impl.AsyncRequestMonitor(reqId, function (response, error) {
                    _attributeUpdateResponseProcessor(response, selfDevice, attributeNameValuePairs, error);
                }, self.device.client._.internalClient);
                self.requestMonitors[reqId] = monitor;
                self.requestMonitors[reqId].start();
            } catch (e) {
                _attributeUpdateResponseProcessor(null, selfDevice, attributeNameValuePairs, lib.createError('invalid response on update async request', e));
            }
        }, function () {
            self.updateAttributes(attributeNameValuePairs, singleAttribute);
        }, self.device.client._.internalClient);
    });
};

/**
 * @memberof iotcs.util.Controller.prototype
 * @function invokeAction
 */
$impl.Controller.prototype.invokeAction = function (actionName, arg) {
    _mandatoryArg(actionName, 'string');

    if (!this.device[actionName]) {
        lib.error('device model action mismatch');
        return;
    }
    if (!this.device[actionName].checkVarArg(arg)) {
        lib.error('invalid parameters on action call');
        return;
    }

    var endpointId = this.device.getEndpointId();
    var deviceModelUrn = this.device.getDeviceModel().urn;
    var selfDevice = this.device;
    var self = this;

    _checkIfDeviceIsDeviceApp(this.device, function () {

        $impl.https.bearerReq({
            method: 'POST',
            path: $impl.reqroot
            + '/apps/' + self.device.client.appid
            + ((self.device._.isDeviceApp === 2) ? '/deviceApps/' : '/devices/') + endpointId
            + '/deviceModels/' + deviceModelUrn
            + '/actions/' + actionName
        }, ((typeof arg !== 'undefined') ? JSON.stringify({value: arg}) : JSON.stringify({})) , function (response, error) {
            if (!response || error || !(response.id)) {
                _actionExecuteResponseProcessor(response, selfDevice, actionName, lib.createError('invalid response on execute async request', error));
                return;
            }
            var reqId = response.id;

            try {
                var monitor = new $impl.AsyncRequestMonitor(reqId, function (response, error) {
                    _actionExecuteResponseProcessor(response, selfDevice, actionName, error);
                }, self.device.client._.internalClient);

                self.requestMonitors[reqId] = monitor;
                self.requestMonitors[reqId].start();
            } catch (e) {
                _actionExecuteResponseProcessor(response, selfDevice, actionName, lib.createError('invalid response on execute async request', e));
            }
        }, function () {
            self.invokeAction(actionName, arg);
        }, self.device.client._.internalClient);
    });
};


/**
 * @TODO MISSING DESCRIPTION
 *
 * @memberof iotcs.util.Controller.prototype
 * @function close
 */
$impl.Controller.prototype.close = function () {
    for(var key in this.requestMonitors) {
        this.requestMonitors[key].stop();
    }
    this.requestMonitors = {};
    this.device = null;
};

//////////////////////////////////////////////////////////////////////////////

/**@ignore*/
function _attributeUpdateResponseProcessor (response, device, attributeNameValuePairs, extError) {
    var error = false;
    if (!response || extError) {
        error = true;
        response = extError;
    } else {
        error = (response.status === 'FAILED'
        || (!response.response)
        || (!response.response.statusCode)
        || (response.response.statusCode > 299)
        || (response.response.statusCode < 200));
    }
    var attrObj = {};
    var newValObj = {};
    var tryValObj = {};
    for (var attributeName in attributeNameValuePairs) {
        var attribute = device[attributeName];
        attribute._.onUpdateResponse(error);
        attrObj[attribute.id] = attribute;
        newValObj[attribute.id] = attribute.value;
        tryValObj[attribute.id] = attributeNameValuePairs[attributeName];
        if (error && attribute.onError) {
            var onAttributeErrorTuple = {
                attribute: attribute,
                newValue: attribute.value,
                tryValue: attributeNameValuePairs[attributeName],
                errorResponse: response
            };
            attribute.onError(onAttributeErrorTuple);
        }
    }
    if (error && device.onError) {
        var onDeviceErrorTuple = {
            attributes: attrObj,
            newValues: newValObj,
            tryValues: tryValObj,
            errorResponse: response
        };
        device.onError(onDeviceErrorTuple);
    }
}

/**@ignore*/
function _actionExecuteResponseProcessor(response, device, actionName, error) {
    var action = device[actionName];
    if (action.onExecute) {
        action.onExecute(response, error);
    }
}

/** @ignore */
function _checkIfDeviceIsDeviceApp(virtualDevice, callback) {

    if (virtualDevice._.isDeviceApp) {
        callback();
        return;
    }

    var deviceId = virtualDevice.getEndpointId();

    var filter = new lib.enterprise.Filter();
    filter = filter.eq('id',deviceId);

    $impl.https.bearerReq({
        method: 'GET',
        path:   $impl.reqroot
        + (virtualDevice.client.appid ? ('/apps/' + virtualDevice.client.appid) : '')
        + '/deviceApps'
        + '?fields=type'
        + '&q=' + filter.toString()
    }, '', function (response, error) {
        if (!response || error || !response.items || !Array.isArray(response.items)) {
            lib.createError('invalid response on device app check request - assuming virtual device is a device');
        } else {
            if ((response.items.length > 0) && response.items[0].type && (response.items[0].type === 'DEVICE_APPLICATION')) {
                virtualDevice._.isDeviceApp = 2;
                callback();
                return;
            }
        }

        virtualDevice._.isDeviceApp = 1;
        callback();

    }, function () {
        _checkIfDeviceIsDeviceApp(virtualDevice, callback);
    }, virtualDevice.client._.internalClient);

}

