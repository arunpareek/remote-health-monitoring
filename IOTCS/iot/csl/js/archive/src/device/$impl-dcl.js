/**
 * Copyright (c) 2015, 2016, Oracle and/or its affiliates. All rights reserved.
 *
 * This software is dual-licensed to you under the MIT License (MIT) and 
 * the Universal Permissive License (UPL). See the LICENSE file in the root
 * directory for license terms. You may choose either license, or both.
 *
 */

/** @ignore */
$impl.reqroot = '/iot/api/v2';

function QueueNode (data) {
    this.data = data;
    this.priority = ['LOWEST','LOW','MEDIUM','HIGH','HIGHEST'].indexOf(data.getJSONObject().priority);
}

// takes an array of objects with {data, priority}
$impl.PriorityQueue = function (maxQueue) {
    this.heap = [null];
    this.maxQueue = maxQueue;
};

$impl.PriorityQueue.prototype = {
    push: function(data) {
        if (this.heap.length === (this.maxQueue + 1)) {
            lib.error('maximum queue number reached');
            return;
        }
        var node = new QueueNode(data);
        this.bubble(this.heap.push(node) -1);
    },

    // removes and returns the data of highest priority
    pop: function() {
        if (this.heap.length === 1) {
            return null;
        }
        if (this.heap.length === 2) {
            return this.heap.pop().data;
        }
        var topVal = this.heap[1].data;
        this.heap[1] = this.heap.pop();
        this.sink(1); return topVal;
    },

    // bubbles node i up the binary tree based on
    // priority until heap conditions are restored
    bubble: function(i) {
        while (i > 1) {
            var parentIndex = i >> 1; // <=> floor(i/2)

            // if equal, no bubble (maintains insertion order)
            if (!this.isHigherPriority(i, parentIndex)) break;

            this.swap(i, parentIndex);
            i = parentIndex;
        }   },

    // does the opposite of the bubble() function
    sink: function(i) {
        while (i*2 < this.heap.length - 1) {
            // if equal, left bubbles (maintains insertion order)
            var leftHigher = !this.isHigherPriority(i*2 +1, i*2);
            var childIndex = leftHigher ? i*2 : i*2 +1;

            // if equal, sink happens (maintains insertion order)
            if (this.isHigherPriority(i,childIndex)) break;

            this.swap(i, childIndex);
            i = childIndex;
        }   },

    // swaps the addresses of 2 nodes
    swap: function(i,j) {
        var temp = this.heap[i];
        this.heap[i] = this.heap[j];
        this.heap[j] = temp;
    },

    // returns true if node i is higher priority than j
    isHigherPriority: function(i,j) {
        return this.heap[i].priority < this.heap[j].priority;
    }
};

$impl.protocolReq = function (options, payload, callback, retryCallback, dcd) {
    if (!options.tam) {
        options.tam = new lib.device.TrustedAssetsManager();
    }
    if (options.tam.getServerScheme && (options.tam.getServerScheme().indexOf('mqtt') > -1)) {
        $impl.mqtt.apiReq(options, payload, callback, retryCallback, dcd);
    } else {
        if (options.path.startsWith($impl.reqroot+'/activation/policy')
            || options.path.startsWith($impl.reqroot+'/activation/direct')
            || options.path.startsWith($impl.reqroot+'/oauth2/token')){
            $impl.https.req(options, payload, callback);
        } else {
            $impl.https.bearerReq(options, payload, callback, retryCallback, dcd);
        }
    }
};

function _mqttControllerInit (dcd) {
    if (!dcd._.mqttController) {
        var getTopics = function () {
            var topics = [];
            var id = dcd._.tam.getClientId();
            if (dcd.isActivated()) {
                id = dcd._.tam.getEndpointId();
                topics.push({
                    responseHandler: 'devices/' + id + '/deviceModels',
                    errorHandler: 'devices/' + id + '/deviceModels/error'
                });
                topics.push({
                    responseHandler: 'devices/' + id + '/messages',
                    errorHandler: 'devices/' + id + '/messages/error'
                });
                topics.push({
                    responseHandler: 'devices/' + id + '/messages/acceptBytes'
                });
                if (dcd._.gateway) {
                    topics.push({
                        responseHandler: 'devices/' + id + '/activation/indirect/device',
                        errorHandler: 'devices/' + id + '/activation/indirect/device/error'
                    });
                }
            } else {
                topics.push({
                    responseHandler: 'devices/' + id + '/activation/policy',
                    errorHandler: 'devices/' + id + '/activation/policy/error'
                });
                topics.push({
                    responseHandler: 'devices/' + id + '/deviceModels',
                    errorHandler: 'devices/' + id + '/deviceModels/error'
                });
                topics.push({
                    responseHandler: 'devices/' + id + '/activation/direct',
                    errorHandler: 'devices/' + id + '/activation/direct/error'
                });
            }
            return topics;
        };
        Object.defineProperty(dcd._, 'mqttController', {
            enumerable: false,
            configurable: false,
            writable: false,
            value: new $impl.mqtt.MqttController(dcd._.tam, getTopics)
        });
    }
}

