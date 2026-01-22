import React, { useState, useEffect } from 'react';
import { TrendingUp, Clock, BarChart3, AlertCircle, RefreshCw } from 'lucide-react';

const App = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. 獲取資金費率規範 (fundingInfo)
      const fundingInfoResp = await fetch("https://fapi.binance.com/fapi/v1/fundingInfo");
      const fundingInfo = await fundingInfoResp.json();

      // 2. 獲取即時費率 (premiumIndex)
      const premiumIndexResp = await fetch("https://fapi.binance.com/fapi/v1/premiumIndex");
      const premiumIndex = await premiumIndexResp.json();

      // 3. 獲取 24h 成交額 (ticker/24hr)
      const tickerResp = await fetch("https://fapi.binance.com/fapi/v1/ticker/24hr");
      const tickerData = await tickerResp.json();

      // 建立對應 Map
      const intervalsMap = {};
      fundingInfo.forEach(item => {
        // 修正點：幣安 API 回傳的是分鐘 (Minutes)，需除以 60 換算成小時 (Hours)
        intervalsMap[item.symbol] = item.fundingIntervalHours;
      });

      const volumeMap = {};
      tickerData.forEach(item => {
        volumeMap[item.symbol] = parseFloat(item.quoteVolume);
      });

      // 整合與計算
      const results = premiumIndex
        .filter(item => intervalsMap[item.symbol] && volumeMap[item.symbol] && item.lastFundingRate)
        .map(item => {
          const symbol = item.symbol;
          const rate = parseFloat(item.lastFundingRate);
          const interval = intervalsMap[symbol];
          const vol = volumeMap[symbol];
          
          // 計算每日結算次數 (24 / 結算小時數)
          const timesPerDay = 24 / interval;
          const apr = Math.abs(rate) * timesPerDay * 365 * 100;

          return {
            symbol,
            ratePct: (rate * 100).toFixed(4),
            interval,
            vol,
            apr: apr.toFixed(2),
            rawApr: apr
          };
        })
        .sort((a, b) => b.rawApr - a.rawApr)
        .slice(0, 3); // 只取前 3 名

      setData(results);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      setError("無法獲取數據，請檢查網路連線或稍後再試。");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const timer = setInterval(fetchData, 60000); // 每分鐘自動刷新
    return () => clearInterval(timer);
  }, []);

  const formatVol = (val) => {
    if (val >= 1e9) return `${(val / 1e9).toFixed(2)}B`;
    if (val >= 1e6) return `${(val / 1e6).toFixed(2)}M`;
    return val.toLocaleString();
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="text-emerald-500" />
              資金費率 APR 監控
            </h1>
            <p className="text-slate-500 mt-1">即時分析幣安合約 APR 前 3 名交易對</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-slate-400 uppercase font-semibold">最後更新</p>
              <p className="text-sm text-slate-600 font-mono">{lastUpdated || '--:--:--'}</p>
            </div>
            <button 
              onClick={fetchData}
              disabled={loading}
              className="p-2 bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Content */}
        {error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        ) : loading && data.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-64 bg-slate-200 animate-pulse rounded-2xl"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {data.map((item, index) => (
              <div 
                key={item.symbol} 
                className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow relative overflow-hidden"
              >
                {/* Rank Badge */}
                <div className="absolute top-0 right-0 bg-emerald-500 text-white px-3 py-1 rounded-bl-xl font-bold text-sm">
                  TOP {index + 1}
                </div>
                
                <h2 className="text-xl font-bold text-slate-800 mb-4">{item.symbol}</h2>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 text-sm flex items-center gap-1">
                      <BarChart3 className="w-4 h-4" /> 24h Vol (USDT)
                    </span>
                    <span className="font-semibold text-slate-700">{formatVol(item.vol)}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 text-sm flex items-center gap-1">
                      <Clock className="w-4 h-4" /> 結算區間
                    </span>
                    <span className="font-semibold text-slate-700">{item.interval}H</span>
                  </div>

                  <div className="pt-4 border-t border-slate-50">
                    <p className="text-xs text-slate-400 uppercase font-bold mb-1">即時費率</p>
                    <p className="text-2xl font-mono text-slate-800">{item.ratePct}%</p>
                  </div>

                  <div className="bg-emerald-50 p-4 rounded-xl">
                    <p className="text-xs text-emerald-600 uppercase font-bold mb-1">年化 APR</p>
                    <p className="text-3xl font-bold text-emerald-700">{item.apr}%</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer info */}
        <div className="mt-8 text-center">
          <p className="text-xs text-slate-400 italic">
            * 數據每 60 秒自動更新一次。APR 計算公式：(費率 * 每日結算次數 * 365)。
          </p>
        </div>
      </div>
    </div>
  );
};

export default App;