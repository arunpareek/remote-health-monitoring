/**
 * Copyright (c) 2015, 2016, Oracle and/or its affiliates. All rights reserved.
 *
 * This software is dual-licensed to you under the MIT License (MIT) and
 * the Universal Permissive License (UPL). See the LICENSE file in the root
 * directory for license terms. You may choose either license, or both.
 *
 */

/**
 * This object is used for store and forward messages
 * to the cloud by using a priority queue and handling the
 * priority attribute of messages. It is also used for
 * monitoring received messages and any errors that can
 * arise when sending messages.
 * <p>
 * There can be only one MessageDispatcher instance per
 * DirectlyConnectedDevice at a time and it is created
 * at first use. To close an instance of a MessageDispatcher
 * the DirectlyConnectedDevice.close method must be used.
 * <p>
 * The message dispatcher uses the RequestDispatcher
 * for dispatching automatically request messages that
 * come from the server and generate response messages
 * to the server.
 * <p>
 * The onDelivery and onError attributes can be used to
 * set handlers that are called when messages are successfully
 * delivered or an error occurs:<br>
 * <code>messageDispatcher.onDelivery = function (messages);</code><br>
 * <code>messageDispatcher.onError = function (messages, error);</code><br>
 * Where messages is an array of the iotcs.message.Message object
 * representing the messages that were sent or not and error is
 * an Error object.
 * <p>
 * Also the MessageDispatcher implements the message dispatcher,
 * diagnostics and connectivity test capabilities.
 *
 * @see {@link iotcs.message.Message}
 * @see {@link iotcs.message.Message.Priority}
 * @see {@link iotcs.device.util.RequestDispatcher}
 * @see {@link iotcs.device.util.DirectlyConnectedDevice#close}
 * @memberOf iotcs.device.util
 * @alias MessageDispatcher
 * @class
 *
 * @param {iotcs.device.util.DirectlyConnectedDevice} dcd - The directly
 * connected device (low level API) associated with this message dispatcher
 */
