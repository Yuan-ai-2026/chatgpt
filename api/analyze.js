export default async function handler(req, res) {

  // 1️⃣ 获取市场数据
  const goldRes = await fetch(`https://www.alphavantage.co/query?function=FX_INTRADAY&from_symbol=XAU&to_symbol=USD&interval=5min&apikey=${process.env.ALPHA_KEY}`);
  const goldData = await goldRes.json();

  const price = Object.values(goldData["Time Series FX (5min)"] || {})[0]?.["4. close"];

  // 2️⃣ AI分析
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
          content: `黄金当前价格 ${price}，请判断走势，输出JSON：
          {direction: Bullish/Bearish, confidence: 0-100, analysis: "..."}`
        }
      ]
    })
  });

  const aiData = await aiRes.json();
  const text = aiData.choices[0].message.content;

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = {
      direction: "Neutral",
      confidence: 50,
      analysis: text
    };
  }

  res.status(200).json(parsed);
}
