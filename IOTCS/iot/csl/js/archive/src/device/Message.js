/**
 * Copyright (c) 2015, 2016, Oracle and/or its affiliates. All rights reserved.
 *
 * This software is dual-licensed to you under the MIT License (MIT) and
 * the Universal Permissive License (UPL). See the LICENSE file in the root
 * directory for license terms. You may choose either license, or both.
 *
 */

/**
 * @namespace
 * @alias iotcs.message
 * @memberOf iotcs
 */
lib.message = {};

/**
 * This object helps in the construction of a general type
 * message to be sent to the server. This object and
 * it's components are used as utilities by the
 * low level API clients, like the DirectlyConnectedDevice
 * or GatewayDevice or indirectly by the MessageDispatcher.
 *
 * @memberOf iotcs.message
 * @alias Message
 * @class
 */
lib.message.Message = function () {

    Object.defineProperty(this, '_',{
        enumerable: false,
        configurable: false,
        writable: true,
        value: {}
    });

    Object.defineProperty(this._, 'internalObject',{
        enumerable: false,
        configurable: false,
        writable: false,
        value: {
            clientId: $port.util.uuidv4(),
            source: null,
            destination: '',
            sender: '',
            priority: 'MEDIUM',
            reliability: 'BEST_EFFORT',
            eventTime: new Date().getTime(),
            type: null,
            properties: {},
            payload: {}
        }
    });

};

/**
 * Sets the payload of the message as object.
 *
 * @param {Object} payload - the payload to set.
 * @returns {iotcs.message.Message} This object
 *
 * @memberOf iotcs.message.Message.prototype
 * @function payload
 */
lib.message.Message.prototype.payload = function (payload) {

    _mandatoryArg(payload, 'object');

    this._.internalObject.payload = payload;
    return this;
};

/**
 * Sets the source of the message.
 *
 * @param {string} source - the source to set
 * @returns {iotcs.message.Message} This object
 *
 * @memberOf iotcs.message.Message.prototype
 * @function source
 */
lib.message.Message.prototype.source = function (source) {

    _mandatoryArg(source, 'string');

    if(this._.internalObject.source === null) {
        this._.internalObject.source = source;
    }
    return this;
};

/**
 * Sets the destination of the message.
 *
 * @param {string} destination - the destination
 * @returns {iotcs.message.Message} This object
 *
 * @memberOf iotcs.message.Message.prototype
 * @function destination
 */
lib.message.Message.prototype.destination = function (destination) {

    _mandatoryArg(destination, 'string');

    this._.internalObject.destination = destination;
    return this;
};

/**
 * This returns the built message as JSON to be sent
 * to the server as it is.
 *
 * @returns {Object} JSON representation of the message to be sent
 *
 * @memberOf iotcs.message.Message.prototype
 * @function payload
 */
lib.message.Message.prototype.getJSONObject = function () {
    return this._.internalObject;
};

/**
 * This sets the type of the message. Types are defined in the
 * Message.Type enumeration. If an invalid type is given an
 * exception is thrown.
 *
 * @param {string} type - the type to set
 * @returns {iotcs.message.Message} This object
 *
 * @see {@link iotcs.message.Message.Type}
 * @memberOf iotcs.message.Message.prototype
 * @function type
 */
lib.message.Message.prototype.type = function (type) {

    _mandatoryArg(type, 'string');
    if (Object.keys(lib.message.Message.Type).indexOf(type) < 0) {
        lib.error('invalid message type given');
        return;
    }

    if(type === lib.message.Message.Type.RESOURCES_REPORT) {
        this._.internalObject.id = $port.util.uuidv4();
    }
    this._.internalObject.type = type;
    return this;
};

/**
 * This sets the format URN in the payload of the message.
 * This is mostly specific for the DATA or ALERT type
 * of messages.
 *
 * @param {string} format - the format to set
 * @returns {iotcs.message.Message} This object
 *
 * @memberOf iotcs.message.Message.prototype
 * @function format
 */
lib.message.Message.prototype.format = function (format) {

    _mandatoryArg(format, 'string');

    this._.internalObject.payload.format = format;
    return this;
};