$impl.protocolRegister = function (path, callback, dcd) {
    if (dcd.isActivated() && dcd._.tam.getServerScheme && (dcd._.tam.getServerScheme().indexOf('mqtt') > -1)) {
        _mqttControllerInit(dcd);
        if (path.startsWith($impl.reqroot+'/messages/acceptBytes')) {
            dcd._.mqttController.register('devices/' + dcd.getEndpointId() + '/messages/acceptBytes', callback);
        } else if (path.startsWith($impl.reqroot+'/messages')) {
            dcd._.mqttController.register('devices/' + dcd.getEndpointId() + '/messages', callback);
        }
    }
};

$impl.mqtt.apiReq = function (options, payload, callback, retryCallback, dcd) {

    var tempCallback = callback;

    var tempCallbackBearer = function (response_body, error) {
        if (error) {
            var exception = null;
            try {
                exception = JSON.parse(error.message);
                if (exception.status && (exception.status === 401)) {
                    dcd._.mqttController.disconnect(retryCallback);
                    return;
                }
            } catch (e) {

            }
        }
        callback(response_body, error);
    };

    function callApi(controller) {
        var id = (dcd.isActivated() ? dcd._.tam.getEndpointId() : dcd._.tam.getClientId());
        var topic = null;
        var expect = null;
        if (options.method === 'GET') {
            if (options.path.startsWith($impl.reqroot+'/activation/policy')) {
                topic = 'iotcs/' + id + '/activation/policy';
                expect = 'devices/' + id + '/activation/policy';
                payload = JSON.stringify({OSName: $port.os.type(), OSVersion: $port.os.release()});
            } else if (options.path.startsWith($impl.reqroot+'/deviceModels')) {
                topic = 'iotcs/' + id + '/deviceModels';
                expect = 'devices/' + id + '/deviceModels';
                tempCallback = tempCallbackBearer;
                payload = JSON.stringify({urn: options.path.substring(options.path.lastIndexOf('/') + 1)});
            }
        } else if (options.method === 'POST') {
            if (options.path.startsWith($impl.reqroot+'/activation/direct')) {
                topic = 'iotcs/' + id + '/activation/direct';
                expect = 'devices/' + id + '/activation/direct';
                tempCallback = function (response_body, error) {
                    if (error) {
                        dcd._.tam.setEndpointCredentials(dcd._.tam.getClientId(), null);
                    }
                    controller.disconnect(function () {
                        callback(response_body, error);
                    });
                };
            } else if (options.path.startsWith($impl.reqroot+'/oauth2/token')) {
                callback({token_type: 'empty', access_token: 'empty'});
                return;
            } else if (options.path.startsWith($impl.reqroot+'/activation/indirect/device')) {
                topic = 'iotcs/' + id + '/activation/indirect/device';
                expect = 'devices/' + id + '/activation/indirect/device';
                tempCallback = tempCallbackBearer;
            } else if (options.path.startsWith($impl.reqroot+'/messages')) {
                expect = 'devices/' + id + '/messages';
                topic = 'iotcs/' + id + '/messages';
                tempCallback = tempCallbackBearer;
                var acceptBytes = parseInt(options.path.substring(options.path.indexOf('acceptBytes=')+12));
                if (acceptBytes && ((typeof controller.acceptBytes === 'undefined') || (controller.acceptBytes !== acceptBytes))) {
                    topic = 'iotcs/' + id + '/messages/acceptBytes';
                    var buffer = forge.util.createBuffer();
                    buffer.putInt32(acceptBytes);
                    controller.req(topic, buffer.toString(), null, function () {
                        controller.acceptBytes = acceptBytes;
                        topic = 'iotcs/' + id + '/messages';
                        controller.req(topic, payload, expect, tempCallback);
                    });
                    return;
                }
            }
        }
        controller.req(topic, payload, expect, tempCallback);
    }

    _mqttControllerInit(dcd);

    callApi(dcd._.mqttController);
};

$impl.https.bearerReq = function (options, payload, callback, retryCallback, dcd) {
    $impl.https.req(options, payload, function (response_body, error) {
        if (error) {
            var exception = null;
            try {
                exception = JSON.parse(error.message);
                if (exception.statusCode && (exception.statusCode === 401)) {
                    dcd._.refresh_bearer(false, function (error) {
                        if (error) {
                            callback(response_body, error);
                            return;
                        }
                        retryCallback();
                    });
                    return;
                }
            } catch (e) {

            }
        }
        callback(response_body, error);
    });
};
