import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { openApiParser } from "../../parser";
import { CanonicalApiModel } from "../../parser/canonical-model";
import { GraphBuilder, buildGraph } from "../graph.builder";

const sampleYamlPath = path.resolve(__dirname, "../../parser/fixtures/sample-openapi.yaml");
const sampleYamlContent = fs.readFileSync(sampleYamlPath, "utf-8");

describe("Graph Builder Service", async () => {
  // Parse the sample model once for integration tests
  const parseResult = await openApiParser.parse(sampleYamlContent);
  assert.equal(parseResult.success, true, "Parser should succeed for sample YAML");
  const sampleModel: CanonicalApiModel = (parseResult as any).data;

  // Test 1: Creates spec node
  it("1. should create a spec node with metadata", () => {
    const graph = buildGraph(sampleModel);
    const specNode = graph.nodes.find((n) => n.id === "spec:main");

    assert.ok(specNode, "Spec node must exist with id 'spec:main'");
    assert.equal(specNode.type, "spec");
    assert.equal(specNode.label, "ATLAS Sample Task & User API");
    assert.equal((specNode.data as any).version, "1.0.0");
    assert.equal((specNode.data as any).openApiVersion, "3.0.3");
  });

  // Test 2: Creates endpoint nodes
  it("2. should create endpoint nodes with deterministic IDs", () => {
    const graph = buildGraph(sampleModel);
    const endpoints = graph.nodes.filter((n) => n.type === "endpoint");

    assert.equal(endpoints.length, 4, "Should create 4 endpoint nodes");
    assert.ok(endpoints.some((e) => e.id === "endpoint:GET:/users"));
    assert.ok(endpoints.some((e) => e.id === "endpoint:POST:/users"));
    assert.ok(endpoints.some((e) => e.id === "endpoint:GET:/users/{id}"));
    assert.ok(endpoints.some((e) => e.id === "endpoint:GET:/health"));
  });

  // Test 3: Creates schema nodes
  it("3. should create schema nodes", () => {
    const graph = buildGraph(sampleModel);
    const schemas = graph.nodes.filter((n) => n.type === "schema");

    assert.ok(schemas.length >= 3);
    assert.ok(schemas.some((s) => s.id === "schema:User"));
    assert.ok(schemas.some((s) => s.id === "schema:CreateUserRequest"));
    assert.ok(schemas.some((s) => s.id === "schema:ErrorResponse"));
  });

  // Test 4: Creates security nodes
  it("4. should create security scheme nodes", () => {
    const graph = buildGraph(sampleModel);
    const securityNodes = graph.nodes.filter((n) => n.type === "security");

    assert.equal(securityNodes.length, 1);
    const bearerNode = securityNodes[0];
    assert.equal(bearerNode.id, "security:BearerAuth");
    assert.equal(bearerNode.label, "BearerAuth");
    assert.equal((bearerNode.data as any).scheme, "bearer");
  });

  // Test 5: Creates tag nodes
  it("5. should create tag nodes derived from endpoint tags", () => {
    const graph = buildGraph(sampleModel);
    const tagNodes = graph.nodes.filter((n) => n.type === "tag");

    assert.ok(tagNodes.some((t) => t.id === "tag:Users"));
    assert.ok(tagNodes.some((t) => t.id === "tag:System"));
  });

  // Test 6: Creates CONTAINS edges
  it("6. should create CONTAINS edges from spec to each endpoint", () => {
    const graph = buildGraph(sampleModel);
    const containsEdges = graph.edges.filter((e) => e.type === "CONTAINS");

    assert.equal(containsEdges.length, 4, "Spec should contain all 4 endpoints");
    assert.ok(
      containsEdges.every((e) => e.source === "spec:main" && e.target.startsWith("endpoint:"))
    );
  });

  // Test 7: Creates RETURNS edges
  it("7. should create RETURNS edges from endpoints to response schemas", () => {
    const graph = buildGraph(sampleModel);
    const returnsEdges = graph.edges.filter((e) => e.type === "RETURNS");

    assert.ok(returnsEdges.length > 0, "Should have RETURNS edges");
    // GET /users returns User on 200
    const getUsers200 = returnsEdges.find(
      (e) => e.source === "endpoint:GET:/users" && e.target === "schema:User"
    );
    assert.ok(getUsers200, "GET /users should return User");
    assert.equal(getUsers200.label, "200");
  });

  // Test 8: Creates REQUEST_BODY edges
  it("8. should create REQUEST_BODY edges from endpoints to request schemas", () => {
    const graph = buildGraph(sampleModel);
    const reqBodyEdge = graph.edges.find(
      (e) =>
        e.type === "REQUEST_BODY" &&
        e.source === "endpoint:POST:/users" &&
        e.target === "schema:CreateUserRequest"
    );

    assert.ok(reqBodyEdge, "POST /users should have REQUEST_BODY edge to CreateUserRequest");
  });

  // Test 9: Creates SECURED_BY edges
  it("9. should create SECURED_BY edges from secured endpoints to security schemes", () => {
    const graph = buildGraph(sampleModel);
    const securedEdges = graph.edges.filter((e) => e.type === "SECURED_BY");

    assert.ok(securedEdges.some((e) => e.source === "endpoint:GET:/users" && e.target === "security:BearerAuth"));
    assert.ok(securedEdges.some((e) => e.source === "endpoint:POST:/users" && e.target === "security:BearerAuth"));
    // GET /users/{id} is public
    assert.ok(!securedEdges.some((e) => e.source === "endpoint:GET:/users/{id}"));
  });

  // Test 10: Creates USES_SCHEMA edges
  it("10. should create USES_SCHEMA edges when schemas reference other schemas", () => {
    const modelWithRefs: CanonicalApiModel = {
      metadata: { title: "Ref API", version: "1.0", openApiVersion: "3.0.0", specType: "openapi" },
      endpoints: [],
      schemas: [
        {
          name: "Order",
          type: "object",
          properties: [{ name: "user", type: "reference", required: true, reference: "User" }],
          required: ["user"],
          references: ["User"],
        },
        {
          name: "User",
          type: "object",
          properties: [{ name: "id", type: "string", required: true }],
          required: ["id"],
          references: [],
        },
      ],
      securitySchemes: [],
    };

    const graph = buildGraph(modelWithRefs);
    const usesSchemaEdge = graph.edges.find(
      (e) => e.type === "USES_SCHEMA" && e.source === "schema:Order" && e.target === "schema:User"
    );

    assert.ok(usesSchemaEdge, "Order should have USES_SCHEMA edge to User");
  });

  // Test 11: Creates TAGGED_WITH edges
  it("11. should create TAGGED_WITH edges from endpoints to tags", () => {
    const graph = buildGraph(sampleModel);
    const taggedEdges = graph.edges.filter((e) => e.type === "TAGGED_WITH");

    assert.ok(taggedEdges.some((e) => e.source === "endpoint:GET:/users" && e.target === "tag:Users"));
    assert.ok(taggedEdges.some((e) => e.source === "endpoint:POST:/users" && e.target === "tag:Users"));
  });

  // Test 12: Does not duplicate nodes
  it("12. should not duplicate nodes even when referenced multiple times", () => {
    const graph = buildGraph(sampleModel);
    const nodeIds = graph.nodes.map((n) => n.id);
    const uniqueIds = new Set(nodeIds);

    assert.equal(nodeIds.length, uniqueIds.size, "All node IDs must be unique");
  });

  // Test 13: Does not duplicate edges
  it("13. should not duplicate edges with identical source, target, and type", () => {
    const graph = buildGraph(sampleModel);
    const edgeIds = graph.edges.map((e) => e.id);
    const uniqueEdgeIds = new Set(edgeIds);

    assert.equal(edgeIds.length, uniqueEdgeIds.size, "All edge IDs must be unique");
  });

  // Test 14: Handles missing optional fields gracefully
  it("14. should handle missing optional fields without throwing errors", () => {
    const sparseModel: CanonicalApiModel = {
      metadata: { title: "Sparse API", version: "1.0", openApiVersion: "3.0.0", specType: "openapi" },
      endpoints: [
        {
          id: "get-ping",
          path: "/ping",
          method: "GET",
          tags: [], // No tags
          parameters: [], // No parameters
          responses: [], // No responses
          security: [], // No security
        },
      ],
      schemas: [
        {
          name: "EmptySchema",
          type: "object",
          properties: [],
          required: [],
          references: [],
        },
      ],
      securitySchemes: [],
    };

    assert.doesNotThrow(() => {
      const graph = buildGraph(sparseModel);
      assert.ok(graph.nodes.length > 0);
      assert.equal(graph.stats.endpoints, 1);
      assert.equal(graph.stats.tags, 0);
      assert.equal(graph.stats.securitySchemes, 0);
    });
  });

  // Test 15: Handles empty API model
  it("15. should handle an empty API model gracefully", () => {
    const emptyModel = {} as CanonicalApiModel;
    assert.doesNotThrow(() => {
      const graph = buildGraph(emptyModel);
      assert.ok(graph.nodes.length >= 1, "Should at least create fallback spec node");
      assert.equal(graph.stats.endpoints, 0);
      assert.equal(graph.stats.schemas, 0);
      assert.equal(graph.stats.edges, 0);
    });
  });
});