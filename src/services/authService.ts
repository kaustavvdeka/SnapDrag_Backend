import prisma from '../config/prisma.js';
import { hashPassword, comparePassword } from '../utils/hash.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { AppError } from '../middleware/errorHandler.js';
import { Role } from '@prisma/client';
import { OAuth2Client } from 'google-auth-library';
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, CLIENT_URL } from '../config/constants.js';

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);

export class AuthService {
  getGoogleAuthUrl(role: Role = Role.CUSTOMER, redirectUri?: string) {
    if (!GOOGLE_CLIENT_ID) {
      throw new AppError('Google OAuth is not configured on this server', 500, 'GOOGLE_AUTH_NOT_CONFIGURED');
    }

    const callbackUrl = redirectUri || `${CLIENT_URL}/auth/google/callback`;
    const url = googleClient.generateAuthUrl({
      access_type: 'offline',
      scope: ['profile', 'email'],
      redirect_uri: callbackUrl,
      state: JSON.stringify({ role, redirectUri: callbackUrl }),
      prompt: 'consent',
    });

    return url;
  }

  async register(data: { email: string; password: string; name: string; phone?: string; role?: Role }) {
    const existing = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existing) {
      throw new AppError('An account with this email address already exists', 409, 'EMAIL_EXISTS');
    }

    const passwordHash = await hashPassword(data.password);
    const user = await prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash,
        name: data.name,
        phone: data.phone,
        role: data.role || Role.CUSTOMER,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt,
      },
    });

    return { user, accessToken, refreshToken };
  }

  async authenticateGoogle(data: { credential?: string; idToken?: string; code?: string; role?: Role; redirectUri?: string }) {
    if (!GOOGLE_CLIENT_ID) {
      throw new AppError('Google OAuth is not configured on this server', 500, 'GOOGLE_AUTH_NOT_CONFIGURED');
    }

    let googlePayload: {
      sub: string;
      email?: string;
      name?: string;
      picture?: string;
    } | undefined;

    const tokenToVerify = data.idToken || data.credential;

    if (tokenToVerify) {
      const ticket = await googleClient.verifyIdToken({
        idToken: tokenToVerify,
        audience: GOOGLE_CLIENT_ID,
      });
      googlePayload = ticket.getPayload();
    } else if (data.code) {
      const callbackUrl = data.redirectUri || `${CLIENT_URL}/auth/google/callback`;
      const { tokens } = await googleClient.getToken({
        code: data.code,
        redirect_uri: callbackUrl,
      });

      if (!tokens.id_token) {
        throw new AppError('Failed to retrieve ID token from Google authorization code', 400, 'GOOGLE_TOKEN_ERROR');
      }

      const ticket = await googleClient.verifyIdToken({
        idToken: tokens.id_token,
        audience: GOOGLE_CLIENT_ID,
      });
      googlePayload = ticket.getPayload();
    } else {
      throw new AppError('Either Google credential, idToken, or code must be provided', 400, 'MISSING_GOOGLE_CREDENTIAL');
    }

    if (!googlePayload || !googlePayload.email) {
      throw new AppError('Google authentication failed: Email address not returned', 400, 'GOOGLE_NO_EMAIL');
    }

    const googleId = googlePayload.sub;
    const email = googlePayload.email.toLowerCase();
    const name = googlePayload.name || email.split('@')[0];
    const avatarUrl = googlePayload.picture;

    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { googleId },
          { email },
        ],
      },
      include: {
        shops: {
          select: { id: true, name: true, isApproved: true },
        },
      },
    });

    if (user) {
      if (!user.googleId || (!user.avatarUrl && avatarUrl)) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            googleId: user.googleId || googleId,
            avatarUrl: user.avatarUrl || avatarUrl,
          },
          include: {
            shops: {
              select: { id: true, name: true, isApproved: true },
            },
          },
        });
      }
    } else {
      user = await prisma.user.create({
        data: {
          email,
          googleId,
          name,
          avatarUrl,
          role: data.role || Role.CUSTOMER,
        },
        include: {
          shops: {
            select: { id: true, name: true, isApproved: true },
          },
        },
      });
    }

    if (!user.isActive) {
      throw new AppError('Your account has been suspended. Please contact platform admin.', 403, 'ACCOUNT_SUSPENDED');
    }

    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt,
      },
    });

    const { passwordHash: _, ...safeUser } = user;

    return { user: safeUser, accessToken, refreshToken };
  }

  async login(data: { email: string; password: string }) {
    const user = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
      include: {
        shops: {
          select: { id: true, name: true, isApproved: true },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    if (!user.passwordHash) {
      throw new AppError('This account was created with Google Sign-In. Please sign in with Google.', 400, 'USE_GOOGLE_LOGIN');
    }

    const isValid = await comparePassword(data.password, user.passwordHash);
    if (!isValid) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt,
      },
    });

    const { passwordHash: _, ...safeUser } = user;

    return { user: safeUser, accessToken, refreshToken };
  }

  async refreshToken(token: string) {
    try {
      const payload = verifyRefreshToken(token);
      const storedToken = await prisma.refreshToken.findUnique({
        where: { token },
        include: { user: true },
      });

      if (!storedToken || storedToken.revoked || storedToken.expiresAt < new Date()) {
        throw new AppError('Refresh token expired or revoked', 401, 'TOKEN_EXPIRED');
      }

      // Rotate token: revoke old one
      await prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { revoked: true },
      });

      const tokenPayload = {
        userId: storedToken.user.id,
        email: storedToken.user.email,
        role: storedToken.user.role,
        name: storedToken.user.name,
      };

      const newAccessToken = generateAccessToken(tokenPayload);
      const newRefreshToken = generateRefreshToken(tokenPayload);

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      await prisma.refreshToken.create({
        data: {
          token: newRefreshToken,
          userId: storedToken.user.id,
          expiresAt,
        },
      });

      return { accessToken: newAccessToken, refreshToken: newRefreshToken };
    } catch (e) {
      throw new AppError('Invalid refresh token', 401, 'INVALID_TOKEN');
    }
  }

  async logout(token?: string) {
    if (token) {
      await prisma.refreshToken.updateMany({
        where: { token },
        data: { revoked: true },
      });
    }
    return true;
  }

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        avatarUrl: true,
        createdAt: true,
        shops: {
          select: {
            id: true,
            name: true,
            slug: true,
            isApproved: true,
            location: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    return user;
  }
}

export const authService = new AuthService();
