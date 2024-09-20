/**
 * Copyright reelyActive 2024
 * We believe in an open Internet of Things
 */


const DEFAULT_MESSAGE_PERIOD_MILLISECONDS = 10000;
const TEST_ORIGIN = 'test';


/**
 * TestListener Class
 * Provides a consistent stream of artificially generated messages.
 */
class TestListener {

  /**
   * TestListener constructor
   * @param {Object} options The options as a JSON object.
   * @constructor
   */
  constructor(options) {
    options = options || {};

    this.decoder = options.decoder;
    this.messagePeriod = options.messagePeriod ||
                         DEFAULT_MESSAGE_PERIOD_MILLISECONDS;
    this.decodingOptions = options.decodingOptions || {};

    setInterval(emitMessages, this.messagePeriod, this);
  }

}


/**
 * Emit simulated messages
 * @param {TestListener} instance The given instance.
 */
function emitMessages(instance) {
  let now = new Date();

  let simulatedOtherTypeMessage = {
      topic: "mokosmart:x", // TODO
      timestamp: now.getTime(),
      message: {
        "msg_id": 3004,
        "device_info": {
          "device_id": "1234",
          "mac": "112233445566"
        },
        "data": [{
          "type": 8,
          "value": {
            "timestamp": "2021-01-01&17:10:16+08", // TODO
            "type": "unknown",
            "mac": "ABDF01FC9E98",
            "rssi": -78,
            "name": "ABC",
            "raw": "0201060303AAFE1116AAFE20000BD091181501E329"
          }
        }]
      }
  };

  instance.decoder.handleData(simulatedOtherTypeMessage, TEST_ORIGIN,
                              now.getTime(), instance.decodingOptions);

}


module.exports = TestListener;
