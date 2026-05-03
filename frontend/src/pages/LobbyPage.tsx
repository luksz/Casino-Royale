import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useSessionStore } from "@/store/sessionStore";
import { usePlayerBalance } from "@/hooks/usePlayer";

const GAMES = [
  { id: "blackjack", name: "Blackjack",    description: "Beat the dealer. 3:2 on naturals.",     path: "/games/blackjack", icon: "🃏" },
  { id: "roulette",  name: "Roulette",     description: "European wheel. 37 numbers, all bets.", path: "/games/roulette",  icon: "🎡" },
  { id: "baccarat",  name: "Baccarat",     description: "Punto Banco. Bet Player, Banker, Tie.", path: "/games/baccarat",  icon: "🎴" },
  { id: "slots",     name: "Slots",        description: "3 reels. Match symbols to win big.",    path: "/games/slots",     icon: "🎰" },
  { id: "war",       name: "Casino War",   description: "Higher card wins. Ties go to war!",     path: "/games/war",       icon: "⚔️" },
  { id: "poker",     name: "Five Card Draw", description: "vs the bot. Discard and draw.",       path: "/games/poker",     icon: "♠️" },
];

export default function LobbyPage() {
  const { currentPlayerId, currentPlayerName, clearPlayer } = useSessionStore();
  const navigate = useNavigate();
  const { data: balanceData } = usePlayerBalance(currentPlayerId);

  if (!currentPlayerId) { navigate("/"); return null; }

  return (
    <div className="min-h-screen px-4 py-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-10">
        <h1 className="font-display text-3xl text-gold-400 tracking-wide">Casino Royale</h1>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-ivory/30 text-xs">Balance</p>
            <p className="text-gold-400 font-semibold text-lg tabular-nums">
              {balanceData ? balanceData.balance.toLocaleString() : "—"} chips
            </p>
          </div>
          <div className="text-right">
            <p className="text-ivory/30 text-xs">Player</p>
            <p className="text-ivory font-medium">{currentPlayerName}</p>
          </div>
          <button onClick={() => { clearPlayer(); navigate("/"); }} className="btn-ghost text-sm py-2 px-4">Leave</button>
        </div>
      </div>

      <p className="text-ivory/30 uppercase text-xs tracking-widest mb-6">Choose your game</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {GAMES.map((game, i) => (
          <motion.div key={game.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
            <Link to={game.path} className="block card-surface p-5 hover:border-royal-500/50 transition-all duration-200 group hover:bg-navy-700/40 h-full">
              <div className="flex items-start gap-3">
                <span className="text-3xl">{game.icon}</span>
                <div className="flex-1">
                  <h3 className="font-display text-lg text-gold-400 group-hover:text-gold-300 transition-colors leading-tight">{game.name}</h3>
                  <p className="text-ivory/40 text-xs mt-1">{game.description}</p>
                </div>
              </div>
              <div className="mt-4">
                <span className="inline-block bg-royal-600/80 group-hover:bg-royal-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
                  Play Now
                </span>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
