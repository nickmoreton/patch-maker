const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildMidiDeviceMenuMarkup
} = require('../src/renderer/scripts/renderer-view');

test('buildMidiDeviceMenuMarkup escapes MIDI port metadata and status messages', () => {
  const rawPortId = 'usb"1<main>';
  const rawPortName = '<Synth "Main"> & Layer';
  const rawMessage = 'Port <offline> "retry"';

  const markup = buildMidiDeviceMenuMarkup({
    midiPorts: [
      { id: rawPortId, name: rawPortName }
    ],
    selectedMidiPortId: rawPortId,
    midiConnected: true,
    message: rawMessage
  });

  assert.equal(markup.includes(rawPortId), false);
  assert.equal(markup.includes(rawPortName), false);
  assert.equal(markup.includes(rawMessage), false);
  assert.match(markup, /data-port-id="usb&quot;1&lt;main&gt;"/);
  assert.match(markup, /&lt;Synth &quot;Main&quot;&gt; &amp; Layer/);
  assert.match(markup, /Port &lt;offline&gt; &quot;retry&quot;/);
});
