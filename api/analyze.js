export default async function handler(req, res) {
  try {
    // ✅ 1. 获取黄金价格（带容错）
    let price = "unknown";

    try {
      const goldRes = await fetch(`https://www.alphavantage.co/query?function=FX_INTRADAY&from_symbol=XAU&to_symbol=USD&interval=5min&apikey=${process.env.ALPHA_KEY}`);
      const goldData = await goldRes.json();

      const series = goldData["Time Series FX (5min)"];
      if (series) {
        price = Object.values(series)[0]["4. close"];
      }
    } catch (e) {
      console.log("Alpha error:", e);
    }

    // ✅ 2. AI分析（强制返回JSON）
    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: `黄金价格 ${price}，请严格输出JSON：
{
  "direction": "Bullish 或 Bearish",
  "confidence": 0-100,
  "analysis": "一句话解释"
}`
          }
        ]
      })
    });

    const aiData = await aiRes.json();
    let text = aiData.choices?.[0]?.message?.content || "";

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = {
        direction: "Neutral",
        confidence: 50,
        analysis: text || "AI解析失败"
      };
    }

    res.status(200).json(parsed);

  } catch (err) {
    res.status(500).json({
      direction: "Error",
      confidence: 0,
      analysis: "服务器错误"
    });
  }
}
