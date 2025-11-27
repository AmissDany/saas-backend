import * as memberships from '../models/memberships.js';

export async function checkProjectAccess(req, res, next) {
    try {
        const projectId = req.params.id || req.body.project_id;
        if (!req.userId || !projectId) return res.status(400).json({ error: 'missing user/project' });
        const member = await memberships.findOne({ user_id: req.userId, project_id: projectId, status: 'active' });
        if (!member) return res.status(403).json({ error: 'forbidden' });
        req.member = member;
        next();
    } catch (e) {
        next(e);
    }
}

export function requireOwner(req, res, next) {
    if (req.member?.rol !== 'owner') return res.status(403).json({ error: 'owner_only' });
    next();
}

export function requireEditorOrOwner(req, res, next) {
  const role = req.member?.rol;
  if (role === "owner" || role === "editor") return next();
  return res.status(403).json({ error: "editor_or_owner_only" });
}

export function requireWriter(req, res, next) {
  // writer = editor o owner
  const role = req.member?.rol;
  if (role === "owner" || role === "editor") return next();
  return res.status(403).json({ error: "no_write_permission" });
}
