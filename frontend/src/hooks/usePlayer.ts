import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/lib/api";
import type { BalanceResponse, Player } from "@/types/api";

export function useCreatePlayer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (display_name: string) =>
      apiPost<Player>("/players", { display_name }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["players"] }),
  });
}

export function usePlayer(playerId: string | null) {
  return useQuery({
    queryKey: ["player", playerId],
    queryFn: () => apiGet<Player>(`/players/${playerId}`),
    enabled: !!playerId,
  });
}

export function usePlayerBalance(playerId: string | null) {
  return useQuery({
    queryKey: ["balance", playerId],
    queryFn: () => apiGet<BalanceResponse>(`/players/${playerId}/balance`),
    enabled: !!playerId,
    refetchInterval: 5000,
  });
}
