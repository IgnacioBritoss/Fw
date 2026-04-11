import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config({ path: "../.env" });

const app = express();
app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

app.post("/api/specs", async (req, res) => {
  const { brand, model, year } = req.body;
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.VITE_GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: `Dado el siguiente vehículo: ${brand} ${model} año ${year}.
Devolvé SOLO un objeto JSON válido (sin texto adicional, sin markdown, sin backticks) con estas especificaciones:
{
  "baul_litros": número,
  "aire_acondicionado": "Sí" o "No" o "Climatizador",
  "puertas": número,
  "potencia_cv": número,
  "consumo_mixto": "X l/100km",
  "traccion": "Delantera" o "Trasera" o "4x4",
  "largo_mm": número,
  "ancho_mm": número,
  "peso_kg": número,
  "bluetooth": "Sí" o "No",
  "camara_reversa": "Sí" o "No",
  "sensor_estacionamiento": "Sí" o "No" o "Traseros" o "Delanteros y traseros"
}
Solo JSON, nada más.`
        }]
      }),
    });
    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "";
    const clean = text.replace(/```json|```/g, "").trim();
    const specs = JSON.parse(clean);
    res.json(specs);
  } catch (e) {
    res.status(500).json({ error: "No se pudieron obtener las specs" });
  }
});

app.listen(3001, () => console.log("Server corriendo en http://localhost:3001"));