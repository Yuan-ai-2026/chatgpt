export default async function handler(req, res) {
  try {
    // =========================
    // 1️⃣ 获取黄金价格（带容错）
    // =========================
    let price = "unknown";

    try {
      const goldRes = await fetch(
        `https://www.alphavantage.co/query?function=FX_INTRADAY&from_symbol=XAU&to_symbol=USD&interval=5min&apikey=${process.env.ALPHA_KEY}`
      );

      const goldData = await goldRes.json();

      const series = goldData["Time Series FX (5min)"];
      if (series) {
        price = Object.values(series)[0]["4. close"];
      } else {
        console.log("Alpha返回异常:", goldData);
      }
    } catch (e) {
      console.log("Alpha接口错误:", e);
    }

    // =========================
    // 2️⃣ 调用AI（强制JSON输出）
    // =========================
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
            role: "system",
            content: "你是一个专业交易分析助手，只能返回JSON，不允许任何额外文本"
          },
          {
            role: "user",
            content: `当前黄金价格为 ${price}。

请判断黄金（XAUUSD）走势。

必须严格返回JSON格式：
{
  "direction": "Bullish 或 Bearish",
  "confidence": 0-100之间的数字,
  "analysis": "一句话分析，不超过50字"
}`
          }
        ],
        response_format: {
          type: "json_object"
        }
      })
    });

    const aiData = await aiRes.json();

    // 👉 调试用（如果出问题可以打开看）
    console.log("AI返回:", aiData);

    const result = aiData.choices?.[0]?.message?.content;

    let parsed;

    try {
      parsed = JSON.parse(result);
    } catch (err) {
      console.log("JSON解析失败:", result);
      parsed = {
        direction: "Neutral",
        confidence: 50,
        analysis: "AI返回格式错误"
      };
    }
    console.log("AI原始输出：", aiResponse)
    // =========================
    // 3️⃣ 返回结果
    // =========================
    res.status(200).json(parsed);

  } catch (error) {
    console.error("服务器错误:", error);

    res.status(500).json({
      direction: "Error",
      confidence: 0,
      analysis: "服务器错误"
    });
  }
}
