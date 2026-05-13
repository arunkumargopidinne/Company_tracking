import "server-only";

import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import { AuditAction, AuthProvider, Role, UserStatus } from "@/generated/prisma/enums";
import { getAuthSecret } from "./auth-secret";
import { prisma, hasDatabaseUrl } from "./db";
import { verifyFirebaseIdToken } from "./firebase-admin";
import { createUserCode, generateTemporaryPassword, hashPassword, verifyPassword } from "./password";

export type AppRole = "SUPERADMIN" | "ADMIN" | "STAKEHOLDER" | "PLACEMENT_TEAM";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  providers: [
    CredentialsProvider({
      name: "Placement Admin",
      credentials: {
        login: { label: "Email or User ID", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.login || !credentials.password) {
          return null;
        }

        if (!hasDatabaseUrl()) {
          return authorizeFallbackSuperadmin(credentials.login, credentials.password);
        }

        await ensureBootstrapSuperadmin();

        const login = credentials.login.trim();
        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { email: { equals: login, mode: "insensitive" } },
              { userCode: { equals: login, mode: "insensitive" } },
            ],
          },
        });

        if (!user || user.authProvider !== AuthProvider.CREDENTIALS) {
          return null;
        }

        if (user.status !== UserStatus.APPROVED) {
          throw new Error(user.status === UserStatus.DISABLED ? "ACCOUNT_DISABLED" : "ACCOUNT_PENDING");
        }

        if (!verifyPassword(credentials.password, user.passwordHash)) {
          return null;
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
          status: user.status,
          userCode: user.userCode,
          mustChangePassword: user.mustChangePassword,
        };
      },
    }),
    CredentialsProvider({
      id: "firebase-google",
      name: "Firebase Google",
      credentials: {
        idToken: { label: "Firebase ID token", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.idToken || !hasDatabaseUrl()) {
          return null;
        }

        await ensureBootstrapSuperadmin();

        const decoded = await verifyFirebaseIdToken(credentials.idToken);
        const email = decoded.email?.toLowerCase();

        if (!email) {
          throw new Error("FIREBASE_EMAIL_REQUIRED");
        }

        const existing = await prisma.user.findUnique({ where: { email } });

        if (existing?.status === UserStatus.DISABLED) {
          throw new Error("ACCOUNT_DISABLED");
        }

        if (existing?.authProvider === AuthProvider.CREDENTIALS) {
          throw new Error("USE_PASSWORD_LOGIN");
        }

        const name = typeof decoded.name === "string" ? decoded.name : email;
        const image = typeof decoded.picture === "string" ? decoded.picture : null;
        const user = await prisma.user.upsert({
          where: { email },
          update: {
            name,
            image,
            authProvider: AuthProvider.FIREBASE,
            role: Role.STAKEHOLDER,
            status: UserStatus.APPROVED,
            mustChangePassword: false,
            lastLoginAt: new Date(),
          },
          create: {
            name,
            email,
            image,
            authProvider: AuthProvider.FIREBASE,
            role: Role.STAKEHOLDER,
            status: UserStatus.APPROVED,
            userCode: createUserCode("STK"),
            mustChangePassword: false,
            lastLoginAt: new Date(),
          },
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
          status: user.status,
          userCode: user.userCode,
          mustChangePassword: user.mustChangePassword,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const authUser = user as AuthUserPayload;
        token.id = authUser.id;
        token.role = authUser.role;
        token.status = authUser.status;
        token.userCode = authUser.userCode;
        token.mustChangePassword = authUser.mustChangePassword;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.id ?? "");
        session.user.role = String(token.role ?? "STAKEHOLDER") as AppRole;
        session.user.status = String(token.status ?? "APPROVED");
        session.user.userCode = typeof token.userCode === "string" ? token.userCode : null;
        session.user.mustChangePassword = Boolean(token.mustChangePassword);
      }

      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  secret: getAuthSecret(),
};

type AuthUserPayload = {
  id: string;
  role?: string;
  status?: string;
  userCode?: string | null;
  mustChangePassword?: boolean;
};

function authorizeFallbackSuperadmin(login: string, password: string) {
  const email = process.env.BOOTSTRAP_SUPERADMIN_EMAIL || "superadmin@edutech.local";
  const userCode = process.env.BOOTSTRAP_SUPERADMIN_USER_ID || "SUP-0001";
  const fallbackPassword = process.env.BOOTSTRAP_SUPERADMIN_PASSWORD || "SuperAdmin@123";

  if ((login === email || login === userCode) && password === fallbackPassword) {
    return {
      id: "bootstrap-superadmin",
      name: "Bootstrap Super Admin",
      email,
      role: Role.SUPERADMIN,
      status: UserStatus.APPROVED,
      userCode,
      mustChangePassword: false,
    };
  }

  return null;
}

export async function ensureBootstrapSuperadmin() {
  if (!hasDatabaseUrl()) {
    return null;
  }

  const existing = await prisma.user.findFirst({
    where: { role: Role.SUPERADMIN },
  });

  if (existing) {
    return existing;
  }

  const email = process.env.BOOTSTRAP_SUPERADMIN_EMAIL || "superadmin@edutech.local";
  const password = process.env.BOOTSTRAP_SUPERADMIN_PASSWORD || "SuperAdmin@123";
  const userCode = process.env.BOOTSTRAP_SUPERADMIN_USER_ID || "SUP-0001";

  const created = await prisma.user.upsert({
    where: { email },
    update: {
      role: Role.SUPERADMIN,
      status: UserStatus.APPROVED,
      userCode,
      passwordHash: hashPassword(password),
      mustChangePassword: true,
    },
    create: {
      name: "Bootstrap Super Admin",
      username: "superadmin",
      email,
      userCode,
      passwordHash: hashPassword(password),
      role: Role.SUPERADMIN,
      status: UserStatus.APPROVED,
      authProvider: AuthProvider.CREDENTIALS,
      mustChangePassword: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: created.id,
      entityType: "User",
      entityId: created.id,
      action: AuditAction.CREATE,
      message: "Bootstrap superadmin account was created.",
    },
  }).catch(() => null);

  return created;
}

export function roleLabel(role?: string | null) {
  if (role === "SUPERADMIN") return "Super Admin";
  if (role === "ADMIN") return "Admin";
  if (role === "STAKEHOLDER") return "Stakeholder";
  return "Placement Team";
}

export function rolePrefix(role: Role) {
  if (role === Role.SUPERADMIN) return "SUP";
  if (role === Role.STAKEHOLDER) return "STK";
  return "ADM";
}

export function makeTemporaryCredential() {
  return generateTemporaryPassword();
}
