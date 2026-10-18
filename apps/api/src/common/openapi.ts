import type { OpenAPIObject, SchemaObject } from "@nestjs/swagger";
const string: SchemaObject = { type: "string" };
const integer: SchemaObject = { type: "integer" };
const date: SchemaObject = { type: "string", format: "date-time" };
const object = (
  properties: Record<string, SchemaObject>,
  required = Object.keys(properties),
): SchemaObject => ({ type: "object", properties, required, additionalProperties: false });
const array = (items: SchemaObject): SchemaObject => ({ type: "array", items });
const metadata = {
  id: string,
  revision: integer,
  country: { type: "string", enum: ["UA"] } satisfies SchemaObject,
  language: { type: "string", enum: ["uk"] } satisfies SchemaObject,
  category: string,
};
const attempt = {
  id: string,
  scenarioId: string,
  revision: integer,
  answerId: string,
  correct: { type: "boolean" } satisfies SchemaObject,
  completedAt: date,
};
const page = (items: SchemaObject) =>
  object({
    items: array(items),
    page: integer,
    limit: integer,
    nextPage: { type: "integer", nullable: true },
  });
export function completeOpenApi(document: OpenAPIObject): OpenAPIObject {
  const schemas: Record<string, SchemaObject> = {
    "/api/v1/auth/register": object({
      id: string,
      email: { type: "string", format: "email" },
      role: { type: "string", enum: ["student", "reviewer", "admin"] },
      status: { type: "string", enum: ["active", "disabled"] },
      createdAt: date,
    }),
    "/api/v1/auth/login": object({
      accessToken: string,
      tokenType: { type: "string", enum: ["Bearer"] },
      expiresAt: date,
    }),
    "/api/v1/auth/logout": object({ revoked: { type: "boolean" } }),
    "/api/v1/scenarios": page(object(metadata)),
    "/api/v1/scenarios/{id}/revisions/{revision}": object({
      ...metadata,
      question: string,
      answers: array(object({ id: string, text: string })),
      sceneReference: {
        type: "object",
        nullable: true,
        description:
          "Validated Scene Definition v1 snapshot (kind, scene); see @traffic-laws/scene-engine.",
      },
    }),
    "/api/v1/progress": object({
      attempts: integer,
      correct: integer,
      completedRevisions: integer,
    }),
    "/api/v1/health/live": object({ status: { type: "string", enum: ["ok"] } }),
    "/api/v1/health/ready": object({ status: { type: "string", enum: ["ready"] } }),
    "/api/v1/internal/scenarios/revisions": object({
      id: string,
      revision: integer,
      payloadHash: string,
      createdAt: date,
    }),
    "/api/v1/internal/scenarios/{id}/revisions/{revision}": object({
      payload: {
        type: "object",
        description: "Validated Scenario v1 (staff only, contains answer)",
      },
      payloadHash: string,
      rulesHash: string,
      createdAt: date,
      reviews: array({ type: "object" }),
    }),
    "/api/v1/internal/scenarios/{id}/revisions/{revision}/reviews": object({
      id: string,
      scenarioId: string,
      revision: integer,
      reviewerId: string,
      decision: { type: "string", enum: ["recommend_approval", "changes_requested", "rejected"] },
      evidence: string,
      createdAt: date,
    }),
  };
  schemas["/api/v1/users/me"] = schemas["/api/v1/auth/register"];
  const error = object({
    error: object({
      status: integer,
      message: string,
      requestId: { type: "string", format: "uuid" },
    }),
  });
  for (const [path, item] of Object.entries(document.paths))
    for (const method of ["get", "post"] as const) {
      const operation = item[method];
      if (!operation) continue;
      // esbuild does not emit design:paramtypes; describe path parameters explicitly.
      const pathParameters = [...path.matchAll(/\{([^}]+)\}/g)].map((match) => match[1]);
      if (pathParameters.length)
        operation.parameters = pathParameters.map((name) => ({
          name,
          in: "path",
          required: true,
          schema:
            name === "revision"
              ? { type: "integer", minimum: 1, maximum: 2147483647 }
              : { type: "string", maxLength: 80, pattern: "^[a-zA-Z0-9][a-zA-Z0-9._-]*$" },
        }));
      if (path.endsWith("/publish")) operation.responses = {};
      else {
        const schema =
          path === "/api/v1/progress/attempts"
            ? method === "get"
              ? page(object(attempt))
              : object({
                  ...attempt,
                  correctAnswerId: string,
                  explanation: string,
                  ruleReferences: array(string),
                })
            : schemas[path];
        if (schema)
          for (const response of Object.values(operation.responses))
            if (response && !("$ref" in response))
              response.content = { "application/json": { schema } };
      }
      for (const status of [400, 401, 403, 404, 409, 413, 429, 500, 503])
        operation.responses[status] = {
          description:
            status === 400
              ? "Malformed input or validation error; field values are never echoed"
              : `HTTP ${status}; see API error conventions`,
          content: { "application/json": { schema: error } },
        };
      if (
        method === "get" &&
        (path === "/api/v1/scenarios" || path === "/api/v1/progress/attempts")
      )
        operation.parameters = [
          {
            name: "page",
            in: "query",
            schema: { type: "integer", default: 1, minimum: 1, maximum: 200 },
          },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 20, minimum: 1, maximum: 50 },
          },
        ];
    }
  return document;
}
