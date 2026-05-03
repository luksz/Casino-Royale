import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useCreatePlayer } from "@/hooks/usePlayer";
import { useSessionStore } from "@/store/sessionStore";
import { ApiError } from "@/lib/api";

export default function LandingPage() {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const setPlayer = useSessionStore((s) => s.setPlayer);
  const { mutateAsync, isPending } = useCreatePlayer();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const player = await mutateAsync(name.trim());
      setPlayer(player.id, player.display_name);
      navigate("/lobby");
    } catch (err) {
      if (err instanceof ApiError) setError(err.detail);
      else setError("Cannot reach the backend. Is it running on port 8001?");
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      {/* Subtle animated glow */}
      <div className="pointer-events-none fixed inset-0 flex items-center justify-center">
        <motion.div
          animate={{ scale: [1, 1.08, 1], opacity: [0.12, 0.18, 0.12] }}
          transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
          className="w-[600px] h-[600px] rounded-full bg-royal-700 blur-[120px]"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="text-center mb-12 relative z-10"
      >
        <h1 className="font-display text-6xl md:text-8xl font-black text-gold-400 tracking-tight drop-shadow-2xl">
          Casino Royale
        </h1>
        <p className="mt-4 text-ivory/40 text-lg tracking-wide">Your exclusive private table awaits.</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="card-surface p-8 w-full max-w-sm relative z-10"
      >
        <h2 className="font-display text-2xl text-gold-400 mb-6 text-center">Create Profile</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-white/60 text-sm mb-1">Display Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. James Bond"
              className="w-full bg-[#0b1530] border border-[#2563eb44] rounded-lg px-4 py-3
                         text-white placeholder-white/25 focus:outline-none focus:border-[#60a5fa]
                         transition-colors"
              required
              minLength={1}
              maxLength={32}
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={isPending || !name.trim()}>
            {isPending ? "Entering casino…" : "Enter the Casino"}
          </button>
        </form>
      </motion.div>

      <p className="mt-8 text-ivory/20 text-xs relative z-10">Starting balance: 10,000 chips · No real money</p>
    </div>
  );
}
