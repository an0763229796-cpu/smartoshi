import React, { useState, useMemo } from 'react';
import { calculateLiquidationInfo, formatCurrency, formatNumber } from '../utils/helpers';

interface LiquidationCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentEthPrice: number | null;
}

type CalculationResult = {
  side: 'Long' | 'Short';
  liqPrice: number | null;
  buffer: number | null;
  isSafe: boolean;
  canOpenA: boolean;
  canOpenB: boolean;
  maintenanceA?: number;
  maintenanceB?: number;
  safetyA?: number;
  safetyB?: number;
  effectiveA?: number;
  effectiveB?: number;
  marginRequired?: number;
  distanceA?: number;
  distanceB?: number;
  pctA?: number;
  pctB?: number;
} | null;

const LiquidationCalculatorModal: React.FC<LiquidationCalculatorModalProps> = ({ isOpen, onClose, currentEthPrice }) => {
  const [balanceA, setBalanceA] = useState(1000);
  const [balanceB, setBalanceB] = useState(1000);
  const [quantity, setQuantity] = useState(1);
  const [maintenancePercent, setMaintenancePercent] = useState(0.5); // %
  const [safetyPercent, setSafetyPercent] = useState(30); // % (30% safety buffer)
  const [result, setResult] = useState<CalculationResult>(null);

  const leverage = 100;

  const handleCalculate = (side: 'Long' | 'Short') => {
    if (!currentEthPrice) {
      setResult(null);
      return;
    }
    
    const entryPrice = currentEthPrice;
    const marginRequired = (entryPrice * quantity) / leverage;

    const infoA: any = calculateLiquidationInfo(balanceA, entryPrice, quantity, leverage, maintenancePercent, safetyPercent);
    const infoB: any = calculateLiquidationInfo(balanceB, entryPrice, quantity, leverage, maintenancePercent, safetyPercent);

  const liqPrice = side === 'Long' ? infoA.longLiq : infoA.shortLiq;
  const buffer = side === 'Long' ? Math.abs(entryPrice - (infoA.longLiq || 0)) : Math.abs(entryPrice - (infoA.shortLiq || 0));

  // distance and percent to liquidation for each exchange
  const liqA = side === 'Long' ? infoA.longLiq : infoA.shortLiq;
  const liqB = side === 'Long' ? infoB.longLiq : infoB.shortLiq;
  const distanceA = liqA != null ? Math.abs(entryPrice - liqA) : null;
  const distanceB = liqB != null ? Math.abs(entryPrice - liqB) : null;
  const pctA = distanceA != null && entryPrice ? (distanceA / entryPrice) * 100 : null;
  const pctB = distanceB != null && entryPrice ? (distanceB / entryPrice) * 100 : null;

    const canOpenA = (balanceA - (infoA.maintenanceAmount || 0) - (infoA.safetyBuffer || 0)) >= marginRequired;
    const canOpenB = (balanceB - (infoB.maintenanceAmount || 0) - (infoB.safetyBuffer || 0)) >= marginRequired;

    setResult({
      side,
      liqPrice: liqPrice,
      buffer: buffer,
      isSafe: infoA.isSafe && infoB.isSafe,
      canOpenA,
      canOpenB,
      maintenanceA: infoA.maintenanceAmount,
      maintenanceB: infoB.maintenanceAmount,
      safetyA: infoA.safetyBuffer,
      safetyB: infoB.safetyBuffer,
      effectiveA: infoA.effectiveCollateral,
      effectiveB: infoB.effectiveCollateral,
      marginRequired: infoA.marginRequired,
      distanceA,
      distanceB,
      pctA,
      pctB,
    });
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
  <div className="bg-gray-900 rounded-lg shadow-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-2xl font-bold text-purple-400"><i className="fas fa-calculator mr-2"></i>Quick Liquidation Calculator</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">&times;</button>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-gray-800 rounded-lg text-center">
            <span className="text-gray-400 text-sm">Current ETH Price (Leverage: {leverage}x)</span>
            <p className="text-2xl font-bold text-cyan-400">{currentEthPrice ? formatCurrency(currentEthPrice) : 'Fetching...'}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Aivora Balance</label>
              <input type="number" value={balanceA} onChange={(e) => setBalanceA(parseFloat(e.target.value))} className="bg-gray-700 p-2 w-full rounded-md focus:ring-2 focus:ring-cyan-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Bitunix Balance</label>
              <input type="number" value={balanceB} onChange={(e) => setBalanceB(parseFloat(e.target.value))} className="bg-gray-700 p-2 w-full rounded-md focus:ring-2 focus:ring-cyan-500 focus:outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Maintenance Margin (%)</label>
              <input type="number" value={maintenancePercent} onChange={(e) => setMaintenancePercent(parseFloat(e.target.value))} className="bg-gray-700 p-2 w-full rounded-md focus:ring-2 focus:ring-cyan-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Safety Buffer (%)</label>
              <input type="number" value={safetyPercent} onChange={(e) => setSafetyPercent(parseFloat(e.target.value))} className="bg-gray-700 p-2 w-full rounded-md focus:ring-2 focus:ring-cyan-500 focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">ETH Quantity</label>
            <input type="number" value={quantity} onChange={(e) => setQuantity(parseFloat(e.target.value))} className="bg-gray-700 p-2 w-full rounded-md focus:ring-2 focus:ring-cyan-500 focus:outline-none" />
          </div>
          <div className="flex justify-center space-x-4">
            <button onClick={() => handleCalculate('Long')} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg" disabled={!currentEthPrice}>Calculate Long</button>
            <button onClick={() => handleCalculate('Short')} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg" disabled={!currentEthPrice}>Calculate Short</button>
          </div>
        </div>

        {result && (
          <div className="mt-6 p-4 bg-gray-800 rounded-lg space-y-3">
            <h4 className="text-lg font-semibold text-white">Calculation Result ({result.side})</h4>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Est. Liquidation Price:</span>
              <span className="font-mono text-xl text-yellow-400">{result.liqPrice ? formatCurrency(result.liqPrice) : 'N/A'}</span>
            </div>
            <div className="grid grid-cols-1 gap-2 text-sm text-gray-300">
              <div className="flex justify-between"><span>Margin Required:</span><span className="font-mono">{result.marginRequired ? formatCurrency(result.marginRequired) : 'N/A'}</span></div>
              <div className="flex justify-between"><span>Aivora maintenance:</span><span className="font-mono">{result.maintenanceA ? formatCurrency(result.maintenanceA) : '-'}</span></div>
              <div className="flex justify-between"><span>Bitunix maintenance:</span><span className="font-mono">{result.maintenanceB ? formatCurrency(result.maintenanceB) : '-'}</span></div>
              <div className="flex justify-between"><span>Aivora safety buffer:</span><span className="font-mono">{result.safetyA ? formatCurrency(result.safetyA) : '-'}</span></div>
              <div className="flex justify-between"><span>Bitunix safety buffer:</span><span className="font-mono">{result.safetyB ? formatCurrency(result.safetyB) : '-'}</span></div>
              <div className="flex justify-between"><span>Aivora effective collateral:</span><span className="font-mono">{result.effectiveA ? formatCurrency(result.effectiveA) : '-'}</span></div>
              <div className="flex justify-between"><span>Bitunix effective collateral:</span><span className="font-mono">{result.effectiveB ? formatCurrency(result.effectiveB) : '-'}</span></div>
              <div className="flex justify-between"><span>Aivora distance to liq:</span><span className="font-mono">{result.distanceA ? formatCurrency(result.distanceA) : '-' } ({result.pctA ? `${formatNumber(result.pctA,2)}%` : '-'})</span></div>
              <div className="flex justify-between"><span>Bitunix distance to liq:</span><span className="font-mono">{result.distanceB ? formatCurrency(result.distanceB) : '-' } ({result.pctB ? `${formatNumber(result.pctB,2)}%` : '-'})</span></div>

              <div className={`p-3 rounded-md text-center font-bold ${result.isSafe && result.canOpenA && result.canOpenB ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'}`}>
                <div className="max-h-40 overflow-auto">
                  {!result.canOpenA && <p><i className="fas fa-exclamation-triangle mr-2"></i>Insufficient effective collateral on Aivora to cover margin.</p>}
                  {!result.canOpenB && <p><i className="fas fa-exclamation-triangle mr-2"></i>Insufficient effective collateral on Bitunix to cover margin.</p>}
                  {!result.isSafe && <p><i className="fas fa-exclamation-triangle mr-2"></i>High liquidation risk (buffer too small or collateral ≤ margin).</p>}
                  {result.isSafe && result.canOpenA && result.canOpenB && <p><i className="fas fa-check-circle mr-2"></i>Position is within safe parameters.</p>}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiquidationCalculatorModal;
