import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { blastRadiusService } from "../blastRadius.service";
import { CanonicalApiModel } from "../../parser/canonical-model";

describe("Blast-Radius Topological Impact Analysis Service", () => {
  // Mock Canonical API Model with interconnected and isolated components
  const testModel: CanonicalApiModel = {
    metadata: {
      title: "Commerce & Auth API",
      version: "1.0.0",
      openApiVersion: "3.0.0",
      specType: "openapi",
    },
    securitySchemes: [
      {
        name: "BearerAuth",
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
      {
        name: "ApiKeyAuth",
        type: "apiKey",
        location: "header",
      },
    ],
    schemas: [
      {
        name: "User",
        type: "object",
        properties: [
          { name: "id", type: "string", required: true },
          { name: "email", type: "string", required: true },
          { name: "profile", type: "object", required: false, reference: "UserProfile" },
        ],
        required: ["id", "email"],
        references: ["UserProfile"],
      },
      {
        name: "UserProfile",
        type: "object",
        properties: [
          { name: "bio", type: "string", required: false },
        ],
        required: [],
        references: [],
      },
      {
        name: "Order",
        type: "object",
        properties: [
          { name: "orderId", type: "string", required: true },
          { name: "buyer", type: "object", required: true, reference: "User" },
        ],
        required: ["orderId", "buyer"],
        references: ["User"],
      },
      {
        name: "IsolatedWidget",
        type: "object",
        properties: [
          { name: "widgetId", type: "string", required: true },
        ],
        required: ["widgetId"],
        references: [],
      },
    ],
    endpoints: [
      {
        id: "get-users",
        path: "/users",
        method: "GET",
        tags: ["Users"],
        parameters: [
          { name: "limit", location: "query", required: false, schemaType: "integer" },
        ],
        responses: [
          { statusCode: "200", description: "List of users", schemaRef: "User" },
        ],
        security: [{ schemeName: "BearerAuth", scopes: [] }],
      },
      {
        id: "create-user",
        path: "/users",
        method: "POST",
        tags: ["Users"],
        parameters: [],
        requestBody: {
          contentType: "application/json",
          required: true,
          schemaRef: "User",
        },
        responses: [
          { statusCode: "201", description: "Created user", schemaRef: "User" },
        ],
        security: [{ schemeName: "BearerAuth", scopes: [] }],
      },
      {
        id: "get-user-by-id",
        path: "/users/{id}",
        method: "GET",
        tags: ["Users"],
        parameters: [
          { name: "id", location: "path", required: true, schemaType: "string" },
        ],
        responses: [
          { statusCode: "200", description: "User details", schemaRef: "User" },
        ],
        security: [{ schemeName: "BearerAuth", scopes: [] }],
      },
      {
        id: "create-order",
        path: "/orders",
        method: "POST",
        tags: ["Orders"],
        parameters: [],
        requestBody: {
          contentType: "application/json",
          required: true,
          schemaRef: "Order",
        },
        responses: [
          { statusCode: "201", description: "Order confirmation", schemaRef: "Order" },
        ],
        security: [{ schemeName: "BearerAuth", scopes: [] }],
      },
      {
        id: "get-order-by-id",
        path: "/orders/{id}",
        method: "GET",
        tags: ["Orders"],
        parameters: [
          { name: "id", location: "path", required: true, schemaType: "string" },
        ],
        responses: [
          { statusCode: "200", description: "Order details", schemaRef: "Order" },
        ],
        security: [{ schemeName: "BearerAuth", scopes: [] }],
      },
      {
        id: "health-check",
        path: "/health",
        method: "GET",
        tags: ["System"],
        parameters: [],
        responses: [
          { statusCode: "200", description: "System operational" },
        ],
        security: [],
      },
      {
        id: "isolated-endpoint",
        path: "/ping",
        method: "GET",
        tags: ["System"],
        parameters: [],
        responses: [
          { statusCode: "200", description: "Pong" },
        ],
        security: [],
      },
    ],
  };

  it("1. should analyze endpoint dependencies (params, schemas, security, tags)", () => {
    const result = blastRadiusService.analyze(testModel, {
      type: "endpoint",
      id: "GET /users",
    });

    assert.equal(result.target.type, "endpoint");
    assert.equal(result.target.id, "endpoint:GET:/users");
    assert.equal(result.affectedTags.includes("Users"), true);

    // Schema returned: User (and nested UserProfile)
    const schemaNames = result.affectedSchemas.map((s) => s.name);
    assert.ok(schemaNames.includes("User"));
    assert.ok(schemaNames.includes("UserProfile"));

    // Security scheme required: BearerAuth
    const secNames = result.affectedSecuritySchemes.map((s) => s.name);
    assert.ok(secNames.includes("BearerAuth"));

    // Sibling endpoints sharing schema 'User': POST /users, GET /users/{id}
    const siblingPaths = result.affectedEndpoints.map((e) => `${e.method} ${e.path}`);
    assert.ok(siblingPaths.includes("POST /users"));
    assert.ok(siblingPaths.includes("GET /users/{id}"));

    assert.ok(result.reasons.length > 0);
    assert.ok(["MEDIUM", "HIGH"].includes(result.impactLevel));
  });

  it("2. should analyze schema consumers and references", () => {
    const result = blastRadiusService.analyze(testModel, {
      type: "schema",
      id: "User",
    });

    assert.equal(result.target.type, "schema");
    assert.equal(result.target.id, "schema:User");

    // Endpoints returning or accepting User: GET /users, POST /users, GET /users/{id}
    const epMethodsAndPaths = result.affectedEndpoints.map((e) => `${e.method} ${e.path}`);
    assert.ok(epMethodsAndPaths.includes("GET /users"));
    assert.ok(epMethodsAndPaths.includes("POST /users"));
    assert.ok(epMethodsAndPaths.includes("GET /users/{id}"));

    // Order references User
    const schemaNames = result.affectedSchemas.map((s) => s.name);
    assert.ok(schemaNames.includes("Order"));
    // User references UserProfile
    assert.ok(schemaNames.includes("UserProfile"));

    // Consumer endpoints >= 2 => impact should be HIGH
    assert.equal(result.impactLevel, "HIGH");
    assert.ok(result.reasons.some((r) => r.includes("Returned by")));
  });

  it("3. should analyze security scheme consumers", () => {
    const result = blastRadiusService.analyze(testModel, {
      type: "security",
      id: "BearerAuth",
    });

    assert.equal(result.target.type, "security");
    assert.equal(result.target.id, "security:BearerAuth");

    // Protects 5 endpoints in testModel: GET /users, POST /users, GET /users/{id}, POST /orders, GET /orders/{id}
    assert.equal(result.affectedEndpoints.length, 5);
    // Impact level for 5 endpoints is HIGH (count >= 2)
    assert.equal(result.impactLevel, "HIGH");
    assert.ok(result.affectedTags.includes("Users"));
    assert.ok(result.affectedTags.includes("Orders"));
  });

  it("4. should accurately identify isolated components with LOW impact level", () => {
    // Isolated schema
    const schemaResult = blastRadiusService.analyze(testModel, {
      type: "schema",
      id: "IsolatedWidget",
    });
    assert.equal(schemaResult.impactLevel, "LOW");
    assert.equal(schemaResult.affectedEndpoints.length, 0);

    // Isolated endpoint
    const endpointResult = blastRadiusService.analyze(testModel, {
      type: "endpoint",
      id: "endpoint:GET:/ping",
    });
    assert.equal(endpointResult.impactLevel, "LOW");
    assert.equal(endpointResult.affectedEndpoints.length, 0);
    assert.equal(endpointResult.affectedSchemas.length, 0);
  });

  it("5. should calculate CRITICAL impact for widely shared components", () => {
    // Create a model where BearerAuth protects 7 endpoints (> 5)
    const wideModel: CanonicalApiModel = {
      ...testModel,
      endpoints: [
        ...testModel.endpoints,
        {
          id: "ep-extra-1",
          path: "/extra/1",
          method: "GET",
          tags: ["Extra"],
          parameters: [],
          responses: [],
          security: [{ schemeName: "BearerAuth", scopes: [] }],
        },
        {
          id: "ep-extra-2",
          path: "/extra/2",
          method: "GET",
          tags: ["Extra"],
          parameters: [],
          responses: [],
          security: [{ schemeName: "BearerAuth", scopes: [] }],
        },
      ],
    };

    const secResult = blastRadiusService.analyze(wideModel, {
      type: "security",
      id: "BearerAuth",
    });
    // 7 protected endpoints > 5 => CRITICAL
    assert.equal(secResult.impactLevel, "CRITICAL");
    assert.equal(secResult.affectedEndpoints.length, 7);
  });

  it("6. should reject non-existent endpoint with 404 TARGET_NOT_FOUND", () => {
    assert.throws(
      () => {
        blastRadiusService.analyze(testModel, {
          type: "endpoint",
          id: "DELETE /nonexistent",
        });
      },
      (err: any) => {
        assert.equal(err.statusCode, 404);
        assert.equal(err.code, "TARGET_NOT_FOUND");
        return true;
      }
    );
  });

  it("7. should reject non-existent schema with 404 TARGET_NOT_FOUND", () => {
    assert.throws(
      () => {
        blastRadiusService.analyze(testModel, {
          type: "schema",
          id: "GhostSchema",
        });
      },
      (err: any) => {
        assert.equal(err.statusCode, 404);
        assert.equal(err.code, "TARGET_NOT_FOUND");
        return true;
      }
    );
  });

  it("8. should reject non-existent security scheme with 404 TARGET_NOT_FOUND", () => {
    assert.throws(
      () => {
        blastRadiusService.analyze(testModel, {
          type: "security",
          id: "FakeOAuth",
        });
      },
      (err: any) => {
        assert.equal(err.statusCode, 404);
        assert.equal(err.code, "TARGET_NOT_FOUND");
        return true;
      }
    );
  });

  it("9. should reject unsupported target type with 400 UNSUPPORTED_TARGET_TYPE", () => {
    assert.throws(
      () => {
        blastRadiusService.analyze(testModel, {
          type: "invalid_type" as any,
          id: "something",
        });
      },
      (err: any) => {
        assert.equal(err.statusCode, 400);
        return true;
      }
    );
  });
});
