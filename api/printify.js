module.exports = async function handler(req, res) {
  const path = req.query.path || "/v1/shops.json";
  const url = `https://api.printify.com${path}`;

  const response = await fetch(url, {
    method: req.method,
    headers: {
      "Authorization": `Bearer ${process.env.PRINTIFY_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: req.method !== "GET" ? JSON.stringify(req.body) : undefined,
  });

  const data = await response.json();
  res.status(response.status).json(data);
};
