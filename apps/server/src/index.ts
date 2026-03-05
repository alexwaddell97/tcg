import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import { v4 as uuid } from 'uuid'
import type { ClientToServerEvents, ServerToClientEvents, SocketData } from '@tcg/shared'
import { config } from './config.js'
import { registerMatchmakingHandlers } from './socket/lobbyHandlers.js'
import { registerGameHandlers } from './socket/gameHandlers.js'

const app = express()
app.use(cors({ origin: config.corsOrigins }))
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() })
})

const httpServer = createServer(app)

const io = new Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>(httpServer, {
  cors: {
    origin: config.corsOrigins,
    methods: ['GET', 'POST'],
  },
})

io.on('connection', (socket) => {
  socket.data.playerId = uuid()
  socket.data.displayName = `Player-${socket.data.playerId.slice(0, 6)}`

  console.log(`[+] ${socket.data.displayName} connected (${socket.id})`)

  registerMatchmakingHandlers(io, socket)
  registerGameHandlers(io, socket)

  socket.on('disconnect', (reason) => {
    console.log(`[-] ${socket.data.displayName} disconnected: ${reason}`)
    // Game disconnect + surrender is handled inside registerGameHandlers
  })
})

httpServer.listen(config.port, () => {
  console.log(`TCG server running on http://localhost:${config.port}`)
})
