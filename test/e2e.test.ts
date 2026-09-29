/**
 * End-to-end smoke test against the real site.
 *
 * Skipped automatically when the origin is unreachable, so the unit suite
 * stays offline-clean while this still guards the parts that unit tests cannot
 * reach: the live sitemap, the live page shape, and the server's stdio
 * handshake.
 *
 *   npx vitest run test/e2e.test.ts
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createServer } from '../src/server/index.js'
import { VERSION } from '../src/version.js'

const STYLE_ID = 'a73148b9-449b-42cd-9f38-86ef694f500e'

/**
 * Probed at module load, not in a hook: `describe.skipIf` is evaluated during
 * collection, so a value set in `beforeAll` would still be false here and the
 * whole suite would silently skip.
 */
const reachable = await fetch('https://styles.refero.design/sitemaps/styles.xml', {
  signal: AbortSignal.timeout(20_000),
})
  .then(response => response.ok)
  .catch(() => false)

describe.skipIf(!reachable)('live server', () => {
  let client: Client
  let close: () => Promise<void>

  beforeAll(async () => {
    const server = createServer()
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
    client = new Client({ name: 'e2e', version: '0.0.0' })
    close = async () => {
      await client.close()
      await server.close()
    }
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)])
  })

  afterAll(async () => {
    await close()
  })

  it('advertises its tools', async () => {
    const { tools } = await client.listTools()
    const names = tools.map(tool => tool.name)
    expect(names).toEqual(
      expect.arrayContaining([
        'refero_search_styles',
        'refero_match_style',
        'refero_get_design_md',
        'refero_get_style',
        'refero_index_status',
        'refero_list_style_ids',
      ]),
    )
  })

  it('reports index coverage', async () => {
    const result = await client.callTool({ name: 'refero_index_status', arguments: {} })
    const body = (result.content as { text: string }[])[0]?.text ?? ''
    expect(body).toContain('Published styles:')
    expect(body).toContain(VERSION)
  })

  it('lists style ids from the live sitemap', async () => {
    const result = await client.callTool({
      name: 'refero_list_style_ids',
      arguments: { limit: 3 },
    })
    const body = (result.content as { text: string }[])[0]?.text ?? ''
    expect(body).toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-/)
  })

  it('renders a design.md for a real style', async () => {
    const result = await client.callTool({
      name: 'refero_get_design_md',
      arguments: { style_id: STYLE_ID, sections: ['overview', 'colors'] },
    })
    const body = (result.content as { text: string }[])[0]?.text ?? ''
    expect(body).toContain('# Apple')
    expect(body).toContain('## Colours')
  }, 90_000)

  it('enumerates the design.md resource', async () => {
    // A readable-but-unlistable resource is invisible to any client that
    // discovers resources by listing them.
    const { resources } = await client.listResources()
    expect(resources.length).toBeGreaterThan(0)
    expect(resources[0]?.uri).toMatch(/^refero:\/\/style\/[0-9a-f-]{36}\/design\.md$/)
  })

  it('reads the design.md resource by URI', async () => {
    const result = await client.readResource({
      uri: `refero://style/${STYLE_ID}/design.md`,
    })
    const body = (result.contents as { text: string }[])[0]?.text ?? ''
    expect(body).toContain('# Apple')
  }, 90_000)

  it('rejects a malformed resource URI without touching the network', async () => {
    await expect(client.readResource({ uri: 'refero://style/not-a-uuid/design.md' })).rejects.toThrow(
      /Invalid style id/,
    )
  })

  it('returns structured data for a real style', async () => {
    const result = await client.callTool({
      name: 'refero_get_style',
      arguments: { style_id: STYLE_ID, include_measured_tokens: false },
    })
    const body = (result.content as { text: string }[])[0]?.text ?? ''
    const parsed = JSON.parse(body) as { summary: { siteName: string } }
    expect(parsed.summary.siteName).toBe('Apple')
  }, 90_000)
})