/**
 * This sets a key/value pair in the data property of the payload
 * of the message. This is specific to DATA or ALERT type messages.
 *
 * @param {string} dataKey - the key
 * @param {Object} [dataValue] - the value associated with the key
 * @returns {iotcs.message.Message} This object
 *
 * @memberOf iotcs.message.Message.prototype
 * @function dataItem
 */
lib.message.Message.prototype.dataItem = function (dataKey, dataValue) {

    _mandatoryArg(dataKey, 'string');

    if (!('data' in this._.internalObject.payload)) {
        this._.internalObject.payload.data = {};
    }
    this._.internalObject.payload.data[dataKey] = dataValue;
    return this;
};

/**
 * This sets the priority of the message. Priorities are defined in the
 * Message.Priority enumeration. If an invalid type is given an
 * exception is thrown. The MessageDispatcher implements a
 * priority queue and it will use this parameter.
 *
 * @param {string} priority - the priority to set
 * @returns {iotcs.message.Message} This object
 *
 * @see {@link iotcs.device.util.MessageDispatcher}
 * @see {@link iotcs.message.Message.Priority}
 * @memberOf iotcs.message.Message.prototype
 * @function priority
 */
lib.message.Message.prototype.priority = function (priority) {

    _mandatoryArg(priority, 'string');
    if (Object.keys(lib.message.Message.Priority).indexOf(priority) < 0) {
        lib.error('invalid priority given');
        return;
    }

    this._.internalObject.priority = priority;
    return this;
};

/**
 * Enumeration of message types
 *
 * @memberOf iotcs.message.Message
 * @alias Type
 * @class
 * @readonly
 * @enum {string}
 */
lib.message.Message.Type = {
    DATA: 'DATA',
    ALERT: 'ALERT',
    REQUEST: 'REQUEST',
    RESPONSE: 'RESPONSE',
    RESOURCES_REPORT: 'RESOURCES_REPORT'
};

/**
 * Enumeration of message priorities
 *
 * @memberOf iotcs.message.Message
 * @alias Priority
 * @class
 * @readonly
 * @enum {string}
 */
lib.message.Message.Priority = {
    LOWEST: 'LOWEST',
    LOW: 'LOW',
    MEDIUM: 'MEDIUM',
    HIGH: 'HIGH',
    HIGHEST: 'HIGHEST'
};

/**
 * This is a helper method for building a response
 * message to be sent to the server as response
 * to a request message sent from the server.
 * This is mostly used by handlers registered
 * with the RequestDispatcher. If no requestMessage
 * is given the id for the response message will be
 * a random UUID.
 *
 * @param {Object} [requestMessage] - the message received
 * from the server as JSON
 * @param {number} statusCode - the status code to be
 * added in the payload of the response message
 * @param {Object} [headers] - the headers to be added in
 * the payload of the response message
 * @param {string} [body] - the body to be added in the
 * payload of the response message
 * @param {string} [url] - the url to be added in the payload
 * of the response message
 *
 * @returns {iotcs.message.Message} The response message
 * instance built on the given parameters
 *
 * @see {@link iotcs.device.util.RequestDispatcher}
 * @memberOf iotcs.message.Message
 * @function buildResponseMessage
 */
lib.message.Message.buildResponseMessage = function (requestMessage, statusCode, headers, body, url) {

    _optionalArg(requestMessage, 'object');
    _mandatoryArg(statusCode, 'number');
    _optionalArg(headers, 'object');
    _optionalArg(body, 'string');
    _optionalArg(url, 'string');

    var payload = {
        statusCode: statusCode,
        url: (url ? url : ''),
        requestId: ((requestMessage && requestMessage.id) ? requestMessage.id : $port.util.uuidv4()),
        headers: (headers ? headers : {}),
        body: (body ? $port.util.btoa(body) : '')
    };
    var message = new lib.message.Message();
    message.type(lib.message.Message.Type.RESPONSE)
        .source((requestMessage && requestMessage.destination) ? requestMessage.destination : '')
        .destination((requestMessage && requestMessage.source) ? requestMessage.source : '')
        .payload(payload);
    return message;
};

