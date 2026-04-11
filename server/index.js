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
        model: "llama-3.3-70b-versatile",
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
console.log("Respuesta Groq:", JSON.stringify(data));
const text = data.choices?.[0]?.message?.content || "";
console.log("Texto recibido:", text);

let parsed;
try {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No se encontró JSON en la respuesta");
  parsed = JSON.parse(match[0]);
} catch (e) {
  console.error("Error parseando JSON:", e.message);
  throw new Error("Respuesta inválida del modelo");
}
res.json(parsed);
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/chat", async (req, res) => {
  const { messages, system } = req.body;
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.VITE_GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 500,
        messages: [
          { role: "system", content: system },
          ...messages,
        ],
      }),
    });
    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "No pude procesar tu pregunta.";
    res.json({ reply });
  } catch (e) {
    res.status(500).json({ reply: "Error al conectar con el asistente." });
  }
});

app.listen(3001, () => console.log("Server corriendo en http://localhost:3001"));