lib.device.util.MessageDispatcher = function (dcd) {

    _mandatoryArg(dcd, lib.device.util.DirectlyConnectedDevice);

    if (dcd.dispatcher) {
        return dcd.dispatcher;
    }

    Object.defineProperty(this, '_', {
        enumerable: false,
        configurable: false,
        writable: true,
        value: {}
    });

    Object.defineProperty(this._, 'dcd', {
        enumerable: false,
        configurable: false,
        writable: false,
        value: dcd
    });

    Object.defineProperty(this, 'onDelivery', {
        enumerable: false,
        configurable: false,
        get: function () {
            return this._.onDelivery;
        },
        set: function (newValue) {
            if (!newValue || (typeof newValue !== 'function')) {
                lib.error('trying to set something to onDelivery that is not a function!');
                return;
            }
            this._.onDelivery = newValue;
        }
    });

    this._.onDelivery = function (arg) {};

    Object.defineProperty(this, 'onError', {
        enumerable: false,
        configurable: false,
        get: function () {
            return this._.onError;
        },
        set: function (newValue) {
            if (!newValue || (typeof newValue !== 'function')) {
                lib.error('trying to set something to onDelivery that is not a function!');
                return;
            }
            this._.onError = newValue;
        }
    });

    this._.onError = function (arg1, arg2) {};

    var queue = new $impl.PriorityQueue(lib.oracle.iot.client.device.maximumMessagesToQueue);
    var client = dcd;

    Object.defineProperty(this._, 'push', {
        enumerable: false,
        configurable: false,
        writable: false,
        value: function (message) {
            queue.push(message);
        }
    });

    var poolingInterval = lib.oracle.iot.client.device.defaultMessagePoolingInterval;
    var startPooling = null;
    var startTime = dcd._.internalDev._.getCurrentServerTime();

    var totalMessagesSent = 0;
    var totalMessagesReceived = 0;
    var totalMessagesRetried = 0;
    var totalBytesSent = 0;
    var totalBytesReceived = 0;
    var totalProtocolErrors = 0;

    var connectivityTestObj = new $impl.TestConnectivity(this);

    var handlers = {
        "deviceModels/urn:oracle:iot:dcd:capability:message_dispatcher/counters": function (requestMessage) {
                var method = _getMethodForRequestMessage(requestMessage);
                if (!method || method !== 'GET') {
                    return lib.message.Message.buildResponseMessage(requestMessage, 405, {}, 'Method Not Allowed', '');
                }
                var counterObj = {
                    totalMessagesSent: totalMessagesSent,
                    totalMessagesReceived: totalMessagesReceived,
                    totalMessagesRetried: totalMessagesRetried,
                    totalBytesSent: totalBytesSent,
                    totalBytesReceived: totalBytesReceived,
                    totalProtocolErrors: totalProtocolErrors
                };
                return lib.message.Message.buildResponseMessage(requestMessage, 200, {}, JSON.stringify(counterObj), '');
            },
        "deviceModels/urn:oracle:iot:dcd:capability:message_dispatcher/reset": function (requestMessage) {
                var method = _getMethodForRequestMessage(requestMessage);
                if (!method || (method !== 'PUT')) {
                    return lib.message.Message.buildResponseMessage(requestMessage, 405, {}, 'Method Not Allowed', '');
                }
                totalMessagesSent = 0;
                totalMessagesReceived = 0;
                totalMessagesRetried = 0;
                totalBytesSent = 0;
                totalBytesReceived = 0;
                totalProtocolErrors = 0;
                return lib.message.Message.buildResponseMessage(requestMessage, 200, {}, '', '');
            },
        "deviceModels/urn:oracle:iot:dcd:capability:message_dispatcher/pollingInterval": function (requestMessage) {
                var method = _getMethodForRequestMessage(requestMessage);
                if (!method || ((method !== 'PUT') && (method !== 'GET'))) {
                    return lib.message.Message.buildResponseMessage(requestMessage, 405, {}, 'Method Not Allowed', '');
                }
                if (method === 'GET') {
                    return lib.message.Message.buildResponseMessage(requestMessage, 200, {}, JSON.stringify({pollingInterval: poolingInterval}), '');
                } else {
                    var data = null;
                    try {
                        data = JSON.parse($port.util.atob(requestMessage.payload.body));
                    } catch (e) {
                        return lib.message.Message.buildResponseMessage(requestMessage, 400, {}, 'Bad Request', '');
                    }
                    if (!data || (typeof data.pollingInterval !== 'number') || (data.pollingInterval % 1 !== 0)) {
                        return lib.message.Message.buildResponseMessage(requestMessage, 400, {}, 'Bad Request', '');
                    }
                    poolingInterval = (data.pollingInterval < lib.oracle.iot.client.monitor.pollingInterval ? lib.oracle.iot.client.monitor.pollingInterval : data.pollingInterval);
                    return lib.message.Message.buildResponseMessage(requestMessage, 200, {}, '', '');
                }
            },
        "deviceModels/urn:oracle:iot:dcd:capability:diagnostics/info": function (requestMessage) {
            var method = _getMethodForRequestMessage(requestMessage);
            if (!method || method !== 'GET') {
                return lib.message.Message.buildResponseMessage(requestMessage, 405, {}, 'Method Not Allowed', '');
            }
            var obj = {
                freeDiskSpace: 'Unknown',
                ipAddress: 'Unknown',
                macAddress: 'Unknown',
                totalDiskSpace: 'Unknown',
                version: 'Unknown'
            };
            if ($port.util.diagnostics) {
                obj = $port.util.diagnostics();
            }
            obj.startTime = startTime;
            return lib.message.Message.buildResponseMessage(requestMessage, 200, {}, JSON.stringify(obj), '');
        },
        "deviceModels/urn:oracle:iot:dcd:capability:diagnostics/testConnectivity": function (requestMessage) {
            var method = _getMethodForRequestMessage(requestMessage);
            var data = null;
            try {
                data = JSON.parse($port.util.atob(requestMessage.payload.body));
            } catch (e) {
                return lib.message.Message.buildResponseMessage(requestMessage, 400, {}, 'Bad Request', '');
            }
            if (!data || ((method === 'PUT') && (typeof data.active !== 'boolean'))) {
                return lib.message.Message.buildResponseMessage(requestMessage, 400, {}, 'Bad Request', '');
            }
            if (method === 'PUT') {
                if (data.active) {
                    return connectivityTestObj.startHandler(requestMessage);
                } else {
                    return connectivityTestObj.stopHandler(requestMessage);
                }
            } else {
                return connectivityTestObj.testHandler(requestMessage);
            }
        }
    };

    var handlerMethods = {
        "deviceModels/urn:oracle:iot:dcd:capability:message_dispatcher/counters": 'GET',
        "deviceModels/urn:oracle:iot:dcd:capability:message_dispatcher/reset": 'PUT',
        "deviceModels/urn:oracle:iot:dcd:capability:message_dispatcher/pollingInterval": 'GET,PUT',
        "deviceModels/urn:oracle:iot:dcd:capability:diagnostics/info": 'GET',
        "deviceModels/urn:oracle:iot:dcd:capability:diagnostics/testConnectivity": 'GET,PUT'
    };


    var self = this;

    var deliveryCallback = function (messages) {
        totalMessagesSent = totalMessagesSent + messages.length;
        messages.forEach(function (message) {
            totalBytesSent = totalBytesSent + _getUtf8BytesLength(JSON.stringify(message));
        });
        self.onDelivery(messages);
    };

    var errorCallback = function (messages, error) {
        totalProtocolErrors = totalProtocolErrors + 1;
        self.onError(messages, error);
    };

    var handleReceivedMessages = function (messages, error) {
        try {
            if (error) {
                errorCallback(messages, error);
            } else {
                deliveryCallback(messages);
            }
        } catch (e) {

        }
        var message = client._.get_received_message();
        while (message) {
            totalMessagesReceived = totalMessagesReceived + 1;
            totalBytesReceived = totalBytesReceived + _getUtf8BytesLength(JSON.stringify(message));
            if (message.type === lib.message.Message.Type.REQUEST) {
                self.queue(self.getRequestDispatcher().dispatch(message));
            }
            message = client._.get_received_message();
        }
    };

    var longPollingStarted = false;

    var sendMonitor = new $impl.Monitor(function () {
        var currentTime = Date.now();
        if (currentTime >= (startPooling + poolingInterval)) {
            if (!dcd.isActivated() || dcd._.internalDev._.activating || dcd._.internalDev._.refreshing) {
                startPooling = currentTime;
                return;
            }
            var sent = false;
            var message = queue.pop();
            while (message !== null) {
                sent = true;
                var index = 0;
                var messageArr = [];
                while ((index < lib.oracle.iot.client.device.maximumMessagesPerConnection) && (message !== null)) {
                    messageArr.push(message);
                    message = queue.pop();
                }
                client._.send_receive_messages(messageArr, handleReceivedMessages, handleReceivedMessages);
                message = queue.pop();
            }
            if (!sent && !client._.receiver && (lib.oracle.iot.client.device.disableLongPolling || client._.internalDev._.mqttController)) {
                client._.send_receive_messages([], handleReceivedMessages, handleReceivedMessages);
            }
            if (!client._.receiver && !lib.oracle.iot.client.device.disableLongPolling && !client._.internalDev._.mqttController) {
                var longPollCallback = null;
                longPollCallback = function (messages, error) {
                    if (!error) {
                        client._.send_receive_messages([], longPollCallback, longPollCallback, true);
                    } else {
                        longPollingStarted = false;
                    }
                    handleReceivedMessages(messages, error);
                };
                if (!longPollingStarted) {
                    client._.send_receive_messages([], longPollCallback, longPollCallback, true);
                    longPollingStarted = true;
                }
            }
            startPooling = currentTime;
        }
    });

    if (client._.receiver) {
        var oldReceiver = client._.receiver;
        client._.receiver = function (messages, error) {
            oldReceiver(messages, error);
            var message = client._.get_received_message();
            while (message) {
                totalMessagesReceived = totalMessagesReceived + 1;
                totalBytesReceived = totalBytesReceived + _getUtf8BytesLength(JSON.stringify(message));
                if (message.type === lib.message.Message.Type.REQUEST) {
                    self.queue(self.getRequestDispatcher().dispatch(message));
                }
                message = client._.get_received_message();
            }
        };
    }

    var resourceMessageMonitor = null;

    resourceMessageMonitor = new $impl.Monitor(function () {

        if (!dcd.isActivated()) {
            return;
        }

        if (resourceMessageMonitor) {
            resourceMessageMonitor.stop();
        }

        for (var path in handlers) {
            self.getRequestDispatcher().registerRequestHandler(dcd.getEndpointId(), path, handlers[path]);
        }
        var resources = [];
        for (var path1 in handlerMethods) {
            resources.push(lib.message.Message.ResourceMessage.Resource.buildResource(path1, path1, handlerMethods[path1], lib.message.Message.ResourceMessage.Resource.Status.ADDED));
        }
        var message = lib.message.Message.ResourceMessage.buildResourceMessage(resources, dcd.getEndpointId(), lib.message.Message.ResourceMessage.Type.UPDATE, lib.message.Message.ResourceMessage.getMD5ofList(Object.keys(handlerMethods)))
            .source(dcd.getEndpointId())
            .priority(lib.message.Message.Priority.HIGHEST);
        self.queue(message);
    });

    resourceMessageMonitor.start();

    Object.defineProperty(this._, 'stop', {
        enumerable: false,
        configurable: false,
        writable: false,
        value: function () {
            sendMonitor.stop();
            if (resourceMessageMonitor) {
                resourceMessageMonitor.stop();
            }
        }
    });

    Object.defineProperty(dcd, 'dispatcher', {
        enumerable: false,
        configurable: false,
        writable: false,
        value: this
    });

    startPooling = Date.now();
    sendMonitor.start();
    startTime = dcd._.internalDev._.getCurrentServerTime();

};

