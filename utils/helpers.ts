import { HedgedPair } from '../types';

export const calculateSlippage = (pair: HedgedPair) => {
  const openSlippage = Math.abs((pair.tradeB.openPrice || 0) - (pair.tradeA.openPrice || 0));
  const closeSlippage = Math.abs((pair.tradeB.closePrice || 0) - (pair.tradeA.closePrice || 0));
  return { openSlippage, closeSlippage, totalSlippage: openSlippage + closeSlippage };
};

export const calculateTotals = (pair: HedgedPair) => {
  const totalFee = (pair.tradeA.fee || 0) + (pair.tradeB.fee || 0);
  const totalPnl = (pair.tradeA.pnl || 0) + (pair.tradeB.pnl || 0);
  const tradingVolume = ((pair.tradeA.openPrice || 0) * (pair.tradeA.quantity || 0)) + ((pair.tradeB.openPrice || 0) * (pair.tradeB.quantity || 0));
  return { totalFee, totalPnl, tradingVolume };
};

export const formatCurrency = (value: number) => {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const formatNumber = (value: number, precision: number = 4) => {
    return value.toLocaleString('en-US', {
        minimumFractionDigits: precision,
        maximumFractionDigits: precision,
    });
}

export const calculateLiquidationInfo = (
  balance: number,
  entryPrice: number,
  quantity: number,
  leverage: number,
) => {
  if (!balance || !entryPrice || !quantity || !leverage) {
    return { longLiq: null, shortLiq: null, buffer: null, isSafe: false };
  }

  // Simplified liquidation price formula for cross margin (this is an estimation)
  // Assumes isolated margin concept for calculation simplicity.
  // Real cross margin liq price depends on the entire account balance and other positions.
  const margin = (entryPrice * quantity) / leverage;
  
  // For Long: Price has to drop
  const priceDrop = (balance + margin) / quantity;
  const longLiq = entryPrice - priceDrop;

  // For Short: Price has to rise
  const priceRise = (balance + margin) / quantity;
  const shortLiq = entryPrice + priceRise;
  
  const buffer = Math.abs(entryPrice - longLiq);
  const isSafe = buffer > 120;

  return { 
    longLiq: longLiq > 0 ? longLiq : 0, 
    shortLiq, 
    buffer, 
    isSafe 
  };
};