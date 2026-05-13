import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "SUPERADMIN" | "ADMIN" | "STAKEHOLDER" | "PLACEMENT_TEAM";
      status: string;
      userCode: string | null;
      mustChangePassword: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role?: string;
    status?: string;
    userCode?: string | null;
    mustChangePassword?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    status?: string;
    userCode?: string | null;
    mustChangePassword?: boolean;
  }
}
