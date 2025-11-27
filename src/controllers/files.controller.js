import { cos, BUCKET } from "../config/cos.js";
import * as files from "../models/files.js";
import cloudant, { DB } from "../config/cloudant.js";

export async function uploadFile(req, res) {
  console.log("\n📌 POST /files llamado");
  console.log("📥 Params:", req.params);
  console.log("📄 req.file:", req.file);
  console.log("📦 Body keys:", Object.keys(req.body));
  console.log("🔐 Headers:", req.headers["content-type"]);
  try {
    const { id: project_id, taskId: task_id } = req.params;
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
  const docs = await files.listFiles(req.params.taskId);
  console.log("📌 [FILES] GET /files llamada");
  console.log("🔍 params.id (proyecto)  =>", req.params.id);
  console.log("🔍 params.taskId          =>", req.params.taskId);
  console.log("🧩 URL completa recibida  =>", req.originalUrl);

  res.json(docs);
}

export async function removeFile(req, res) {
  try {
    console.log("🗑 DELETE FILE →", req.params);

    const fileId = req.params.fileId;
    const doc = await files.getFile(fileId);

    if (!doc) return res.status(404).json({ error: "file_not_found" });

    /** 1) Borrar archivo en COS */
    console.log("🗑 Eliminando en COS →", doc.key);
    await cos.deleteObject({
      Bucket: BUCKET,
      Key: doc.key
    });

    /** 2) Borrar documento en Cloudant */
    console.log("🗑 Eliminando registro Cloudant →", doc._id);
    await cloudant.deleteDocument({
      db: DB.files,
      docId: doc._id,
      rev: doc._rev
    });

    return res.status(204).end();

  } catch (err) {
    console.error("❌ Error delete file:", err);
    res.status(500).json({ error: "delete_failed", detail: err.message });
  }
}
