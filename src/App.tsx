import {
  BrowserRouter as Router,
  Route,
  Routes,
} from "react-router-dom";
import { TradingView } from "./TradingView";
import { HistoryView } from "./HistoryView";
import { WalletView } from "./WalletView";
import { IntroView } from "./IntroView";
import { Toaster } from "react-hot-toast";

import { Layout } from "./Layout";
import { HcsAnchorView } from "./HcsAnchorView";
import { LPView } from "./LPView";

function App() {
  return (
    <Router>
      <Toaster position="top-right" />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<IntroView />} />
          <Route path="/trade" element={<TradingView />} />
          <Route path="/history" element={<HistoryView />} />
          <Route path="/wallet" element={<WalletView />} />
          <Route path="/hcs-anchor" element={<HcsAnchorView />} />
          <Route path="/lp" element={<LPView />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
