/**
 * Copyright (c) 2015, 2016, Oracle and/or its affiliates. All rights reserved.
 *
 * This software is dual-licensed to you under the MIT License (MIT) and
 * the Universal Permissive License (UPL). See the LICENSE file in the root
 * directory for license terms. You may choose either license, or both.
 *
 */

//@TODO: missing jsdoc

/**
 * @class
 */
/** @ignore */
$impl.Attribute = function (attributeSpec) {
    _mandatoryArg(attributeSpec, 'object');

    if ((!attributeSpec.name) || (!attributeSpec.type)) {
        lib.error('attribute specification in device model is incomplete');
        return;
    }

    var spec = {
        name: attributeSpec.name,
        description: (attributeSpec.description || ''),
        type: attributeSpec.type,
        writable: (attributeSpec.writable || false),
        alias: (attributeSpec.alias || null)
    };

    if (attributeSpec.range) {
        spec.range = _parseRange(spec.type, attributeSpec.range);
    }

    /** @private */
    Object.defineProperty(this, '_', {
        enumerable: false,
        configurable: false,
        writable: false,
        value: {}
    });
    this._.value = null;
    this._.lastKnownValue = null;
    this._.lastUpdate = null;

    var self = this;

    //@TODO: see comment in AbstractVirtualDevice; this is not clean especially it is supposed to be a private function and yet used in 4 other objects ...etc...; this looks like a required ((semi-)public) API ... or an $impl.XXX or a function ()...

    /** @private */
    Object.defineProperty(this._, 'remoteUpdate', {
        enumerable: false,
        configurable: false,
        writable: false,
        value: function (newValue, onlyValidation) {

            try {
                newValue = _checkAndGetNewValue(newValue, spec);
            } catch (e) {
                lib.createError('invalid value', e);
                return false;
            }

            if (!spec.writable) {
                lib.createError('trying to set a read only value');
                return false;
            }

            if (typeof newValue === 'undefined') {
                lib.createError('trying to set an invalid value');
                return false;
            }

            if (spec.range && ((newValue < spec.range.low) || (newValue > spec.range.high))) {
                lib.createError('trying to set a value out of range [' + spec.range.low + ' - ' + spec.range.high + ']');
                return false;
            }

            if (!onlyValidation) {

                self._.lastUpdate = Date.now();

                if (_equal(newValue, self._.lastKnownValue, spec)) {
                    return true;
                }

                self._.lastKnownValue = newValue;

                lib.log('updating attribute "' + spec.name + '" of type "' + spec.type + '" from ' + self._.value + ' to ' + newValue);
                self._.value = newValue;

            }
            return true;
        }
    });

    /** @private */
    Object.defineProperty(this._, 'onUpdateResponse', {
        enumerable: false,
        configurable: false,
        writable: false,
        value: function (error) {
            if (error) {
                lib.log('updating attribute "' + spec.name + '" of type "' + spec.type + '" from ' + self._.value + ' to ' + self._.lastKnownValue);
                self._.value = self._.lastKnownValue;
            } else {
                self._.lastKnownValue = self._.value;
            }
            self._.lastUpdate = new Date().getTime();
        }
    });

    /** @private */
    Object.defineProperty(this._, 'localUpdate', {
        enumerable: false,
        configurable: false,
        writable: false,
        value: function (newValue, nosync) {

            newValue = _checkAndGetNewValue(newValue, spec);

            if (typeof newValue === 'undefined') {
                lib.error('trying to set an invalid value');
                return;
            }

            if (spec.range && ((newValue < spec.range.low) || (newValue > spec.range.high))) {
                lib.error('trying to set a value out of range [' + spec.range.low + ' - ' + spec.range.high + ']');
                return;
            }

            if (_equal(newValue, self._.value, spec)) {
                return;
            }

            lib.log('updating attribute "' + spec.name + '" of type "' + spec.type + '" from ' + self._.value + ' to ' + newValue);
            self._.value = newValue;

            if (!nosync) {
                var attributes = {};
                attributes[spec.name] = newValue;
                if (!self.device || !(self.device instanceof lib.device.VirtualDevice)) {
                    return;
                }
                self.device._.updateAttributes(attributes);
            }
        }
    });


    // public properties

    /**
     * @memberof iotcs.Attribute
     * @member {string} id - the unique/reproducible
     * id for this attribute (usually its name)
     */
    Object.defineProperty(this, 'id', {
        enumerable: true,
        configurable: false,
        writable: false,
        value: spec.name
    });

    /**
     * @memberof iotcs.Attribute
     * @member {string} description - the description
     * of this attribute
     */
    Object.defineProperty(this, 'description', {
        enumerable: true,
        configurable: false,
        writable: false,
        value: spec.description
    });

    /**
     * @memberof iotcs.Attribute
     * @member {string} type - one of <code>INTEGER</code>,
     * <code>NUMBER</code>, <code>STRING</code>, <code>BOOLEAN</code>,
     * <code>DATETIME</code>
     */
    Object.defineProperty(this, 'type', {
        enumerable: true,
        configurable: false,
        writable: false,
        value: spec.type
    });

    /**
     * @ignore
     * @memberof iotcs.Attribute
     * @member {boolean} writable - expressing whether
     * this attribute is writable or not
     */
    Object.defineProperty(this, 'writable', {
        enumerable: true,
        configurable: false,
        writable: false,
        value: spec.writable
    });

    /**
     * @memberof iotcs.Attribute
     * @member {function(Object)} onChange - function called
     * back when value as changed on the server side. Callback
     * signature is <code>function (e) {}</code>, where <code>e</code>
     * is <code>{'attribute':this, 'newValue':, 'oldValue':}</code>
     */
    Object.defineProperty(this, 'onChange', {
        enumerable: false,
        configurable: false,
        get: function () {
            return this._.onChange;
        },
        set: function (newValue) {
            if (!newValue || (typeof newValue !== 'function')) {
                lib.error('trying to set to onChange something that is not a function!');
                return;
            }
            this._.onChange = newValue;
        }
    });

    /**
     * @memberof iotcs.Attribute
     * @member {function(Object)} onError - function called
     * back when value could not be changed. Callback signature is
     * <code>function (e) {}</code>, where <code>e</code> is
     * <code>{'attribute':this, 'newValue':, 'tryValue':}</code>
     */
    Object.defineProperty(this, 'onError', {
        enumerable: false,
        configurable: false,
        get: function () {
            return this._.onError;
        },
        set: function (newValue) {
            if (!newValue || (typeof newValue !== 'function')) {
                lib.error('trying to set to onError something that is not a function!');
                return;
            }
            this._.onError = newValue;
        }
    });

    /**
     * @memberof iotcs.Attribute
     * @member {(number|string|boolean|Date)} value - used for setting or
     * getting the current value of this attribute (subject to whether it is writable
     * or not).
     */
    Object.defineProperty(this, 'value', {
        enumerable: false,
        configurable: false,
        get: function () {
            return this._.value;
        },
        set: function (newValue) {
            this._.localUpdate(newValue, false);
        }
    });

    /**
     * @memberof iotcs.Attribute
     * @member {(number|string|boolean|Date)} lastKnownValue -
     * used for getting the current value of this attribute
     */
    Object.defineProperty(this, 'lastKnownValue', {
        enumerable: false,
        configurable: false,
        get: function () {
            return this._.lastKnownValue;
        },
        set: function (newValue) {
            return;
        }
    });

    /**
     * @memberof iotcs.Attribute
     * @member {Date} lastUpdate - the date of the last value update
     */
    Object.defineProperty(this, 'lastUpdate', {
        enumerable: false,
        configurable: false,
        get: function () {
            return this._.lastUpdate;
        },
        set: function (newValue) {
            return;
        }
    });
};

