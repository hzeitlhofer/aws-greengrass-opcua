'use strict';

const IotData = require('aws-greengrass-core-sdk').IotData;
const device = new IotData();

let deviceName = 'BR01_Core';
let runmode = 0;
let data = [];


const sendData = () => {

    if (!data.length) return false;

    const payload = {
        timestamp: new Date().getTime(),
        deviceName: deviceName,
        data: data,
    };

    const topic = `br/opcuademo/${deviceName}/data`;
    const payloadStr = JSON.stringify(payload);

    device.publish(
        {
            topic: topic,
            payload: payloadStr,
        },
        (err) => {
            if (err) {
                console.log(`Failed to publish ${payloadStr} on ${topic}. Got the following error: ${err}`);
            } else {
                data = [];
                console.log('data sent to ' + topic);
            }
        });

}

const addMeasure = (measure) => {
  data.push(measure);
}

setInterval(() => {
    sendData();
}, 1000);



exports.handler = function handler(event, context, callback) {
    console.log('event  : '+ JSON.stringify(event));
    addMeasure(event);
    if (callback) callback();
}
