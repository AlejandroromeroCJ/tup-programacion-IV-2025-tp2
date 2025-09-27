import express from "express";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = 3000;

app.use(express.json());

//Conexión a MySQL usando variables del .env
const db = await mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
});

//POST → Crear alumno
app.post("/alumnos", async (req, res) => {
  const { nombre, materia, notas } = req.body;

  // Validaciones
  if (!nombre || !materia || !Array.isArray(notas) || notas.length !== 3) {
    return res.status(400).json({ error: "Nombre, materia y por lo ménos 3 notas requeridos" });
  }
  if (notas.some(n => n < 0 || n > 10)) {
    return res.status(400).json({ error: "Notas entre 0 y 10" });
  }

  // Verificar si el alumno ya existe en la misma materia
  const [exist] = await db.execute(
    "SELECT * FROM alumnos WHERE nombre = ? AND materia_id = (SELECT id FROM materias WHERE nombre = ?)",
    [nombre, materia]
  );

  if (exist.length > 0) {
    return res.status(400).json({ error: "Alumno ya existe en esa materia" });
  }

  // Si la materia no existe, crearla
  const [materiaRows] = await db.execute("SELECT id FROM materias WHERE nombre = ?", [materia]);
  let materiaId;
  if (materiaRows.length === 0) {
    const [result] = await db.execute("INSERT INTO materias (nombre) VALUES (?)", [materia]);
    materiaId = result.insertId;
  } else {
    materiaId = materiaRows[0].id;
  }

  // Guardar alumno
  const [result] = await db.execute(
    "INSERT INTO alumnos (nombre, materia_id, nota1, nota2, nota3) VALUES (?, ?, ?, ?, ?)",
    [nombre, materiaId, notas[0], notas[1], notas[2]]
  );

  res.status(201).json({ mensaje: "Alumno agregado", id: result.insertId });
});

//GET → Listar alumnos con promedio y estado
app.get("/alumnos", async (_req, res) => {
  const [rows] = await db.execute(`
    SELECT a.id, a.nombre, m.nombre AS materia, a.nota1, a.nota2, a.nota3
    FROM alumnos a
    JOIN materias m ON a.materia_id = m.id
  `);

  const data = rows.map(a => {
    const promedio = (a.nota1 + a.nota2 + a.nota3) / 3;
    const estado = promedio < 6 ? "Reprobado" : promedio < 8 ? "Aprobado" : "Promocionado";
    return { ...a, promedio, estado };
  });

  res.json(data);
});

//PUT → Actualizar alumno
app.put("/alumnos/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { nuevoNombre, materia, notas } = req.body;

  if (!nuevoNombre || !materia || !Array.isArray(notas) || notas.length !== 3) {
    return res.status(400).json({ error: "Nombre, materia y 3 notas requeridos" });
  }
  if (notas.some(n => n < 0 || n > 10)) {
    return res.status(400).json({ error: "Notas entre 0 y 10" });
  }

  // Verificar que el alumno exista
  const [alumnoExist] = await db.execute("SELECT * FROM alumnos WHERE id = ?", [id]);
  if (alumnoExist.length === 0) {
    return res.status(404).json({ error: "Alumno no encontrado" });
  }

  // Verificar duplicado nombre + materia (excepto este id)
  const [dup] = await db.execute(
    "SELECT * FROM alumnos WHERE nombre = ? AND materia_id = (SELECT id FROM materias WHERE nombre = ?) AND id != ?",
    [nuevoNombre, materia, id]
  );
  if (dup.length > 0) {
    return res.status(400).json({ error: "Otro alumno ya tiene ese nombre en la misma materia" });
  }

  // Si la materia no existe, crearla
  const [materiaRows] = await db.execute("SELECT id FROM materias WHERE nombre = ?", [materia]);
  let materiaId;
  if (materiaRows.length === 0) {
    const [result] = await db.execute("INSERT INTO materias (nombre) VALUES (?)", [materia]);
    materiaId = result.insertId;
  } else {
    materiaId = materiaRows[0].id;
  }

  // Actualizar alumno
  await db.execute(
    "UPDATE alumnos SET nombre = ?, materia_id = ?, nota1 = ?, nota2 = ?, nota3 = ? WHERE id = ?",
    [nuevoNombre, materiaId, notas[0], notas[1], notas[2], id]
  );

  res.json({ mensaje: "Alumno actualizado" });
});

//DELETE → Eliminar alumno
app.delete("/alumnos/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.execute("DELETE FROM alumnos WHERE id = ?", [id]);
  res.json({ mensaje: "Alumno eliminado", id });
});

app.listen(port, () => {
  console.log(`La aplicación está funcionando en el puerto ${port}`);
});
