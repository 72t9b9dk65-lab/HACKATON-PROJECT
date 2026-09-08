import { sites } from '@openai/sites-vite-plugin';
import tailwindcss from '@tailwindcss/postcss';
import vinext from 'vinext';
import { defineConfig } from 'vite';
import hostingConfig from './.openai/hosting.json';
import { localReceiptReader } from './scripts/local/receipt-plugin';

const SITE_CREATOR_PLACEHOLDER_DATABASE_ID =
  '00000000-0000-4000-8000-000000000000';

const { d1, r2 } = hostingConfig;

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === 'seatbelt';

const localBindingConfig = {
  main: 'vinext/server/fetch-handler',
  compatibility_flags: ['nodejs_compat'],
  d1_databases: d1
    ? [
        {
          binding: d1,
          database_name: 'site-creator-d1',
          database_id: SITE_CREATOR_PLACEHOLDER_DATABASE_ID,
        },
      ]
    : [],
  r2_buckets: r2
    ? [
        {
          binding: r2,
          bucket_name: 'site-creator-r2',
        },
      ]
    : [],
};

export default defineConfig(async ({ command }) => {
  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  process.env.WRANGLER_WRITE_LOGS ??= 'false';
  process.env.WRANGLER_LOG_PATH ??= '.wrangler/logs';
  process.env.MINIFLARE_REGISTRY_PATH ??= '.wrangler/registry';

  // Wrangler snapshots its log path while the Cloudflare plugin is imported.
  const { cloudflare } = await import('@cloudflare/vite-plugin');

  return {
    css: { postcss: { plugins: [tailwindcss()] } },
    server: {
      port: 3001,
      strictPort: true,
      host: '127.0.0.1',
      open: process.env.EARTHHEALTH_OPEN_BROWSER === '1',
      ...(isCodexSeatbeltSandbox
        ? { watch: { useFsEvents: false, usePolling: true } }
        : {}),
    },
    plugins: [
      localReceiptReader(),
      vinext(),
      sites(),
      cloudflare({
        viteEnvironment: { name: 'rsc', childEnvironments: ['ssr'] },
        persistState: process.env.CARE_STATE_DIR
          ? { path: process.env.CARE_STATE_DIR }
          : true,
        remoteBindings: false,
        tunnel: false,
        config: {
          ...localBindingConfig,
          vars:
            command === 'serve'
              ? {
                  CARE_MODE: process.env.CARE_MODE || 'demo',
                  CARE_PUBLIC_ORIGIN:
                    process.env.CARE_PUBLIC_ORIGIN || 'http://127.0.0.1:3001',
                  CARE_STAFF_ORIGIN:
                    process.env.CARE_STAFF_ORIGIN || 'http://127.0.0.1:3002',
                }
              : {},
        },
      }),
    ],
  };
});
