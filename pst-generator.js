/**
 * Logic Pro External Instrument PST File Generator
 * Generates .pst preset files for Logic Pro's External Instrument plugin
 * configured for Yamaha Genos via MD-BT01 Bluetooth MIDI adapter
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
    midiDestination = "MD-BT01"
  } = options;

  // Create a 376-byte buffer (fixed PST file size)
  const buffer = Buffer.alloc(376);

  // Fill with zeros
  buffer.fill(0);

  // --- Header Section (0x00 - 0x1F) ---

  // Magic bytes
  buffer.writeUInt8(0x78, 0x00);
  buffer.writeUInt8(0x01, 0x01);

  // Version/flags (observed pattern)
  buffer.writeUInt8(0x01, 0x04);
  buffer.writeUInt8(0x01, 0x06);

  // String length indicator (0x0F = 15)
  buffer.writeUInt8(0x0F, 0x08);

  // Device identifier string
  const deviceId = "MELCTSPP2IxEMD-BT01";
  buffer.write(deviceId, 0x0C, 'ascii');

  // --- Parameter Block (0xA0 - 0x10F) ---
  // Format: param_id (4 bytes LE), value (4 bytes LE)

  let offset = 0xA0;

  // Write a parameter pair
  function writeParam(paramId, value) {
    buffer.writeUInt32LE(paramId, offset);
    buffer.writeUInt32LE(value, offset + 4);
    offset += 8;
  }

  // Parameter mappings based on reverse-engineering the reference file
  writeParam(1, 5);               // Audio input related (observed: 5)
  writeParam(2, midiChannel);     // MIDI Channel
  writeParam(3, 0);               // Unknown (always 0)
  writeParam(4, 1);               // Auto-compensate latency (1 = on)
  writeParam(5, 32);              // Audio input volume related (observed: 32 for +8dB)
  writeParam(6, 0);               // Unknown
  writeParam(7, 0);               // Unknown
  writeParam(8, 1);               // Send program change (1 = on)
  writeParam(9, 0);               // Unknown
  writeParam(10, 0);              // Unknown
  writeParam(11, 1);              // Unknown
  writeParam(12, program + 1);    // Program Change (Logic stores as 1-indexed!)
  writeParam(13, bankLSB + 1);    // Bank LSB (Logic stores as 1-indexed)
  writeParam(14, bankMSB + 1);    // Bank MSB (Logic stores as 1-indexed)

  // --- Additional Data Section ---

  // Value at 0x110 (purpose unclear, observed as 100)
  buffer.writeUInt32LE(100, 0x110);

  // Mystery bytes at 0x114 (observed pattern)
  buffer.writeUInt8(0x97, 0x114);
  buffer.writeUInt8(0x21, 0x115);
  buffer.writeUInt8(0x0B, 0x116);
  buffer.writeUInt8(0xFF, 0x117);

  // Display name "Bluetooth" at 0x118
  buffer.write("Bluetooth", 0x118, 'ascii');

  // MIDI destination device name at 0x158
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
  // Combine category and name
  const fullName = `${name}`;

  // Remove or replace invalid filename characters
  const sanitized = fullName
    .replace(/[<>:"/\\|?*]/g, '-')  // Replace invalid chars with dash
    .replace(/\s+/g, ' ')            // Normalize whitespace
    .trim();

  return sanitized;
}

module.exports = {
  generatePST,
  generateFilename
};
