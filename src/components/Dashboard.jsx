import React, { useState, useEffect } from 'react';
import { Plus, Search, RefreshCw, AlertCircle } from 'lucide-react';
import FundCard from './FundCard';

import FundDetailsModal from './FundDetailsModal';
import EditHoldingsModal from './EditHoldingsModal';
import { fetchFundValuations } from '../services/fundService';
import { calculateRealtimeEstimate } from '../services/valuationService';

// 前缀: sh/sz 用于 A股/基金/ETF, hk 用于港股, jj 用于 开放式基金
// 示例: sz000001 (平安银行), sh600519 (茅台), hk00700 (腾讯), sz161725 (白酒 LOF)
const DEFAULT_FUNDS = ['sz161725', 'sh600519', 'hk00700', 'jj000216'];

const Dashboard = () => {
  const [codes, setCodes] = useState(() => {
    const saved = localStorage.getItem('fund_codes');
    return saved ? JSON.parse(saved) : DEFAULT_FUNDS;
  });
  
  const [fundsData, setFundsData] = useState({});
  const [loading, setLoading] = useState(false);
  const [inputCode, setInputCode] = useState('');
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // 持仓状态: { 'code': shares }
  const [holdings, setHoldings] = useState(() => {
    const saved = localStorage.getItem('fund_holdings');
    return saved ? JSON.parse(saved) : {};
  });

  const [selectedFund, setSelectedFund] = useState(null);
  const [editingFund, setEditingFund] = useState(null); // 正在编辑持仓的基金

  useEffect(() => {
    localStorage.setItem('fund_codes', JSON.stringify(codes));
    updateAll();
  }, [codes]);

  useEffect(() => {
    localStorage.setItem('fund_holdings', JSON.stringify(holdings));
  }, [holdings]);

  // 自动刷新，每 20 秒
  useEffect(() => {
    const interval = setInterval(updateAll, 20000); // 20 秒刷新
    return () => clearInterval(interval);
  }, [codes]); // 如果 codes 改变则重新绑定 (尽管如果 updateAll 定义在 generic effect 内部使用当前状态闭包，这里我们依赖 codes)

  const updateAll = async () => {
    if (codes.length === 0) return;
    setLoading(true);
    setError(null);
    
    // 我们通过服务队列逐个获取
    // 我们可以一次性触发所有请求 - 服务会把它们排队。
    try {
      const dataMap = await fetchFundValuations(codes);
      
      // 迁移逻辑: 检查是否需要更新任何代码 (如 000001 -> sz000001)
      const newCodes = [...codes];
      let codesChanged = false;

      // 结合估值引擎
      for (const key of Object.keys(dataMap)) {
          const item = dataMap[key];
          // 如果是基金 (jj) 并且有净值但没有实时增长 (0)，尝试估算
          if (item.code.startsWith('jj')) {
             // 尝试估算
             const estimation = await calculateRealtimeEstimate(item.code, item.prevClose); 
             if (estimation) {
                 item.estimatedNav = estimation.estimatedNav;
                 item.growthRate = estimation.growthRate;
                 item.isEstimated = true; // UI 标记
                 item.holdings = estimation.holdings; // 存储持仓用于弹窗
             }
          }
      }

      Object.values(dataMap).forEach(item => {
        // 如果我们有确切的代码，很好。
        if (newCodes.includes(item.code)) return;

        // 如果没有，检查我们是否有简码 (如用户有 000001, api 返回 sz000001)
        const idx = newCodes.indexOf(item.shortCode);
        if (idx !== -1) {
          // 用完整代码替换原始代码
          newCodes[idx] = item.code;
          codesChanged = true;
        }
      });

      if (codesChanged) {
        setCodes(newCodes);
        // dataMap key 已经是 item.code，所以它匹配 newCodes
      }

      const nextData = { ...fundsData, ...dataMap };
      setFundsData(nextData);
    } catch (err) {
      console.error("Batch update failed", err);
      // Optional: set global error or toast
    }
    
    setLoading(false);
    setLastUpdated(new Date());
  };

  const handleAddString = () => {
    if (!inputCode) return;
    
    // 用逗号、空格、无限空白分割
    const rawInputs = inputCode.split(/[,，\s]+/).filter(s => s && s.length >= 5);
    
    if (rawInputs.length === 0) return;

    // 过滤掉已存在的代码 (如果可能检查 code 和 shortCode，但主要是原始输入 vs codes)
    // 详细检查在 fetch 后发生，但我们先过滤严格重复项。
    const newInputs = rawInputs.filter(code => !codes.includes(code));
    
    if (newInputs.length === 0) {
        setError('All funds already exist');
        return;
    }
    
    setLoading(true);
    fetchFundValuations(newInputs)
      .then(dataMap => {
        const values = Object.values(dataMap);
        if (values.length > 0) {
            let addedCount = 0;
            const nextCodes = [...codes];
            const nextData = { ...fundsData };

            values.forEach(data => {
                if (!nextCodes.includes(data.code)) {
                    nextCodes.push(data.code);
                    nextData[data.code] = data;
                    addedCount++;
                }
            });

            if (addedCount > 0) {
                setCodes(nextCodes);
                setFundsData(nextData);
                setInputCode('');
                setError(null);
            } else {
                 setError('Funds already exist or invalid');
            }
        } else {
            setError('Invalid Code(s) or No Data');
        }
      })
      .catch((err) => {
        console.error(err);
        setError('Network Error or Invalid Codes');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const removeFund = (code) => {
    setCodes(prev => prev.filter(c => c !== code));
    const newData = { ...fundsData };
    delete newData[code];
    setFundsData(newData);
  };

  const handleCardClick = (fund) => {
    // 仅针对有估算/持仓数据的基金打开弹窗
    if (fund.holdings) {
        setSelectedFund(fund);
    }
  };

  const handleUpdateHoldings = (code, shares) => {
      setHoldings(prev => {
          const next = { ...prev };
          if (!shares || shares <= 0) {
              delete next[code];
          } else {
              next[code] = shares;
          }
          return next;
      });
  };

  const openHoldingsModal = (e, fund) => {
      e.stopPropagation();
      setEditingFund(fund);
  };

  // Calculate Total Daily P&L
  const totalDailyPnL = Object.values(fundsData).reduce((sum, fund) => {
      const shares = holdings[fund.code] || 0;
      if (shares <= 0 || !fund.prevClose) return sum;
      
      const currentPrice = fund.estimatedNav || fund.nav; 
      const priceDiff = currentPrice - fund.prevClose;
      return sum + (priceDiff * shares);
  }, 0);

  const totalHoldingValue = Object.values(fundsData).reduce((sum, fund) => {
      const shares = holdings[fund.code] || 0;
      if (shares <= 0) return sum;
      const currentPrice = fund.estimatedNav || fund.nav || 0;
      return sum + (currentPrice * shares);
  }, 0);

  return (
    <div className="container">
      {/* Header */}
      <div className="glass-panel header">
        <div>
          <h1 style={{fontSize: '1.875rem', fontWeight: 'bold', marginBottom: '0.5rem'}}>
            <span className="text-gradient">FundTracker</span> 实时估值
          </h1>
          <p style={{color: 'var(--text-secondary)', fontSize: '0.875rem'}}>
            上次更新: {lastUpdated.toLocaleTimeString()}
          </p>
          
          <div style={{ marginTop: '1rem', display: 'flex', gap: '2rem' }}>
             <div>
                <p className="text-secondary" style={{ fontSize: '0.875rem' }}>今日预估盈亏</p>
                <p className={`metric-value large ${totalDailyPnL >= 0 ? 'color-up' : 'color-down'}`}>
                   {totalDailyPnL >= 0 ? '+' : ''}{totalDailyPnL.toFixed(2)}
                </p>
             </div>
             <div>
                <p className="text-secondary" style={{ fontSize: '0.875rem' }}>持仓总市值</p>
                <p className="metric-value large" style={{ color: 'white' }}>
                   {totalHoldingValue.toFixed(2)}
                </p>
             </div>
          </div>
        </div>
        
        <div className="search-bar">
          <div className="input-group">
            <input 
              type="text" 
              placeholder="输入基金代码 (支持批量, 如 000001 000002)" 
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddString()}
              // maxLength={8} // Removed maxLength to allow batch input
            />
            <Search className="input-icon" size={18} />
          </div>
          
          <button 
            onClick={handleAddString}
            disabled={loading}
            className="btn"
          >
            <Plus size={24} />
          </button>

          <button 
            onClick={updateAll}
            disabled={loading}
            className={`btn btn-secondary ${loading ? 'animate-spin' : ''}`}
            title="Refresh"
          >
            <RefreshCw size={24} />
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="error-banner">
            <AlertCircle size={20} style={{marginRight: '0.5rem'}} />
            {error}
        </div>
      )}

      {/* Grid */}
      <div className="grid-cols-3">
        {codes.map(code => (
          fundsData[code] ? (
            <FundCard 
                key={code} 
                data={fundsData[code]} 
                holdings={holdings[code]}
                onDelete={removeFund} 
                onClick={() => handleCardClick(fundsData[code])}
                onEditHoldings={(e) => openHoldingsModal(e, fundsData[code])}
            />
          ) : (
            <div key={code} className="glass-panel" style={{height: '12rem', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative'}}>
               <span style={{color: 'var(--text-secondary)'}}>Loading {code}...</span>
               <button 
                  onClick={() => removeFund(code)}
                  style={{
                    position: 'absolute',
                    top: '1rem',
                    right: '1rem',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    padding: '0.5rem'
                  }}
                  title="Remove"
               >
                 X
               </button>
            </div>
          )
        ))}
        
        {codes.length === 0 && (
          <div style={{gridColumn: '1 / -1', textAlign: 'center', padding: '5rem 0', color: 'var(--text-secondary)'}}>
            <p>暂无关注基金，请在右上角添加。</p>
          </div>
        )}
      </div>


      <FundDetailsModal 
        fund={selectedFund} 
        onClose={() => setSelectedFund(null)} 
      />

      <EditHoldingsModal
        fund={editingFund}
        currentShares={editingFund ? holdings[editingFund.code] : 0}
        onClose={() => setEditingFund(null)}
        onSave={handleUpdateHoldings}
      />
    </div>
  );
};

export default Dashboard;
