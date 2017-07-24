/**
 * Copyright (c) 2015, 2016, Oracle and/or its affiliates. All rights reserved.
 *
 * This software is dual-licensed to you under the MIT License (MIT) and 
 * the Universal Permissive License (UPL). See the LICENSE file in the root
 * directory for license terms. You may choose either license, or both.
 *
 */

/** @ignore */
var $impl = {};

if (lib.debug) {
    lib.$impl = $impl;
}

/** @ignore */
$impl.https = $impl.https || {};

//@TODO: Default TAM Integration
/** @ignore */
$impl.https.req = $impl.https.req || function (options, payload, callback) {
    if (!$impl.tam && !(options.tam)) {
        _initTAM(function () {
            _httpsTAMReq(options, payload, callback);
        });
    } else {
        _httpsTAMReq(options, payload, callback);
    }
};

function _initTAM (callback) {
    if (lib.oracle.iot.tam.store && (typeof window !== 'undefined') && location.hostname && location.protocol) {
        var i = location.protocol.indexOf(':');
        var protocol = (i<0) ? location.protocol : location.protocol.substring(0, i);
        $port.https.req({
            method: 'GET',
            path: lib.oracle.iot.tam.store,
            protocol: protocol,
            hostname: location.hostname,
            port: location.port
        }, '', function(response) {
            $port.file.store(lib.oracle.iot.tam.store, response);
            $impl.tam = new lib.enterprise.TrustedAssetsManager();
            callback();
        }, false);
    } else {
        $impl.tam = (lib.enterprise ? new lib.enterprise.TrustedAssetsManager() : new lib.device.TrustedAssetsManager());
        callback();
    }
}

/** @ignore */
function _httpsTAMReq (options, payload, callback) {

    var basePath = null;
    var testPath = null;

    if (options.path.indexOf($impl.reqroot) > -1) {
        basePath = $impl.reqroot;
        testPath = (lib.oracle.iot.client.test ? lib.oracle.iot.client.test.reqroot : null);
    } else if (lib.oracle.iot.client.test && (options.path.indexOf(lib.oracle.iot.client.test.reqroot) > -1)) {
        basePath = lib.oracle.iot.client.test.reqroot;
    }

    // @TODO: Better way of handling links
    if(options.path && ((options.path.indexOf('http:') === 0) || (options.path.indexOf('https:') === 0))){
        options.path = options.path.substring(options.path.indexOf(basePath));
    }

    var _opt = {};
    var oracleIoT = true;
    if (!(options.tam)) {
        options.tam = $impl.tam;
    }
    if (options.tam) {
        _opt.protocol = 'https';
        _opt.hostname = options.tam.getServerHost();
        _opt.port = options.tam.getServerPort();
    } else if (typeof location !== 'undefined') {
        if (location.protocol) {
            var i = location.protocol.indexOf(':');
            _opt.protocol = (i<0) ? location.protocol : location.protocol.substring(0, i);
        }
        if (location.hostname) {
            _opt.hostname = location.hostname;
        }
        if (location.port) {
            _opt.port = location.port;
        }
        oracleIoT = false;
    }
    _opt.headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    };

    //@TODO: Remove basic auth; only for tests and test server
    //@TODO: (jy) use lib.debug if this configuration is really/always needed for tests ...
    if (lib.oracle.iot.client.test && lib.oracle.iot.client.test.auth.activated) {
        _opt.protocol = lib.oracle.iot.client.test.auth.protocol;
        _opt.headers.Authorization = 'Basic ' + $port.util.btoa(lib.oracle.iot.client.test.auth.user + ':' + lib.oracle.iot.client.test.auth.password);
        if (testPath) {
            options.path = options.path.replace(basePath, testPath);
        }
    }

    for (var key in options) {
        if (key === 'headers') {
            for (var header in options.headers) {
                if (options.headers[header] === null) {
                    delete _opt.headers[header];
                } else {
                    _opt.headers[header] = options.headers[header];
                }
            }
        } else {
            _opt[key] = options[key];
        }
    }

    $port.https.req(_opt, payload, function(response_body, error) {
        if (!response_body || error) {
            callback(null, error);
            return;
        }
        var response_json = null;
        try {
            response_json = JSON.parse(response_body);
        } catch (e) {

        }
        if (!response_json || (typeof response_json !== 'object')) {
            callback(null, lib.createError('response not JSON'));
            return;
        }
        callback(response_json);
    }, oracleIoT);
}


//////////////////////////////////////////////////////////////////////////////

/** @ignore */
function _mandatoryArg(arg, types) {
    if (!arg) {
        lib.error('missing argument');
        return;
    }
    __checkType(arg, types);
}

/** @ignore */
function _optionalArg(arg, types) {
    if (!arg) {
        return;
    }
    __checkType(arg, types);
}

/** @ignore */
//@TODO: [v2] (?) increase check on 'number' with parseInt()!==NaN ?? 
//@TODO: [v2] add support for {'array':'type'}
function __isArgOfType(arg, type) {
    switch(typeof(type)) {
    case 'function':
    case 'object':
        return (arg instanceof type);
    case 'string':
        return (type==='array')
            ? Array.isArray(arg)
            : (typeof(arg) === type);
    default:
    }
    return false;
}

/** @ignore */
function __checkType(arg, types) {
    var argType = typeof(arg);
    if (Array.isArray(types)) {
        var nomatch = types.every(function(type) { return !__isArgOfType(arg, type); });
        if (nomatch) {
            lib.log('type mismatch: got '+argType+' but expecting any of '+types+')');
            lib.error('illegal argument type');
            return;
        }
        return;
    }
    if (!__isArgOfType(arg, types)) {
        lib.log('type mismatch: got '+argType+' but expecting '+types+')');
        lib.error('illegal argument type');
        return;
    }
}
