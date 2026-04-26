import { create } from 'zustand';

export const useUIStore = create((set) => ({
  bountyFilters: {
    severities: [],
    visibility: 'all',
    minReward: 0,
    maxReward: 100,
  },
  reportWizardStep: 1,
  updateBountyFilters: (updater) =>
    set((state) => ({
      bountyFilters: typeof updater === 'function' ? updater(state.bountyFilters) : updater,
    })),
  resetBountyFilters: () =>
    set({
      bountyFilters: {
        severities: [],
        visibility: 'all',
        minReward: 0,
        maxReward: 100,
      },
    }),
  setReportWizardStep: (step) => set({ reportWizardStep: step }),
}));
