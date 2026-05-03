import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useSessionStore } from "@/store/sessionStore";
import { usePlayerBalance } from "@/hooks/usePlayer";

const CASINO_GAMES = [
  { id: "blackjack", name: "Blackjack",      description: "Beat the dealer. 3:2 on naturals. Side bets available.", path: "/games/blackjack", icon: "🃏" },
  { id: "roulette",  name: "Roulette",        description: "European wheel. 37 numbers, all bets.",                   path: "/games/roulette",  icon: "🎡" },
  { id: "baccarat",  name: "Baccarat",        description: "Punto Banco. Player · Banker · Tie.",                     path: "/games/baccarat",  icon: "🎴" },
  { id: "war",       name: "Casino War",      description: "Higher card wins. Ties go to War!",                       path: "/games/war",       icon: "⚔️" },
  { id: "poker",     name: "Five Card Draw",  description: "vs the bot. Discard and draw.",                           path: "/games/poker",     icon: "♠️" },
];

const QUICK_GAMES = [
  { id: "slots", name: "Slots",  description: "3 reels. Match symbols to win big.",          path: "/games/slots", icon: "🎰" },
  { id: "dice",  name: "Dice",   description: "Roll two dice. High, Low, Seven or Double.",  path: "/games/dice",  icon: "🎲" },
  { id: "hilo",  name: "Hi-Lo",  description: "Higher or lower? Build your multiplier.",     path: "/games/hilo",  icon: "🃏" },
  { id: "keno",  name: "Keno",   description: "Pick up to 10 numbers. 20 drawn from 80.",    path: "/games/keno",  icon: "🔢" },
];

function GameCard({ game, delay }: { game: typeof CASINO_GAMES[0]; delay: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
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
  );
}

export default function LobbyPage() {
  const { currentPlayerId, currentPlayerName, clearPlayer, history } = useSessionStore();
  const navigate = useNavigate();
  const { data: balanceData } = usePlayerBalance(currentPlayerId);

  if (!currentPlayerId) { navigate("/"); return null; }

  const balance = balanceData?.balance ?? 0;
  const sessionNet = history.reduce((s, r) => s + r.netDelta, 0);
  const sessionRounds = history.length;
  const biggestWin = history.length > 0 ? Math.max(...history.map(r => r.netDelta)) : 0;

  return (
    <div className="min-h-screen px-4 py-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-3xl text-gold-400 tracking-wide">Casino Royale</h1>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-ivory/30 text-xs">Balance</p>
            <p className="text-gold-400 font-semibold text-lg tabular-nums">{balance.toLocaleString()} chips</p>
          </div>
          <div className="text-right">
            <p className="text-ivory/30 text-xs">Player</p>
            <p className="text-ivory font-medium">{currentPlayerName}</p>
          </div>
          <button onClick={() => { clearPlayer(); navigate("/"); }} className="btn-ghost text-sm py-2 px-4">
            Leave
          </button>
        </div>
      </div>

      {/* Session stats */}
      {sessionRounds > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-surface p-4 mb-6 w-full"
        >
          <p className="text-ivory/30 text-xs uppercase tracking-widest mb-3">This session</p>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-ivory/40 text-xs">Rounds</p>
              <p className="text-ivory font-bold text-xl tabular-nums">{sessionRounds}</p>
            </div>
            <div className="text-center">
              <p className="text-ivory/40 text-xs">Net</p>
              <p className={`font-bold text-xl tabular-nums ${sessionNet > 0 ? "text-green-400" : sessionNet < 0 ? "text-red-400" : "text-ivory"}`}>
                {sessionNet > 0 ? "+" : ""}{sessionNet.toLocaleString()}
              </p>
            </div>
            <div className="text-center">
              <p className="text-ivory/40 text-xs">Best win</p>
              <p className={`font-bold text-xl tabular-nums ${biggestWin > 0 ? "text-gold-400" : "text-ivory/40"}`}>
                {biggestWin > 0 ? `+${biggestWin.toLocaleString()}` : "—"}
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {history.slice(0, 10).map((r, i) => (
              <span key={i} className={`text-xs px-2 py-0.5 rounded-full border font-semibold tabular-nums ${
                r.netDelta > 0 ? "border-green-500/40 bg-green-500/10 text-green-400"
                : r.netDelta < 0 ? "border-red-500/40 bg-red-500/10 text-red-400"
                : "border-navy-600 text-ivory/40"
              }`}>
                {r.game} {r.netDelta > 0 ? "+" : ""}{r.netDelta}
              </span>
            ))}
          </div>
        </motion.div>
      )}

      {/* Casino Games */}
      <p className="text-ivory/30 uppercase text-xs tracking-widest mb-4">Casino Games</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {CASINO_GAMES.map((game, i) => <GameCard key={game.id} game={game} delay={i * 0.06} />)}
      </div>

      {/* Quick Games */}
      <p className="text-ivory/30 uppercase text-xs tracking-widest mb-4">Games</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {QUICK_GAMES.map((game, i) => <GameCard key={game.id} game={game} delay={0.3 + i * 0.06} />)}
      </div>
    </div>
  );
}
