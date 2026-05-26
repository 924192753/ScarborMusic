import net from 'net'

function checkPort(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port }, () => {
      socket.end()
      resolve(true)
    })
    socket.on('error', () => resolve(false))
    socket.setTimeout(2000, () => {
      socket.destroy()
      resolve(false)
    })
  })
}

export default async function globalSetup() {
  const mysqlUp = await checkPort('127.0.0.1', 3306)
  const redisUp = await checkPort('127.0.0.1', 6379)
  process.env.E2E_MYSQL = mysqlUp ? '1' : '0'
  process.env.E2E_REDIS = redisUp ? '1' : '0'
}
