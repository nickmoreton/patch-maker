const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildPatchCollection,
  getVisibleCategories,
  getVisiblePatches,
  getSelectedMidiPort,
  getSelectedPatches,
  isPatchSelected,
  toggleSelectedPatchIds,
  isSelectedPatchExpanded,
  toggleSelectedPatchExpanded,
  collapseRemovedSelectedPatch
} = require('../src/renderer/scripts/renderer-state');

function createState(overrides = {}) {
  return {
    patches: [],
    categories: [],
    selectedCategory: null,
    selectedPatchIds: [],
    expandedSelectedPatchIds: [],
    midiPorts: [],
    selectedMidiPortId: '',
    categorySearchTerm: '',
    patchSearchTerm: '',
    ...overrides
  };
}

test('buildPatchCollection adds ids and sorted categories', () => {
  const collection = buildPatchCollection([
    { name: 'Warm Pad', category: 'Pad' },
    { name: 'Soft Piano', category: 'Piano' },
    { name: 'Bright Pad', category: 'Pad' }
  ]);

  assert.deepEqual(
    collection.patches.map(patch => patch.id),
    [0, 1, 2]
  );
  assert.deepEqual(collection.categories, ['Pad', 'Piano']);
});

test('getVisibleCategories and getVisiblePatches apply current filters', () => {
  const patches = [
    { id: 0, name: 'Warm Pad', category: 'Pad', pc: 1, lsb: 2, msb: 3 },
    { id: 1, name: 'Soft Piano', category: 'Piano', pc: 4, lsb: 5, msb: 6 },
    { id: 2, name: 'Bright Pad', category: 'Pad', pc: 7, lsb: 8, msb: 9 }
  ];
  const state = createState({
    patches,
    categories: ['Pad', 'Piano'],
    categorySearchTerm: 'pa',
    patchSearchTerm: 'bright',
    selectedCategory: 'Pad'
  });

  assert.deepEqual(getVisibleCategories(state), ['Pad']);
  assert.deepEqual(
    getVisiblePatches(state).map(patch => patch.name),
    ['Bright Pad']
  );
});

test('getSelectedMidiPort derives state correctly', () => {
  const state = createState({
    midiPorts: [
      { id: '1', name: 'Genos Port' },
      { id: '2', name: 'Other Port' }
    ],
    selectedMidiPortId: '1'
  });

  assert.deepEqual(getSelectedMidiPort(state), { id: '1', name: 'Genos Port' });
});

test('toggleSelectedPatchIds adds and removes patch ids uniquely', () => {
  const state = createState({
    selectedPatchIds: [1, 3]
  });

  assert.deepEqual(toggleSelectedPatchIds(state, 5), [1, 3, 5]);
  assert.deepEqual(toggleSelectedPatchIds(state, 3), [1]);
});

test('getSelectedPatches returns selected patches in selection order', () => {
  const patches = [
    { id: 0, name: 'Warm Pad', category: 'Pad', pc: 1, lsb: 2, msb: 3 },
    { id: 1, name: 'Soft Piano', category: 'Piano', pc: 4, lsb: 5, msb: 6 },
    { id: 2, name: 'Bright Pad', category: 'Pad', pc: 7, lsb: 8, msb: 9 }
  ];
  const state = createState({
    patches,
    selectedPatchIds: [2, 0, 99]
  });

  assert.deepEqual(
    getSelectedPatches(state).map(patch => patch.name),
    ['Bright Pad', 'Warm Pad']
  );
});

test('isPatchSelected and visible patches remain independent', () => {
  const patches = [
    { id: 0, name: 'Warm Pad', category: 'Pad', pc: 1, lsb: 2, msb: 3 },
    { id: 1, name: 'Soft Piano', category: 'Piano', pc: 4, lsb: 5, msb: 6 },
    { id: 2, name: 'Bright Pad', category: 'Pad', pc: 7, lsb: 8, msb: 9 }
  ];
  const state = createState({
    patches,
    categories: ['Pad', 'Piano'],
    selectedPatchIds: [1, 2],
    selectedCategory: 'Pad',
    patchSearchTerm: 'warm'
  });

  assert.equal(isPatchSelected(state, 1), true);
  assert.equal(isPatchSelected(state, 0), false);
  assert.deepEqual(
    getVisiblePatches(state).map(patch => patch.name),
    ['Warm Pad']
  );
  assert.deepEqual(
    getSelectedPatches(state).map(patch => patch.name),
    ['Soft Piano', 'Bright Pad']
  );
});

test('toggleSelectedPatchExpanded adds and removes expanded ids uniquely', () => {
  const state = createState({
    expandedSelectedPatchIds: [1, 3]
  });

  assert.deepEqual(toggleSelectedPatchExpanded(state, 5), [1, 3, 5]);
  assert.deepEqual(toggleSelectedPatchExpanded(state, 3), [1]);
});

test('collapseRemovedSelectedPatch clears removed ids from expanded state only', () => {
  const state = createState({
    selectedPatchIds: [2, 4],
    expandedSelectedPatchIds: [1, 2, 5]
  });

  assert.deepEqual(collapseRemovedSelectedPatch(state, 2), [1, 5]);
  assert.deepEqual(state.selectedPatchIds, [2, 4]);
});

test('expanded state does not affect selected patch ordering or selection membership', () => {
  const patches = [
    { id: 0, name: 'Warm Pad', category: 'Pad', pc: 1, lsb: 2, msb: 3 },
    { id: 1, name: 'Soft Piano', category: 'Piano', pc: 4, lsb: 5, msb: 6 },
    { id: 2, name: 'Bright Pad', category: 'Pad', pc: 7, lsb: 8, msb: 9 }
  ];
  const state = createState({
    patches,
    selectedPatchIds: [2, 0],
    expandedSelectedPatchIds: [0]
  });

  assert.equal(isSelectedPatchExpanded(state, 0), true);
  assert.equal(isSelectedPatchExpanded(state, 2), false);
  assert.deepEqual(
    getSelectedPatches(state).map(patch => patch.name),
    ['Bright Pad', 'Warm Pad']
  );
  assert.equal(isPatchSelected(state, 2), true);
});
