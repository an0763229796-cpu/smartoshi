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
  maintenancePercent: number = 0.5, // percent (e.g., 0.5 means 0.5%)
  safetyPercent: number = 30 // percent (e.g., 30 means 30% safety buffer)
) => {
  if (!balance || !entryPrice || !quantity || !leverage) {
    return { longLiq: null, shortLiq: null, buffer: null, isSafe: false };
  }
  // Use formulas provided:
  // For Long: liquidationPrice = entryPrice * (1 - 1/leverage + MMR)
  // For Short: liquidationPrice = entryPrice * (1 + 1/leverage - MMR)
  // maintenancePercent is provided as percent (e.g., 0.5 means 0.5%) -> MMR is decimal
  const MMR = maintenancePercent / 100;

  const longLiq = entryPrice * (1 - 1 / leverage + MMR);
  const shortLiq = entryPrice * (1 + 1 / leverage - MMR);

  // For compatibility keep maintenanceAmount/safetyBuffer/effectiveCollateral/marginRequired
  const maintenanceAmount = balance * (maintenancePercent / 100);
  const safetyBuffer = balance * (safetyPercent / 100);
  const effectiveCollateral = balance - maintenanceAmount - safetyBuffer;
  const marginRequired = (entryPrice * quantity) / leverage;

  // distance (absolute) from entry to liquidation price for long/short
  const bufferLong = Math.abs(entryPrice - longLiq);
  const bufferShort = Math.abs(shortLiq - entryPrice);

  // isSafe: simple heuristic — effective collateral should cover margin and bufferLong/Short should be > 0
  const isSafe = effectiveCollateral > marginRequired && (bufferLong > 0 || bufferShort > 0);

  return {
    longLiq: longLiq > 0 ? longLiq : 0,
    shortLiq,
    buffer: bufferLong,
    isSafe,
    maintenanceAmount,
    safetyBuffer,
    effectiveCollateral,
    marginRequired,
  } as any;
};