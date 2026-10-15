import { z } from 'zod';

// Spanish fallback messages for any rule without a custom message (e.g. query params)
z.config(z.locales.es());

export { z };
