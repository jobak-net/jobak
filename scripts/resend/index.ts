/**
 * Resend commands
 */

import type { ScriptCategory } from "../types";

export const category: ScriptCategory = {
    name: "Resend",
    description: "Push the auth email templates to Resend",
    commands: [
        {
            key: "1",
            description: "Preview the templates (no API calls)",
            action: "tsx scripts/resend/push-templates.ts --dry-run",
        },
        {
            key: "2",
            description: "Create/update and publish the templates in Resend",
            action: "tsx scripts/resend/push-templates.ts",
        },
    ],
};
