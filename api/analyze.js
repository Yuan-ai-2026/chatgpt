export default async function handler(req, res) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
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
          content: "分析黄金走势：美元上涨，美债收益率上涨"
        }
      ]
    })
  });

  const data = await response.json();
  res.json(data);
}
