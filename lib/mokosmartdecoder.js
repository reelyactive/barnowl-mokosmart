/**
 * Copyright reelyActive 2024
 * We believe in an open Internet of Things
 */


const mqttProtocolDecoder = require('./mqttprotocoldecoder');


/**
 * MOKOSmartDecoder Class
 * Decodes data streams from one or more MOKOSmart gateways and forwards the
 * packets to the given BarnowlMOKOSmart instance.
 */
class MOKOSmartDecoder {

  /**
   * MOKOSmartDecoder constructor
   * @param {Object} options The options as a JSON object.
   * @constructor
   */
  constructor(options) {
    options = options || {};

    this.barnowl = options.barnowl;
  }

  /**
   * Handle data from a given device, specified by the origin
   * @param {Buffer} data The data as a buffer or a JSON object.
   * @param {String} origin The unique origin identifier of the device.
   * @param {Number} time The time of the data capture.
   * @param {Object} decodingOptions The packet decoding options.
   */
  handleData(data, origin, time, decodingOptions) {
    let self = this;

    // Assume all data with valid numerical msg_id is MQTT protocol
    if(Number.isInteger(data.msg_id)) {
      let decoded = mqttProtocolDecoder.decode(data, origin, time,
                                               decodingOptions);
      decoded.raddecs.forEach((raddec) => {
        self.barnowl.handleRaddec(raddec);
      });
      decoded.infrastructureMessages.forEach((infrastructureMessage) => {
        self.barnowl.handleInfrastructureMessage(infrastructureMessage);
      });  
    }
  }
}


module.exports = MOKOSmartDecoder;