/**
 * This method returns the RequestDispatcher used by this
 * MessageDispatcher for dispatching messages.
 *
 * @returns {iotcs.device.util.RequestDispatcher} The RequestDispatcher
 * instance
 *
 * @memberOf iotcs.device.util.MessageDispatcher.prototype
 * @function getRequestDispatcher
 */
lib.device.util.MessageDispatcher.prototype.getRequestDispatcher = function () {
    return new lib.device.util.RequestDispatcher();
};

/**
 * This method adds a message to the queue of this MessageDispatcher
 * to be sent to the cloud.
 *
 * @param {iotcs.message.Message} message - the message to be sent
 *
 * @memberOf iotcs.device.util.MessageDispatcher.prototype
 * @function queue
 */
lib.device.util.MessageDispatcher.prototype.queue = function (message) {

    _mandatoryArg(message, lib.message.Message);

    this._.push(message);
};

function _getMethodForRequestMessage(requestMessage){
    var method = null;
    if (requestMessage.payload && requestMessage.payload.method) {
        method = requestMessage.payload.method.toUpperCase();
    }
    if (requestMessage.payload.headers && Array.isArray(requestMessage.payload.headers['x-http-method-override']) && (requestMessage.payload.headers['x-http-method-override'].length > 0)) {
        method = requestMessage.payload.headers['x-http-method-override'][0].toUpperCase();
    }
    return method;
}





