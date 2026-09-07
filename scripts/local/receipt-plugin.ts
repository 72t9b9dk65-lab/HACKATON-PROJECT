import type { Plugin } from 'vite';
import { mkdir, writeFile, rm, access } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve } from 'node:path';
const exec = promisify(execFile);
export function localReceiptReader(): Plugin {
  return {
    name: 'hundstallet-local-document-reader',
    configureServer(server) {
      server.middlewares.use('/api/receipt-extraction', async (req, res) => {
        const reply = (status: number, data: unknown) => {
          res.statusCode = status;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(data));
        };
        let path = '';
        try {
          if (req.method !== 'POST') return reply(405, { error: 'Use POST.' });
          const host = req.headers.host ?? '';
          if (
            !/^(localhost|127\.0\.0\.1):\d+$/.test(host) ||
            (req.headers.origin && req.headers.origin !== `http://${host}`)
          )
            return reply(403, { error: 'Local workspace only.' });
          const type = req.headers['content-type'] ?? '';
          const ext = (
            {
              'application/pdf': 'pdf',
              'image/jpeg': 'jpg',
              'image/png': 'png',
              'image/webp': 'webp',
              'text/plain': 'txt',
            } as Record<string, string>
          )[type];
          if (!ext)
            return reply(400, {
              error: 'Choose a PDF, image or text receipt.',
            });
          const chunks: Buffer[] = [];
          let size = 0;
          for await (const chunk of req) {
            size += chunk.length;
            if (size > 12_000_000)
              throw new Error('Use a document smaller than 12 MB.');
            chunks.push(Buffer.from(chunk));
          }
          const bytes = Buffer.concat(chunks);
          if (ext === 'txt')
            return reply(200, {
              text: bytes.toString('utf8'),
              engine: 'Text document',
            });
          if (process.platform !== 'darwin')
            throw new Error(
              'On-device image reading is available on macOS. You can still enter the products or paste receipt text.',
            );
          const folder = resolve(server.config.root, '.local');
          await mkdir(folder, { recursive: true });
          const binary = resolve(folder, 'receipt-vision');
          try {
            await access(binary);
          } catch {
            await exec(
              'swiftc',
              [
                '-O',
                '-module-cache-path',
                resolve(folder, 'swift-cache'),
                resolve(
                  server.config.root,
                  'scripts/local/ReceiptVision.swift',
                ),
                '-o',
                binary,
              ],
              { timeout: 60_000, maxBuffer: 1_000_000 },
            );
          }
          path = resolve(folder, `receipt-${crypto.randomUUID()}.${ext}`);
          await writeFile(path, bytes);
          const output = await exec(binary, [path], {
            timeout: 30_000,
            maxBuffer: 2_000_000,
          });
          reply(200, JSON.parse(output.stdout));
        } catch (error) {
          reply(400, {
            error:
              error instanceof Error
                ? error.message
                : 'Could not read the document. Enter its products below.',
          });
        } finally {
          if (path) await rm(path, { force: true });
        }
      });
    },
  };
}
