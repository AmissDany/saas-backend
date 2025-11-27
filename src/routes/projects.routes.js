import { Router } from 'express';
import { requireAuth } from '../config/auth.js';

// 1. Corregimos los imports de authz (quitamos registerAction de aquí)
import {
  checkProjectAccess,
  requireOwner,
  requireWriter
} from '../middleware/authz.js';

// 2. Importamos registerAction del lugar correcto
import { registerAction } from '../middleware/activityLogger.js';

import {
  listMyProjects,
  createProject,
  getProject,
  patchProject,
  deleteProject
} from '../controllers/projects.controller.js';

import * as membersCtl from '../controllers/members.controller.js';
import * as tasksCtl from "../controllers/tasks.controller.js";

import multer from "multer";
const upload = multer();

const r = Router();

// ------------------------------
//   RUTAS DE PROYECTOS
// ------------------------------
r.get('/', requireAuth, listMyProjects);
r.post('/', requireAuth, createProject);

// Obtener un proyecto específico
r.get('/:id', requireAuth, checkProjectAccess, getProject);

// Actualizar proyecto
r.patch('/:id', 
  requireAuth, checkProjectAccess, requireWriter, 
  registerAction("PROJECT_UPDATED"), 
  patchProject
);

// Eliminar proyecto
r.delete('/:id', 
  requireAuth, checkProjectAccess, requireOwner, 
  registerAction("PROJECT_DELETED"), 
  deleteProject
);

// ------------------------------
//   RUTAS DE TAREAS (ANIDADAS)
// ------------------------------

// 1. Listar Tareas del Proyecto
r.get('/:id/tareas', 
  requireAuth, checkProjectAccess, 
  tasksCtl.listTasks
);

// 2. Crear Tarea
r.post('/:id/tareas', 
  requireAuth, checkProjectAccess, requireWriter,
  registerAction("TASK_CREATED"),
  tasksCtl.createTask
);

// 3. Editar Tarea
r.patch('/:id/tareas/:taskId',
  requireAuth, checkProjectAccess, requireWriter,
  registerAction("TASK_UPDATED"),
  tasksCtl.patchTask
);

// 4. Eliminar Tarea
r.delete('/:id/tareas/:taskId',
  requireAuth, checkProjectAccess, requireWriter,
  registerAction("TASK_DELETED"),
  tasksCtl.deleteTask
);

// 5. Importar Tareas desde CSV
r.post('/:id/tareas/import-csv',
  requireAuth, checkProjectAccess, requireWriter, 
  upload.single("csv"),
  tasksCtl.importCsvTasks
);

// ------------------------------
//   RUTAS DE MIEMBROS
// ------------------------------
r.get('/:id/members', requireAuth, checkProjectAccess, membersCtl.listMembers);

r.post('/:id/members', 
  requireAuth, checkProjectAccess, requireOwner, 
  membersCtl.addMemberByEmail
);

r.delete('/:id/members/:userId', 
  requireAuth, checkProjectAccess, requireOwner, 
  membersCtl.removeMember
);

r.patch('/:id/members/:userId/role', 
  requireAuth, checkProjectAccess, requireOwner, 
  membersCtl.updateRole
);

export default r;