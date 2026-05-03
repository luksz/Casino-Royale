import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiPost } from "@/lib/api";
import type { PlayerAction, RoundStateResponse } from "@/types/api";

export function useBlackjack(playerId: string) {
  const [roundId, setRoundId] = useState<string | null>(null);
  const [state, setState] = useState<RoundStateResponse | null>(null);
  const queryClient = useQueryClient();

  const startRound = useMutation({
    mutationFn: (bet: number) =>
      apiPost<RoundStateResponse>("/blackjack/rounds", { player_id: playerId, bet }),
    onSuccess: (data) => {
      setRoundId(data.round_id);
      setState(data);
      queryClient.invalidateQueries({ queryKey: ["balance", playerId] });
    },
  });

  const sendAction = useMutation({
    mutationFn: (action: PlayerAction) =>
      apiPost<RoundStateResponse>(`/blackjack/rounds/${roundId}/action`, { action }),
    onSuccess: (data) => {
      setState(data);
      queryClient.invalidateQueries({ queryKey: ["balance", playerId] });
    },
  });

  return {
    roundId,
    state,
    startRound,
    sendAction,
    isLoading: startRound.isPending || sendAction.isPending,
  };
}
