import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { HedgedPair, UserData } from './types';
import Dashboard from './components/Dashboard';
import EthPriceTicker from './components/EthPriceTicker';
import VolumeTracker from './components/VolumeTracker';
import LoginScreen from './components/LoginScreen';
import { useLocalStorage } from './hooks/useLocalStorage';
import * as apiService from './services/apiService';
import LiquidationCalculatorModal from './components/LiquidationCalculatorModal';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useLocalStorage<string | null>('currentUser', null);
  const [hedgedPairs, setHedgedPairs] = useState<HedgedPair[]>([]);
  const [monthlyVolumeTarget, setMonthlyVolumeTarget] = useState<number>(500000);
  const [startingEquity, setStartingEquity] = useState<number>(100000);
  const [currentEthPrice, setCurrentEthPrice] = useState<number | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPair, setEditingPair] = useState<HedgedPair | null>(null);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadInitialData = async () => {
      if (currentUser) {
        try {
          const userData = await apiService.loginUser(currentUser);
          setHedgedPairs(userData.hedgedPairs);
          setMonthlyVolumeTarget(userData.monthlyVolumeTarget);
          setStartingEquity(userData.startingEquity);
        } catch (error) {
          console.error("Failed to load user data:", error);
          setCurrentUser(null);
        }
      }
      setIsLoading(false);
    };
    loadInitialData();
  }, [currentUser, setCurrentUser]);

  useEffect(() => {
    if (currentUser && !isLoading) {
      const userData: UserData = { hedgedPairs, monthlyVolumeTarget, startingEquity };
      apiService.saveUserData(currentUser, userData);
    }
  }, [hedgedPairs, monthlyVolumeTarget, startingEquity, currentUser, isLoading]);

  const handleLogin = async (username: string) => {
    setIsLoading(true);
    try {
      const userData = await apiService.loginUser(username);
      setHedgedPairs(userData.hedgedPairs);
      setMonthlyVolumeTarget(userData.monthlyVolumeTarget);
      setStartingEquity(userData.startingEquity);
      setCurrentUser(username);
    } catch (error) {
      console.error("Login failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setHedgedPairs([]);
    setMonthlyVolumeTarget(500000);
    setStartingEquity(100000);
  };

  const handleOpenModal = () => {
    setEditingPair(null);
    setIsModalOpen(true);
  };

  const handleEditPair = (pair: HedgedPair) => {
    setEditingPair(pair);
    setIsModalOpen(true);
  };

  const handleSavePair = (pair: HedgedPair) => {
    if (editingPair && editingPair.id) {
      setHedgedPairs(hedgedPairs.map(p => p.id === pair.id ? pair : p));
    } else {
      setHedgedPairs([...hedgedPairs, { ...pair, id: Date.now().toString() }]);
    }
    setIsModalOpen(false);
    setEditingPair(null);
  };

  const handleDeletePair = (id: string) => {
    if (window.confirm('Are you sure you want to delete this hedge pair?')) {
      setHedgedPairs(hedgedPairs.filter(p => p.id !== id));
    }
  };

  const { totalPnl, totalFees, totalVolumeA, totalVolumeB } = useMemo(() => {
    return hedgedPairs.reduce(
      (acc, pair) => {
        const pnlA = pair.tradeA.pnl || 0;
        const pnlB = pair.tradeB.pnl || 0;
        const feeA = pair.tradeA.fee || 0;
        const feeB = pair.tradeB.fee || 0;
        const volumeA = (pair.tradeA.openPrice || 0) * (pair.tradeA.quantity || 0);
        const volumeB = (pair.tradeB.openPrice || 0) * (pair.tradeB.quantity || 0);

        acc.totalPnl += pnlA + pnlB;
        acc.totalFees += feeA + feeB;
        acc.totalVolumeA += volumeA;
        acc.totalVolumeB += volumeB;
        return acc;
      },
      { totalPnl: 0, totalFees: 0, totalVolumeA: 0, totalVolumeB: 0 }
    );
  }, [hedgedPairs]);

  const totalEquity = useMemo(() => startingEquity + totalPnl, [startingEquity, totalPnl]);

  const handlePriceUpdate = useCallback((price: number) => {
    setCurrentEthPrice(price);
  }, []);
  
  if (isLoading && !currentUser) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-900"><div className="text-white text-xl">Loading...</div></div>;
  }

  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} isLoading={isLoading} />;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
      <header className="bg-gray-800 shadow-md p-4">
        <div className="container mx-auto flex justify-between items-center flex-wrap gap-4">
          <h1 className="text-2xl font-bold text-cyan-400">
            <i className="fas fa-shield-alt mr-2"></i>Hedging Dashboard
          </h1>
          <div className="flex items-center space-x-2 md:space-x-4">
             <EthPriceTicker onPriceUpdate={handlePriceUpdate} />
              <div className="flex items-center space-x-2 bg-gray-700/50 p-2 rounded-lg">
                  <i className="fas fa-user-circle text-cyan-400"></i>
                  <span className="font-medium">{currentUser}</span>
              </div>
            <button
              onClick={() => setIsCalculatorOpen(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 shadow-lg"
            >
              <i className="fas fa-calculator mr-2"></i>Calculator
            </button>
             <button
              onClick={handleOpenModal}
              className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-4 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 shadow-lg"
            >
              <i className="fas fa-plus-circle mr-2"></i>Add Pair
            </button>
             <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 shadow-lg"
            >
              <i className="fas fa-sign-out-alt"></i>
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                <h3 className="text-gray-400 text-sm font-medium">Total Equity</h3>
                 <p className={`text-3xl font-semibold ${totalEquity >= startingEquity ? 'text-green-400' : 'text-red-400'}`}>
                    ${totalEquity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <div className="text-gray-400 text-xs mt-1">
                  Starting Equity: 
                  <input 
                    type="number"
                    value={startingEquity}
                    onChange={(e) => setStartingEquity(parseFloat(e.target.value) || 0)}
                    className="bg-gray-700/50 ml-1 px-1 rounded w-24 text-white text-xs"
                  />
                </div>
            </div>
            <div className={`bg-gray-800 p-6 rounded-lg shadow-lg`}>
                <h3 className="text-gray-400 text-sm font-medium">Total Net PnL</h3>
                <p className={`text-3xl font-semibold ${totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    ${totalPnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-gray-400 text-sm mt-1">Across {hedgedPairs.length} pairs</p>
            </div>
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                <h3 className="text-gray-400 text-sm font-medium">Total Fees Paid</h3>
                <p className="text-3xl font-semibold text-yellow-400">
                    ${totalFees.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-gray-400 text-sm mt-1">Check fee optimization</p>
            </div>
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                <h3 className="text-gray-400 text-sm font-medium">Total Trading Volume</h3>
                <p className="text-3xl font-semibold text-blue-400">
                    ${(totalVolumeA + totalVolumeB).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-gray-400 text-sm mt-1">All tracked volume</p>
            </div>
        </div>
        
        <div className="mb-6">
           <VolumeTracker
             volumeA={totalVolumeA}
             volumeB={totalVolumeB}
             target={monthlyVolumeTarget}
             setTarget={setMonthlyVolumeTarget}
           />
        </div>

        <div className="grid grid-cols-1 gap-6">
          <div className="w-full">
             <Dashboard 
                pairs={hedgedPairs} 
                onEdit={handleEditPair} 
                onDelete={handleDeletePair}
                isModalOpen={isModalOpen}
                setIsModalOpen={setIsModalOpen}
                editingPair={editingPair}
                onSave={handleSavePair}
                currentEthPrice={currentEthPrice}
             />
          </div>
        </div>
      </main>
      {isCalculatorOpen && 
        <LiquidationCalculatorModal 
          isOpen={isCalculatorOpen} 
          onClose={() => setIsCalculatorOpen(false)} 
          currentEthPrice={currentEthPrice}
        />}
    </div>
  );
};

export default App;
