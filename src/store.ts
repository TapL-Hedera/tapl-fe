import { create } from "zustand";
import toast from "react-hot-toast";
import type { Socket } from "socket.io-client";
export interface PricePoint {
  time: number; // timestamp
  price: number;
}

export interface CellData {
  id: string;
  timeWindowStart: number;
  timeWindowEnd: number;
  priceLevel: number; // The price band (e.g. 50020, 50040)
  multiplier: number;
  status: "active" | "past" | "hit";
  original: RemoteCell;
}

export interface RemoteCell {
  gridTs: number;
  startTs: number;
  endTs: number;
  lowerPrice: string;
  upperPrice: string;
  rewardRate: string;
  gridSignature: string;
}

interface GameState {
  balance: number;
  currentPrice: number;
  history: PricePoint[];
  cells: CellData[];
  basePrice: number;
  nextSessionTime: number;
  modeIntervalSeconds: number;
  modePriceStep: number;
  bets: Record<string, number>;
  betRates: Record<string, number>;
  pendingBets: Record<string, number>;
  socket: Socket | null;
  wssKey: string | null;
  betAmount: number;
  isDemoMode: boolean;
  demoAddress: string | null;

  setConnection: (socket: Socket | null, wssKey: string | null) => void;
  updatePrice: (price: number) => void;
  placeBet: (cellId: string, amount: number) => void;
  ensureCells: () => void;
  tickTime: () => void;
  updateGrid: (newCells: RemoteCell[]) => void;
  updateBalance: (balance: number) => void;
  setBetAmount: (amount: number) => void;
  setDemoMode: (isDemoMode: boolean) => void;
  setDemoAddress: (address: string | null) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setOpenBets: (orders: any[]) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateOrder: (data: any) => void;
}

