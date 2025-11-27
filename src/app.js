// app.js
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import cloudant from './config/cloudant.js'
import { requireAuth } from './config/auth.js'
import authRoutes from './routes/auth.routes.js'
import meRoutes from './routes/me.routes.js'
import projectsRoutes from './routes/projects.routes.js'
import tasksRoutes from './routes/tasks.routes.js'
import filesRoutes from "./routes/files.routes.js";
import activityRoutes from "./routes/activity.routes.js"
import compression from 'compression';

dotenv.config()

const app = express()

const allowedOrigins = [
  "https://saas-frontend-onpj.onrender.com",
  "http://localhost:5173"
];
app.use(cors({
  origin: function (origin, callback) {
    // Permitir Postman, curl, etc
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("CORS no permitido: " + origin));
  },
  credentials: true
}));


app.use(compression())
app.use(express.json())

// Ruta de prueba general
app.get('/api', (_req, res) => {
  res.json({ message: "API funcionando" })
})

// Ruta raíz solo para ver que el servidor está arriba
app.get('/', (_req, res) => { res.send('El servidor funciona') })
app.get('/health', (_req, res) => { res.json({ ok: true }) })

// Rutas del backend bajo /api
app.use("/api", activityRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/me', meRoutes)
app.use('/api/proyectos', projectsRoutes)
app.use('/api/tasks', tasksRoutes)
app.use("/api", filesRoutes)

export default app
