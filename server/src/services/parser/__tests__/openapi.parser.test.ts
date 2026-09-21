import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { openApiParser } from "../openapi.parser";
import { CanonicalApiModel } from "../canonical-model";

const sampleYamlPath = path.resolve(__dirname, "../fixtures/sample-openapi.yaml");
const sampleYamlContent = fs.readFileSync(sampleYamlPath, "utf-8");

describe("OpenAPI Parser Service & Canonical API Model", () => {
  // Test 1: Valid OpenAPI 3 specification
  it("1. should successfully parse a valid OpenAPI 3 specification", async () => {
    const result = await openApiParser.parse(sampleYamlContent);

    assert.equal(result.success, true, "Parser should succeed for valid OpenAPI 3 specification");
    if (!result.success) return;

    assert.ok(result.data, "Result should contain CanonicalApiModel data");
    assert.equal(result.data.metadata.title, "ATLAS Sample Task & User API");
    assert.equal(result.data.metadata.version, "1.0.0");
    assert.equal(result.data.metadata.openApiVersion, "3.0.3");
    assert.equal(result.data.metadata.specType, "openapi");
  });

  // Test 2: Invalid specifications
  it("2. should return useful error messages for invalid specifications", async () => {
    // 2a. Malformed YAML syntax
    const malformedYaml = `
      openapi: 3.0.0
      info:
        title: [unclosed array
    `;
    const syntaxResult = await openApiParser.parse(malformedYaml);
    assert.equal(syntaxResult.success, false);
    if (!syntaxResult.success) {
      assert.match(syntaxResult.error, /Syntax error/i);
    }

    // 2b. Missing or unsupported spec version
    const unsupportedDoc = `
      info:
        title: Missing Version Spec
        version: 1.0.0
      paths: {}
    `;
    const versionResult = await openApiParser.parse(unsupportedDoc);
    assert.equal(versionResult.success, false);
    if (!versionResult.success) {
      assert.match(versionResult.error, /Unsupported or invalid specification format/i);
    }

    // 2c. Invalid paths property (not an object)
    const invalidPathsDoc = `
      openapi: 3.0.0
      info:
        title: Invalid Paths
        version: 1.0.0
      paths: "this is invalid"
    `;
    const schemaResult = await openApiParser.parse(invalidPathsDoc);
    assert.equal(schemaResult.success, false);
    if (!schemaResult.success) {
      assert.match(schemaResult.error, /paths/i);
    }
  });

  // Test 3: Extraction of endpoints
  it("3. should extract all endpoints, HTTP methods, and operations correctly", async () => {
    const result = await openApiParser.parse(sampleYamlContent);
    assert.equal(result.success, true);
    if (!result.success) return;

    const { endpoints } = result.data;
    assert.equal(endpoints.length, 4, "Should extract 4 endpoints from sample specification");

    const listUsers = endpoints.find((e) => e.path === "/users" && e.method === "GET");
    assert.ok(listUsers, "GET /users must exist");
    assert.equal(listUsers.operationId, "listUsers");
    assert.equal(listUsers.summary, "List all users");
    assert.deepEqual(listUsers.tags, ["Users"]);

    const createUser = endpoints.find((e) => e.path === "/users" && e.method === "POST");
    assert.ok(createUser, "POST /users must exist");
    assert.equal(createUser.operationId, "createUser");
    assert.ok(createUser.requestBody, "POST /users must have requestBody");
    assert.equal(createUser.requestBody.schemaRef, "CreateUserRequest");

    const getUserById = endpoints.find((e) => e.path === "/users/{id}" && e.method === "GET");
    assert.ok(getUserById, "GET /users/{id} must exist");

    const healthProbe = endpoints.find((e) => e.path === "/health" && e.method === "GET");
    assert.ok(healthProbe, "GET /health must exist");
  });

  // Test 4: Extraction of schemas
  it("4. should extract schemas, properties, required fields, and references", async () => {
    const result = await openApiParser.parse(sampleYamlContent);
    assert.equal(result.success, true);
    if (!result.success) return;

    const { schemas } = result.data;
    assert.ok(schemas.length >= 3, "Should extract User, CreateUserRequest, and ErrorResponse");

    const userSchema = schemas.find((s) => s.name === "User");
    assert.ok(userSchema, "User schema should exist");
    assert.equal(userSchema.type, "object");
    assert.deepEqual(userSchema.required, ["id", "username", "email"]);

    const idProp = userSchema.properties.find((p) => p.name === "id");
    assert.ok(idProp, "User.id property must exist");
    assert.equal(idProp.type, "string");
    assert.equal(idProp.required, true);

    const emailProp = userSchema.properties.find((p) => p.name === "email");
    assert.ok(emailProp, "User.email property must exist");
    assert.equal(emailProp.format, "email");

    const createRequest = schemas.find((s) => s.name === "CreateUserRequest");
    assert.ok(createRequest, "CreateUserRequest schema should exist");
    assert.deepEqual(createRequest.required, ["username", "email", "password"]);
  });

  // Test 5: Extraction of parameters
  it("5. should extract path, query, and header parameters with proper metadata", async () => {
    const result = await openApiParser.parse(sampleYamlContent);
    assert.equal(result.success, true);
    if (!result.success) return;

    // Test query parameters on GET /users
    const listUsers = result.data.endpoints.find((e) => e.path === "/users" && e.method === "GET");
    assert.ok(listUsers);
    const limitParam = listUsers.parameters.find((p) => p.name === "limit");
    assert.ok(limitParam, "Query parameter 'limit' should exist");
    assert.equal(limitParam.location, "query");
    assert.equal(limitParam.required, false);
    assert.equal(limitParam.schemaType, "integer");

    // Test path parameter on GET /users/{id}
    const getUser = result.data.endpoints.find((e) => e.path === "/users/{id}" && e.method === "GET");
    assert.ok(getUser);
    const idParam = getUser.parameters.find((p) => p.name === "id");
    assert.ok(idParam, "Path parameter 'id' should exist");
    assert.equal(idParam.location, "path");
    assert.equal(idParam.required, true);
  });

  // Test 6: Extraction of responses
  it("6. should extract responses, status codes, descriptions, and content types", async () => {
    const result = await openApiParser.parse(sampleYamlContent);
    assert.equal(result.success, true);
    if (!result.success) return;

    const listUsers = result.data.endpoints.find((e) => e.path === "/users" && e.method === "GET");
    assert.ok(listUsers);

    const res200 = listUsers.responses.find((r) => r.statusCode === "200");
    assert.ok(res200, "200 response should exist");
    assert.equal(res200.description, "A list of users");
    assert.equal(res200.contentType, "application/json");

    const res401 = listUsers.responses.find((r) => r.statusCode === "401");
    assert.ok(res401, "401 response should exist");
    assert.equal(res401.schemaRef, "ErrorResponse");
  });

  // Test 7: Extraction of security schemes
  it("7. should extract security schemes and endpoint authentication bindings", async () => {
    const result = await openApiParser.parse(sampleYamlContent);
    assert.equal(result.success, true);
    if (!result.success) return;

    const { securitySchemes, endpoints } = result.data;
    assert.equal(securitySchemes.length, 1);
    const bearer = securitySchemes[0];
    assert.equal(bearer.name, "BearerAuth");
    assert.equal(bearer.type, "http");
    assert.equal(bearer.scheme, "bearer");
    assert.equal(bearer.bearerFormat, "JWT");

    // Endpoint requiring authentication
    const listUsers = endpoints.find((e) => e.path === "/users" && e.method === "GET");
    assert.ok(listUsers);
    assert.equal(listUsers.security.length, 1);
    assert.equal(listUsers.security[0].schemeName, "BearerAuth");

    // Endpoint without authentication
    const getUser = endpoints.find((e) => e.path === "/users/{id}" && e.method === "GET");
    assert.ok(getUser);
    assert.equal(getUser.security.length, 0, "GET /users/{id} should have no security requirements");
  });

  // Test 8: Canonical model structure
  it("8. should strictly conform to the CanonicalApiModel specification", async () => {
    const result = await openApiParser.parse(sampleYamlContent);
    assert.equal(result.success, true);
    if (!result.success) return;

    const model: CanonicalApiModel = result.data;
    assert.ok(model.metadata, "CanonicalApiModel.metadata must be defined");
    assert.ok(Array.isArray(model.endpoints), "CanonicalApiModel.endpoints must be an array");
    assert.ok(Array.isArray(model.schemas), "CanonicalApiModel.schemas must be an array");
    assert.ok(Array.isArray(model.securitySchemes), "CanonicalApiModel.securitySchemes must be an array");

    // Verify every endpoint has all required canonical fields
    for (const ep of model.endpoints) {
      assert.ok(ep.id, "Endpoint must have an id");
      assert.ok(ep.path, "Endpoint must have a path");
      assert.ok(ep.method, "Endpoint must have an HTTP method");
      assert.ok(Array.isArray(ep.tags), "Endpoint tags must be an array");
      assert.ok(Array.isArray(ep.parameters), "Endpoint parameters must be an array");
      assert.ok(Array.isArray(ep.responses), "Endpoint responses must be an array");
      assert.ok(Array.isArray(ep.security), "Endpoint security must be an array");
    }
  });
});