var IoTServer = require('jsclient/iot');
var iot = new IoTServer('https://iottrial2608-iotpartner.iot.us.oraclecloud.com');
iot.setPrincipal("arun.pareek@rubiconred.com", "#Musicrules12");
var mydevice = null;
iot.getDevice('myHealthDevice', '#Musicrules12').then(function(device) {
  console.log("Got device: "+iotDeviceID);
  mydevice = device;
});