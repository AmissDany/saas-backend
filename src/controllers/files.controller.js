import { cos, BUCKET } from "../config/cos.js";
import * as files from "../models/files.js";

// 🟢 Limpia "project:" y extrae UUID real de taskId
function cleanProjectId(id) {
  return id.replace(/^project:/, "");
}

function extractTaskUUID(id) {
  const parts = id.split(":");        // task : projectUUID : uuid
  return parts.length >= 3 ? parts[2] : parts[0]; // ← devuelve SOLO el UUID
}

/* ========== subir archivo ========== */
export async function uploadFile(req, res) {
  try {
    let { id: project_id, taskId } = req.params;

    const cleanProject = cleanProjectId(project_id);
    const cleanTaskId = extractTaskUUID(taskId);
    const file = req.file;

    if (!file) return res.status(400).json({ error: "missing_file" });

    const key = `${cleanProject}/${cleanTaskId}/${file.originalname}`;

    await cos.putObject({
      Bucket: BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype
    });

    const url = `${process.env.COS_ENDPOINT}/${BUCKET}/${key}`;

    const saved = await files.addFile({
      project_id: cleanProject,
      task_id: cleanTaskId,
      filename: file.originalname,
      mime: file.mimetype,
      size: file.size,
      url,
      key
    });

    res.status(201).json(saved);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "upload_failed", detail: e.message });
  }
}

/* ========== listar archivos ========== */
export async function listFiles(req, res) {
  const cleanTaskId = extractTaskUUID(req.params.taskId);
  const docs = await files.listFiles(cleanTaskId);
  res.json(docs);
}

/* ========== borrar archivo ========== */
export async function removeFile(req, res) {
  const cleanTaskId = extractTaskUUID(req.params.taskId);
  const fileId = req.params.fileId;

  const doc = await files.getFile(fileId);
  if (!doc) return res.status(404).json({ error: "file_not_found" });

  await cos.deleteObject({ Bucket: BUCKET, Key: doc.key });
  await files.deleteFile(fileId);

  res.status(204).end();
}
