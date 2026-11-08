'use client';

import { useCallback, useMemo } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { OptionGroup } from '@/lib/catalog/types';
import type { DesignItem, StudioKind } from '@/lib/custom/types';
import { defaultOptions, normalizeOptions } from '@/lib/pricing/engine';

/**
 * Work in progress in the custom studio: chosen options, uploaded images,
 * captions and crops. Saved in this browser so a refresh doesn't lose 50
 * uploaded photos; the images are cleared once the design is in the cart.
 */
export interface StudioDraft {
  options: Record<string, string>;
  items: DesignItem[];
  note: string;
  qty: number;
}

interface StudioState {
  drafts: Partial<Record<StudioKind, StudioDraft>>;
  update: (kind: StudioKind, fn: (current: StudioDraft | undefined) => StudioDraft) => void;
}

export const useStudioDrafts = create<StudioState>()(
  persist(
    (set) => ({
      drafts: {},
      update: (kind, fn) => set((s) => ({ drafts: { ...s.drafts, [kind]: fn(s.drafts[kind]) } })),
    }),
    {
      name: 'pyv-studio',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ drafts: s.drafts }),
      skipHydration: true,
    },
  ),
);

function normalizeDraft(d: StudioDraft | undefined, groups: OptionGroup[], base: StudioDraft): StudioDraft {
  if (!d) return base;
  const options = normalizeOptions(groups, { ...base.options, ...d.options }) ?? base.options;
  const qty = Number.isInteger(d.qty) && d.qty >= 1 ? d.qty : 1;
  return { options, items: Array.isArray(d.items) ? d.items : [], note: typeof d.note === 'string' ? d.note : '', qty };
}

/**
 * The saved draft for one studio (or a fresh one), with options checked
 * against the current option lists. Updates always start from the latest
 * saved state, so quick successive updates (several uploads finishing) all land.
 */
export function useStudioDraft(kind: StudioKind, groups: OptionGroup[]) {
  const stored = useStudioDrafts((s) => s.drafts[kind]);
  const update = useStudioDrafts((s) => s.update);
  const base = useMemo<StudioDraft>(() => ({ options: defaultOptions(groups), items: [], note: '', qty: 1 }), [groups]);
  const draft = useMemo(() => normalizeDraft(stored, groups, base), [stored, groups, base]);
  const setDraft = useCallback((fn: (d: StudioDraft) => StudioDraft) => update(kind, (cur) => fn(normalizeDraft(cur, groups, base))), [update, kind, groups, base]);
  return [draft, setDraft] as const;
}
