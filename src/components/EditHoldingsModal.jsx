import React, { useState, useEffect } from 'react';
import { X, Save, Calculator, ArrowRight, Wallet } from 'lucide-react';

const EditHoldingsModal = ({ fund, currentShares, onClose, onSave }) => {
  const [amount, setAmount] = useState('');
  
  useEffect(() => {
     if (currentShares && fund && fund.nav) {
         setAmount((currentShares * fund.nav).toFixed(2));
     } else {
         setAmount('');
     }
  }, [currentShares, fund]);

  if (!fund) return null;

  const handleSave = () => {
    const val = parseFloat(amount);
    if (!fund.nav || fund.nav === 0) {
        onSave(fund.code, 0);
    } else {
        const shares = isNaN(val) ? 0 : val / fund.nav;
        onSave(fund.code, shares);
    }
    onClose();
  };

  const calculatedShares = ((parseFloat(amount) || 0) / fund.nav);
  const estimatedValue = calculatedShares * fund.estimatedNav;

  return (
    <div className="modal-overlay" onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div 
        className="glass-panel" 
        onClick={e => e.stopPropagation()}
        style={{ 
          width: '100%', maxWidth: '420px', padding: '0', 
          overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' 
        }}
      >
        {/* Header */}
        <div style={{ 
          padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'white' }}>持仓设置</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
              {fund.name} ({fund.code})
            </p>
          </div>
          <button 
            onClick={onClose}
            className="btn-icon"
            style={{ width: '32px', height: '32px', background: 'rgba(255,255,255,0.1)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.5rem' }}>
          
          {/* Input Section */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ 
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              color: 'var(--color-accent)', fontSize: '0.9rem', marginBottom: '0.75rem', fontWeight: '500' 
            }}>
              <Wallet size={16} />
              投入金额 / 昨日市值
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ 
                position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)',
                color: 'white', fontSize: '1.2rem', fontWeight: 'bold'
              }}>¥</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                style={{
                  width: '100%',
                  padding: '1rem 1rem 1rem 2.5rem',
                  borderRadius: '0.75rem',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(0,0,0,0.3)',
                  color: 'white',
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  outline: 'none',
                  transition: 'all 0.2s'
                }}
                autoFocus
                onFocus={(e) => e.target.style.borderColor = 'var(--color-accent)'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem', paddingLeft: '0.5rem' }}>
              按昨日净值 <span style={{color:'white'}}>{fund.nav}</span> 自动折算份额
            </p>
          </div>

          {/* Conversion Visual */}
          {amount && fund.estimatedNav && (
            <div style={{ 
              background: 'rgba(255,255,255,0.03)', borderRadius: '0.75rem', padding: '1rem',
              border: '1px solid rgba(255,255,255,0.05)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                <Calculator size={14} style={{ marginRight: '0.5rem' }} />
                <span style={{ fontSize: '0.8rem' }}>实时预估价值计算</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                 <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>折算份额</p>
                    <p style={{ fontSize: '1rem', fontWeight: 'bold' }}>{calculatedShares.toFixed(2)}</p>
                 </div>
                 
                 <ArrowRight size={16} style={{ color: 'var(--text-secondary)', opacity: 0.5 }} />
                 
                 <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>当前市值 (预估)</p>
                    <p style={{ fontSize: '1.1rem', fontWeight: 'bold', color: estimatedValue >= parseFloat(amount) ? '#ef4444' : '#22c55e' }}>
                       ¥{estimatedValue.toFixed(2)}
                    </p>
                 </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ 
          padding: '1.25rem 1.5rem', background: 'rgba(0,0,0,0.2)', borderTop: '1px solid rgba(255,255,255,0.05)',
          display: 'flex', justifyContent: 'flex-end', gap: '1rem'
        }}>
          <button 
            onClick={onClose} 
            className="btn"
            style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)' }}
          >
            取消
          </button>
          <button 
            onClick={handleSave} 
            className="btn"
            style={{ paddingLeft: '1.5rem', paddingRight: '1.5rem' }}
          >
            <Save size={18} style={{ marginRight: '0.5rem' }} />
            确认保存
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditHoldingsModal;
