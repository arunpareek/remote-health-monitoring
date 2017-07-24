/**
 * Copyright (c) 2015, 2016, Oracle and/or its affiliates. All rights reserved.
 *
 * This software is dual-licensed to you under the MIT License (MIT) and 
 * the Universal Permissive License (UPL). See the LICENSE file in the root
 * directory for license terms. You may choose either license, or both.
 *
 */

/**
 * This represents a GatewayDevice in the high level API.
 * It has the exact same specifications and capabilities as
 * a directly connected device from the high level API and additionally
 * it has the capability to register indirectly connected devices.
 *
 * @param {string} [taStoreFile] - trusted assets store file path
 * to be used for trusted assets manager creation. This is optional.
 * If none is given the default global library parameter is used:
 * lib.oracle.iot.tam.store
 * @param {string} [taStorePassword] - trusted assets store file password
 * to be used for trusted assets manager creation. This is optional.
 * If none is given the default global library parameter is used:
 * lib.oracle.iot.tam.storePassword
 *
 * @memberOf iotcs.device
 * @alias GatewayDevice
 * @class
 * @extends iotcs.device.DirectlyConnectedDevice
 */
lib.device.GatewayDevice = function (taStoreFile, taStorePassword) {
    lib.device.DirectlyConnectedDevice.call(this, (taStoreFile ? taStoreFile : null), (taStorePassword ? taStorePassword : null), true);
};

lib.device.GatewayDevice.prototype = Object.create(lib.device.DirectlyConnectedDevice.prototype);
lib.device.GatewayDevice.constructor = lib.device.GatewayDevice.prototype;

/**
 * Enumeration of the standard properties that can
 * be used in the metadata object given as parameter
 * on indirect registration
 *
 * @memberOf iotcs.device.GatewayDevice
 * @alias DeviceMetadata
 * @class
 * @readonly
 * @enum {string}
 * @see {@link iotcs.device.GatewayDevice#registerDevice}
 */
lib.device.GatewayDevice.DeviceMetadata = {
    MANUFACTURER: 'manufacturer',
    MODEL_NUMBER: 'modelNumber',
    SERIAL_NUMBER: 'serialNumber',
    DEVICE_CLASS: 'deviceClass',
    PROTOCOL: 'protocol',
    PROTOCOL_DEVICE_CLASS: 'protocolDeviceClass',
    PROTOCOL_DEVICE_ID: 'protocolDeviceId'
};

/**
 * Register an indirectly-connected device with the cloud
 * service. An indirectly-connected device only needs to be
 * registered once. After registering the indirectly-connected
 * device, the caller is responsible for keeping track of what
 * devices have been registered, the metadata, and for
 * persisting the endpoint id. On subsequent boots, the same
 * endpoint id is to be used for the indirectly-connected
 * device. Registering an indirectly-connected device that has
 * already been registered will result in an error given by the
 * server.
 * <p>
 * The hardwareId is a unique identifier within the Cloud
 * Service instance. The metadata argument should typically contain all the standard
 * metadata (the constants documented in This object) along
 * with any other vendor defined metadata.
 * <p>
 * Standard metadata properties can be taken from the
 * DeviceMetadata enumeration, part of this object.
 *
 * @param {string} hardwareid - an identifier unique within
 * the Cloud Service instance 
 * @param {Object} metadata - the metadata of the device
 * @param {string[]} deviceModelUrns - array of device model
 * URNs supported by the indirectly connected device
 * @param {function(Object)} callback - the callback function. This
 * function is called with the following argument: the endpoint id
 * of the indirectly-connected device is the registration was successful
 * or null and an error object as the second parameter: callback(id, error).
 * The reason can be retrieved from error.message and it represents
 * the actual response from the server or any other network or framework
 * error that can appear.
 *
 * @see {@link iotcs.device.GatewayDevice.DeviceMetadata}
 * @memberof iotcs.device.GatewayDevice.prototype
 * @function registerDevice
 */
lib.device.GatewayDevice.prototype.registerDevice = function (hardwareid, metadata, deviceModelUrns, callback) {
    this._.internalDev.registerDevice(hardwareid, metadata, deviceModelUrns, callback);
};
