'use strict';

require('requirish')._(module);
const util = require('util');
const EventEmitter = require('events');

let Opcua;
let IoTDevice;

class OPCUASubscriber {
    constructor(client, serverConfig, monitoredItemsConfig) {
        this._client = client;
        this._serverConfig = serverConfig;
        this._monitoredItemsConfig = monitoredItemsConfig;
        this._subscriptions = [];

        const self = this;
        this.on('connect', () => {
            self.createSession();
        });
        this.on('session_create', () => {
            self.createSubscription();
        });
//        this.on('subscribe', () => {
//            self.initMonitoring();
//        });
    }

    connect() {
        const self = this;
        self._client.connect(self._serverConfig.url, (connectError) => {
            if (connectError) {
                console.log('Got an error connecting to ', self._serverConfig.url, ' Err: ', connectError);
                return;
            }
            self.emit('connect');
        });
    }


    createSession() {
        const userIdentity = null;
        const self = this;
        self._client.createSession(userIdentity, (createSessionError, session) => {
            if (!createSessionError) {
                self._session = session;
                console.log('Session created');
                console.log('SessionId: ', session.sessionId.toString());
                self.emit('session_create');
            } else {
                console.log('Err: ', createSessionError);
            }
        });
    }

    createSubscription() {
        const parameters = {
            requestedPublishingInterval: 100,
            requestedLifetimeCount: 1000,
            requestedMaxKeepAliveCount: 12,
            maxNotificationsPerPublish: 10,
            publishingEnabled: true,
            priority: 10,
        };

        const self = this;
        this._subscription = new Opcua.ClientSubscription(this._session, parameters);
        this._subscription.on('started', () => {
            console.log('started subscription :', this._subscription.subscriptionId);
            self.emit('subscribe');
        }).on('internal_error', (err) => {
            console.log(' received internal error', err.message);
        }).on('status_changed', (err, v) => {
            console.log('err=', err, ' Value: ', v);
        });
    }

    subscribeNode(monitoredNode) {
      const self = this;
      console.log('subscribeNode: '+ JSON.stringify(monitoredNode));
      console.log('monitoring node id: ' + monitoredNode.nodeId);
      const monitoredItem = this._subscription.monitor(
          {
              nodeId: monitoredNode.nodeId,
              attributeId: Opcua.AttributeIds.Value,
          },
          {
              samplingInterval: 250,
              queueSize: 10000,
              discardOldest: true,
          },
          Opcua.read_service.TimestampsToReturn.Both
      );
      monitoredItem.on('initialized', () => {
          console.log('monitoredItem initialized');
          self._subscriptions.push(monitoredNode);
      });
      monitoredItem.on('changed', (dataValue) => {
          console.log('monitoredItem changed: ' + JSON.stringify(dataValue));
          const monitoredNodeName = monitoredNode.name;
          const serverName = self._serverConfig.name;
          const time = dataValue.sourceTimestamp;
          const nodeId = monitoredItem.itemToMonitor.nodeId.toString();
          const payload = {
              id: nodeId,
              timestamp: time,
              value: dataValue.value,
          };

          const topic = `opcua/data/${serverName}/node/${monitoredNodeName}`;
          const payloadStr = JSON.stringify(payload);
          IoTDevice.publish(
              {
                  topic: topic,
                  payload: payloadStr,
              },
              (err) => {
                  if (err) {
                     console.log(`Failed to publish ${payloadStr} on ${topic}. Got the following error: ${err}`);
                  }
              });
      });

      monitoredItem.on('err', (errorMessage) => {
          console.log(monitoredItem.itemToMonitor.nodeId.toString(), ' ERROR', errorMessage);
      });

    }

    initMonitoring(nodes) {
        const self = this;
        nodes = nodes || self._monitoredItemsConfig;
        console.log('initMonitoring: '+ JSON.stringify(nodes));

        nodes.forEach((monitoredNode) => {
            console.log('call subscribeNode: '+ JSON.stringify(monitoredNode));
            this.subscribeNode(monitoredNode);
        }, self);
    }
}

util.inherits(OPCUASubscriber, EventEmitter);

module.exports = {
    OPCUASubscriber: OPCUASubscriber,
    setOPCUA: (opcua) => {
        Opcua = opcua;
    },
    setIoTDevice: (device) => {
        IoTDevice = device;
    },
};
