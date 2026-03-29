export default async function handler(req, res) {
  try {
    const prompt = `
你是一个黄金（XAUUSD）宏观交易分析师。

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

当前市场信息：
- 美元指数上涨
- 美债收益率上升
- 市场无明显避险情绪
`;

    // ✅ DeepSeek API调用
    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "user", content: prompt }
        ],
        temperature: 0.3
      })
    });

    const result = await response.json();

    console.log("🔥 完整返回:", result);

    // ✅ 获取AI文本（和OpenAI兼容）
    let aiText = result.choices?.[0]?.message?.content || "";

    console.log("🧠 AI原始输出:", aiText);

    // 🧹 提取JSON（核心修复）
    function extractJSON(text) {
      if (!text) return null;

      text = text.replace(/```json/g, "").replace(/```/g, "").trim();

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

      if (!jsonString) throw new Error("没有JSON");

      parsed = JSON.parse(jsonString);
    } catch (err) {
      console.error("❌ JSON解析失败:", aiText);

      parsed = fallbackParse(aiText);
    }

    // 🎯 标准化输出
    const finalData = {
      direction: normalizeDirection(parsed.direction),
      confidence: normalizeConfidence(parsed.confidence),
      analysis: parsed.analysis || "无分析",
      raw: aiText
    };

    res.status(200).json(finalData);

  } catch (error) {
    console.error("❌ 服务器错误:", error);

    res.status(500).json({
      direction: "Neutral",
      confidence: 50,
      analysis: "服务器错误"
    });
  }
}

// 🔧 工具函数

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

  let direction = "Neutral";

  if (text.toLowerCase().includes("bull")) direction = "Bullish";
  if (text.toLowerCase().includes("bear")) direction = "Bearish";

  return {
    direction,
    confidence: 50,
    analysis: text.slice(0, 60)
  };
}
