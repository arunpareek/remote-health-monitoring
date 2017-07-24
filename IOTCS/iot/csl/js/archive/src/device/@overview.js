/**
 * Copyright (c) 2015, 2016, Oracle and/or its affiliates.  All rights reserved.
 *
 * This software is dual-licensed to you under the MIT License (MIT) and 
 * the Universal Permissive License (UPL).  See the LICENSE file in the root
 * directory for license terms.  You may choose either license, or both.
 *
 * @overview
 *
 * The device and enterprise client libraries simplify working with the Oracle IoT Cloud Service.
 * These client libraries are a low–level abstraction over top of messages and REST APIs.
 * Device clients are primarily concerned with sending data and alert messages to the cloud service,
 * and acting upon requests from the cloud service. Enterprise clients are primarily concerned
 * with monitor and control of device endpoints.
 *
 * <h2>Configuration</h2>
 *
 * The client must have a configuration in order to communicate with the cloud service.
 * This configuration includes the IoT Cloud Service host, the identifier of the device
 * or enterprise integration the client represents, and the shared secret of the device
 * or enterprise integration.
 * <p>
 * The configuration is created by using the provisioner tool: provisioner.js. This tool
 * creates a file that is used when running the client application. Usage is available
 * by running the tool with the -h argument.
 *
 * <h2>Device and Enterprise Clients</h2>
 *
 * Prerequisites:<br>
 * - Register your device and/or enterprise application with the Cloud Service.<br>
 * - Provision the device with the credentials obtained from above.<br>
 * - Optionally provision the device model.<br>
 *
 * @example <caption>Device Client Quick Start</caption>
 *
 * //The following steps must be taken to run a device-client application.
 * //The example shows a GatewayDevice. A DirectlyConnectedDevice is identical,
 * //except for registering indirectly-connected devices.
 *
 * // 1. Initialize device client
 *
 *      var gateway = new iotcs.device.GatewayDeviceUtil(configurationFilePath, password);
 *
 * // 2. Activate the device
 *
 *      if (!gateway.isActivated()) {
 *          gateway.activate([], function (device, error) {
 *              if (!device || error) {
 *                  //handle activation error
 *              }
 *          });
 *
 * // 3. Register indirectly-connected devices
 *
 *      gateway.registerDevice(hardwareId,
 *          {serialNumber: 'someNumber',
 *          manufacturer: 'someManufacturer',
 *          modelNumber: 'someModel'}, ['urn:myModel'],
 *          function (response, error) {
 *              if (!response || error) {
 *                  //handle enroll error
 *              }
 *              indirectDeviceId = response;
 *          });
 *
 * // 4. Register handler for attributes and actions
 *
 *      var messageDispatcher = new iotcs.device.util.MessageDispatcher(gateway);
 *      messageDispatcher.getRequestDispatcher().registerRequestHandler(id,
 *          'deviceModels/urn:com:oracle:iot:device:humidity_sensor/attributes/maxThreshold',
 *          function (requestMessage) {
 *              //handle attribute update and validation
 *              return iotcs.message.Message.buildResponseMessage(requestMessage, 200, {}, 'OK', '');
 *          });
 *
 * // 5. Send data from the indirectly-connected device
 *
 *      var message = new iotcs.message.Message();
 *      message
 *          .type(iotcs.message.Message.Type.DATA)
 *          .source(indirectDeviceId)
 *          .format('urn:com:oracle:iot:device:humidity_sensor' + ":attributes");
 *      message.dataItem('humidity', sensor.humidity);
 *      message.dataItem('maxThreshold', sensor.maxThreshold);
 *      messageDispatcher.queue(message);
 *
 * // 6. Dispose the device client
 *
 *      gateway.close();
 *
 * @example <caption>Enterprise Client Quick Start</caption>
 *
 * //The following steps must be taken to run an enterprise-client application.
 *
 * // 1. Initialize enterprise client
 *
 *      iotcs.enterprise.EnterpriseClient.newClient(applicationName, function (client, error) {
 *          if (!client || error) {
 *              //handle client creation error
 *          }
 *          ec = client;
 *      });
 *
 * // 2. Select a device
 *
 *      ec.getActiveDevices('urn:myModelUrn').page('first').then(function(response, error){
 *          if (!response || error) {
 *              //handle get device model error
 *          }
 *          if(response.items){
 *              response.items.forEach(function(item){
 *                  //handle select of an item as a device
 *                  device = item;
 *              });
 *          }
 *      });
 *
 * // 3. Monitor a device
 *
 *      messageEnumerator = new iotcs.enterprise.MessageEnumerator(ec);
 *      messageEnumerator.setListener(device.id, 'ALERT', function (items) {
 *          items.forEach(function(item) {
 *              //handle each item as a message received from the device
 *          });
 *      });
 *
 * // 4. List the resources of a device
 *
 *      resourceEnumerator = new iotcs.enterprise.ResourceEnumerator(ec, device.id);
 *      resourceEnumerator.getResources().page('first').then(function (response){
 *              response.items.forEach(function(item){
 *                  //handle each item as a resource
 *              });
 *      }, function (error) {
 *          //handle error on enumeration
 *      });
 *
 * // 5. Dispose the enterprise client
 *
 *      ec.close();
 *
 */
