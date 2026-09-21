import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { simulatorService } from "../simulator.service";
import { SimulatorEngine } from "../simulator.engine";
import { CanonicalApiModel } from "../../parser/canonical-model";

describe("What-If API Simulator Service & Engine", () => {
  const getBaseModel = (): CanonicalApiModel => ({
    metadata: {
      title: "Store Simulator API",
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
    ],
    schemas: [
      {
        name: "User",
        type: "object",
        properties: [
          { name: "id", type: "string", required: true },
          { name: "email", type: "string", required: true },
          { name: "role", type: "string", required: false },
        ],
        required: ["id", "email"],
        references: [],
      },
      {
        name: "Order",
        type: "object",
        properties: [
          { name: "id", type: "string", required: true },
          { name: "amount", type: "number", required: true },
        ],
        required: ["id", "amount"],
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
          { name: "role", location: "query", required: false, schemaType: "string" },
        ],
        responses: [
          { statusCode: "200", description: "List of users", schemaRef: "#/components/schemas/User" },
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
          { statusCode: "200", description: "User details", schemaRef: "#/components/schemas/User" },
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
          schemaRef: "#/components/schemas/Order",
        },
        responses: [
          { statusCode: "201", description: "Order created", schemaRef: "#/components/schemas/Order" },
        ],
        security: [{ schemeName: "BearerAuth", scopes: [] }],
      },
    ],
  });

  it("1. should simulate REMOVE_ENDPOINT and detect breaking diff", () => {
    const original = getBaseModel();
    const result = simulatorService.simulate(original, {
      type: "REMOVE_ENDPOINT",
      path: "/users/{id}",
      method: "GET",
    });

    // Verification
    assert.equal(result.simulatedModel.endpoints.length, 2);
    assert.equal(
      result.simulatedModel.endpoints.some((e) => e.path === "/users/{id}"),
      false
    );
    // Diff should mark removing endpoint as breaking
    assert.ok(result.diff.summary.breakingCount > 0);
    assert.equal(result.summary.isBreaking, true);
    // Original model must NOT be modified
    assert.equal(original.endpoints.length, 3);
  });

  it("2. should simulate ADD_ENDPOINT and detect non-breaking addition", () => {
    const original = getBaseModel();
    const result = simulatorService.simulate(original, {
      type: "ADD_ENDPOINT",
      path: "/users/{id}/avatar",
      method: "GET",
      summary: "Get user avatar",
    });

    assert.equal(result.simulatedModel.endpoints.length, 4);
    assert.ok(result.simulatedModel.endpoints.some((e) => e.path === "/users/{id}/avatar"));
    assert.ok(result.diff.summary.nonBreakingCount > 0);
    assert.equal(original.endpoints.length, 3);
  });

  it("3. should simulate REMOVE_AUTHENTICATION and detect governance score drop", () => {
    const original = getBaseModel();
    const result = simulatorService.simulate(original, {
      type: "REMOVE_AUTHENTICATION",
      path: "/users",
      method: "GET",
    });

    const ep = result.simulatedModel.endpoints.find((e) => e.path === "/users");
    assert.ok(ep);
    assert.equal(ep.security.length, 0);

    // Governance score should decrease (finding 'gov-public-endpoint' triggered)
    assert.ok(result.governance.scoreDelta < 0);
    assert.ok(result.governance.newFindings.some((f) => f.ruleId === "gov-public-endpoint"));
    // Original must still have security
    assert.equal(original.endpoints[0].security.length, 1);
  });

  it("4. should simulate ADD_AUTHENTICATION and bind security scheme", () => {
    const original = getBaseModel();
    // First remove auth on a clean copy
    original.endpoints[0].security = [];

    const result = simulatorService.simulate(original, {
      type: "ADD_AUTHENTICATION",
      path: "/users",
      method: "GET",
      securityScheme: "BearerAuth",
    });

    const ep = result.simulatedModel.endpoints.find((e) => e.path === "/users");
    assert.ok(ep);
    assert.equal(ep.security.length, 1);
    assert.equal(ep.security[0].schemeName, "BearerAuth");
    // Resolved finding
    assert.ok(result.governance.scoreDelta >= 0);
  });

  it("5. should simulate MAKE_PARAMETER_REQUIRED and flag breaking change", () => {
    const original = getBaseModel();
    const result = simulatorService.simulate(original, {
      type: "MAKE_PARAMETER_REQUIRED",
      path: "/users",
      method: "GET",
      parameter: "limit",
    });

    const ep = result.simulatedModel.endpoints.find((e) => e.path === "/users");
    const param = ep?.parameters.find((p) => p.name === "limit");
    assert.equal(param?.required, true);

    // Making an optional parameter required is a breaking change
    assert.ok(result.diff.summary.breakingCount > 0);
    assert.equal(result.summary.isBreaking, true);
    // Original parameter must remain optional
    assert.equal(original.endpoints[0].parameters[0].required, false);
  });

  it("6. should simulate REMOVE_PARAMETER and detect contract drift", () => {
    const original = getBaseModel();
    const result = simulatorService.simulate(original, {
      type: "REMOVE_PARAMETER",
      path: "/users",
      method: "GET",
      parameter: "role",
    });

    const ep = result.simulatedModel.endpoints.find((e) => e.path === "/users");
    assert.equal(ep?.parameters.some((p) => p.name === "role"), false);
    assert.equal(original.endpoints[0].parameters.length, 2);
  });

  it("7. should simulate REMOVE_RESPONSE_FIELD from referenced schema", () => {
    const original = getBaseModel();
    const result = simulatorService.simulate(original, {
      type: "REMOVE_RESPONSE_FIELD",
      path: "/users/{id}",
      method: "GET",
      statusCode: "200",
      field: "role",
    });

    const userSchema = result.simulatedModel.schemas.find((s) => s.name === "User");
    assert.equal(userSchema?.properties.some((p) => p.name === "role"), false);
    // Original schema intact
    assert.equal(original.schemas[0].properties.length, 3);
  });

  it("8. should simulate REMOVE_SCHEMA_PROPERTY and detect breaking diff", () => {
    const original = getBaseModel();
    const result = simulatorService.simulate(original, {
      type: "REMOVE_SCHEMA_PROPERTY",
      schema: "User",
      property: "email",
    });

    const userSchema = result.simulatedModel.schemas.find((s) => s.name === "User");
    assert.equal(userSchema?.properties.some((p) => p.name === "email"), false);
    assert.equal(userSchema?.required.includes("email"), false);

    // Removing a required property is breaking
    assert.ok(result.diff.summary.breakingCount > 0);
    assert.equal(result.summary.isBreaking, true);
    assert.equal(original.schemas[0].properties.length, 3);
  });

  it("9. should reject non-existent endpoint with 404 ENDPOINT_NOT_FOUND", () => {
    const original = getBaseModel();
    assert.throws(
      () => {
        SimulatorEngine.applyChange(original, {
          type: "REMOVE_ENDPOINT",
          path: "/ghost",
          method: "DELETE",
        });
      },
      (err: any) => {
        assert.equal(err.statusCode, 404);
        assert.equal(err.code, "ENDPOINT_NOT_FOUND");
        return true;
      }
    );
  });

  it("10. should reject non-existent schema with 404 SCHEMA_NOT_FOUND", () => {
    const original = getBaseModel();
    assert.throws(
      () => {
        SimulatorEngine.applyChange(original, {
          type: "REMOVE_SCHEMA_PROPERTY",
          schema: "GhostEntity",
          property: "id",
        });
      },
      (err: any) => {
        assert.equal(err.statusCode, 404);
        assert.equal(err.code, "SCHEMA_NOT_FOUND");
        return true;
      }
    );
  });

  it("11. should reject non-existent parameter with 404 PARAMETER_NOT_FOUND", () => {
    const original = getBaseModel();
    assert.throws(
      () => {
        SimulatorEngine.applyChange(original, {
          type: "MAKE_PARAMETER_REQUIRED",
          path: "/users",
          method: "GET",
          parameter: "nonExistentParam",
        });
      },
      (err: any) => {
        assert.equal(err.statusCode, 404);
        assert.equal(err.code, "PARAMETER_NOT_FOUND");
        return true;
      }
    );
  });

  it("12. should reject non-existent schema property with 404 PROPERTY_NOT_FOUND", () => {
    const original = getBaseModel();
    assert.throws(
      () => {
        SimulatorEngine.applyChange(original, {
          type: "REMOVE_SCHEMA_PROPERTY",
          schema: "User",
          property: "nonExistentProp",
        });
      },
      (err: any) => {
        assert.equal(err.statusCode, 404);
        assert.equal(err.code, "PROPERTY_NOT_FOUND");
        return true;
      }
    );
  });

  it("13. should reject unsupported change type with 400 UNSUPPORTED_CHANGE_TYPE", () => {
    const original = getBaseModel();
    assert.throws(
      () => {
        SimulatorEngine.applyChange(original, {
          type: "NONSENSE_ACTION" as any,
        } as any);
      },
      (err: any) => {
        assert.equal(err.statusCode, 400);
        assert.equal(err.code, "UNSUPPORTED_CHANGE_TYPE");
        return true;
      }
    );
  });

  it("14. should guarantee complete immutability of original canonical model", () => {
    const original = getBaseModel();
    const copyBefore = JSON.stringify(original);

    simulatorService.simulate(original, {
      type: "REMOVE_SCHEMA_PROPERTY",
      schema: "User",
      property: "email",
    });

    const copyAfter = JSON.stringify(original);
    assert.equal(copyBefore, copyAfter);
  });
});
