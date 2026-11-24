import { z } from "zod";

import { AI_PROVIDER_IDS } from "@/shared/ai";
import { HR_EMAIL_LIMITS as L, HR_EMAIL_PURPOSES, HR_EMAIL_TONES, type HrEmailRequest } from "@/shared/contracts/hr-email";

import { cvInputSchema } from "../../cv-review/validation/cv-input-schema";

/**
 * The body of `POST /api/v1/ai-tools/hr-email`. Every text field is optional
 * ("") except what the purpose can't do without: HR's message for a reply,
 * the draft to improve, and what the offer is about.
 */
export const hrEmailSchema = z
  .object({
    provider: z.enum(AI_PROVIDER_IDS),
    purpose: z.enum(HR_EMAIL_PURPOSES),
    tone: z.enum(HR_EMAIL_TONES),
    sender: z.object({ name: z.string().trim().min(1).max(L.name) }),
    recipient: z.object({
      name: z.string().trim().max(L.name),
      email: z.union([z.literal(""), z.email().max(L.email)]),
    }),
    job: z.object({
      company: z.string().trim().max(L.company),
      title: z.string().trim().max(L.jobTitle),
      posting: z.string().trim().max(L.posting),
    }),
    context: z.object({
      theirMessage: z.string().trim().max(L.theirMessage),
      draft: z.string().trim().max(L.draft),
      notes: z.string().trim().max(L.notes),
    }),
    cv: cvInputSchema.optional(),
  })
  .superRefine((body, ctx) => {
    if (body.purpose === "reply" && body.context.theirMessage.length < 10) {
      ctx.addIssue({ code: "custom", path: ["context", "theirMessage"], message: "Paste the message you're replying to." });
    }
    if (body.purpose === "improve" && body.context.draft.length < 20) {
      ctx.addIssue({ code: "custom", path: ["context", "draft"], message: "Paste the draft to improve." });
    }
    if (body.purpose === "offer" && !body.context.notes && !body.context.theirMessage) {
      ctx.addIssue({ code: "custom", path: ["context", "notes"], message: "Say what the offer is and what you'd like to ask." });
    }
  }) satisfies z.ZodType<HrEmailRequest>;
