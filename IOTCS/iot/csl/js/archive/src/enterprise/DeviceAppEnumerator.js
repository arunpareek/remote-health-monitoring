/**
 * Copyright (c) 2015, 2016, Oracle and/or its affiliates. All rights reserved.
 *
 * This software is dual-licensed to you under the MIT License (MIT) and
 * the Universal Permissive License (UPL). See the LICENSE file in the root
 * directory for license terms. You may choose either license, or both.
 *
 */

/**
 * A class that implements a way of getting device applications
 *
 * @memberOf iotcs.enterprise
 * @alias DeviceAppEnumerator
 *
 * @param {iotcs.enterprise.EnterpriseClient} client - The enterprise
 * client associated with the application context
 * for which the deviceApps need to be enumerated
 * @class
 */
lib.enterprise.DeviceAppEnumerator = function (client) {
    _mandatoryArg(client, lib.enterprise.EnterpriseClient);
    this.client = client;
};

/**
 * Return the list of deviceApps from the enterprise client context
 *
 * @returns {iotcs.enterprise.Pageable} A pageable instance with
 * which pages can be requested that contain deviceApps as items
 *
 * @memberof iotcs.enterprise.DeviceAppEnumerator.prototype
 * @function getDeviceApps
 */
lib.enterprise.DeviceAppEnumerator.prototype.getDeviceApps = function (filter) {

    _optionalArg(filter, lib.enterprise.Filter);

    return new lib.enterprise.Pageable({
        method: 'GET',
        path: $impl.reqroot
        + '/apps/' + this.client.appid
        + '/deviceApps'
        + (filter ? ('?q=' + filter.toString()) : '')
    }, '', null, this.client);
};