const test = require('node:test');
const assert = require('node:assert/strict');

const {
  BULK_SEND_DELAY_MS,
  sendPatchesSequentially
} = require('../src/renderer/scripts/renderer-midi');

test('sendPatchesSequentially sends entries in order with progress and waits between sends', async () => {
  const events = [];
  const waited = [];
  const patches = [
    { patch: { name: 'Warm Pad' }, channel: 1 },
    { patch: { name: 'Soft Piano' }, channel: 2 },
    { patch: { name: 'Bright Brass' }, channel: 3 }
  ];

  const result = await sendPatchesSequentially({
    patches,
    waitFor: async delayMs => {
      waited.push(delayMs);
    },
    onProgress(entry, index, total) {
      events.push(`progress:${index + 1}/${total}:${entry.patch.name}`);
    },
    onSuccess(entry) {
      events.push(`success:${entry.patch.name}`);
    },
    sendPatch: async entry => {
      events.push(`send:${entry.patch.name}`);
      return { success: true };
    }
  });

  assert.deepEqual(events, [
    'progress:1/3:Warm Pad',
    'send:Warm Pad',
    'success:Warm Pad',
    'progress:2/3:Soft Piano',
    'send:Soft Piano',
    'success:Soft Piano',
    'progress:3/3:Bright Brass',
    'send:Bright Brass',
    'success:Bright Brass'
  ]);
  assert.deepEqual(waited, [BULK_SEND_DELAY_MS, BULK_SEND_DELAY_MS]);
  assert.deepEqual(result, { success: true, total: 3 });
});

test('sendPatchesSequentially stops on the first failure and returns failure details', async () => {
  const sentNames = [];
  const waited = [];
  const patches = [
    { patch: { name: 'Warm Pad' }, channel: 1 },
    { patch: { name: 'Soft Piano' }, channel: 2 },
    { patch: { name: 'Bright Brass' }, channel: 3 }
  ];

  const result = await sendPatchesSequentially({
    patches,
    waitFor: async delayMs => {
      waited.push(delayMs);
    },
    sendPatch: async entry => {
      sentNames.push(entry.patch.name);
      if (entry.patch.name === 'Soft Piano') {
        return { success: false, error: 'Port disconnected' };
      }

      return { success: true };
    }
  });

  assert.deepEqual(sentNames, ['Warm Pad', 'Soft Piano']);
  assert.deepEqual(waited, [BULK_SEND_DELAY_MS]);
  assert.equal(result.success, false);
  assert.equal(result.error, 'Port disconnected');
  assert.equal(result.failedIndex, 1);
  assert.equal(result.failedEntry.patch.name, 'Soft Piano');
  assert.equal(result.total, 3);
});
