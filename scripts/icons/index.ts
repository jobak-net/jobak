/**
 * App icon generation commands
 */

import type { ScriptCategory } from "../types";

export const category: ScriptCategory = {
    name: "Icons",
    description: "Re-export favicon.ico (from mark.svg) and the manifest PNGs (from app-icon.svg)",
    commands: [
        {
            key: "1",
            description: "Regenerate app icons from the brand mark",
            action: "tsx scripts/icons/generate-icons.ts",
        },
    ],
};
