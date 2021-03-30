'use strict';

require('requirish')._(module);
const Subscriber = require('subscriber');
const opcua = require('node-opcua');
const IotData = require('aws-greengrass-core-sdk').IotData;

const device = new IotData();

Subscriber.setOPCUA(opcua);
Subscriber.setIoTDevice(device);
const OPCUASubscriber = Subscriber.OPCUASubscriber;

const configSet = {
    server: {
        name: 'server',
        url: 'opc.tcp://localhost:4840',
    },
    subscriptions: [
        {
            name: 'OEE',
            nodeId: 'ns=6;s=IOImage.Data.OEE.OEE',
        },
    ],
};


const clientOptions = {
    keepSessionAlive: true,
    connectionStrategy: {
        maxRetry: 100000,
        initialDelay: 2000,
        maxDelay: 10 * 1000,
    },
};

console.log("Setting up OPCUA client");
const client = new opcua.OPCUAClient(clientOptions);
const subscriber = new OPCUASubscriber(client, configSet.server, configSet.subscriptions);
subscriber.connect();

exports.handler = function handler(event, context, callback) {
    console.log('event  : '+ JSON.stringify(event));
    console.log('context: '+ JSON.stringify(context));

    if (context.clientContext && context.clientContext.Custom && context.clientContext.Custom.subject == 'opcua/config/nodes') {
        subscriber.initMonitoring(event);
    }

    if (callback) callback();
};
