import express from "express"
import mysql from "mysql2/promise"
import dotenv from "dotenv"

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


app.get("/tareas", async (req, res) => {
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
})


app.post("/tareas", async (req, res) => {
  const { descripcion, completada } = req.body
  if (!descripcion || completada === undefined) {
    return res.status(400).json({ ok: false, msg: "Faltan datos" })
  }


  const [existente] = await db.execute("SELECT * FROM tareas WHERE descripcion = ?", [descripcion])
  if (existente.length) {
    return res.status(400).json({ ok: false, msg: "Esta tarea se esta repitiendo" })
  }

  const [result] = await db.execute(
    "INSERT INTO tareas (descripcion, completada) VALUES (?, ?)",
    [descripcion, completada]
  )

  res.json({ ok: true, data: { id: result.insertId, descripcion, completada } })
})

app.get("/tareas/:id", async (req, res) => {
  const [rows] = await db.execute("SELECT * FROM tareas WHERE id = ?", [req.params.id])
  if (!rows.length) return res.status(404).json({ ok: false, msg: "Tarea no encontrada" })
  res.json({ ok: true, data: rows[0] })
})


app.delete("/tareas/:id", async (req, res) => {
  const [rows] = await db.execute("SELECT * FROM tareas WHERE id = ?", [req.params.id])
  if (!rows.length) return res.status(404).json({ ok: false, msg: "Tarea no encontrada para eliminar" })

  await db.execute("DELETE FROM tareas WHERE id = ?", [req.params.id])
  res.json({ ok: true, data: rows[0] })
})

app.listen(port, () => {
  console.log(`La aplicación esta funcionando en el puerto ${port}`);
});


