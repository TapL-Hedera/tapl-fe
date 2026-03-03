import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { TradingView } from "./TradingView";
import { HistoryView } from "./HistoryView";
import { WalletView } from "./WalletView";
import { LPView } from "./LPView";
import { CREProofView } from "./CREProofView";
import { Toaster } from "react-hot-toast";

function App() {
  return (
    <Router>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/" element={<TradingView />} />
        <Route path="/history" element={<HistoryView />} />
        <Route path="/wallet" element={<WalletView />} />
        <Route path="/lp" element={<LPView />} />
        <Route path="/cre-workflows" element={<CREProofView />} />
      </Routes>
    </Router>
  );
}

export default App;
