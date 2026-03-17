const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildPatchCollection,
  getVisibleCategories,
  getVisiblePatches,
  getSelectedMidiPort,
  areAllVisiblePatchesSelected,
  togglePatchSelectionList,
  toggleVisiblePatchSelection
} = require('../renderer-state');

function createState(overrides = {}) {
  return {
    patches: [],
    categories: [],
    selectedCategory: null,
    selectedPatch: null,
    selectedPatches: [],
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

test('getSelectedMidiPort and areAllVisiblePatchesSelected derive state correctly', () => {
  const patches = [
    { id: 0, name: 'Warm Pad', category: 'Pad' },
    { id: 1, name: 'Soft Piano', category: 'Piano' }
  ];
  const state = createState({
    patches,
    midiPorts: [
      { id: '1', name: 'Genos Port' },
      { id: '2', name: 'Other Port' }
    ],
    selectedMidiPortId: '1',
    selectedPatches: patches.slice()
  });

  assert.deepEqual(getSelectedMidiPort(state), { id: '1', name: 'Genos Port' });
  assert.equal(areAllVisiblePatchesSelected(state), true);
});

test('selection helpers toggle single patches and visible patch sets', () => {
  const patchA = { id: 0, name: 'Warm Pad', category: 'Pad' };
  const patchB = { id: 1, name: 'Bright Pad', category: 'Pad' };
  const patchC = { id: 2, name: 'Soft Piano', category: 'Piano' };

  let selectedPatches = togglePatchSelectionList([], patchA);
  selectedPatches = togglePatchSelectionList(selectedPatches, patchB);
  assert.deepEqual(selectedPatches.map(patch => patch.id), [0, 1]);

  selectedPatches = togglePatchSelectionList(selectedPatches, patchA);
  assert.deepEqual(selectedPatches.map(patch => patch.id), [1]);

  selectedPatches = toggleVisiblePatchSelection(selectedPatches, [patchA, patchB, patchC]);
  assert.deepEqual(selectedPatches.map(patch => patch.id), [1, 0, 2]);

  selectedPatches = toggleVisiblePatchSelection(selectedPatches, [patchA, patchB, patchC]);
  assert.deepEqual(selectedPatches, []);
});
