import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { diffEngine } from "../diff.engine";
import { diffService } from "../diff.service";
import { CanonicalApiModel } from "../../parser/canonical-model";

describe("API Diff & Breaking Change Detection Engine", () => {
  const createBaseModel = (): CanonicalApiModel => ({
    metadata: {
      title: "Sample API",
      version: "1.0.0",
      openApiVersion: "3.0.0",
      specType: "openapi",
    },
    endpoints: [
      {
        id: "get-users",
        path: "/users",
        method: "GET",
        summary: "Get users",
        tags: ["Users"],
        parameters: [
          {
            name: "limit",
            location: "query",
            required: false,
            schemaType: "integer",
          },
        ],
        responses: [
          {
            statusCode: "200",
            description: "Success",
            schemaRef: "User",
          },
        ],
        security: [],
      },
    ],
    schemas: [
      {
        name: "User",
        type: "object",
        required: ["id", "email"],
        references: [],
        properties: [
          { name: "id", type: "string", required: true },
          { name: "email", type: "string", required: true },
          { name: "age", type: "integer", required: false },
        ],
      },
    ],
    securitySchemes: [
      {
        name: "BearerAuth",
        type: "http",
        scheme: "bearer",
      },
    ],
  });

  it("1. should detect metadata changes as info severity", () => {
    const base = createBaseModel();
    const updated = createBaseModel();
    updated.metadata.title = "Updated API Title";
    updated.metadata.version = "1.1.0";

    const report = diffEngine.compare(base, updated);

    assert.equal(report.summary.breakingCount, 0);
    assert.equal(report.summary.infoCount, 2);
    assert.equal(report.summary.hasBreakingChanges, false);

    const titleChange = report.changes.find((c) => c.path === "metadata.title");
    assert.ok(titleChange);
    assert.equal(titleChange.severity, "info");
    assert.equal(titleChange.changeType, "modified");
  });

  it("2. should detect removed endpoint as a breaking change", () => {
    const base = createBaseModel();
    const updated = createBaseModel();
    updated.endpoints = []; // Removed GET /users

    const report = diffEngine.compare(base, updated);

    assert.equal(report.summary.breakingCount, 1);
    assert.equal(report.summary.hasBreakingChanges, true);

    const epChange = report.changes.find((c) => c.category === "endpoint");
    assert.ok(epChange);
    assert.equal(epChange.severity, "breaking");
    assert.equal(epChange.changeType, "removed");
    assert.match(epChange.description, /GET \/users/);
  });

  it("3. should detect added endpoint as non-breaking", () => {
    const base = createBaseModel();
    const updated = createBaseModel();
    updated.endpoints.push({
      id: "post-users",
      path: "/users",
      method: "POST",
      tags: ["Users"],
      parameters: [],
      responses: [{ statusCode: "201", description: "Created" }],
      security: [],
    });

    const report = diffEngine.compare(base, updated);

    assert.equal(report.summary.breakingCount, 0);
    assert.equal(report.summary.nonBreakingCount, 1);
    assert.equal(report.summary.hasBreakingChanges, false);

    const addedChange = report.changes.find((c) => c.changeType === "added");
    assert.ok(addedChange);
    assert.equal(addedChange.severity, "non-breaking");
  });

  it("4. should detect added required parameter as breaking, but optional as non-breaking", () => {
    const base = createBaseModel();
    const updated = createBaseModel();
    updated.endpoints[0].parameters.push({
      name: "tenantId",
      location: "header",
      required: true,
      schemaType: "string",
    });
    updated.endpoints[0].parameters.push({
      name: "sort",
      location: "query",
      required: false,
      schemaType: "string",
    });

    const report = diffEngine.compare(base, updated);

    const breakingParam = report.changes.find(
      (c) => c.category === "parameter" && c.severity === "breaking"
    );
    assert.ok(breakingParam);
    assert.match(breakingParam.description, /tenantId/);

    const nonBreakingParam = report.changes.find(
      (c) => c.category === "parameter" && c.severity === "non-breaking"
    );
    assert.ok(nonBreakingParam);
    assert.match(nonBreakingParam.description, /sort/);
  });

  it("5. should detect removed required parameter as breaking", () => {
    const base = createBaseModel();
    base.endpoints[0].parameters.push({
      name: "id",
      location: "path",
      required: true,
      schemaType: "string",
    });
    const updated = createBaseModel(); // Doesn't have path param "id"

    const report = diffEngine.compare(base, updated);
    const paramChange = report.changes.find(
      (c) => c.category === "parameter" && c.changeType === "removed"
    );
    assert.ok(paramChange);
    assert.equal(paramChange.severity, "breaking");
  });

  it("6. should detect removed schema property as breaking", () => {
    const base = createBaseModel();
    const updated = createBaseModel();
    // Remove "email" from User schema
    updated.schemas[0].properties = updated.schemas[0].properties.filter((p) => p.name !== "email");

    const report = diffEngine.compare(base, updated);
    const propChange = report.changes.find(
      (c) => c.category === "schema" && c.changeType === "removed"
    );
    assert.ok(propChange);
    assert.equal(propChange.severity, "breaking");
    assert.match(propChange.description, /email/);
  });

  it("7. should detect schema property type change as breaking", () => {
    const base = createBaseModel();
    const updated = createBaseModel();
    // Change id from string to integer
    const idProp = updated.schemas[0].properties.find((p) => p.name === "id");
    if (idProp) idProp.type = "integer";

    const report = diffEngine.compare(base, updated);
    const typeChange = report.changes.find(
      (c) => c.category === "schema" && c.path.includes("id.type")
    );
    assert.ok(typeChange);
    assert.equal(typeChange.severity, "breaking");
  });

  it("8. should detect removed security scheme as breaking", () => {
    const base = createBaseModel();
    const updated = createBaseModel();
    updated.securitySchemes = []; // Removed BearerAuth

    const report = diffEngine.compare(base, updated);
    const secChange = report.changes.find((c) => c.category === "security");
    assert.ok(secChange);
    assert.equal(secChange.severity, "breaking");
    assert.equal(secChange.changeType, "removed");
  });

  it("9. should return 0 changes for identical models", () => {
    const base = createBaseModel();
    const same = createBaseModel();

    const report = diffEngine.compare(base, same);
    assert.equal(report.summary.totalChanges, 0);
    assert.equal(report.summary.hasBreakingChanges, false);
    assert.equal(report.changes.length, 0);
  });

  it("10. should accurately compare sample-openapi v1 and v2 fixtures", async () => {
    const v1Path = path.resolve(__dirname, "../../parser/fixtures/sample-openapi.yaml");
    const v2Path = path.resolve(__dirname, "../fixtures/sample-openapi-v2.yaml");

    const v1Content = fs.readFileSync(v1Path, "utf-8");
    const v2Content = fs.readFileSync(v2Path, "utf-8");

    const diffResult = await diffService.compareSpecs(v1Content, v2Content);

    assert.equal(diffResult.success, true);
    assert.ok(diffResult.data);

    const { summary, changes } = diffResult.data;
    assert.equal(summary.hasBreakingChanges, true);
    assert.ok(summary.breakingCount > 0);
    assert.ok(summary.nonBreakingCount > 0);
    assert.ok(summary.infoCount > 0);

    // Verify specific expected changes in v2:
    // 1. GET /users/{id} removed -> breaking
    const removedEndpoint = changes.find(
      (c) => c.category === "endpoint" && c.changeType === "removed" && c.path.includes("/users/{id}")
    );
    assert.ok(removedEndpoint, "Should detect removed GET /users/{id} endpoint");
    assert.equal(removedEndpoint.severity, "breaking");

    // 2. GET /organizations added -> non-breaking
    const addedEndpoint = changes.find(
      (c) => c.category === "endpoint" && c.changeType === "added" && c.path.includes("/organizations")
    );
    assert.ok(addedEndpoint, "Should detect added GET /organizations endpoint");
    assert.equal(addedEndpoint.severity, "non-breaking");

    // 3. User.id type changed string -> integer
    const idTypeChange = changes.find(
      (c) => c.category === "schema" && c.path.includes("User.properties.id.type")
    );
    assert.ok(idTypeChange, "Should detect User.id type change");
    assert.equal(idTypeChange.severity, "breaking");

    // 4. X-Tenant-ID header added as required in POST /users
    const tenantParam = changes.find(
      (c) => c.category === "parameter" && c.path.includes("X-Tenant-ID")
    );
    assert.ok(tenantParam, "Should detect required X-Tenant-ID header");
    assert.equal(tenantParam.severity, "breaking");
  });
});
