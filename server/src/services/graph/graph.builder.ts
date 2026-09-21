import { CanonicalApiModel } from "../parser/canonical-model";
import { GraphModel, GraphNode, GraphEdge, GraphStats } from "./graph.types";

export class GraphBuilder {
  /**
   * Transforms a CanonicalApiModel into a complete GraphModel
   */
  public static build(model: CanonicalApiModel): GraphModel {
    const nodeMap = new Map<string, GraphNode>();
    const edgeMap = new Map<string, GraphEdge>();

    if (!model) {
      return {
        nodes: [],
        edges: [],
        stats: {
          nodes: 0,
          edges: 0,
          endpoints: 0,
          schemas: 0,
          securitySchemes: 0,
          tags: 0,
        },
      };
    }

    const metadata = model.metadata || {
      title: "API Specification",
      version: "1.0.0",
      openApiVersion: "3.0.0",
      specType: "openapi",
    };
    const endpoints = Array.isArray(model.endpoints) ? model.endpoints : [];
    const schemas = Array.isArray(model.schemas) ? model.schemas : [];
    const securitySchemes = Array.isArray(model.securitySchemes) ? model.securitySchemes : [];

    // 1. Create API Spec Node
    const specNodeId = "spec:main";
    nodeMap.set(specNodeId, {
      id: specNodeId,
      type: "spec",
      label: metadata.title || "API Specification",
      data: {
        title: metadata.title,
        version: metadata.version,
        openApiVersion: metadata.openApiVersion,
        specType: metadata.specType,
        description: metadata.description,
        endpointCount: endpoints.length,
        schemaCount: schemas.length,
        securityCount: securitySchemes.length,
      },
    });

    // 2. Create Security Scheme Nodes
    for (const sec of securitySchemes) {
      if (!sec || !sec.name) continue;
      const secNodeId = `security:${sec.name}`;
      if (!nodeMap.has(secNodeId)) {
        nodeMap.set(secNodeId, {
          id: secNodeId,
          type: "security",
          label: sec.name,
          data: {
            name: sec.name,
            type: sec.type,
            scheme: sec.scheme,
            bearerFormat: sec.bearerFormat,
            location: sec.location,
            description: sec.description,
          },
        });
      }
    }

    // 3. Create Schema Nodes
    for (const schema of schemas) {
      if (!schema || !schema.name) continue;
      const schemaNodeId = `schema:${schema.name}`;
      if (!nodeMap.has(schemaNodeId)) {
        nodeMap.set(schemaNodeId, {
          id: schemaNodeId,
          type: "schema",
          label: schema.name,
          data: {
            name: schema.name,
            type: schema.type,
            description: schema.description,
            properties: schema.properties || [],
            propertyCount: schema.properties ? schema.properties.length : 0,
            required: schema.required || [],
            references: schema.references || [],
            rawSchema: schema.rawSchema,
          },
        });
      }
    }

    // Connect Schema -> Schema (USES_SCHEMA)
    for (const schema of schemas) {
      if (!schema || !schema.name) continue;
      const sourceSchemaId = `schema:${schema.name}`;
      const refs = Array.isArray(schema.references) ? schema.references : [];

      for (const refName of refs) {
        if (!refName) continue;
        const targetSchemaId = `schema:${refName}`;
        // Only connect if target schema is known or add it
        if (!nodeMap.has(targetSchemaId)) {
          nodeMap.set(targetSchemaId, {
            id: targetSchemaId,
            type: "schema",
            label: refName,
            data: {
              name: refName,
              type: "object",
              properties: [],
              required: [],
              references: [],
            },
          });
        }

        const edgeId = `edge:uses_schema:${sourceSchemaId}->${targetSchemaId}`;
        if (!edgeMap.has(edgeId)) {
          edgeMap.set(edgeId, {
            id: edgeId,
            source: sourceSchemaId,
            target: targetSchemaId,
            type: "USES_SCHEMA",
            label: "references",
          });
        }
      }
    }

    // 4. Create Endpoint Nodes & Collect Tags
    const tagToEndpointMap = new Map<string, string[]>();

    for (const ep of endpoints) {
      if (!ep || !ep.path || !ep.method) continue;
      const endpointNodeId = `endpoint:${ep.method.toUpperCase()}:${ep.path}`;

      if (!nodeMap.has(endpointNodeId)) {
        nodeMap.set(endpointNodeId, {
          id: endpointNodeId,
          type: "endpoint",
          label: `${ep.method.toUpperCase()} ${ep.path}`,
          data: {
            id: ep.id,
            path: ep.path,
            method: ep.method.toUpperCase(),
            operationId: ep.operationId,
            summary: ep.summary,
            description: ep.description,
            tags: ep.tags || [],
            parameters: ep.parameters || [],
            requestBody: ep.requestBody,
            responses: ep.responses || [],
            security: ep.security || [],
          },
        });
      }

      // Relationship: Spec -> CONTAINS -> Endpoint
      const containsEdgeId = `edge:contains:${specNodeId}->${endpointNodeId}`;
      if (!edgeMap.has(containsEdgeId)) {
        edgeMap.set(containsEdgeId, {
          id: containsEdgeId,
          source: specNodeId,
          target: endpointNodeId,
          type: "CONTAINS",
        });
      }

      // Relationship: Endpoint -> REQUEST_BODY -> Schema
      if (ep.requestBody && ep.requestBody.schemaRef) {
        const targetSchemaId = `schema:${ep.requestBody.schemaRef}`;
        if (!nodeMap.has(targetSchemaId)) {
          nodeMap.set(targetSchemaId, {
            id: targetSchemaId,
            type: "schema",
            label: ep.requestBody.schemaRef,
            data: {
              name: ep.requestBody.schemaRef,
              type: "object",
              properties: [],
              required: [],
              references: [],
            },
          });
        }

        const reqBodyEdgeId = `edge:request_body:${endpointNodeId}->${targetSchemaId}`;
        if (!edgeMap.has(reqBodyEdgeId)) {
          edgeMap.set(reqBodyEdgeId, {
            id: reqBodyEdgeId,
            source: endpointNodeId,
            target: targetSchemaId,
            type: "REQUEST_BODY",
            label: ep.requestBody.contentType || "body",
          });
        }
      }

      // Relationship: Endpoint -> RETURNS -> Schema
      const responses = Array.isArray(ep.responses) ? ep.responses : [];
      for (const resp of responses) {
        if (!resp || !resp.schemaRef) continue;
        const targetSchemaId = `schema:${resp.schemaRef}`;

        if (!nodeMap.has(targetSchemaId)) {
          nodeMap.set(targetSchemaId, {
            id: targetSchemaId,
            type: "schema",
            label: resp.schemaRef,
            data: {
              name: resp.schemaRef,
              type: "object",
              properties: [],
              required: [],
              references: [],
            },
          });
        }

        const returnsEdgeId = `edge:returns:${endpointNodeId}->${targetSchemaId}:${resp.statusCode}`;
        if (!edgeMap.has(returnsEdgeId)) {
          edgeMap.set(returnsEdgeId, {
            id: returnsEdgeId,
            source: endpointNodeId,
            target: targetSchemaId,
            type: "RETURNS",
            label: resp.statusCode,
          });
        }
      }

      // Relationship: Endpoint -> SECURED_BY -> Security
      const secReqs = Array.isArray(ep.security) ? ep.security : [];
      for (const sec of secReqs) {
        if (!sec || !sec.schemeName) continue;
        const targetSecId = `security:${sec.schemeName}`;

        if (!nodeMap.has(targetSecId)) {
          nodeMap.set(targetSecId, {
            id: targetSecId,
            type: "security",
            label: sec.schemeName,
            data: {
              name: sec.schemeName,
              type: "apiKey",
            },
          });
        }

        const securedEdgeId = `edge:secured_by:${endpointNodeId}->${targetSecId}`;
        if (!edgeMap.has(securedEdgeId)) {
          edgeMap.set(securedEdgeId, {
            id: securedEdgeId,
            source: endpointNodeId,
            target: targetSecId,
            type: "SECURED_BY",
            label: sec.scopes && sec.scopes.length > 0 ? sec.scopes.join(", ") : undefined,
          });
        }
      }

      // Group tags
      const tags = Array.isArray(ep.tags) ? ep.tags : [];
      for (const tag of tags) {
        if (!tag) continue;
        const currentList = tagToEndpointMap.get(tag) || [];
        currentList.push(endpointNodeId);
        tagToEndpointMap.set(tag, currentList);
      }
    }

    // 5. Create Tag Nodes & TAGGED_WITH edges
    for (const [tagName, endpointIds] of tagToEndpointMap.entries()) {
      const tagNodeId = `tag:${tagName}`;
      if (!nodeMap.has(tagNodeId)) {
        nodeMap.set(tagNodeId, {
          id: tagNodeId,
          type: "tag",
          label: tagName,
          data: {
            name: tagName,
            endpointCount: endpointIds.length,
            endpoints: endpointIds,
          },
        });
      }

      for (const epId of endpointIds) {
        const taggedEdgeId = `edge:tagged_with:${epId}->${tagNodeId}`;
        if (!edgeMap.has(taggedEdgeId)) {
          edgeMap.set(taggedEdgeId, {
            id: taggedEdgeId,
            source: epId,
            target: tagNodeId,
            type: "TAGGED_WITH",
            label: "tag",
          });
        }
      }
    }

    const nodes = Array.from(nodeMap.values());
    const edges = Array.from(edgeMap.values());

    const stats: GraphStats = {
      nodes: nodes.length,
      edges: edges.length,
      endpoints: nodes.filter((n) => n.type === "endpoint").length,
      schemas: nodes.filter((n) => n.type === "schema").length,
      securitySchemes: nodes.filter((n) => n.type === "security").length,
      tags: nodes.filter((n) => n.type === "tag").length,
    };

    return {
      nodes,
      edges,
      stats,
    };
  }
}

export const buildGraph = GraphBuilder.build;