import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SessionState {
  currentPlayerId: string | null;
  currentPlayerName: string | null;
  setPlayer: (id: string, name: string) => void;
  clearPlayer: () => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      currentPlayerId: null,
      currentPlayerName: null,
      setPlayer: (id, name) => set({ currentPlayerId: id, currentPlayerName: name }),
      clearPlayer: () => set({ currentPlayerId: null, currentPlayerName: null }),
    }),
    { name: "casino-royale-session" },
  ),
);
