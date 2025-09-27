import express from "express";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import { body, param, validationResult } from "express-validator";

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

const validar = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errores: errors.array() });
  }
  next();
};

// POST → Crear rectángulo
app.post(
  "/rectangulos",
  [
    body("ancho").isFloat({ gt: 0 }).withMessage("El ancho debe ser un número mayor que 0"),
    body("alto").isFloat({ gt: 0 }).withMessage("El alto debe ser un número mayor que 0"),
    validar,
  ],
  async (req, res) => {
    const { ancho, alto } = req.body;
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
  }
);

// GET → Ver todos los rectángulos
app.get("/rectangulos", async (_req, res) => {
  const [rows] = await db.execute("SELECT * FROM rectangulos");
  res.json(rows);
});

// PUT → Modificar un rectángulo
app.put(
  "/rectangulos/:id",
  [
    param("id").isInt({ min: 1 }).withMessage("El ID debe ser un número entero positivo"),
    body("ancho").isFloat({ gt: 0 }).withMessage("El ancho debe ser un número mayor que 0"),
    body("alto").isFloat({ gt: 0 }).withMessage("El alto debe ser un número mayor que 0"),
    validar,
  ],
  async (req, res) => {
    const id = Number(req.params.id);
    const { ancho, alto } = req.body;

    const perimetro = 2 * (ancho + alto);
    const superficie = ancho * alto;

    await db.execute(
      "UPDATE rectangulos SET ancho=?, alto=?, perimetro=?, superficie=? WHERE id=?",
      [ancho, alto, perimetro, superficie, id]
    );

    res.json({ id, ancho, alto, perimetro, superficie });
  }
);

// DELETE → Eliminar un rectángulo
app.delete(
  "/rectangulos/:id",
  [
    param("id").isInt({ min: 1 }).withMessage("El ID debe ser un número entero positivo"),
    validar,
  ],
  async (req, res) => {
    const id = Number(req.params.id);
    await db.execute("DELETE FROM rectangulos WHERE id=?", [id]);
    res.json({ success: true, id });
  }
);

app.listen(port, () => {
  console.log(`La aplicación está funcionando en el puerto ${port}`);
});
