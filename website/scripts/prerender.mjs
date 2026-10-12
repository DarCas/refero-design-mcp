/*
 * Dario Casertano <dario@casertano.name>
 * Copyright (c) 2026 Casertano Dario – All rights reserved.
 * Licensed under the MIT License.
 */

import {readFile, writeFile} from 'node:fs/promises'
import {fileURLToPath} from 'node:url'
import {dirname, resolve} from 'node:path'
import React from 'react'
import {renderToString} from 'react-dom/server'
import {createServer} from 'vite'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const indexFile = resolve(root, 'dist/index.html')

const server = await createServer({
    root,
    logLevel: 'error',
    server: {middlewareMode: true},
    appType: 'custom',
})

let html
try {
    const module = await server.ssrLoadModule('/src/App.tsx')
    const markup = renderToString(React.createElement(module.App))
    html = await readFile(indexFile, 'utf8')
    const mount = '<div id="root"></div>'

    if (!html.includes(mount)) {
        throw new Error('prerender: #root mount point not found in dist/index.html')
    }

    html = html.replace(mount, `<div id="root">${markup}</div>`)
} finally {
    await server.close()
}

await writeFile(indexFile, html)

console.log('prerender: full markup injected into dist/index.html')
