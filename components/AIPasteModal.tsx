
import React, { useState } from 'react';
import { Trade } from '../types';
import { parseTradeText } from '../services/geminiService';

interface AIPasteModalProps {
  onParseComplete: (trade: Trade) => void;
  onClose: () => void;
}

const AIPasteModal: React.FC<AIPasteModalProps> = ({ onParseComplete, onClose }) => {
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleParse = async () => {
    if (!text.trim()) {
      setError("Please paste the trade information first.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const parsedTrade = await parseTradeText(text);
      onParseComplete(parsedTrade);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(errorMessage);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg shadow-2xl p-6 w-full max-w-2xl">
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-2xl font-bold text-purple-400"><i className="fas fa-magic mr-2"></i>AI Paste & Create</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl" disabled={isLoading}>&times;</button>
        </div>
        
        <p className="text-gray-400 text-sm mb-4">
            Paste the completed trade details from your exchange below. The AI will extract the information and pre-fill the form for you.
        </p>

        <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste trade details here..."
            className="w-full h-48 p-3 bg-gray-800 border border-gray-700 rounded-md resize-none focus:ring-2 focus:ring-purple-500 focus:outline-none mb-4"
            disabled={isLoading}
        />

        {error && <p className="text-red-400 mb-4 text-sm bg-red-900/20 p-3 rounded-md">{error}</p>}

        <div className="flex justify-end space-x-4">
            <button 
                type="button" 
                onClick={onClose} 
                className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded-lg transition duration-300 disabled:opacity-50"
                disabled={isLoading}
            >
                Cancel
            </button>
            <button 
                type="button" 
                onClick={handleParse} 
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded-lg transition duration-300 disabled:bg-gray-600 disabled:cursor-not-allowed"
                disabled={isLoading || !text.trim()}
            >
                {isLoading ? (
                    <>
                        <i className="fas fa-spinner fa-spin mr-2"></i>Parsing...
                    </>
                ) : (
                    <>
                        <i className="fas fa-cogs mr-2"></i>Parse Trade
                    </>
                )}
            </button>
        </div>
      </div>
    </div>
  );
};

export default AIPasteModal;
