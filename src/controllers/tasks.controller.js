import * as tasks from '../models/tasks.js';
import cloudant, { DB } from "../config/cloudant.js";
import { deleteDocsBySelector, deleteCOSFolder } from "../utils/cascadeDelete.js";
import { parse } from "csv-parse/sync";
import * as memberships from "../models/memberships.js";

export async function listTasks(req, res) {
  const { estado, asignado_a } = req.query;
  const tareas = await tasks.listByProject(req.params.id, { estado, asignado_a });
  res.json(tareas);
}

export async function createTask(req, res) {
  const { titulo, descripcion, estado, responsables, fecha_inicio, fecha_fin } = req.body;
  const tarea = await tasks.create({
    project_id: req.params.id,
    titulo, descripcion, estado, responsables, fecha_inicio, fecha_fin
  });
  res.status(201).json(tarea);
}

export async function patchTask(req, res) {
  const updated = await tasks.patch(req.params.taskId, req.body || {});
  res.json(updated);
}

export async function deleteTask(req, res) {
  try {
    const { id: projectId, taskId } = req.params;

    await deleteTaskCascade(taskId, projectId);

    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "error_deleting_task" });
  }
}

export async function deleteTaskCascade(taskId, projectId) {
  const prefix = `${projectId}/${taskId}/`;

  await deleteCOSFolder(prefix);

  await deleteDocsBySelector(DB.files, { task_id: taskId });
  await deleteDocsBySelector(DB.activity, { task_id: taskId });

  const taskDoc = await cloudant.getDocument({
    db: DB.tasks,
    docId: taskId
  });

  await cloudant.deleteDocument({
    db: DB.tasks,
    docId: taskId,
    rev: taskDoc.result._rev
  });
}

export async function importCsvTasks(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "missing_csv_file" });
    }

    const csvText = req.file.buffer.toString("utf8");

    let records;
    try {
      records = parse(csvText, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
    } catch (e) {
      return res.status(400).json({ error: "invalid_csv_format" });
    }

    const project_id = req.params.id;
    const members = await memberships.listByProject(project_id);

    const emailToUserId = {};
    for (const m of members) {
      if (m.status === "active" && m.user_id && m.email) {
        emailToUserId[m.email.trim().toLowerCase()] = m.user_id;
      }
    }

    let created = 0;
    let errors = [];

    for (let i = 0; i < records.length; i++) {
      const r = records[i];
      const titulo = r.titulo?.trim();

      if (!titulo) {
        errors.push(`Fila ${i + 1}: falta título`);
        continue;
      }

      let responsables = [];
      if (r.responsables) {
        const correos = r.responsables
          .split(";")
          .map((x) => x.trim().toLowerCase())
          .filter((x) => x.length > 0);

        responsables = correos
          .filter((correo) => emailToUserId[correo])
          .map((correo) => emailToUserId[correo]);
      }

      try {
        await tasks.create({
          project_id,
          titulo,
          descripcion: r.descripcion || "",
          estado: r.estado || "pendiente",
          responsables,
          fecha_inicio: r.fecha_inicio || null,
          fecha_fin: r.fecha_fin || null,
        });

        created++;
      } catch (e) {
        errors.push(`Fila ${i + 1}: ${e.message}`);
      }
    }

    await cloudant.postDocument({
      db: DB.activity,
      document: {
        _id: `act:${project_id}:${Date.now()}`,
        project_id,
        action: "CSV_IMPORTED",
        description: `Se importaron ${created} tareas desde archivo CSV`,
        created_at: new Date().toISOString(),
        metadata: {
          created,
          errors,
          total: records.length,
        },
      },
    });

    return res.json({
      created,
      errors,
      total: records.length,
    });

  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "import_failed" });
  }
}

