/**
 * Normalizes stock/fund code by adding prefix if missing.
 * Heuristic based on common Chinese market patterns.
 * @param {string} code - The code to guess prefix for (e.g. "600519")
 * @returns {string|string[]} - The code with prefix (e.g. "sh600519") or array of candidates.
 */
export const guessPrefix = (code) => {
    if (!code || !/^\d+$/.test(code)) return code; // Already has prefix or acts like one
  
    // Heuristics for 6-digit codes
    if (code.length === 6) {
      if (['50', '51', '60', '68'].some(p => code.startsWith(p))) return `sh${code}`; // SH Stocks/ETFs
      
      if (code.startsWith('00')) {
          // AMBIGUITY: 00xxxx can be Shenzhen Stock (sz) OR Open-Ended Fund (jj).
          // Example: 000001 (Ping An - sz) vs 000001 (HuaXia Growth - jj).
          // Example: 000216 (HuaAn Cash - jj) checking sz000216 returns none.
          // STRATEGY: Query BOTH.
          return [`sz${code}`, `jj${code}`];
      }
  
      if (code.startsWith('30')) return `sz${code}`; // ChiNext (SZ)
      if (code.startsWith('16')) return [`sz${code}`, `jj${code}`]; // LOF: Check both Market (sz) and Fund (jj)
      if (code.startsWith('15')) return `sz${code}`; // ETF usually SZ
      if (['83', '87', '43'].some(p => code.startsWith(p))) return `bj${code}`; // Beijing Stock Exchange
      
      // For others (e.g. 11xxxx), default to 'jj' (Open Ended Funds)
      return `jj${code}`; 
    }
    
    // Hong Kong often 5 digits
    if (code.length === 5) return `hk${code}`;
    
    return code; 
  };
