/**
 * This is a API server
 */

import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import authRoutes from './routes/auth.js'
import aiRoutes from './routes/ai.js'
import buildingsRoutes from './routes/buildings.js'
import tenantsRoutes from './routes/tenants.js'
import reportsRoutes from './routes/reports.js'

// for esm mode
const __filename = fileURLToPath(import.meta.url)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _dirname = path.dirname(__filename)

// load env
dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

/**
 * API Routes
 */
app.use('/api/auth', authRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/buildings', buildingsRoutes)
app.use('/api/tenants', tenantsRoutes)
app.use('/api/reports', reportsRoutes)

/**
 * health
 */
app.use(
  '/api/health',
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  (_req: Request, res: Response, _next: NextFunction): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

/**
 * error handler middleware
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Server error:', error)
  console.error('Stack trace:', error.stack)
  res.status(500).json({
    success: false,
    error: 'Server internal error',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  })
})

/**
 * 404 handler
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

export default app
