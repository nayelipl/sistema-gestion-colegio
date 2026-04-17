// src/lib/auth.ts
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Credenciales requeridas");
        }

        const usuario = await prisma.usuario.findUnique({
          where: { email: credentials.email }
        });

        if (!usuario || !usuario.activo) {
          throw new Error("Usuario no encontrado");
        }

        const isValid = await compare(credentials.password, usuario.contrasena);
        
        if (!isValid) {
          throw new Error("Contraseña incorrecta");
        }

        return {
          id: usuario.id.toString(),
          email: usuario.email,
          name: usuario.nombre,
          role: usuario.rol,
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
      }
      return session;
    }
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
