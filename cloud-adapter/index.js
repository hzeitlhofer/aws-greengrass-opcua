'use strict';

const IotData = require('aws-greengrass-core-sdk').IotData;

const device = new IotData();

const deviceName = 'BR01_Core';
const shadowUpdatedTopic = "$aws/things/"+deviceName+"/shadow/update/accepted";

let runmode = 0;

const heartbeat = () => {
    console.log('safety check watchdog');
}

const setConfig = (config) => {
    console.log(config);
    device.updateThingShadow({
        thingName: deviceName,
        payload: JSON.stringify({'state': {'reported': config}})
    }, (err, data) => {
        if (err) {
            console.log('ERROR:', JSON.stringify(err));
        } else {
            console.log(JSON.stringify(data));
        }
    });
}

const setNodes = (payload) => {
  device.publish(
      {
          topic: 'opcua/config',
          payload: JSON.stringify(payload.opcua.nodes)
      },
      (err) => {
          if (err) {
             console.log(`Failed to publish OPC UA config`);
          }
      });
}

const getShadow = (callback) => {
    console.log('getThingShadow');
    device.getThingShadow({thingName: deviceName}, (err, data) => {
        if (err) {
            console.log('ERROR:', JSON.stringify(err));
        } else {
            console.log(JSON.stringify(data));
            let payload = JSON.parse(data.Payload);
            console.log(JSON.stringify(payload.state.desired));
            setNodes(payload.state.desired);
            setConfig(payload.state.desired);
        }
    });
}

setInterval(() => {
    heartbeat();
}, 2000);


getShadow();

exports.handler = function handler(event, context, callback) {
    console.log('event  : '+ JSON.stringify(event));

    if (context.clientContext && context.clientContext.Custom && context.clientContext.Custom.subject == shadowUpdatedTopic) {
//        getShadow();
    }


    if (callback) callback();
}
