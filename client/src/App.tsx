// =============================================================================
// CARROM TOURNAMENT — App Root
// Design: Dark Luxury Sports (IPL Trophy Night)
// =============================================================================

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "./contexts/ThemeContext";
import { TournamentProvider, useTournament } from "./contexts/TournamentContext";
import ErrorBoundary from "./components/ErrorBoundary";
import SetupPage from "./pages/SetupPage";
import LeaguePage from "./pages/LeaguePage";
import TiebreakerPage from "./pages/TiebreakerPage";
import KnockoutPage from "./pages/KnockoutPage";
import PlayerEditPage from "./pages/PlayerEditPage";
import DisplayBoardPage from "./pages/DisplayBoardPage";
import { RotateCcw } from "lucide-react";
import { motion } from "framer-motion";
import { Router, Route, Switch } from "wouter";

function TournamentRouter() {
  const { state, reset } = useTournament();

  return (
    <div className="relative">
      {/* Reset button — always visible once tournament started */}
      {state.stage !== "setup" && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => {
            if (window.confirm("Reset the tournament? All progress will be lost.")) {
              reset();
            }
          }}
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 hover:scale-105"
          style={{
            background: "rgba(28,28,28,0.9)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "rgba(239,239,239,0.5)",
            backdropFilter: "blur(12px)",
          }}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          New Tournament
        </motion.button>
      )}

      {/* Stage-based routing */}
      {state.stage === "setup" && <SetupPage />}
      {state.stage === "league" && <LeaguePage />}
      {state.stage === "tiebreaker" && <TiebreakerPage />}
      {(state.stage === "knockout" || state.stage === "complete") && <KnockoutPage />}
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TournamentProvider>
          <TooltipProvider>
            <Toaster />
            <Router>
              <Switch>
                <Route path="/display" component={DisplayBoardPage} />
                <Route path="/players" component={PlayerEditPage} />
                <Route component={TournamentRouter} />
              </Switch>
            </Router>
          </TooltipProvider>
        </TournamentProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
