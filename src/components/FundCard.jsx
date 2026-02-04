import React from 'react';
import { TrendingUp, TrendingDown, Clock, Trash2 } from 'lucide-react';

const FundCard = ({ data, holdings, onDelete, onClick, onEditHoldings }) => {
  const isPositive = parseFloat(data.growthRate) >= 0;
  const growthClass = isPositive ? 'up' : 'down';
  const GrowthIcon = isPositive ? TrendingUp : TrendingDown;

  // Calculate individual P&L
  const shares = holdings || 0;
  const currentPrice = data.estimatedNav || data.nav || 0;
  const dailyPnL = shares > 0 ? (currentPrice - data.prevClose) * shares : 0;

  return (
    <div 
        className={`glass-panel fund-card animate-in ${data.holdings ? 'cursor-pointer hover:border-sky-500/50' : ''}`}
        onClick={onClick}
    > {/* Added classes and onClick */}
      {/* Replaced the old delete button and fund-card-header with the new structure */}
      <div className="card-header">
        <div>
          <h2 className="fund-name">{data.name}</h2> {/* Changed h3 to h2 and added class */}
          <span className="fund-code">
            {data.code} {data.isEstimated && <span className="text-xs text-amber-500">(预估)</span>} {/* Added conditional indicator */}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
                className="btn-icon" 
                title="设置持仓"
                onClick={onEditHoldings}
            >
               <span style={{ fontSize: '0.8rem', color: shares > 0 ? 'var(--color-accent)' : 'var(--text-secondary)' }}>
                 {shares > 0 ? `市值¥${(shares * currentPrice).toFixed(0)}` : '设置持仓'}
               </span>
            </button>
            <button 
                className="btn-icon" 
                onClick={(e) => {
                    e.stopPropagation();
                    onDelete(data.code);
                }}
            > {/* New delete button structure */}
              <Trash2 size={18} />
            </button>
        </div>
      </div>

      {/* The growth badge is now outside the card-header, but still within the main card div */}
      <div className={`badge ${growthClass}`}>
          <GrowthIcon size={16} style={{marginRight: '0.25rem'}} />
          <span>
            {data.growthRate > 0 ? '+' : ''}{parseFloat(data.growthRate).toFixed(2)}%
          </span>
      </div>

      <div className="metric-grid">
        <div>
           <p className="metric-label">实时估值</p>
           <p className={`metric-value large ${isPositive ? 'color-up' : 'color-down'}`}>
             {parseFloat(data.estimatedNav).toFixed(4)}
           </p>
        </div>
        <div>
           <p className="metric-label">今日盈亏</p>
           <p className={`metric-value large ${dailyPnL >= 0 ? 'color-up' : 'color-down'}`}>
             {dailyPnL !== 0 ? (dailyPnL > 0 ? '+' : '') + dailyPnL.toFixed(2) : '--'}
           </p>
        </div>
      </div>

      <div className="card-footer">
        <Clock size={12} style={{marginRight: '0.25rem'}} />
        <span>更新时间: {data.updateTime}</span>
      </div>
    </div>
  );
};

export default FundCard;
