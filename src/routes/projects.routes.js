import { Router } from 'express';
import { requireAuth } from '../config/auth.js';

import {
  checkProjectAccess,
  requireOwner,
  requireWriter,
  requireEditorOrOwner
} from '../middleware/authz.js';

import {
  listMyProjects,
  createProject,
  getProject,
  patchProject,
  deleteProject
} from '../controllers/projects.controller.js';

import * as membersCtl from '../controllers/members.controller.js';

// 🟢 Importación correcta de tareas
import * as tasksCtl from "../controllers/tasks.controller.js";
import { importCsvTasks } from "../controllers/tasks.controller.js";

import { registerAction } from "../middleware/activityLogger.js";

import multer from "multer";
const upload = multer(); // <-- ahora multer procesa CSV

const r = Router();

// ------------------------------
//   PROYECTOS
// ------------------------------
r.get('/', requireAuth, listMyProjects);
r.post('/', requireAuth, createProject);

// GET /proyectos/:id
r.get('/:id', requireAuth, checkProjectAccess, getProject);

// 🟢 NUEVA RUTA NECESARIA
// GET /proyectos/:id/tareas
r.get(
  '/:id/tareas',
  requireAuth,
  checkProjectAccess,
  tasksCtl.listTasks
);

r.patch(
  '/:id',
  requireAuth,
  checkProjectAccess,
  registerAction("PROJECT_UPDATED"),
  requireWriter,
  patchProject
);

r.delete(
  "/:id",
  requireAuth,
  checkProjectAccess,
  requireOwner,
  registerAction("PROJECT_DELETED"),
  deleteProject
);

// Importar CSV de tareas
r.post(
  '/:id/tareas/import-csv',
  requireAuth,
  checkProjectAccess,
  requireEditorOrOwner,
  upload.single("csv"),
  importCsvTasks
);

// Miembros
r.get('/:id/members', requireAuth, checkProjectAccess, membersCtl.listMembers);

r.post(
  '/:id/members',
  requireAuth,
  checkProjectAccess,
  requireOwner,
  membersCtl.addMemberByEmail
);

r.delete(
  '/:id/members/:userId',
  requireAuth,
  checkProjectAccess,
  requireOwner,
  membersCtl.removeMember
);

r.patch(
  '/:id/members/:userId/role',
  requireAuth,
  checkProjectAccess,
  requireOwner,
  membersCtl.updateRole
);

export default r;
