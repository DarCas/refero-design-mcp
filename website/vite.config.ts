/*
 * Dario Casertano <dario@casertano.name>
 * Copyright (c) 2026 Casertano Dario – All rights reserved.
 * Licensed under the MIT License.
 */

import SubResourceIntegrity from '@darcas/rollup-sub-resource-integrity'
import react from '@vitejs/plugin-react'
import {defineConfig} from 'vite'

/**
 * Publication base path, kept in one place so Step 9 (GitHub Pages) only has to
 * change this constant and the canonical URL in `index.html`.
 */
const base = '/'

export default defineConfig({
    base,
    plugins: [
        react(),
        SubResourceIntegrity('sha384'),
    ],
})
