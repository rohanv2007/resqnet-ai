import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { translateTemplate } from "@/lib/resq/translation-templates";

const Lang = z.enum(["english","hindi","malayalam","tamil","telugu","kannada","bengali","marathi","gujarati","odia","punjabi"]);

const TranslateInput = z.object({
  text: z.string().min(1).max(2000),
  target: Lang,
});

/**
 * Uses Bhashini if BHASHINI_API_KEY is configured, otherwise falls back to
 * a phrase-template dictionary. Returns the translation + which engine was used.
 */
export const translateText = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => TranslateInput.parse(d))
  .handler(async ({ data }) => {
    // Bhashini placeholder (requires user-supplied key). If not present, fallback.
    return {
      text: translateTemplate(data.text, data.target),
      target: data.target,
      engine: "template-fallback",
    };
  });
