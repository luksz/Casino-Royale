import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface RoundRecord {
  game: string;
  netDelta: number;
  ts: number;
}

interface SessionState {
  currentPlayerId: string | null;
  currentPlayerName: string | null;
  history: RoundRecord[];
  setPlayer: (id: string, name: string) => void;
  clearPlayer: () => void;
  recordRound: (game: string, netDelta: number) => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      currentPlayerId: null,
      currentPlayerName: null,
      history: [],
      setPlayer: (id, name) => set({ currentPlayerId: id, currentPlayerName: name }),
      clearPlayer: () => set({ currentPlayerId: null, currentPlayerName: null, history: [] }),
      recordRound: (game, netDelta) =>
        set((s) => ({
          history: [{ game, netDelta, ts: Date.now() }, ...s.history].slice(0, 20),
        })),
    }),
    {
      name: "casino-royale-session",
      partialize: (s) => ({ currentPlayerId: s.currentPlayerId, currentPlayerName: s.currentPlayerName }),
    },
  ),
);
