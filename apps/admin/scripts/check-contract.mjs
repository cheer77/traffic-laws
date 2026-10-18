import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const document = JSON.parse(readFileSync(process.argv[2], "utf8"));
const contracts = [
  ["post", "/auth/login", false, ["accessToken", "expiresAt"]],
  ["post", "/auth/logout", true, ["revoked"]],
  ["get", "/users/me", true, ["id", "email", "role", "status", "createdAt"]],
  ["get", "/internal/scenarios", true, ["items", "page", "limit", "nextPage"]],
  ["post", "/internal/scenarios/revisions", true, ["id", "revision", "payloadHash", "createdAt"]],
  ["get", "/internal/scenarios/{id}/revisions", true, ["items", "page", "limit", "nextPage"]],
  [
    "get",
    "/internal/scenarios/{id}/revisions/{revision}",
    true,
    ["payload", "authorId", "payloadHash", "rulesHash", "createdAt", "reviews"],
  ],
  [
    "post",
    "/internal/scenarios/{id}/revisions/{revision}/reviews",
    true,
    ["id", "reviewerId", "decision", "evidence", "createdAt"],
  ],
];
for (const [method, path, protectedRoute, fields] of contracts) {
  const operation = document.paths[`/api/v1${path}`]?.[method];
  assert.ok(operation, `Missing ${method.toUpperCase()} ${path}`);
  assert.equal(
    Boolean(operation.security?.some((value) => "bearer" in value)),
    protectedRoute,
    path,
  );
  const success = Object.entries(operation.responses).find(([status]) =>
    /^2\d\d$/.test(status),
  )?.[1];
  assert.ok(success, `Missing success response: ${path}`);
  const schema = success.content?.["application/json"]?.schema;
  assert.ok(schema, `Missing JSON response: ${path}`);
  for (const field of fields) assert.ok(schema.required?.includes(field), `${path}: ${field}`);
}
for (const name of ["CredentialsDto", "DraftDto", "ReviewDto"]) {
  assert.ok(document.components.schemas[name], `Missing ${name}`);
}
for (const [name, fields] of [
  ["CredentialsDto", ["email", "password"]],
  ["DraftDto", ["payload", "expectedRevision"]],
  ["ReviewDto", ["decision", "evidence"]],
]) {
  for (const field of fields)
    assert.ok(document.components.schemas[name].required?.includes(field));
}
assert.ok(document.components.schemas.DraftDto.required?.includes("expectedRevision"));
assert.ok(document.components.schemas.DraftDto.required?.includes("payload"));
const query = document.paths["/api/v1/internal/scenarios"].get.parameters;
for (const name of ["page", "limit", "q", "status"])
  assert.ok(
    query.some((parameter) => parameter.in === "query" && parameter.name === name),
    name,
  );
const historyQuery = document.paths["/api/v1/internal/scenarios/{id}/revisions"].get.parameters;
for (const name of ["page", "limit"])
  assert.ok(
    historyQuery.some((parameter) => parameter.in === "query" && parameter.name === name),
    name,
  );
const publish =
  document.paths["/api/v1/internal/scenarios/{id}/revisions/{revision}/publish"]?.post;
assert.ok(publish, "Protected owner publish route must exist");
assert.ok(publish.security?.some((entry) => "bearer" in entry));
assert.ok(Object.keys(publish.responses).some((status) => /^2\d\d$/.test(status)));
const unpublish =
  document.paths["/api/v1/internal/scenarios/{id}/revisions/{revision}/unpublish"]?.post;
assert.ok(unpublish, "Protected owner withdrawal route must exist");
assert.ok(unpublish.security?.some((entry) => "bearer" in entry));
for (const [path, method] of [
  ["/api/v1/internal/imports", "get"],
  ["/api/v1/internal/imports/sync", "post"],
  ["/api/v1/internal/imports/publish", "post"],
]) {
  const operation = document.paths[path]?.[method];
  assert.ok(operation, `Missing Admin import contract: ${method.toUpperCase()} ${path}`);
  assert.ok(operation.security?.some((entry) => "bearer" in entry));
}
console.log(
  `PASS: ${contracts.length + 3} Admin API contracts and protected owner publication match OpenAPI`,
);
