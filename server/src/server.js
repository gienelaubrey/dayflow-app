import 'dotenv/config'
import { app } from './app.js'
import { prisma } from './lib/prisma.js'

const port = Number(process.env.PORT || 4000)
const host = '0.0.0.0'

const server = app.listen(port, host, () => {
  console.log(`DayFlow server listening on port ${port}`)
})

async function shutdown(signal) {
  console.log(`\n${signal} received. Shutting down...`)
  server.close(async () => {
    await prisma.$disconnect()
    process.exit(0)
  })
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