/**
 * Helpers for building alert messages.
 *
 * @memberOf iotcs.message.Message
 * @alias AlertMessage
 * @class
 */
lib.message.Message.AlertMessage = {};

/**
 * Enumeration of severities for alert messages
 *
 * @memberOf iotcs.message.Message.AlertMessage
 * @alias Severity
 * @class
 * @readonly
 * @enum {string}
 */
lib.message.Message.AlertMessage.Severity = {
    LOW: 'LOW',
    NORMAL: 'NORMAL',
    SIGNIFICANT: 'SIGNIFICANT',
    CRITICAL: 'CRITICAL'
};

/**
 * Helper method used for building alert messages
 * to be sent to the server. The severity is defined
 * in the AlertMessage.Severity enumeration. If an invalid
 * value is given an exception is thrown.
 *
 * @param {string} format - the format added in the
 * payload of the generated message
 * @param {string} description - the description added
 * in the payload of the generated message
 * @param {string} severity - the severity added in the
 * payload of the generated message
 *
 * @returns {iotcs.message.Message} The instance of
 * the alert message built based on the given
 * parameters.
 *
 * @see {@link iotcs.message.Message.AlertMessage.Severity}
 * @memberOf iotcs.message.Message.AlertMessage
 * @function buildAlertMessage
 */
lib.message.Message.AlertMessage.buildAlertMessage = function (format, description, severity) {

    _mandatoryArg(format, 'string');
    _mandatoryArg(description, 'string');
    _mandatoryArg(severity, 'string');
    if (Object.keys(lib.message.Message.AlertMessage.Severity).indexOf(severity) < 0) {
        lib.error('invalid severity given');
        return;
    }

    var payload = {
        format: format,
        severity: severity,
        description: description
    };
    var message = new lib.message.Message();
    message.type(lib.message.Message.Type.ALERT)
        .priority(lib.message.Message.Priority.HIGHEST)
        .payload(payload);
    return message;
};

/**
 * Helpers for building resource report messages
 *
 * @memberOf iotcs.message.Message
 * @alias ResourceMessage
 * @class
 */
lib.message.Message.ResourceMessage = {};

/**
 * Enumeration of the type of resource report messages
 *
 * @memberOf iotcs.message.Message.ResourceMessage
 * @alias Type
 * @class
 * @readonly
 * @enum {string}
 */
lib.message.Message.ResourceMessage.Type = {
    UPDATE: 'UPDATE',
    DELETE: 'DELETE',
    RECONCILIATION: 'RECONCILIATION'
};

/**
 * This generates an MD5 hash of an array of
 * strings. Thi has to be used to generate
 * the reconciliationMark of the resource
 * report message.
 *
 * @param {string[]} stringArray - the array of string
 * for which to generate the hash
 *
 * @returns {string} The MD5 hash
 *
 * @memberOf iotcs.message.Message.ResourceMessage
 * @function getMD5ofList
 */
lib.message.Message.ResourceMessage.getMD5ofList = function (stringArray) {

    _mandatoryArg(stringArray, 'array');
    stringArray.forEach( function (str) {
        _mandatoryArg(str, 'string');
    });

    var hash = forge.md.md5.create();
    var i;
    for (i = 0; i < stringArray.length; i++) {
        hash.update(stringArray[i]);
    }
    return hash.digest().toHex();
};

/**
 * Helper method used for building a resource report
 * message to be sent to the server. Th resources
 * objects can be generated by using the
 * ResourceMessage.Resource.buildResource method.
 * The reportType must be taken from the
 * ResourceMessage.Type enumeration. If an invalid
 * value is given an exception is thrown.
 * The rM parameter is the reconciliationMark that can
 * be calculated by using the ResourceMessage.getMD5ofList
 * over the array of paths of the resources given as objects.
 * A resource is an object that must have at least 2
 * properties as strings: path and methods. Also methods
 * must be string that represents a concatenation of
 * valid HTTP methods comma separated.
 *
 * @param {Object[]} resources - the array of resources that are
 * included in the report message
 * resource report message
 * @param {string} endpointName - the endpoint that is giving the
 * resource report
 * @param {string} reportType - the type of the report
 * @param {string} [rM] - the reconciliationMark used by teh server
 * to validate the report
 *
 * @returns {iotcs.message.Message} The isntance of the resource
 * report message to be sent to the server.
 *
 * @see {@link iotcs.message.Message.ResourceMessage.Resource.buildResource}
 * @see {@link iotcs.message.Message.ResourceMessage.Type}
 * @memberOf iotcs.message.Message.ResourceMessage
 * @function buildResourceMessage
 */
