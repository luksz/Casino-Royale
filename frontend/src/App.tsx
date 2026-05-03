import { Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "@/pages/LandingPage";
import LobbyPage from "@/pages/LobbyPage";
import BlackjackTablePage from "@/games/blackjack/BlackjackTablePage";
import RoulettePage from "@/games/roulette/RoulettePage";
import BaccaratPage from "@/games/baccarat/BaccaratPage";
import SlotsPage from "@/games/slots/SlotsPage";
import WarPage from "@/games/war/WarPage";
import PokerPage from "@/games/poker/PokerPage";
import DicePage from "@/games/dice/DicePage";
import HiLoPage from "@/games/hilo/HiLoPage";
import KenoPage from "@/games/keno/KenoPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/lobby" element={<LobbyPage />} />
      <Route path="/games/blackjack" element={<BlackjackTablePage />} />
      <Route path="/games/roulette"  element={<RoulettePage />} />
      <Route path="/games/baccarat"  element={<BaccaratPage />} />
      <Route path="/games/slots"     element={<SlotsPage />} />
      <Route path="/games/war"       element={<WarPage />} />
      <Route path="/games/poker"     element={<PokerPage />} />
      <Route path="/games/dice"      element={<DicePage />} />
      <Route path="/games/hilo"      element={<HiLoPage />} />
      <Route path="/games/keno"      element={<KenoPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