export const useGameStore = create<GameState>((set) => ({
  balance: 1000.0,
  currentPrice: 0,
  history: [], // Keep track of the line chart
  cells: [],
  basePrice: 0, // Anchor point for the grid
  nextSessionTime: Date.now() + 60000,
  modeIntervalSeconds: 5,
  modePriceStep: 25,
  bets: {},
  betRates: {},
  pendingBets: {},
  socket: null,
  wssKey: null,
  betAmount: 10,
  isDemoMode: localStorage.getItem("is-demo-mode") === "true",
  demoAddress: localStorage.getItem("demo-wallet-address") || null,

  setConnection: (socket, wssKey) => set({ socket, wssKey }),

  updateBalance: (balance) => set({ balance }),

  setBetAmount: (amount) => set({ betAmount: amount }),

  setDemoMode: (isDemoMode) => {
    localStorage.setItem("is-demo-mode", isDemoMode.toString());
    set({ isDemoMode });
  },

  setDemoAddress: (demoAddress) => {
    if (demoAddress) {
      localStorage.setItem("demo-wallet-address", demoAddress);
    } else {
      localStorage.removeItem("demo-wallet-address");
    }
    set({ demoAddress });
  },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setOpenBets: (orders: any[]) =>
    set((state) => {
      const newBets = { ...state.bets };
      const newBetRates = { ...state.betRates };
      for (const order of orders) {
        if (order.status === "OPEN") {
          const start =
            order.cellTimeStart || order.cell?.startTs || order.startTs;
          const end = order.cellTimeEnd || order.cell?.endTs || order.endTs;
          const lower = order.lowerPrice || order.cell?.lowerPrice;
          const upper = order.upperPrice || order.cell?.upperPrice;
          const cellId = `${start}:${end}:${lower}:${upper}`;
          newBets[cellId] = Number(order.amount) || 0;

          const rate = order.rewardRate || order.cell?.rewardRate;
          if (rate) {
            newBetRates[cellId] = parseFloat(rate);
          }
        }
      }
      return { bets: newBets, betRates: newBetRates };
    }),

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateOrder: (data: any) =>
    set((state) => {
      let newState = { ...state };

      const start = data.cellTimeStart || data.cell?.startTs || data.startTs;
      const end = data.cellTimeEnd || data.cell?.endTs || data.endTs;
      const lower = data.lowerPrice || data.cell?.lowerPrice;
      const upper = data.upperPrice || data.cell?.upperPrice;
      const cellId = `${start}:${end}:${lower}:${upper}`;

      if (data.status === "OPEN") {
        const newPendingBets = { ...newState.pendingBets };
        delete newPendingBets[cellId];

        const confirmedAmount =
          Number(data.amount) || newState.pendingBets[cellId] || 0;

        const newBetRates = { ...newState.betRates };
        const rewardRate = data.rewardRate || data.cell?.rewardRate;
        if (rewardRate) {
          newBetRates[cellId] = parseFloat(rewardRate);
        }

        newState = {
          ...newState,
          pendingBets: newPendingBets,
          bets: { ...newState.bets, [cellId]: confirmedAmount },
          betRates: newBetRates,
        };
      }

      const rewardRate = data.rewardRate || data.cell?.rewardRate;
      if (rewardRate) {
        newState = {
          ...newState,
          cells: newState.cells.map((c) =>
            c.id === cellId
              ? {
                  ...c,
                  multiplier: parseFloat(rewardRate),
                  original: { ...c.original, rewardRate },
                }
              : c,
          ),
        };
      }

      if (data.settledWin === true) {
        const cell = newState.cells.find((c) => c.id === cellId);

        if (cell && cell.status !== "hit") {
          const betAmount = newState.bets[cellId] || Number(data.amount) || 0;
          const win = betAmount * cell.multiplier;

          if (win > 0) {
            toast.success(`You won $${win.toFixed(2)}! 🚀`, {
              style: {
                background: "#252422",
                color: "#d57455",
                border: "1px solid rgba(213, 116, 85, 0.5)",
                boxShadow: "0 0 15px rgba(213, 116, 85, 0.3)",
              },
              iconTheme: {
                primary: "#d57455",
                secondary: "#252422",
              },
            });
          }

          newState = {
            ...newState,
            cells: newState.cells.map((c) =>
              c.id === cellId ? { ...c, status: "hit" as const } : c,
            ),
          };
        }
      }
      return newState;
    }),

  updatePrice: (price) =>
    set((state) => {
      const now = Date.now();
      // Keep history of last 120 seconds for smooth scrolling
      const newHistory = [...state.history, { time: now, price }].filter(
        (p) => now - p.time <= 120000,
      );

      return {
        currentPrice: price,
        history: newHistory,
      };
    }),

  placeBet: (cellId, amount) =>
    set((state) => {
      if (state.bets[cellId] || state.pendingBets[cellId]) {
        // Already bet on this cell
        return state;
      }
      if (state.balance >= amount) {
        return {
          balance: state.balance - amount,
          pendingBets: { ...state.pendingBets, [cellId]: amount },
        };
      }

      toast.error("Insufficient balance!", {
        style: {
          background: "#252422",
          color: "#d57455",
          border: "1px solid rgba(213, 116, 85, 0.5)",
        },
      });
      return state;
    }),

  ensureCells: () => {
    // No API for old chart data, wait for socket to populate history
  },

  updateGrid: (newCells) =>
    set((state) => {
      const now = Date.now();

      const remoteIds = new Set<string>();
      const combinedCells = [...state.cells];

      for (const remoteCell of newCells) {
        const id = `${remoteCell.startTs}:${remoteCell.endTs}:${remoteCell.lowerPrice}:${remoteCell.upperPrice}`;
        const timeWindowStart = remoteCell.startTs;
        const timeWindowEnd = remoteCell.endTs;
        const priceLevel =
          (parseFloat(remoteCell.lowerPrice) +
            parseFloat(remoteCell.upperPrice)) /
          2;

        const hasBet =
          (state.bets[id] && state.bets[id] > 0) ||
          (state.pendingBets[id] && state.pendingBets[id] > 0);
        const existingIdx = combinedCells.findIndex((c) => c.id === id);

        let finalMultiplier = parseFloat(remoteCell.rewardRate);
        if (hasBet) {
          if (state.betRates[id] !== undefined) {
            finalMultiplier = state.betRates[id];
          } else if (existingIdx !== -1) {
            finalMultiplier = combinedCells[existingIdx].multiplier;
          }
        }

        remoteIds.add(id);

        if (existingIdx === -1) {
          combinedCells.push({
            id,
            timeWindowStart,
            timeWindowEnd,
            priceLevel,
            multiplier: finalMultiplier,
            status: timeWindowEnd < now ? "past" : "active",
            original: remoteCell,
          });
        } else {
          // Update the multiplier rate since it fluctuates based on bets
          // If the user has bet on this cell, keep the original rate.
          combinedCells[existingIdx] = {
            ...combinedCells[existingIdx],
            multiplier: finalMultiplier,
            priceLevel, // Ensure price bounds sync
            original: remoteCell,
          };
        }
      }

      // Filter out cells that are obsolete (older than 60s)
      // And remove any active future cell that the server no longer broadcasted
      const finalCells = combinedCells.filter((c) => {
        if (
          c.status === "active" &&
          c.timeWindowStart > now &&
          !remoteIds.has(c.id)
        ) {
          return false; // Safely discard missing future predictions
        }
        return c.timeWindowEnd > now - 60000;
      });

      return { cells: finalCells };
    }),

  tickTime: () =>
    set((state) => {
      const now = Date.now();
      const cutoff = now - 60000;

      // Filter out very old cells (older than 60s)
      let cells = state.cells.filter((c) => c.timeWindowEnd > cutoff);

      cells = cells.map((cell) => {
        if (cell.status === "active" && now > cell.timeWindowEnd) {
          return { ...cell, status: "past" as const };
        }
        return cell;
      });

      // Cleanup old bets, pendingBets, and betRates to avoid memory leaks
      const validCellIds = new Set(cells.map((c) => c.id));
      const cleanDict = (dict: Record<string, number>) => {
        let changed = false;
        const result: Record<string, number> = {};
        for (const [key, value] of Object.entries(dict)) {
          if (validCellIds.has(key)) {
            result[key] = value;
          } else {
            changed = true;
          }
        }
        return changed ? result : dict;
      };

      return {
        cells,
        bets: cleanDict(state.bets),
        pendingBets: cleanDict(state.pendingBets),
        betRates: cleanDict(state.betRates),
      };
    }),
}));
