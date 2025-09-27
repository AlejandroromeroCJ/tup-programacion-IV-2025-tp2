import express from "express"
import mysql from "mysql2/promise"
import dotenv from "dotenv"
import { body, param, query, validationResult } from "express-validator"   // 👈 agregado

dotenv.config()

const app = express()
const port = 3000

app.use(express.json())

const db = await mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
});

await db.execute(`
  CREATE TABLE IF NOT EXISTS tareas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    descripcion VARCHAR(255) UNIQUE NOT NULL,
    completada BOOLEAN NOT NULL
  )
`)

app.get("/", (_, res) => res.send("API de Tareas funcionando"))

// 🔹 Middleware para manejar errores de validación
const validar = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ ok: false, errors: errors.array() })
  }
  next()
}

app.get(
  "/tareas",
  [
    query("completada").optional().isBoolean().withMessage("completada debe ser true o false"),
    validar,
  ],
  async (req, res) => {
    const { completada } = req.query
    let query = "SELECT * FROM tareas"
    let params = []

    if (completada !== undefined) {
      query += " WHERE completada = ?"
      params.push(completada === "true")
    }

    const [rows] = await db.execute(query, params)
    if (!rows.length) return res.status(404).json({ ok: false, msg: "No hay tareas" })
    res.json({ ok: true, data: rows })
  }
)

app.post(
  "/tareas",
  [
    body("descripcion")
      .notEmpty().withMessage("La descripción es obligatoria")
      .isLength({ max: 255 }).withMessage("Máximo 255 caracteres"),
    body("completada")
      .isBoolean().withMessage("Completada debe ser true o false"),
    validar,
  ],
  async (req, res) => {
    const { descripcion, completada } = req.body

    const [existente] = await db.execute("SELECT * FROM tareas WHERE descripcion = ?", [descripcion])
    if (existente.length) {
      return res.status(400).json({ ok: false, msg: "Esta tarea se esta repitiendo" })
    }

    const [result] = await db.execute(
      "INSERT INTO tareas (descripcion, completada) VALUES (?, ?)",
      [descripcion, completada]
    )

    res.json({ ok: true, data: { id: result.insertId, descripcion, completada } })
  }
)

app.get(
  "/tareas/:id",
  [param("id").isInt({ min: 1 }).withMessage("El ID debe ser un número entero positivo"), validar],
  async (req, res) => {
    const [rows] = await db.execute("SELECT * FROM tareas WHERE id = ?", [req.params.id])
    if (!rows.length) return res.status(404).json({ ok: false, msg: "Tarea no encontrada" })
    res.json({ ok: true, data: rows[0] })
  }
)

app.delete(
  "/tareas/:id",
  [param("id").isInt({ min: 1 }).withMessage("El ID debe ser un número entero positivo"), validar],
  async (req, res) => {
    const [rows] = await db.execute("SELECT * FROM tareas WHERE id = ?", [req.params.id])
    if (!rows.length) return res.status(404).json({ ok: false, msg: "Tarea no encontrada para eliminar" })

    await db.execute("DELETE FROM tareas WHERE id = ?", [req.params.id])
    res.json({ ok: true, data: rows[0] })
  }
)

app.listen(port, () => {
  console.log(`La aplicación esta funcionando en el puerto ${port}`);
});
