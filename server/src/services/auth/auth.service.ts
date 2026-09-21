import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { User, IUser } from "../../models/User";
import { ApiError } from "../../utils/api-error";

export interface RegisterDTO {
  name: string;
  email: string;
  password: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    createdAt?: Date;
  };
}

export class AuthService {
  private getJwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      if (process.env.NODE_ENV === "production") {
        throw new Error("FATAL: JWT_SECRET environment variable is missing.");
      }
      return "atlas-dev-secret-key-phase5-2026-secure";
    }
    return secret;
  }

  public generateToken(user: IUser): string {
    const secret = this.getJwtSecret();
    return jwt.sign(
      {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
      },
      secret,
      { expiresIn: "7d" }
    );
  }

  public verifyToken(token: string): { id: string; email: string; name: string } {
    const secret = this.getJwtSecret();
    return jwt.verify(token, secret) as { id: string; email: string; name: string };
  }

  public async register(dto: RegisterDTO): Promise<AuthResponse> {
    const { name, email, password } = dto;

    if (!name || name.trim().length < 2) {
      throw new ApiError(400, "VALIDATION_ERROR", "Name must be at least 2 characters long.");
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      throw new ApiError(400, "VALIDATION_ERROR", "Please provide a valid email address.");
    }

    if (!password || password.length < 6) {
      throw new ApiError(400, "VALIDATION_ERROR", "Password must be at least 6 characters long.");
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      throw new ApiError(409, "VALIDATION_ERROR", "An account with this email already exists.");
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
    });

    const token = this.generateToken(user);

    return {
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
    };
  }

  public async login(dto: LoginDTO): Promise<AuthResponse> {
    const { email, password } = dto;

    if (!email || !password) {
      throw new ApiError(400, "VALIDATION_ERROR", "Email and password are required.");
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      throw new ApiError(401, "INVALID_CREDENTIALS", "Invalid email or password.");
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new ApiError(401, "INVALID_CREDENTIALS", "Invalid email or password.");
    }

    const token = this.generateToken(user);

    return {
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
    };
  }

  public async getCurrentUser(userId: string): Promise<{ id: string; name: string; email: string; createdAt: Date }> {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, "AUTH_REQUIRED", "User account not found.");
    }

    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    };
  }
}

export const authService = new AuthService();
