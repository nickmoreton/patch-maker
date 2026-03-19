const test = require('node:test');
const assert = require('node:assert/strict');

const {
  attachRendererPatches
} = require('../src/renderer/scripts/renderer-patches');

function createModalState() {
  return {
    isOpen: false,
    mode: null,
    title: '',
    message: '',
    confirmLabel: 'Confirm',
    cancelLabel: 'Cancel',
    inputLabel: 'Favourite name',
    inputValue: '',
    error: '',
    showInput: false,
    showFavourites: false,
    hideConfirm: false,
    targetName: '',
    returnMode: null
  };
}

function createTestApp() {
  const renderCalls = [];
  const patches = [
    { id: 1, category: 'Piano', name: 'Grand', msb: 0, lsb: 0, pc: 1 },
    { id: 2, category: 'Strings', name: 'Warm Pad', msb: 1, lsb: 2, pc: 3 }
  ];
  const state = {
    patches,
    selectedPatchIds: [1],
    expandedSelectedPatchIds: [],
    selectedPatchChannelsById: { '1': 1 },
    savedFavouriteLists: [
      {
        name: 'Set A',
        patches: [
          { category: 'Strings', name: 'Warm Pad', msb: 1, lsb: 2, pc: 3, channel: 4 }
        ]
      }
    ],
    modal: createModalState(),
    bulkSendInProgress: true
  };

  const app = {
    state,
    elements: {
      lastSent: { textContent: '' },
      appModalInput: null,
      appModalFavourites: null,
      appModalConfirmButton: null,
      appModalCancelButton: null
    },
    selectors: {
      isPatchSelected: patchId => state.selectedPatchIds.includes(patchId),
      getSelectedPatchChannel: patchId => state.selectedPatchChannelsById[String(patchId)] || null,
      getSelectedPatches: () => state.selectedPatchIds
        .map(patchId => state.patches.find(patch => patch.id === patchId))
        .filter(Boolean),
      getNextAvailableMidiChannel: () => {
        const usedChannels = Object.values(state.selectedPatchChannelsById);

        for (let channel = 1; channel <= 16; channel += 1) {
          if (!usedChannels.includes(channel)) {
            return channel;
          }
        }

        return null;
      },
      getUsedMidiChannels: excludedPatchId => new Set(
        state.selectedPatchIds
          .filter(patchId => patchId !== excludedPatchId)
          .map(patchId => state.selectedPatchChannelsById[String(patchId)])
          .filter(Number.isInteger)
      ),
      sortFavouriteLists: lists => [...lists],
      buildPatchIdentity: patch => [
        patch.category,
        patch.name,
        patch.msb,
        patch.lsb,
        patch.pc
      ].join('||')
    },
    selection: {
      toggleSelectedPatchIds: patchId => state.selectedPatchIds.includes(patchId)
        ? state.selectedPatchIds.filter(selectedPatchId => selectedPatchId !== patchId)
        : [...state.selectedPatchIds, patchId],
      collapseRemovedSelectedPatch: patchId => state.expandedSelectedPatchIds
        .filter(expandedPatchId => expandedPatchId !== patchId),
      toggleSelectedPatchExpanded: patchId => state.expandedSelectedPatchIds.includes(patchId)
        ? state.expandedSelectedPatchIds.filter(expandedPatchId => expandedPatchId !== patchId)
        : [...state.expandedSelectedPatchIds, patchId]
    },
    view: {
      renderPatches: () => renderCalls.push('renderPatches'),
      renderSelectedPatches: () => renderCalls.push('renderSelectedPatches'),
      renderAppModal: () => renderCalls.push('renderAppModal')
    }
  };

  attachRendererPatches({
    GenosApp: app,
    requestAnimationFrame: callback => callback()
  });

  return { app, state, patches, renderCalls };
}

test('renderer patch mutations are ignored during bulk send and resume afterward', () => {
  const { app, state, patches, renderCalls } = createTestApp();

  app.patches.togglePatchSelection(patches[1]);
  app.patches.updateSelectedPatchChannel(1, 7);
  app.patches.removeSelectedPatch(1);
  app.patches.openBrowseFavouritesModal();
  app.patches.loadFavouriteList('Set A');

  assert.deepEqual(state.selectedPatchIds, [1]);
  assert.deepEqual(state.selectedPatchChannelsById, { '1': 1 });
  assert.equal(state.modal.isOpen, false);
  assert.deepEqual(renderCalls, []);

  state.bulkSendInProgress = false;

  app.patches.updateSelectedPatchChannel(1, 7);
  assert.equal(state.selectedPatchChannelsById['1'], 7);

  app.patches.togglePatchSelection(patches[1]);
  assert.deepEqual(state.selectedPatchIds, [1, 2]);

  app.patches.removeSelectedPatch(1);
  assert.deepEqual(state.selectedPatchIds, [2]);

  app.patches.openBrowseFavouritesModal();
  assert.equal(state.modal.isOpen, true);
  assert.equal(state.modal.mode, 'browse-favourites');

  state.modal = createModalState();
  app.patches.loadFavouriteList('Set A');
  assert.deepEqual(state.selectedPatchIds, [2]);
  assert.equal(state.selectedPatchChannelsById['2'], 4);
  assert.ok(renderCalls.includes('renderPatches'));
  assert.ok(renderCalls.includes('renderSelectedPatches'));
  assert.ok(renderCalls.includes('renderAppModal'));
});