lib.message.Message.ResourceMessage.buildResourceMessage = function (resources, endpointName, reportType, rM) {

    _mandatoryArg(resources, 'array');
    resources.forEach( function(resource) {
        _mandatoryArg(resource, 'object');
        _mandatoryArg(resource.path, 'string');
        _mandatoryArg(resource.methods, 'string');
        resource.methods.split(',').forEach( function (method) {
            if (['GET', 'PUT', 'POST', 'HEAD', 'OPTIONS', 'CONNECT', 'DELETE', 'TRACE'].indexOf(method) < 0) {
                lib.error('invalid method in resource message');
                return;
            }
        });
    });
    _mandatoryArg(endpointName, 'string');
    _mandatoryArg(reportType, 'string');
    if (Object.keys(lib.message.Message.ResourceMessage.Type).indexOf(reportType) < 0) {
        lib.error('invalid report type given');
        return;
    }
    _optionalArg(rM, 'string');

    var payload = {
        type: 'JSON',
        value: {
            reportType: reportType,
            endpointName: endpointName,
            resources: resources
        }
    };
    if (rM) {
        payload.value.reconciliationMark = rM;
    }
    var message = new lib.message.Message();
    message.type(lib.message.Message.Type.RESOURCES_REPORT)
        .payload(payload);
    return message;
};

/**
 * Helpers used to build resource objects, used by the
 * resource report messages.
 *
 * @memberOf iotcs.message.Message.ResourceMessage
 * @alias Resource
 * @class
 */
lib.message.Message.ResourceMessage.Resource = {};

/**
 * Enumeration of possible statuses of the resources
 *
 * @memberOf iotcs.message.Message.ResourceMessage.Resource
 * @alias Status
 * @class
 * @readonly
 * @enum {string}
 */
lib.message.Message.ResourceMessage.Resource.Status = {
    ADDED: 'ADDED',
    REMOVED: 'REMOVED'
};

/**
 * Helper method used to build a resource object.
 * The status parameter must be given from the
 * Resource.Status enumeration. If an invalid value is given
 * the method will throw an exception. Also the methods array
 * must be an array of valid HTTP methods, otherwise
 * an exception will be thrown.
 *
 * @param {string} name - the name of the resource
 * @param {string} path - the path of the resource
 * @param {string[]} methods - the methods that the resource
 * implements
 * @param {string} [endpointName] - the endpoint associated
 * with the resource
 * @param {string} status - the status of the resource
 *
 * @returns {Object} The instance of the object representing
 * a resource
 *
 * @see {@link iotcs.message.Message.ResourceMessage.Resource.Status}
 * @memberOf iotcs.message.Message.ResourceMessage.Resource
 * @function buildResource
 */
lib.message.Message.ResourceMessage.Resource.buildResource = function (name, path, methods, status, endpointName) {

    _mandatoryArg(name, 'string');
    _mandatoryArg(path, 'string');
    _mandatoryArg(methods, 'string');
    methods.split(',').forEach( function (method) {
        if (['GET', 'PUT', 'POST', 'HEAD', 'OPTIONS', 'CONNECT', 'DELETE', 'TRACE'].indexOf(method) < 0) {
            lib.error('invalid method in resource message');
            return;
        }
    });
    _mandatoryArg(status, 'string');
    _optionalArg(endpointName, 'string');
    if (Object.keys(lib.message.Message.ResourceMessage.Resource.Status).indexOf(status) < 0) {
        lib.error('invalid status given');
        return;
    }

    var obj = {
        name: name,
        path: path,
        status: status,
        methods: methods.toString()
    };

    if (endpointName) {
        obj.endpointName = endpointName;
    }

    return obj;
};
