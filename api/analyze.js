export default async function handler(req, res) {
  try {
    // 👉 1. 你的输入（可以以后改成动态数据）
    const prompt = `
你是一个专业黄金交易分析师，请根据宏观信息判断黄金（XAUUSD）走势。

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
- 市场无明显避险情绪
`;

    // 👉 2. 调用OpenAI
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3
      })
    });

    const data = await response.json();

    // 👉 3. 获取AI原始输出
    let aiText = data.choices?.[0]?.message?.content || "";

    console.log("AI原始输出:", aiText);

    // 👉 4. 清洗函数（关键）
    function cleanJSON(text) {
      return text
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();
    }

    let parsed;

    try {
      const cleaned = cleanJSON(aiText);
      parsed = JSON.parse(cleaned);
    } catch (err) {
      console.error("解析失败:", aiText);

      // 👉 5. fallback（避免崩溃）
      parsed = {
        direction: "Neutral",
        confidence: 50,
        analysis: "AI返回格式错误"
      };
    }

    // 👉 6. 返回结果
    res.status(200).json(parsed);

  } catch (error) {
    console.error("服务器错误:", error);

    res.status(500).json({
      direction: "Neutral",
      confidence: 50,
      analysis: "服务器错误"
    });
  }
}
