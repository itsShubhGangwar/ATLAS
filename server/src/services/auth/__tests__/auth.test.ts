import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { connectDB, disconnectDB } from "../../../config/db";
import { authService } from "../auth.service";
import { User } from "../../../models/User";
import { ApiError } from "../../../utils/api-error";

describe("Authentication Service & Security", () => {
  before(async () => {
    await connectDB();
    await User.deleteMany({ email: /@test\.com$/ });
  });

  after(async () => {
    await User.deleteMany({ email: /@test\.com$/ });
    await disconnectDB();
  });

  const testUser = {
    name: "Alice Engineer",
    email: "alice@test.com",
    password: "securePassword123!",
  };

  it("1. should successfully register a new user with hashed password and return a JWT", async () => {
    const res = await authService.register(testUser);

    assert.ok(res.token);
    assert.equal(res.user.name, testUser.name);
    assert.equal(res.user.email, testUser.email);
    assert.ok(res.user.id);
    assert.equal((res.user as any).passwordHash, undefined);

    // Verify stored in DB with hashed password
    const inDb = await User.findOne({ email: testUser.email });
    assert.ok(inDb);
    assert.notEqual(inDb.passwordHash, testUser.password);
    assert.ok(inDb.passwordHash.startsWith("$2"));
  });

  it("2. should reject duplicate email registration with 409 error", async () => {
    await assert.rejects(
      async () => {
        await authService.register(testUser);
      },
      (err: any) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.statusCode, 409);
        assert.equal(err.code, "VALIDATION_ERROR");
        return true;
      }
    );
  });

  it("3. should successfully authenticate user and return token on valid login", async () => {
    const res = await authService.login({
      email: testUser.email,
      password: testUser.password,
    });

    assert.ok(res.token);
    assert.equal(res.user.email, testUser.email);
    assert.equal((res.user as any).passwordHash, undefined);

    // Verify token validity
    const decoded = authService.verifyToken(res.token);
    assert.equal(decoded.email, testUser.email);
    assert.equal(decoded.id, res.user.id);
  });

  it("4. should reject login with invalid password with 401 error", async () => {
    await assert.rejects(
      async () => {
        await authService.login({
          email: testUser.email,
          password: "wrongPassword!",
        });
      },
      (err: any) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.statusCode, 401);
        assert.equal(err.code, "INVALID_CREDENTIALS");
        return true;
      }
    );
  });

  it("5. should reject login with non-existent email with 401 error", async () => {
    await assert.rejects(
      async () => {
        await authService.login({
          email: "unknown@test.com",
          password: "password123",
        });
      },
      (err: any) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.statusCode, 401);
        assert.equal(err.code, "INVALID_CREDENTIALS");
        return true;
      }
    );
  });

  it("6. should fetch current user profile without sensitive fields", async () => {
    const registered = await User.findOne({ email: testUser.email });
    assert.ok(registered);

    const profile = await authService.getCurrentUser(registered._id.toString());
    assert.equal(profile.id, registered._id.toString());
    assert.equal(profile.email, testUser.email);
    assert.equal((profile as any).passwordHash, undefined);
  });
});
