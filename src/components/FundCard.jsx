import React from 'react';
import { TrendingUp, TrendingDown, Clock, Trash2, GripVertical } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const FundCard = ({ id, data, holdings, onDelete, onClick, onEditHoldings }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isPositive = parseFloat(data.growthRate) >= 0;
  const growthClass = isPositive ? 'up' : 'down';
  const GrowthIcon = isPositive ? TrendingUp : TrendingDown;

  // Calculate individual P&L
  const shares = holdings || 0;
  const currentPrice = data.estimatedNav || data.nav || 0;
  const dailyPnL = shares > 0 ? (currentPrice - data.prevClose) * shares : 0;

  return (
    <div 
        ref={setNodeRef}
        style={{...style, position: 'relative'}}
        className={`glass-panel fund-card animate-in ${data.holdings ? 'cursor-pointer hover:border-sky-500/50' : ''}`}
        onClick={onClick}
    > 
      {/* Drag Handle - Absolute Positioned */}
      <div 
          {...attributes} 
          {...listeners} 
          className="drag-handle"
          style={{ 
              position: 'absolute', 
              top: '8px', 
              left: '4px', 
              cursor: 'grab', 
              color: 'rgba(255,255,255,0.3)', 
              zIndex: 10,
              padding: '4px' 
          }}
          onClick={(e) => e.stopPropagation()} 
      >
          <GripVertical size={20} />
      </div>

      <div className="card-header" style={{ paddingLeft: '1rem' }}>
        <div>
           <h2 className="fund-name">{data.name}</h2> 
           <span className="fund-code">
             {data.code} {data.isEstimated && <span className="text-xs text-amber-500">(预估)</span>} 
           </span>
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
                className="btn-icon" 
                title="设置持仓"
                onClick={(e) => {
                    e.stopPropagation(); // Stop propagation to avoid card click
                    onEditHoldings(e);
                }}
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
            > 
              <Trash2 size={18} />
            </button>
        </div>
      </div>

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
