/**
 * Copyright (c) 2015, 2016, Oracle and/or its affiliates. All rights reserved.
 *
 * This software is dual-licensed to you under the MIT License (MIT) and
 * the Universal Permissive License (UPL). See the LICENSE file in the root
 * directory for license terms. You may choose either license, or both.
 *
 */

//@TODO: missing JSDOC

/**
 * @class
 */
/** @ignore */
$impl.Alert = function (alertSpec) {
    _mandatoryArg(alertSpec, 'object');

    if (!alertSpec.urn) {
        lib.error('alert specification in device model is incomplete');
        return;
    }

    var spec = {
        urn: alertSpec.name,
        description: (alertSpec.description || ''),
        name: (alertSpec.name || null)
    };

    /** @private */
    Object.defineProperty(this, '_', {
        enumerable: false,
        configurable: false,
        writable: true,
        value: {}
    });

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

    Object.defineProperty(this, 'onAlerts', {
        enumerable: false,
        configurable: false,
        get: function () {
            return this._.onAlerts;
        },
        set: function (newValue) {
            if (!newValue || (typeof newValue !== 'function')) {
                lib.error('trying to set something to onAlert that is not a function!');
                return;
            }
            this._.onAlerts = newValue;
        }
    });
    this._.onAlerts = function (arg) {};

};