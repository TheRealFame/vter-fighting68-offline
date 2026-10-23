const { app, BrowserWindow, session, shell } = require('electron')
const http = require('http')
const fs = require('fs')
const path = require('path')

const SITE = path.join(__dirname, 'site')
const SUPPLIER = require('./mock/supplier.json')

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.eot': 'application/vnd.ms-fontobject',
  '.wasm': 'application/wasm',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav'
}

function sendJson (res, body) {
  const data = JSON.stringify(body)
  res.writeHead(200, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(data),
    'Access-Control-Allow-Origin': '*'
  })
  res.end(data)
}

function listenOn (server, port) {
  return new Promise((resolve, reject) => {
    const onError = (err) => {
      server.removeListener('listening', onListening)
      reject(err)
    }
    const onListening = () => {
      server.removeListener('error', onError)
      resolve(server.address().port)
    }
    server.once('error', onError)
    server.once('listening', onListening)
    server.listen(port, '127.0.0.1')
  })
}

async function startServer () {
  const server = http.createServer((req, res) => {
      let pathname
      try {
        pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname)
      } catch {
        res.writeHead(400); return res.end('Bad request')
      }

      if (pathname === '/api/supplier/index') return sendJson(res, SUPPLIER)
      if (pathname.startsWith('/api/keyboard/layout/')) {
        return sendJson(res, { code: 1, msg: 'success', data: [] })
      }
      if (pathname.startsWith('/api/keyboard/musiceffect')) {
        if (pathname.endsWith('/close')) {
          return sendJson(res, { code: 1, msg: 'success', data: {} })
        }
        return sendJson(res, { code: 1, msg: 'success', keys: [] })
      }
      if (pathname.startsWith('/api/keyboard/mu')) {
        return sendJson(res, { code: 1, msg: 'success', data: { status: 1 } })
      }
      if (pathname === '/api/fileinfo/index') {
        return sendJson(res, { code: 1, msg: 'success', data: { list: { data: [], total: 0 } } })
      }
      if (pathname.startsWith('/api/user/')) {
        return sendJson(res, { code: 0, msg: 'Offline', data: {} })
      }
      if (pathname === '/update.json') {
        return sendJson(res, [])
      }

      const rel = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '')
      const filePath = path.join(SITE, rel)
      if (!filePath.startsWith(SITE + path.sep)) {
        res.writeHead(403); return res.end('Forbidden')
      }

      fs.readFile(filePath, (err, data) => {
        if (err) {
          fs.readFile(path.join(SITE, 'index.html'), (e2, html) => {
            if (e2) { res.writeHead(404); return res.end('Not found') }
            res.writeHead(200, { 'Content-Type': MIME['.html'] })
            res.end(html)
          })
          return
        }
        res.writeHead(200, {
          'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
          'Content-Length': data.length
        })
        res.end(data)
      })
    })
  const candidates = [Number(process.env.VTER_PORT || 8080), 18080, 0]
  let lastError
  for (const port of candidates) {
    try {
      return await listenOn(server, port)
    } catch (err) {
      lastError = err
      if (err.code !== 'EADDRINUSE' && err.code !== 'EACCES') throw err
    }
  }
  throw lastError
}

function setupRequestRedirect (ses, port) {
  if (port === 8080) return
  ses.webRequest.onBeforeRequest(
    { urls: ['http://127.0.0.1:8080/*', 'http://localhost:8080/*'] },
    (details, callback) => {
      const u = new URL(details.url)
      callback({ redirectURL: `http://127.0.0.1:${port}${u.pathname}${u.search}` })
    }
  )
}

function setupHid (ses) {
  ses.setPermissionRequestHandler((wc, permission, callback) => {
    callback(permission === 'hid')
  })
  ses.setPermissionCheckHandler((wc, permission) => permission === 'hid')
  ses.setDevicePermissionHandler((details) => details.deviceType === 'hid')

  ses.on('select-hid-device', (event, details, callback) => {
    event.preventDefault()
    const list = details.deviceList || []
    if (list.length === 0) return callback()
    const preferred = list.find(d =>
      d.vendorId === 0x0c45 || d.usagePage === 0xff68 || d.usagePage === 0xff00
    )
    callback((preferred || list[0]).deviceId)
  })

  ses.on('hid-device-added', () => {})
  ses.on('hid-device-removed', () => {})
}

async function createWindow (port) {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 960,
    minHeight: 600,
    title: 'VTER',
    backgroundColor: '#1b1d24',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url)
    return { action: 'deny' }
  })

  await win.loadURL(`http://127.0.0.1:${port}/`)

  return win
}

app.whenReady().then(async () => {
  setupHid(session.defaultSession)
  const port = await startServer()
  setupRequestRedirect(session.defaultSession, port)
  await createWindow(port)
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow(port)
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
