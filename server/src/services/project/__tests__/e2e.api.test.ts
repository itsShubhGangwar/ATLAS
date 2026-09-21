import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import app from "../../../server";
import { connectDB, disconnectDB } from "../../../config/db";
import { User, Project, ApiVersion, GovernanceReport, DiffReport } from "../../../models";

describe("ATLAS Phase 5 — Full E2E Integration Test Suite", () => {
  let server: http.Server;
  let baseUrl: string;

  let user1Token: string;
  let user1Id: string;
  let user2Token: string;

  let projectId: string;
  let v1Id: string;
  let v2Id: string;

  const sampleSpecV1 = `openapi: 3.0.0
info:
  title: E2E Store API
  version: 1.0.0
paths:
  /items:
    get:
      summary: List all items
      responses:
        "200":
          description: List of items
`;

  const sampleSpecV2 = `openapi: 3.0.0
info:
  title: E2E Store API
  version: 2.0.0
paths:
  /items:
    get:
      summary: List all items with pagination
      parameters:
        - name: limit
          in: query
          required: true
          schema:
            type: integer
      responses:
        "200":
          description: List of items
`;

  before(async () => {
    process.env.NODE_ENV = "test";
    await connectDB();
    await User.deleteMany({});
    await Project.deleteMany({});
    await ApiVersion.deleteMany({});
    await GovernanceReport.deleteMany({});
    await DiffReport.deleteMany({});

    server = http.createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", () => {
        const addr = server.address();
        if (typeof addr === "object" && addr) {
          baseUrl = `http://127.0.0.1:${addr.port}`;
        }
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    await disconnectDB();
  });

  it("1. should register a new user via POST /api/auth/register", async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Alice Engineer",
        email: "alice@atlas.dev",
        password: "password123",
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.ok(body.token);
    assert.equal(body.user.email, "alice@atlas.dev");
    user1Token = body.token;
    user1Id = body.user.id;
  });

  it("2. should login existing user via POST /api/auth/login", async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "alice@atlas.dev",
        password: "password123",
      }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.token);
    assert.equal(body.user.email, "alice@atlas.dev");
  });

  it("3. should get current user profile via GET /api/auth/me", async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${user1Token}` },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.user.email, "alice@atlas.dev");
    assert.equal(body.user.password, undefined);
  });

  it("4. should create a project via POST /api/projects", async () => {
    const res = await fetch(`${baseUrl}/api/projects`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user1Token}`,
      },
      body: JSON.stringify({
        name: "E-Commerce API",
        description: "Core store services",
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.name, "E-Commerce API");
    assert.equal(body.owner, user1Id);
    projectId = body.id;
  });

  it("5. should upload v1 specification via POST /api/projects/:id/versions", async () => {
    const res = await fetch(`${baseUrl}/api/projects/${projectId}/versions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user1Token}`,
      },
      body: JSON.stringify({
        spec: sampleSpecV1,
        name: "Initial Release",
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.version, "1.0.0");
    assert.equal(body.endpointsCount, 1);
    assert.ok(body.canonicalModel);
    assert.equal(body.canonicalModel.endpoints.length, 1);
    v1Id = body.id;
  });

  it("6. should upload v2 specification via POST /api/projects/:id/versions", async () => {
    const res = await fetch(`${baseUrl}/api/projects/${projectId}/versions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user1Token}`,
      },
      body: JSON.stringify({
        spec: sampleSpecV2,
        name: "Pagination Update",
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.version, "2.0.0");
    assert.equal(body.endpointsCount, 1);
    v2Id = body.id;
  });

  it("7. should list project versions via GET /api/projects/:id/versions", async () => {
    const res = await fetch(`${baseUrl}/api/projects/${projectId}/versions`, {
      headers: { Authorization: `Bearer ${user1Token}` },
    });

    assert.equal(res.status, 200);
    const list = await res.json();
    assert.equal(list.length, 2);
  });

  it("8. should run & persist governance analysis via POST /api/projects/:id/versions/:vId/governance", async () => {
    const res = await fetch(`${baseUrl}/api/projects/${projectId}/versions/${v1Id}/governance`, {
      method: "POST",
      headers: { Authorization: `Bearer ${user1Token}` },
    });

    assert.equal(res.status, 200);
    const report = await res.json();
    assert.ok(typeof report.score === "number");
    assert.ok(Array.isArray(report.findings));
    assert.ok(report.summary);
  });

  it("9. should fetch saved governance report via GET /api/projects/:id/versions/:vId/governance", async () => {
    const res = await fetch(`${baseUrl}/api/projects/${projectId}/versions/${v1Id}/governance`, {
      headers: { Authorization: `Bearer ${user1Token}` },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.report);
    assert.ok(typeof body.report.score === "number");
  });

  it("10. should compare v1 and v2 via POST /api/projects/:id/diff", async () => {
    const res = await fetch(`${baseUrl}/api/projects/${projectId}/diff`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user1Token}`,
      },
      body: JSON.stringify({
        baseVersionId: v1Id,
        newVersionId: v2Id,
      }),
    });

    assert.equal(res.status, 200);
    const report = await res.json();
    assert.equal(report.baseVersion, "1.0.0");
    assert.equal(report.newVersion, "2.0.0");
    assert.ok(report.summary.totalChanges > 0);
    // Adding required query param is a breaking change
    assert.ok(report.summary.breakingCount > 0);
  });

  it("11. should fetch dashboard metrics via GET /api/projects/dashboard/metrics", async () => {
    const res = await fetch(`${baseUrl}/api/projects/dashboard/metrics`, {
      headers: { Authorization: `Bearer ${user1Token}` },
    });

    assert.equal(res.status, 200);
    const metrics = await res.json();
    assert.equal(metrics.projectsCount, 1);
    assert.equal(metrics.versionsCount, 2);
    assert.equal(metrics.endpointsCount, 1);
    assert.ok(metrics.recentActivity.length > 0);
  });

  it("12. should enforce strict user isolation between users", async () => {
    // Register User 2 (Bob)
    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Bob Intruder",
        email: "bob@atlas.dev",
        password: "password456",
      }),
    });
    const regBody = await regRes.json();
    user2Token = regBody.token;

    // Bob tries to access Alice's project -> 403 Forbidden
    const projRes = await fetch(`${baseUrl}/api/projects/${projectId}`, {
      headers: { Authorization: `Bearer ${user2Token}` },
    });
    assert.equal(projRes.status, 403);

    // Bob tries to run governance on Alice's version -> 403 Forbidden
    const govRes = await fetch(`${baseUrl}/api/projects/${projectId}/versions/${v1Id}/governance`, {
      method: "POST",
      headers: { Authorization: `Bearer ${user2Token}` },
    });
    assert.equal(govRes.status, 403);
  });

  it("13. should cascade delete project via DELETE /api/projects/:id", async () => {
    const delRes = await fetch(`${baseUrl}/api/projects/${projectId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${user1Token}` },
    });

    assert.equal(delRes.status, 200);

    // Verify versions were cascade deleted
    const versions = await ApiVersion.find({ projectId });
    assert.equal(versions.length, 0);

    // Verify governance reports were cascade deleted
    const govReports = await GovernanceReport.find({ projectId });
    assert.equal(govReports.length, 0);

    // Verify diff reports were cascade deleted
    const diffReports = await DiffReport.find({ projectId });
    assert.equal(diffReports.length, 0);
  });
});
