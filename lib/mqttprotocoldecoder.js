/**
 * Copyright reelyActive 2024
 * We believe in an open Internet of Things
 */


const Raddec = require('raddec');


const NETWORK_STATUS_MSG_ID = 3003;
const SCANNED_BLUETOOTH_DATA_MSG_ID = 3004;
const SUPPORTED_MSG_IDS = [ NETWORK_STATUS_MSG_ID,
                            SCANNED_BLUETOOTH_DATA_MSG_ID ];


/**
 * Determine if the given data is a valid MOKOSmart MQTT protocol message.
 * @param {Object} data The MQTT message.
 */
function isValidMqttProtocolMessage(data) {
  return (data && SUPPORTED_MSG_IDS.includes(data.msg_id) &&
          data.hasOwnProperty('device_info') &&
          (typeof data.device_info.mac === 'string'));
}


/**
 * Reconstruct the complete packet.
 * @param {String} payload The packet payload as a hex string.
 * @param {String} address The address of the transmitter as a hex string.
 */
function reconstructPacket(payload, address) {
  // The report does not include the data required to reconstruct the header
  // bits, and the payload may exceed the expected maximum packet length.
  // The packet is therefore an approximation.
  let headerAddress = '20'; // (ADV_IND)
  let length = 6 + (payload.length / 2);

  headerAddress += length.toString(16).padStart(2, '0');
  headerAddress += address.substring(10,12);
  headerAddress += address.substring(8,10);
  headerAddress += address.substring(6,8);
  headerAddress += address.substring(4,6);
  headerAddress += address.substring(2,4);
  headerAddress += address.substring(0,2);

  return headerAddress + payload;
}


/**
 * Decode the given device report as a raddec.
 * @param {Object} data The device report.
 * @param {String} receiverId The identifier of the receiver.
 * @param {Number} receiverIdType The receiver id type.
 */
function decodeReport(data, receiverId, receiverIdType) {
  let isValidReport = Number.isInteger(data.type) &&
                      data.hasOwnProperty('value') &&
                      (typeof data.value.mac === 'string') &&
                      (typeof data.value.timestamp === 'string') &&
                      Number.isInteger(data.value.rssi);

  if(!isValidReport) {
    return null;
  }

  // TODO: transmitterIdType should use txAdd bit if added to protocol
  let transmitterId = data.value.mac.toLowerCase();
  let isRandomStatic = (parseInt(transmitterId.substring(0,1), 16) >= 0xc);
  let transmitterIdType = isRandomStatic ? Raddec.identifiers.TYPE_RND48 :
                                           Raddec.identifiers.TYPE_EUI48

  let timestamp = new Date(data.value.timestamp).getTime();

  let raddec = new Raddec({
      transmitterId: transmitterId,
      transmitterIdType: transmitterIdType,
      timestamp: timestamp
  });

  raddec.addDecoding({ receiverId: receiverId,
                       receiverIdType: receiverIdType,
                       rssi: data.value.rssi });

  // Reconstruct packet based on availability of 'raw' or 'raw data'
  if(data.value.hasOwnProperty('raw data')) {
    raddec.addPacket(reconstructPacket(data.value['raw data'], transmitterId));
  }
  else if(data.value.hasOwnProperty('raw')) {
    raddec.addPacket(reconstructPacket(data.value['raw'], transmitterId));
  }

  return raddec;
}


/**
 * Decode a network status data message.
 * @param {Object} data The MQTT message.
 * @param {String} origin Origin of the data stream.
 * @param {Number} time The time of the data capture.
 * @param {Object} options The packet decoding options.
 */
function decodeNetworkStatusData(data, origin, time, options) {
  let infrastructureMessages = [];

  if(data.data && (data.data.net_state === 'online')) {
    infrastructureMessages.push({
        deviceId: data.device_info.mac.toLowerCase(),
        deviceIdType: Raddec.identifiers.TYPE_EUI48,
        isHealthy: true,
        timestamp: time
    });
  }

  return { raddecs: [], infrastructureMessages: infrastructureMessages };
}


/**
 * Decode a scanned Bluetooth data message.
 * @param {Object} data The MQTT message.
 * @param {String} origin Origin of the data stream.
 * @param {Number} time The time of the data capture.
 * @param {Object} options The packet decoding options.
 */
function decodeScannedBluetoothData(data, origin, time, options) {
  if(!Array.isArray(data.data)) {
    return { raddecs: [], infrastructureMessages: [] };
  }

  let raddecs = [];
  let receiverId = data.device_info.mac.toLowerCase();
  let receiverIdType = Raddec.identifiers.TYPE_EUI48;

  data.data.forEach((report) => {
    let raddec = decodeReport(report, receiverId, receiverIdType);

    if(raddec) {
      raddecs.push(raddec);
    }
  });

  return { raddecs: raddecs, infrastructureMessages: [] };
}


/**
 * Decode all the reports from the message.
 * @param {Object} data The MQTT message.
 * @param {String} origin Origin of the data stream.
 * @param {Number} time The time of the data capture.
 * @param {Object} options The packet decoding options.
 */
function decode(data, origin, time, options) {
  if(!isValidMqttProtocolMessage(data)) {
    return { raddecs: [], infrastructureMessages: [] };
  }

  switch(data.msg_id) {
    case NETWORK_STATUS_MSG_ID:
      return decodeNetworkStatusData(data, origin, time, options);
    case SCANNED_BLUETOOTH_DATA_MSG_ID:
      return decodeScannedBluetoothData(data, origin, time, options);
  }
}


module.exports.decode = decode;
