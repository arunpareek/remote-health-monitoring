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
$impl.Data = function (dataSpec) {
    _mandatoryArg(dataSpec, 'object');

    if (!dataSpec.urn) {
        lib.error('data specification in device model is incomplete');
        return;
    }

    var spec = {
        urn: dataSpec.name,
        description: (dataSpec.description || ''),
        name: (dataSpec.name || null)
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

    Object.defineProperty(this, 'onData', {
        enumerable: false,
        configurable: false,
        get: function () {
            return this._.onData;
        },
        set: function (newValue) {
            if (!newValue || (typeof newValue !== 'function')) {
                lib.error('trying to set something to onData that is not a function!');
                return;
            }
            this._.onData = newValue;
        }
    });
    this._.onData = function (arg) {};

};