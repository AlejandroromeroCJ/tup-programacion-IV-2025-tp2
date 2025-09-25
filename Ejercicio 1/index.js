import express from "express";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = 3000;
app.use(express.json());

// Conexión a MySQL usando variables del .env
const db = await mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
});

// POST → Crear rectángulo
app.post("/rectangulos", async (req, res) => {
  const { ancho, alto } = req.body;

  if (typeof ancho !== "number" || typeof alto !== "number" || ancho <= 0 || alto <= 0) {
    return res.status(400).json({ error: "ancho y alto deben ser números > 0" });
  }

  const perimetro = 2 * (ancho + alto);
  const superficie = ancho * alto;

  const [result] = await db.execute(
    "INSERT INTO rectangulos (ancho, alto, perimetro, superficie) VALUES (?, ?, ?, ?)",
    [ancho, alto, perimetro, superficie]
  );

  res.status(201).json({
    id: result.insertId,
    ancho,
    alto,
    perimetro,
    superficie,
  });
});

// GET → Ver todos los rectángulos
app.get("/rectangulos", async (req, res) => {
  const [rows] = await db.execute("SELECT * FROM rectangulos");
  res.json(rows);
});


// PUT → Modificar un rectángulo
app.put("/rectangulos/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { ancho, alto } = req.body;

  if (typeof ancho !== "number" || typeof alto !== "number" || ancho <= 0 || alto <= 0) {
    return res.status(400).json({ error: "ancho y alto deben ser números > 0" });
  }

  const perimetro = 2 * (ancho + alto);
  const superficie = ancho * alto;

  await db.execute(
    "UPDATE rectangulos SET ancho=?, alto=?, perimetro=?, superficie=? WHERE id=?",
    [ancho, alto, perimetro, superficie, id]
  );

  res.json({ id, ancho, alto, perimetro, superficie });
});

// DELETE → Eliminar un rectángulo
app.delete("/rectangulos/:id", async (req, res) => {
  const id = Number(req.params.id);

  await db.execute("DELETE FROM rectangulos WHERE id=?", [id]);
  res.json({ success: true, id });
});

app.listen(port, () => {
  console.log(`La aplicación esta funcionando en el puerto ${port}`);
});
