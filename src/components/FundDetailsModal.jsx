import React from 'react';
import { X, TrendingUp, TrendingDown, ExternalLink } from 'lucide-react';

const FundDetailsModal = ({ fund, onClose }) => {
  if (!fund) return null;

  const getChangeColor = (change) => {
    if (change > 0) return 'text-red-500';
    if (change < 0) return 'text-green-500';
    return 'text-gray-400';
  };

  const getChangeIcon = (change) => {
    if (change > 0) return <TrendingUp size={14} className="inline mr-1" />;
    if (change < 0) return <TrendingDown size={14} className="inline mr-1" />;
    return null;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-panel" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
            <div>
                <h2 className="text-xl font-bold">{fund.name}</h2>
                <span className="fund-code">{fund.code}</span>
            </div>
            <button className="btn-icon" onClick={onClose}>
                <X size={24} />
            </button>
        </div>

        <div className="modal-body">
            <div className="metric-grid mb-6">
                <div>
                   <p className="metric-label">实时估值</p>
                   <p className={`metric-value large ${fund.growthRate >= 0 ? 'color-up' : 'color-down'}`}>
                     {fund.estimatedNav ? parseFloat(fund.estimatedNav).toFixed(4) : '--'}
                   </p>
                   <p className={`text-sm ${getChangeColor(fund.growthRate)}`}>
                      {getChangeIcon(fund.growthRate)}
                      {fund.growthRate > 0 ? '+' : ''}{parseFloat(fund.growthRate).toFixed(2)}%
                   </p>
                </div>
                <div>
                  <p className="metric-label">前十大重仓动态</p>
                  <p className="text-sm text-gray-400 mt-2">
                    基于昨天收盘持仓权重与今日实时涨跌幅估算
                  </p>
                </div>
            </div>

            <div className="holdings-list">
                <div className="holding-item header">
                    <span className="w-40">股票名称</span>
                    <span className="w-20 text-right">占比</span>
                    <span className="w-24 text-right">现价</span>
                    <span className="w-24 text-right">涨跌幅</span>
                </div>
                {fund.holdings && fund.holdings.length > 0 ? (
                    fund.holdings.map((stock) => (
                        <div key={stock.code} className="holding-item">
                            <span className="w-40 truncate" title={stock.name}>
                                {stock.name} <span className="text-xs text-gray-500">({stock.code})</span>
                            </span>
                            <span className="w-20 text-right">{(stock.weight * 100).toFixed(2)}%</span>
                            <span className="w-24 text-right font-mono">{stock.price}</span>
                            <span className={`w-24 text-right font-mono ${getChangeColor(stock.change)}`}>
                                {stock.change > 0 ? '+' : ''}{parseFloat(stock.change).toFixed(2)}%
                            </span>
                        </div>
                    ))
                ) : (
                    <div className="p-4 text-center text-gray-500">
                        暂无持仓详情数据，可能为非股票型基金或数据未更新。
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default FundDetailsModal;
