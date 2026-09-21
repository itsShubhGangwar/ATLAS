import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { openApiParser } from "../../parser";
import { CanonicalApiModel } from "../../parser/canonical-model";
import { governanceEngine } from "../governance.engine";

const sampleYamlPath = path.resolve(__dirname, "../../parser/fixtures/sample-openapi.yaml");
const sampleYamlContent = fs.readFileSync(sampleYamlPath, "utf-8");

describe("Governance & Security Rule Engine", async () => {
  const parseResult = await openApiParser.parse(sampleYamlContent);
  assert.equal(parseResult.success, true);
  const sampleModel: CanonicalApiModel = (parseResult as any).data;

  it("1. should detect public endpoints with no security requirements", () => {
    const report = governanceEngine.analyze(sampleModel);
    const publicFinding = report.findings.find(
      (f) => f.ruleId === "gov-public-endpoint" && f.targetId.includes("/users/{id}")
    );

    assert.ok(publicFinding, "Should flag GET /users/{id} as public endpoint");
    assert.equal(publicFinding.severity, "medium");
    assert.equal(publicFinding.category, "Security");
  });

  it("2. should detect missing operationId on endpoints", () => {
    const modelWithMissingOpId: CanonicalApiModel = {
      metadata: { title: "API", version: "1.0", openApiVersion: "3.0.0", specType: "openapi" },
      endpoints: [
        {
          id: "get-test",
          path: "/test",
          method: "GET",
          operationId: "", // Missing
          tags: [],
          parameters: [],
          responses: [],
          security: [],
        },
      ],
      schemas: [],
      securitySchemes: [],
    };

    const report = governanceEngine.analyze(modelWithMissingOpId);
    const opIdFinding = report.findings.find((f) => f.ruleId === "gov-missing-operation-id");
    assert.ok(opIdFinding, "Should detect missing operationId");
    assert.equal(opIdFinding.severity, "low");
  });

  it("3. should detect missing response descriptions", () => {
    const modelWithEmptyDesc: CanonicalApiModel = {
      metadata: { title: "API", version: "1.0", openApiVersion: "3.0.0", specType: "openapi" },
      endpoints: [
        {
          id: "get-items",
          path: "/items",
          method: "GET",
          operationId: "getItems",
          tags: [],
          parameters: [],
          responses: [
            {
              statusCode: "200",
              description: "", // Missing
            },
          ],
          security: [],
        },
      ],
      schemas: [],
      securitySchemes: [],
    };

    const report = governanceEngine.analyze(modelWithEmptyDesc);
    const descFinding = report.findings.find((f) => f.ruleId === "gov-missing-response-description");
    assert.ok(descFinding, "Should detect missing response description");
  });

  it("4. should detect unbounded pagination parameters without maximum constraint", () => {
    const report = governanceEngine.analyze(sampleModel);
    const paramFinding = report.findings.find(
      (f) => f.ruleId === "gov-unbounded-pagination" && f.targetId.includes("limit")
    );

    assert.ok(paramFinding, "Should flag unbounded 'limit' parameter");
    assert.equal(paramFinding.severity, "medium");
  });

  it("5. should detect sensitive identifiers in schemas", () => {
    const report = governanceEngine.analyze(sampleModel);
    const passwordFinding = report.findings.find(
      (f) => f.ruleId === "gov-sensitive-fields" && f.targetId.includes("password")
    );

    assert.ok(passwordFinding, "Should detect 'password' property in CreateUserRequest schema");
    assert.equal(passwordFinding.severity, "medium");
  });

  it("6. should detect HTTP Basic authentication scheme usage", () => {
    const modelWithBasicAuth: CanonicalApiModel = {
      metadata: { title: "API", version: "1.0", openApiVersion: "3.0.0", specType: "openapi" },
      endpoints: [],
      schemas: [],
      securitySchemes: [
        {
          name: "BasicAuth",
          type: "http",
          scheme: "basic",
        },
      ],
    };

    const report = governanceEngine.analyze(modelWithBasicAuth);
    const basicFinding = report.findings.find((f) => f.ruleId === "gov-http-basic-auth");
    assert.ok(basicFinding, "Should detect HTTP Basic authentication");
    assert.equal(basicFinding.severity, "medium");
  });

  it("7. should detect missing or weak API metadata", () => {
    const modelWithoutDesc: CanonicalApiModel = {
      metadata: { title: "Untitled API", version: "1.0.0", openApiVersion: "3.0.0", specType: "openapi" },
      endpoints: [],
      schemas: [],
      securitySchemes: [],
    };

    const report = governanceEngine.analyze(modelWithoutDesc);
    const metaFinding = report.findings.find((f) => f.ruleId === "gov-missing-api-metadata");
    assert.ok(metaFinding, "Should detect missing metadata");
  });

  it("8. should detect empty schema descriptions", () => {
    const modelWithEmptySchemaDesc: CanonicalApiModel = {
      metadata: { title: "API", version: "1.0", openApiVersion: "3.0.0", specType: "openapi" },
      endpoints: [],
      schemas: [
        {
          name: "Item",
          type: "object",
          description: "", // Missing
          properties: [],
          required: [],
          references: [],
        },
      ],
      securitySchemes: [],
    };

    const report = governanceEngine.analyze(modelWithEmptySchemaDesc);
    const schemaFinding = report.findings.find((f) => f.ruleId === "gov-empty-schema-description");
    assert.ok(schemaFinding, "Should detect empty schema description");
  });

  it("9. should calculate score correctly and deduct points based on severities", () => {
    const report = governanceEngine.analyze(sampleModel);
    assert.ok(report.score >= 0 && report.score <= 100, "Score must be clamped between 0 and 100");
    assert.ok(report.rulesRun >= 8, "All registered rules must be run");

    // Total deductions:
    // summary.critical * 25 + summary.high * 15 + summary.medium * 8 + summary.low * 3
    const expectedDeductions =
      report.summary.critical * 25 +
      report.summary.high * 15 +
      report.summary.medium * 8 +
      report.summary.low * 3;

    const expectedScore = Math.max(0, Math.min(100, 100 - expectedDeductions));
    assert.equal(report.score, expectedScore, "Score must strictly reflect deductions");
  });

  it("10. should handle empty models safely without throwing", () => {
    const emptyModel = {} as CanonicalApiModel;
    assert.doesNotThrow(() => {
      const report = governanceEngine.analyze(emptyModel);
      assert.ok(report.score >= 0 && report.score <= 100);
      assert.ok(Array.isArray(report.findings));
    });
  });
});