//////////////////////////////////////////////////////////////////////////////

/** @ignore */
function _parseRange(type, rangeStr) {
    _mandatoryArg(type, 'string');
    _mandatoryArg(rangeStr, 'string');
    if ((type !== 'NUMBER') && (type !== 'INTEGER')) {
        lib.error('device model specification is invalid');
        return;
    }
    var rangeLimits = rangeStr.split(',');
    if (rangeLimits.length != 2) {
        lib.error('device model specification is invalid');
        return;
    }
    var first = parseFloat(rangeLimits[0]);
    var second = parseFloat(rangeLimits[1]);
    return { low:Math.min(first,second), high:Math.max(first,second) };
}

/** @ignore */
function _matchType(reqType, value) {
    _mandatoryArg(reqType, 'string');
    switch(reqType) {
        case 'INTEGER':
            return ((typeof value === 'number') && (value % 1 === 0));
        case 'NUMBER':
            return (typeof value === 'number');
        case 'STRING':
            return (typeof value === 'string');
        case 'BOOLEAN':
            return (typeof value === 'boolean');
        case 'DATETIME':
            return (value instanceof Date);
        default:
            lib.error('illegal state');
            return;
    }
}

/** @ignore */
function _checkAndGetNewValue(newValue, spec) {
    if (spec.type === 'DATETIME') {
        if (typeof newValue === 'number') {
            var str = '' + newValue;
            if (str.match(/^[-+]?[1-9]\.[0-9]+e[-]?[1-9][0-9]*$/)) {
                newValue = newValue.toFixed();
            }
        }
        newValue = new Date(newValue);
        if (isNaN(newValue.getTime())) {
            lib.error('invalid date in date time parameter');
            return;
        }
    }
    if (!_matchType(spec.type, newValue)) {
        lib.error('type mismatch; attribute "' + spec.name + '" has type [' + spec.type + ']');
        return;
    }
    return newValue;
}

/** @ignore */
function _equal(newValue, oldValue, spec) {
    if (spec.type === 'DATETIME'
        && (newValue instanceof Date)
        && (oldValue instanceof Date)) {
        return (newValue.getTime() === oldValue.getTime());
    } else {
        return (newValue === oldValue);
    }
}
