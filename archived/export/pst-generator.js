/**
 * Logic Pro External Instrument PST File Generator
 * Archived for later reactivation in the live Electron app.
 */

/**
 * Generate a Logic Pro External Instrument PST file
 * @param {Object} options - Configuration options
 * @param {string} options.voiceName - Name of the Genos voice
 * @param {number} options.program - Program Change number (0-127)
 * @param {number} options.bankLSB - Bank LSB (0-127)
 * @param {number} options.bankMSB - Bank MSB (0-127)
 * @param {number} options.midiChannel - MIDI Channel (1-16), defaults to 1
 * @param {string} options.midiDestination - MIDI device name, defaults to "MD-BT01"
 * @returns {Buffer} Binary PST file data
 */
function generatePST(options) {
  const {
    voiceName,
    program = 0,
    bankLSB = 0,
    bankMSB = 0,
    midiChannel = 1,
    midiDestination = 'MD-BT01'
  } = options;

  const buffer = Buffer.alloc(376);
  buffer.fill(0);

  buffer.writeUInt8(0x78, 0x00);
  buffer.writeUInt8(0x01, 0x01);
  buffer.writeUInt8(0x01, 0x04);
  buffer.writeUInt8(0x01, 0x06);
  buffer.writeUInt8(0x0F, 0x08);

  const deviceId = 'MELCTSPP2IxEMD-BT01';
  buffer.write(deviceId, 0x0C, 'ascii');

  let offset = 0xA0;

  function writeParam(paramId, value) {
    buffer.writeUInt32LE(paramId, offset);
    buffer.writeUInt32LE(value, offset + 4);
    offset += 8;
  }

  writeParam(1, 5);
  writeParam(2, midiChannel);
  writeParam(3, 0);
  writeParam(4, 1);
  writeParam(5, 32);
  writeParam(6, 0);
  writeParam(7, 0);
  writeParam(8, 1);
  writeParam(9, 0);
  writeParam(10, 0);
  writeParam(11, 1);
  writeParam(12, program + 1);
  writeParam(13, bankLSB + 1);
  writeParam(14, bankMSB + 1);

  buffer.writeUInt32LE(100, 0x110);

  buffer.writeUInt8(0x97, 0x114);
  buffer.writeUInt8(0x21, 0x115);
  buffer.writeUInt8(0x0B, 0x116);
  buffer.writeUInt8(0xFF, 0x117);

  buffer.write('Bluetooth', 0x118, 'ascii');
  buffer.write(midiDestination, 0x158, 'ascii');

  return buffer;
}

/**
 * Generate a safe filename for the PST file
 * @param {string} category - Voice category
 * @param {string} name - Voice name
 * @returns {string} Sanitized filename without extension
 */
function generateFilename(category, name) {
  const fullName = `${name}`;

  return fullName
    .replace(/[<>:"/\\|?*]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

module.exports = {
  generatePST,
  generateFilename
};
