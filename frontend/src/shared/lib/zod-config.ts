import { z } from 'zod'

// The deployed page forbids eval (content security policy). Without this Zod probes for it
// when the first schema is defined, and the browser reports the caught attempt as a violation.
// Imported first in main.tsx so it runs before any feature module defines a schema.
z.config({ jitless: true })
