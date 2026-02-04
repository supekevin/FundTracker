/**
 * 基金/股票估值服务
 * 从腾讯财经 (qt.gtimg.cn) 获取实时数据。
 * 
 * API 端点: https://qt.gtimg.cn/q={codes}
 * 代理: https://corsproxy.io/?
 * 编码: GBK
 */

import { guessPrefix } from '../utils/stockUtils';

const TENCENT_API_BASE = '/api/qt/q=';

/**
 * 获取一组代码的估值数据。
 * @param {string|string[]} codes - 单个代码或代码数组 (如 'sh600519', 'sz00700')
 * @returns {Promise<Object>} 代码到数据对象的映射
 */
export const fetchFundValuations = async (codes) => {
  const codeList = Array.isArray(codes) ? codes : [codes];
  if (codeList.length === 0) return {};

  // 规范化代码：如果缺少前缀则尝试猜测
  // 使用 flatMap 因为 guessPrefix 可能对一个代码返回多个候选 (如 000001 -> sz000001, jj000001)
  const normalizedCodes = codeList.flatMap(guessPrefix);
  
  // 去重
  const uniqueCodes = [...new Set(normalizedCodes)];

  const query = uniqueCodes.join(',');
  const targetUrl = `${TENCENT_API_BASE}${query}`;

  try {
    const response = await fetch(targetUrl);
    if (!response.ok) {
      throw new Error(`Network response was not ok: ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    const decoder = new TextDecoder('gbk');
    const text = decoder.decode(buffer);
    
    // 注意：这里我们不严格检查 v_pv_none_match，因为双重查询（sz+jj）时，
    // 可能一个失败（none_match）而另一个成功。
    // 解析器将直接提取有效内容。

     return parseTencentData(text);
  } catch (error) {
    console.error("Failed to fetch fund valuations:", error);
    throw error;
  }
};

/**
 * 解析来自腾讯 API 的原始响应。
 * 股票格式 (sh/sz): v_sh600519="51~名称~代码~当前价~昨收~...";
 * 基金格式 (jj): v_jj000216="代码~名称~?~?~?~净值~累计净值~?~日期~...";
 */
const parseTencentData = (text) => {
  const lines = text.split(';');
  const result = {};

  lines.forEach(line => {
    const cleanLine = line.trim();
    if (!cleanLine) return;
    
    // 忽略错误行
    if (cleanLine.includes('v_pv_none_match')) return;

    // 从变量名中提取代码: v_sh600519="..."
    // v_(code)=
    const match = cleanLine.match(/v_([a-zA-Z0-9]+)="(.*)"/);
    if (!match) return;

    const fullCode = match[1]; 
    const dataStr = match[2];
    const parts = dataStr.split('~');

    let name, code, currentPrice, prevClose, growthRate, updateTime;

    // 根据前缀或部分长度/内容使用不同的解析逻辑
    if (fullCode.startsWith('jj')) {
        // 基金格式: 代码~名称~?~?~?~净值~累计净值~?~最新日期~...
        // 例如: 000216~Name~0~0~~3.8065~3.8065~...~2026-02-03
        // 索引 5: 净值 (最新可用的，如果是盘前/盘中通常是昨日收盘价)
        // 索引 4: 通常是股票格式中的昨收，但这里为空。
        // 我们无法通过特定的 'jj' 接口轻松获得开放式基金的实时增长
        // 因为它似乎返回静态的 EOD (End of Day) 数据。
        // 但是，用户期望看到 *一些东西*。
        // 如果日期是今天，那么净值是今天的组件？不，通常有效日期是昨天。
        
        code = parts[0];
        name = parts[1];
        currentPrice = parseFloat(parts[5]); // 使用最新净值作为 "价格"
        
        // 尝试在其他槽位找到先前的净值？
        // 也就是昨收。如果没有它，我们无法计算每日增长。
        // 我们将默认为 0。
        // 注意：基金的实时估值通常需要 's_jj' 或不同的来源。
        prevClose = currentPrice; // 设置相等以避免大幅波动或 NaN。
        growthRate = 0; 
        updateTime = parts[8] || 'EOD'; 
    } else {
        // 股票格式 (sh/sz/hk)
        // 51~名称~代码~当前价~昨收~...
        // 索引: 1=名称, 2=代码, 3=当前价, 4=昨收
        if (parts.length < 5) return;
        name = parts[1];
        code = parts[2];
        currentPrice = parseFloat(parts[3]);
        prevClose = parseFloat(parts[4]);
        
        // 计算增长率: ((当前 - 昨收) / 昨收) * 100
        growthRate = 0;
        if (prevClose > 0) {
          growthRate = ((currentPrice - prevClose) / prevClose) * 100;
        }
        updateTime = new Date().toLocaleTimeString();
    }

    // 映射到与 UI 兼容的标准化结构
    result[fullCode] = {
      code: fullCode, 
      shortCode: code,
      name: name,
      price: currentPrice || 0, // Fallback 0
      prevClose: prevClose,
      growthRate: growthRate,
      updateTime: updateTime,
      // Dashboard 的向后兼容字段
      nav: prevClose,
      estimatedNav: currentPrice || 0,
    };
  });

  return result;
};

// 向后兼容别名
export const fetchFundValuation = async (code) => {
    const data = await fetchFundValuations([code]);
    return data[code];
};
