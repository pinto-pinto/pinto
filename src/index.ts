import cors, { CorsOptions } from 'cors'
import express, { Request, Response, NextFunction, Application } from 'express'
import { ExpressPeerServer } from 'peer'
import { EventEmitter } from 'events'
import WebSocketLib from 'ws'

declare type MyWebSocket = WebSocketLib & EventEmitter
declare interface IClient {
  getId(): string
  getToken(): string
  getSocket(): MyWebSocket | null
  setSocket(socket: MyWebSocket | null): void
  getLastPing(): number
  setLastPing(lastPing: number): void
  send(data: any): void
}
const PORT = Number(process.env.PORT) || 9000
const KEY = process.env.KEY || 'pinto'
const whitelist = ['http://localhost:5000', 'https://web-player.vercel.app', 'https://www.pintopinto.org']
const corsOptions: CorsOptions = {
  origin: (origin: any, callback: any) => {
    if (whitelist.indexOf(origin) !== -1 || !origin) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept']
}
const generateClientId = (): string => {
  return Math.round(Math.random() * 99).toString(10)
}

let activeClients: IClient[]
const app = express()
app.use(cors(corsOptions))

const peerServer = ExpressPeerServer(app.listen(PORT), { key: KEY })

app.use(`/${KEY}`, peerServer)

// GET:- Redirect to welcome page
app.get('/', (request: Request, response: Response, next: NextFunction) => {
  response.redirect(301, `./${KEY}`)
  next()
})

// GET:- Retrieve a new user ID
app.get(`/${KEY}/id`, (request: Request, response: Response, next: NextFunction) => {
  response.status(200).json(generateClientId())
  next()
})

// GET:- List of all connected peers
app.get(`/${KEY}/peers`, (request: Request, response: Response, next: NextFunction) => {
  if (activeClients) {
    response.status(200).json(activeClients.length)
  } else {
    response.status(200).json('[]')
  }
  next()
})

peerServer.on('connection', (client: IClient) => {
  const activeClient = activeClients.find(activeClient => {
    return activeClient === client
  })
  if (!activeClient) {
    activeClients.push(client)
  }
  console.dir(`Client connected ${client.getId()}`)
})

peerServer.on('disconnect', (client: IClient) => {
  activeClients = activeClients.filter(activeClient => {
    return activeClient !== client
  })
  console.dir(`Client disconnected ${client.getId()}`)
})