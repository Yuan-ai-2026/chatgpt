export default async function handler(req, res) {
  try {
    const prompt = `
你是一个黄金（XAUUSD）分析师。

请严格按照以下JSON格式输出：

{
  "direction": "Bullish 或 Bearish 或 Neutral",
  "confidence": 0-100之间的数字,
  "analysis": "一句话分析，不超过50字"
}

要求：
- 只能输出JSON
- 不要使用代码块
- 不要解释
- 不要多余文字

当前信息：
- 美元指数上涨
- 美债收益率上升
- 无明显避险情绪
`;

    // 👉 调用 AI（你可以换 DeepSeek / OpenAI）
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3
      })
    });

    const result = await response.json();

    // 👉 1. 获取AI原始输出
    let aiText = result.choices?.[0]?.message?.content || "";

    console.log("AI原始输出:", aiText);

    // 👉 2. 超强清洗函数（关键）
    function extractJSON(text) {
      if (!text) return null;

      // 去掉 ```json ``` 包裹
      text = text.replace(/```json/g, "").replace(/```/g, "").trim();

      // 找第一个 { 到最后一个 }
      const start = text.indexOf("{");
      const end = text.lastIndexOf("}");

      if (start !== -1 && end !== -1) {
        return text.substring(start, end + 1);
      }

      return null;
    }

    let parsed;

    try {
      const jsonString = extractJSON(aiText);

      if (!jsonString) throw new Error("没有找到JSON");

      parsed = JSON.parse(jsonString);
    } catch (err) {
      console.error("❌ JSON解析失败:", aiText);

      // 👉 3. 兜底智能解析（即使AI乱说也能用）
      parsed = fallbackParse(aiText);
    }

    // 👉 4. 标准化输出（防止字段错）
    const finalData = {
      direction: normalizeDirection(parsed.direction),
      confidence: normalizeConfidence(parsed.confidence),
      analysis: parsed.analysis || "无分析",
      raw: aiText // 👈 调试用
    };

    res.status(200).json(finalData);

  } catch (error) {
    console.error("服务器错误:", error);

    res.status(500).json({
      direction: "Neutral",
      confidence: 50,
      analysis: "服务器错误"
    });
  }
}

//
// 🔧 工具函数
//

function normalizeDirection(dir) {
  if (!dir) return "Neutral";

  const d = dir.toLowerCase();

  if (d.includes("bull")) return "Bullish";
  if (d.includes("bear")) return "Bearish";

  return "Neutral";
}

function normalizeConfidence(num) {
  const n = Number(num);
  if (isNaN(n)) return 50;
  return Math.max(0, Math.min(100, n));
}

function fallbackParse(text) {
  if (!text) {
    return {
      direction: "Neutral",
      confidence: 50,
      analysis: "无数据"
    };
  }

  // 👉 简单关键词判断（最后兜底）
  let direction = "Neutral";

  if (text.toLowerCase().includes("bull")) direction = "Bullish";
  if (text.toLowerCase().includes("bear")) direction = "Bearish";

  return {
    direction,
    confidence: 50,
    analysis: text.slice(0, 60)
  };
}
