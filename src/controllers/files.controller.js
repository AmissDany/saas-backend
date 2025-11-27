import { cos, BUCKET } from "../config/cos.js";
import * as files from "../models/files.js";

function extractProjectId(id) {
  // project:UUID → UUID
  return id.includes(":") ? id.split(":")[1] : id;
}

function extractTaskId(taskId) {
  // task:PROJUUID:TASKUUID → TASKUUID
  const parts = taskId.split(":");
  return parts.length >= 3 ? parts[2] : taskId;
}

export async function uploadFile(req, res) {
  try {
    const rawProjectId = req.params.id;
    const rawTaskId   = req.params.taskId;

    const project_id = extractProjectId(rawProjectId);
    const task_id    = extractTaskId(rawTaskId);
    const file = req.file;

    if (!file) return res.status(400).json({ error: "missing_file" });

    const key = `${project_id}/${task_id}/${file.originalname}`;

    await cos.putObject({
      Bucket: BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype
    });

    const url = `${process.env.COS_ENDPOINT}/${BUCKET}/${key}`;

    const saved = await files.addFile({
      project_id,
      task_id,
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

export async function listFiles(req, res) {
  const task_id = extractTaskId(req.params.taskId);
  const docs = await files.listFiles(task_id);
  res.json(docs);
}

export async function removeFile(req, res) {
  const fileId = req.params.fileId;
  const doc = await files.getFile(fileId);

  const key = doc.key;

  await cos.deleteObject({
    Bucket: BUCKET,
    Key: key
  });

  await files.deleteFile(fileId);

  res.status(204).end();
}
