import { fetchFundValuations } from './fundService';
import { guessPrefix } from '../utils/stockUtils';

// 持仓 API 端点 (通过 CORS 代理的小型 fetch)
const HOLDINGS_API_PRIMARY = '/api/em/mob/fundapi/FundBasicInit.ashx?FCODE=';
const HOLDINGS_API_FALLBACK = '/api/em/f10/FundArchivesDatas.aspx?type=jjcc&topline=10&code=';
const VALUATION_API_FALLBACK = '/api/em/gz/js/';

// 持仓缓存以避免频繁调用 API (缓存 1 天?)
// 会话内存缓存
const holdingsCache = {};

/**
 * 从天天基金 (EastMoney) 获取基金持仓。
 * 策略: 尝试主要接口 (JSON) -> 失败 -> 尝试备用接口 (HTML 抓取)
 * @param {string} fundCode (如 000216)
 */
const fetchHoldings = async (fundCode) => {
    // 1. 检查缓存
    if (holdingsCache[fundCode]) {
        return holdingsCache[fundCode];
    }
    
    const shortCode = fundCode.replace(/^(jj|sz|sh)/, '');
    let holdings = [];

    // 尝试主要接口
    try {
        holdings = await fetchHoldingsPrimary(shortCode);
    } catch (primaryErr) {
        console.warn(`Primary holdings API failed for ${fundCode}, trying fallback...`, primaryErr);
        // 尝试备用接口
        try {
            holdings = await fetchHoldingsFallback(shortCode);
        } catch (fallbackErr) {
            console.error(`All holdings sources failed for ${fundCode}`, fallbackErr);
            return []; // 放弃
        }
    }

    if (holdings && holdings.length > 0) {
        holdingsCache[fundCode] = holdings;
    }
    return holdings;
};

const fetchHoldingsPrimary = async (shortCode) => {
    const url = `${HOLDINGS_API_PRIMARY}${shortCode}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Primary API network error');
    
    const json = await res.json();
    // 检查 "busy" 逻辑，如果 API 返回 200 但有错误代码？
    // 通常 json.ErrCode != 0. 但我们先假设标准失败。
    
    // 结构: json.Data.Holding (股票) 或 json.Data.FundHolding (基金/ETF)
    const holdingList = json?.Data?.Holding || [];
    const fundHoldingList = json?.Data?.FundHolding || [];
    
    // 合并两个列表
    // 策略: 如果有 FundHoldings (ETF)，它们很可能是主要资产 (联接基金)。
    // 我们应该优先考虑它们或直接返回它们。
    // 通常联接基金有 1 个主要 ETF 持仓 (~90%)。
    // 股票可能只有少量或没有。
    if (fundHoldingList.length > 0) {
        return fundHoldingList.map(item => {
             // FundHolding 的字段名可能不同
             const rawCode = item.GPDM || item.BZDM || item.CODE || item.DM;
             const weightStr = item.JZBL || item.ZJZBL || item.WEIGHT;
             
             // ETF 代码需要严格正确的前缀。
             // 51xxxx -> sh, 15xxxx -> sz
             // parseHoldingItem 使用 guessPrefix，它可以处理 15/16 -> sz, 50/51 -> sh。
             return parseHoldingItem(rawCode, weightStr);
        });
    }

    const combinedList = [...holdingList];

    if (combinedList.length === 0) {
        // 可能是有效的空，或者是错误。如果完全没有 Data，通常是错误或繁忙。
        if (!json.Data) throw new Error('Primary API returned no Data (possible busy/limit)');
        return [];
    }

    return combinedList.map(item => {
        const rawCode = item.GPDM;
        const weightStr = item.JZBL;
        return parseHoldingItem(rawCode, weightStr);
    });
};

const fetchHoldingsFallback = async (shortCode) => {
    const url = `${HOLDINGS_API_FALLBACK}${shortCode}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Fallback API network error');
    
    const htmlText = await res.text();
    // 使用 regex 提取数据以避免部分 HTML 导致的繁重 DOM 解析问题
    // 查找行。
    // 模式: <td><a href="...">Code</a></td> ... <td>Percent%</td>
    // 但要验证结构。
    // 链接通常是: href="//quote.eastmoney.com/sh600519.html" 或类似
    // 或者仅仅是 <tbody> 内的 simple <td>Code</td>
    
    // 如果环境支持 (浏览器支持)，让我们使用 DOMParser 以获得更清晰的逻辑。
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, 'text/html');
    
    const rows = doc.querySelectorAll('tbody tr');
    const holdings = [];
    
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length < 3) return;
        
        // 通常: 第 1 列 = 代码 (或代码链接), 最后一列或倒数第二列 = 百分比
        // 让我们查找代码。通常在第 2 列 (索引 1)
        const codeText = cells[1]?.textContent?.trim();
        // 权重通常在最后一列或带有标签。
        // 让我们查找带有 '%' 的单元格
        let weightText = '';
        for (let i = 0; i < cells.length; i++) {
             const txt = cells[i].textContent.trim();
             if (txt.includes('%')) {
                 weightText = txt;
                 break; 
             }
        }
        
        if (codeText && weightText) {
             const weightVal = parseFloat(weightText.replace('%', ''));
             if (!isNaN(weightVal)) {
                 holdings.push(parseHoldingItem(codeText, weightVal.toString()));
             }
        }
    });

    return holdings;
};

