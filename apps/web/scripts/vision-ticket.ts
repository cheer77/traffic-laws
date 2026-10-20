import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseImportedTickets, reconstruct } from "../src/features/official-tickets/pipeline.ts";
import {
  createGeminiVisionAdapter,
  GEMINI_VISION_MODEL,
  GeminiVisionError,
} from "../src/features/official-tickets/gemini-vision.server.ts";

const WEB_ROOT = fileURLToPath(new URL("../", import.meta.url));
const REPOSITORY_ROOT = path.resolve(WEB_ROOT, "../..");

function parseArguments(args: string[]): {
  ticket: number;
  force: boolean;
  plain: boolean;
  json: boolean;
} {
  let ticket: number | null = null;
  let force = false;
  let plain = false;
  let json = false;
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--force") force = true;
    else if (argument === "--plain") plain = true;
    else if (argument === "--json") json = true;
    else if (argument === "--ticket") {
      const value = Number(args[index + 1]);
      if (!Number.isInteger(value) || value < 1) throw new Error("invalid_ticket_number");
      ticket = value;
      index += 1;
    } else throw new Error(`unknown_argument:${argument}`);
  }
  if (ticket === null) throw new Error("missing_required_argument:--ticket");
  if (plain && json) throw new Error("conflicting_diagnostic_modes");
  return { ticket, force, plain, json };
}

async function main() {
  const args = parseArguments(process.argv.slice(2));
  if (args.ticket !== 1) throw new Error("pilot_is_restricted_to_section_16.1_ticket_1");
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("missing_gemini_api_key");

  const importedPath = path.resolve(WEB_ROOT, "src/features/official-tickets/imported.json");
  const tickets = parseImportedTickets(JSON.parse(await readFile(importedPath, "utf8")));
  const ticket = tickets.find((item) => item.section === "16.1" && item.number === args.ticket);
  if (!ticket) throw new Error("official_ticket_not_found");

  const { adapter, stats } = createGeminiVisionAdapter(ticket, {
    apiKey,
    cacheDirectory: path.resolve(REPOSITORY_ROOT, ".cache/gemini-vision"),
    force: args.force,
    model: GEMINI_VISION_MODEL,
    plain: args.plain,
    json: args.json,
  });
  const result = await reconstruct(ticket, adapter);
  const factsByKind = result.analysis?.facts.reduce<Record<string, number>>((counts, fact) => {
    counts[fact.kind] = (counts[fact.kind] ?? 0) + 1;
    return counts;
  }, {});
  console.log(
    JSON.stringify(
      {
        ticket: `${ticket.section} №${ticket.number}`,
        model: stats.model,
        cache: stats.cacheHit ? "hit" : "miss",
        apiRequests: stats.requestCount,
        request: stats.request,
        diagnostic: stats.diagnostic,
        plainDescriptionReceived: stats.plainDescriptionReceived,
        plainDescriptionCharacters: stats.plainDescriptionCharacters,
        invalidJsonSaved: stats.invalidJsonSaved,
        invalidJsonCharacters: stats.invalidJsonCharacters,
        status: result.status,
        factCounts: factsByKind ?? {},
        requiredAssets: result.analysis?.requiredAssets ?? [],
        missingAssets: result.missingAssets,
        unknowns: result.analysis?.unknowns ?? [],
        hasValidatedSceneDefinition: result.draft !== null,
        issues: result.issues,
      },
      null,
      2,
    ),
  );
  if (!result.analysis && !stats.plainDescriptionReceived) process.exitCode = 1;
}

main().catch((error: unknown) => {
  const code =
    error instanceof GeminiVisionError
      ? error.code
      : error instanceof Error
        ? error.message
        : "vision_cli_failed";
  console.error(`Vision analysis failed: ${code}`);
  process.exitCode = 1;
});
