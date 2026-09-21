import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { typeScriptSdkGenerator } from "../typescript.generator";
import { sdkService } from "../sdk.service";
import { CanonicalApiModel } from "../../parser/canonical-model";

describe("TypeScript SDK Generator", () => {
  const sampleModel: CanonicalApiModel = {
    metadata: {
      title: "PetStore API",
      version: "1.0.0",
      openApiVersion: "3.0.0",
      specType: "openapi",
    },
    endpoints: [
      {
        id: "get-pets",
        path: "/pets",
        method: "GET",
        operationId: "listPets",
        summary: "List all pets",
        tags: ["Pets"],
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
            description: "A list of pets",
            schemaRef: "#/components/schemas/Pet",
            schemaType: "array",
          },
        ],
        security: [],
      },
      {
        id: "post-pets",
        path: "/pets",
        method: "POST",
        operationId: "createPet",
        summary: "Create a pet",
        tags: ["Pets"],
        parameters: [],
        requestBody: {
          required: true,
          contentType: "application/json",
          schemaRef: "#/components/schemas/NewPet",
        },
        responses: [
          {
            statusCode: "201",
            description: "Pet created",
            schemaRef: "#/components/schemas/Pet",
          },
        ],
        security: [],
      },
      {
        id: "get-pet-by-id",
        path: "/pets/{id}",
        method: "GET",
        operationId: "getPetById",
        summary: "Get pet by id",
        tags: ["Pets"],
        parameters: [
          {
            name: "id",
            location: "path",
            required: true,
            schemaType: "string",
          },
        ],
        responses: [
          {
            statusCode: "200",
            description: "Pet found",
            schemaRef: "#/components/schemas/Pet",
          },
        ],
        security: [],
      },
    ],
    schemas: [
      {
        name: "Pet",
        type: "object",
        description: "Pet object",
        required: ["id", "name"],
        references: [],
        properties: [
          { name: "id", type: "string", required: true },
          { name: "name", type: "string", required: true },
          { name: "tag", type: "string", required: false },
        ],
      },
      {
        name: "NewPet",
        type: "object",
        description: "New pet registration",
        required: ["name"],
        references: [],
        properties: [
          { name: "name", type: "string", required: true },
          { name: "tag", type: "string", required: false },
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
  };

  it("1. should generate 3 files: types.ts, client.ts, index.ts", () => {
    const sdk = typeScriptSdkGenerator.generate(sampleModel);

    assert.equal(sdk.files.length, 3);
    const filenames = sdk.files.map((f) => f.filename);
    assert.ok(filenames.includes("types.ts"));
    assert.ok(filenames.includes("client.ts"));
    assert.ok(filenames.includes("index.ts"));
  });

  it("2. should generate correct interfaces in types.ts", () => {
    const sdk = typeScriptSdkGenerator.generate(sampleModel);
    const typesFile = sdk.files.find((f) => f.filename === "types.ts")!;

    assert.match(typesFile.content, /export interface Pet \{/);
    assert.match(typesFile.content, /id: string;/);
    assert.match(typesFile.content, /name: string;/);
    assert.match(typesFile.content, /tag\?: string;/);

    assert.match(typesFile.content, /export interface NewPet \{/);

    // Query params interface
    assert.match(typesFile.content, /export interface ListPetsQueryParams \{/);
    assert.match(typesFile.content, /limit\?: number;/);
  });

  it("3. should generate typed client methods in client.ts", () => {
    const sdk = typeScriptSdkGenerator.generate(sampleModel, { clientName: "PetStore" });
    const clientFile = sdk.files.find((f) => f.filename === "client.ts")!;

    assert.equal(sdk.clientName, "PetStoreClient");
    assert.match(clientFile.content, /export class PetStoreClient \{/);

    // listPets
    assert.match(clientFile.content, /public async listPets\(query\?: Types\.ListPetsQueryParams\): Promise<Types\.Pet\[\]>/);

    // createPet
    assert.match(clientFile.content, /public async createPet\(body: Types\.NewPet\): Promise<Types\.Pet>/);

    // getPetById
    assert.match(clientFile.content, /public async getPetById\(id: string\): Promise<Types\.Pet>/);

    // ApiClientError class
    assert.match(clientFile.content, /export class ApiClientError extends Error/);
  });

  it("4. should generate index.ts that exports types and client", () => {
    const sdk = typeScriptSdkGenerator.generate(sampleModel, { clientName: "PetStore" });
    const indexFile = sdk.files.find((f) => f.filename === "index.ts")!;

    assert.match(indexFile.content, /export \* from "\.\/types";/);
    assert.match(indexFile.content, /export \* from "\.\/client";/);
    assert.match(indexFile.content, /export \{ PetStoreClient as default \} from "\.\/client";/);
  });

  it("5. should successfully generate SDK from sample OpenAPI YAML file", async () => {
    const v1Path = path.resolve(__dirname, "../../parser/fixtures/sample-openapi.yaml");
    const v1Content = fs.readFileSync(v1Path, "utf-8");

    const result = await sdkService.generateFromSpec(v1Content, { clientName: "AtlasTest" });
    assert.equal(result.success, true);
    assert.ok(result.data);

    const types = result.data.files.find((f) => f.filename === "types.ts")!;
    const client = result.data.files.find((f) => f.filename === "client.ts")!;

    assert.match(types.content, /export interface User \{/);
    assert.match(types.content, /export interface CreateUserRequest \{/);
    assert.match(client.content, /listUsers/);
    assert.match(client.content, /createUser/);
    assert.match(client.content, /getUserById/);
  });

  it("6. should handle empty models gracefully", () => {
    const emptyModel: CanonicalApiModel = {
      metadata: {
        title: "Empty API",
        version: "0.0.1",
        openApiVersion: "3.0.0",
        specType: "openapi",
      },
      endpoints: [],
      schemas: [],
      securitySchemes: [],
    };

    const sdk = typeScriptSdkGenerator.generate(emptyModel);
    assert.equal(sdk.files.length, 3);
    assert.ok(sdk.clientName.length > 0);
  });
});
