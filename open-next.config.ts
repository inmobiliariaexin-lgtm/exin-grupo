import { defineCloudflareConfig } from '@opennextjs/cloudflare'

// Temporary public preview: no persistent cache or production bindings.
export default defineCloudflareConfig({})
