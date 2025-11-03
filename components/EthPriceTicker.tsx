import React, { useState, useEffect, useRef } from 'react';

const formatCurrency = (value: number) => {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

interface EthPriceTickerProps {
  onPriceUpdate: (price: number) => void;
}

const EthPriceTicker: React.FC<EthPriceTickerProps> = ({ onPriceUpdate }) => {
  const [price, setPrice] = useState<string | null>(null);
  const [changeDirection, setChangeDirection] = useState<'up' | 'down' | 'none'>('none');
  const prevPriceRef = useRef<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  useEffect(() => {
    let ws: WebSocket | null = null;
    const reconnectAttempts = { current: 0 };
    let reconnectTimeout: number | null = null;
    let fallbackPollInterval: number | null = null;

    const parseAndSetPrice = (priceStr: string) => {
      const newPriceNum = parseFloat(priceStr);
      if (!isNaN(newPriceNum)) {
        onPriceUpdate(newPriceNum);

        if (prevPriceRef.current !== null) {
          const currentNumeric = parseFloat(prevPriceRef.current);
          if (newPriceNum > currentNumeric) setChangeDirection('up');
          else if (newPriceNum < currentNumeric) setChangeDirection('down');
        }

        prevPriceRef.current = priceStr;
        setPrice(priceStr);
      }
    };

    const fetchPriceOnce = async () => {
      try {
        // Use CoinGecko's simple price endpoint as requested (CORS-friendly)
        const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd,eur');
        if (!res.ok) throw new Error(`REST price fetch failed: ${res.status}`);
        const json = await res.json();
        const priceNum = json?.ethereum?.usd;
        if (priceNum !== undefined && priceNum !== null) {
          // parseAndSetPrice expects a string like previous implementation
          parseAndSetPrice(String(priceNum));
        }
      } catch (err) {
        console.warn('Failed to fetch initial ETH price (CoinGecko):', err);
      }
    };

    const scheduleReconnect = () => {
      reconnectAttempts.current += 1;
      const attempt = reconnectAttempts.current;
      const backoff = Math.min(30000, 1000 * Math.pow(2, attempt));
      const jitter = Math.floor(Math.random() * 1000);
      const timeout = backoff + jitter;
      console.info(`WebSocket closed, scheduling reconnect #${attempt} in ${timeout}ms`);
      reconnectTimeout = window.setTimeout(() => {
        createWebSocket();
      }, timeout);
    };

    const startFallbackPolling = () => {
      // poll via REST every 10s while websocket is disconnected
      if (fallbackPollInterval) return;
      fallbackPollInterval = window.setInterval(() => {
        fetchPriceOnce();
      }, 10000);
      // do an immediate fetch
      fetchPriceOnce();
    };

    const stopFallbackPolling = () => {
      if (fallbackPollInterval) {
        clearInterval(fallbackPollInterval);
        fallbackPollInterval = null;
      }
    };

    const cleanup = () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }
      stopFallbackPolling();
      if (ws) {
        try {
          ws.onopen = null;
          ws.onmessage = null;
          ws.onerror = null;
          ws.onclose = null;
          if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) ws.close();
        } catch (e) {
          // ignore errors during cleanup
        }
        ws = null;
      }
    };

    const createWebSocket = () => {
      try {
        setConnectionStatus('connecting');
        ws = new WebSocket('wss://ws.coincap.io/prices?assets=ethereum');

        ws.onopen = () => {
          reconnectAttempts.current = 0;
          setConnectionStatus('connected');
          stopFallbackPolling();
          console.info('ETH price websocket opened');
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.ethereum) parseAndSetPrice(data.ethereum);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket Error:', error);
          setConnectionStatus('disconnected');
          startFallbackPolling();
        };

        ws.onclose = (ev) => {
          console.info('WebSocket closed', ev);
          setConnectionStatus('disconnected');
          startFallbackPolling();
          scheduleReconnect();
        };
      } catch (err) {
        console.error('WebSocket creation error:', err);
        startFallbackPolling();
        scheduleReconnect();
      }
    };

    // try to get a price quickly from REST so UI isn't stuck on Loading
    fetchPriceOnce();

    // start websocket connection
    createWebSocket();

    return () => {
      cleanup();
      setConnectionStatus('disconnected');
    };
  }, [onPriceUpdate]);

  const getStatusIndicator = () => {
    switch(connectionStatus) {
        case 'connected':
            return <span className="w-2 h-2 rounded-full bg-green-500" title="Connected"></span>;
        case 'connecting':
            return <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" title="Connecting..."></span>;
        case 'disconnected':
            return <span className="w-2 h-2 rounded-full bg-red-500" title="Disconnected"></span>;
    }
  }

  const priceColor = changeDirection === 'up' ? 'text-green-400' : changeDirection === 'down' ? 'text-red-400' : 'text-gray-100';

  return (
    <div className="bg-gray-800 p-2 px-4 rounded-lg flex items-center space-x-3 shadow">
      <div className="flex items-center space-x-2">
        <i className="fab fa-ethereum text-cyan-400"></i>
        <span className="font-bold text-sm text-gray-300">ETH/USD</span>
        {getStatusIndicator()}
      </div>
      <div className={`text-lg font-mono font-bold transition-colors duration-300 ${priceColor}`}>
        {price ? (
          <>
            <span>{formatCurrency(parseFloat(price))}</span>
            {changeDirection === 'up' && <i className="fas fa-arrow-up ml-2 text-xs"></i>}
            {changeDirection === 'down' && <i className="fas fa-arrow-down ml-2 text-xs"></i>}
          </>
        ) : (
          <span>Loading...</span>
        )}
      </div>
    </div>
  );
};

export default EthPriceTicker;