const parseHoldingItem = (rawCode, weightStr) => {
    if (!rawCode) return null; // 安全检查

    // 猜测股票代码前缀
    const prefixResult = guessPrefix(rawCode);
    // 如果是数组，选择 'sz' 或 'sh' 一个 (股票), 忽略 'jj'.
    let code = Array.isArray(prefixResult) 
        ? prefixResult.find(c => c.startsWith('sz') || c.startsWith('sh')) 
        : prefixResult;
    
    if (!code) code = rawCode; // 回退

    const weight = parseFloat(weightStr);

    return {
        code: code,
        weight: isNaN(weight) ? 0 : weight / 100 // 转换百分比为小数
    };
};

/**
 * 计算基金的实时预估净值。
 * 公式: Est = PrevNAV * (1 + Sum(StockChange * Weight))
 * @param {string} fundCode - 基金代码 (如 '000216')
 * @param {number} prevNav - 昨日净值 (来自腾讯 jj 接口)
 * @returns {Promise<Object>} { estimatedNav, growthRate, details }
 */
export const calculateRealtimeEstimate = async (fundCode, prevNav) => {
  // 1. 并行获取天天基金估值 和 持仓
  const [emValuation, holdings] = await Promise.all([
      fetchEastMoneyValuation(fundCode),
      fetchHoldings(fundCode)
  ]);

  // 辅助函数: 检查持仓是否有效以进行计算
  const hasValidHoldings = holdings && holdings.length > 0 && holdings.some(h => h.weight > 0);

  if (!hasValidHoldings) {
    console.log(`Holdings invalid or empty for ${fundCode}, using EastMoney...`);
    return emValuation; 
  }

  // 2. 获取持仓的实时市场数据
  const holdingCodes = holdings.map(h => h.code);
  const marketDataMap = await fetchFundValuations(holdingCodes);

  // 3. 计算加权变化
  let totalWeightedChange = 0;
  
  const details = holdings.map(h => {
    // 处理港股或 ETF
    let marketItem = marketDataMap[h.code];
    if (!marketItem) return null;

    const growth = marketItem.growthRate || 0;
    const changeDecimal = growth / 100;
    const contribution = changeDecimal * h.weight;

    totalWeightedChange += contribution;

    return {
        code: h.code,
        name: marketItem.name,
        price: marketItem.price,
        change: growth,
        weight: h.weight
    };
  }).filter(item => item && item.name && item.price > 0);

  // 如果计算没有产生有效的详情 (例如所有市场数据都失败)，回退
  if (details.length === 0) {
      return emValuation;
  }

  // 4. 根据总权重重新标准化
  let totalKnownWeight = details.reduce((sum, h) => sum + h.weight, 0);
  
  if (totalKnownWeight < 0.05) {
       // 数据太少无法准确估算，如果有的话回退到天天基金
       if (emValuation) return emValuation;
       totalKnownWeight = 1; 
  }
  
  const estimatedGrowthDecimal = totalWeightedChange / totalKnownWeight;
  const estimatedNav = prevNav * (1 + estimatedGrowthDecimal);
  const estimatedGrowthRate = estimatedGrowthDecimal * 100;

  return {
    estimatedNav,
    growthRate: estimatedGrowthRate,
    holdings: details
  };
};

/**
 * 直接从天天基金 "fundgz" API 获取估值。
 * API 返回 JSONP: jsonpgz({"fundcode":"...","name":"...","jzrq":"2023-11-03","dwjz":"2.5480","gsz":"2.5512","gszzl":"0.13","gztime":"2023-11-06 15:00"});
 */
const fetchEastMoneyValuation = async (fundCode) => {
    const shortCode = fundCode.replace(/^(jj|sz|sh)/, '');
    const url = `${VALUATION_API_FALLBACK}${shortCode}.js`;
    
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error('EastMoney Valuation API failed');
        
        const text = await res.text();
        // Extract JSON from jsonpgz(...)
        const match = text.match(/jsonpgz\((.*)\)/);
        if (!match || !match[1]) return null;
        
        const data = JSON.parse(match[1]);
        
        return {
            estimatedNav: parseFloat(data.gsz),
            growthRate: parseFloat(data.gszzl),
            // 我们返回空持仓以告知 UI 这是一个没有细分的直接估算
            holdings: [] 
        };
    } catch (err) {
        console.warn('EastMoney fallback valuation failed:', err);
        return null; // 两种方法都失败
    }
};
