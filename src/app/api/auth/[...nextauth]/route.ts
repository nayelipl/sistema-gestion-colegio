// src/app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credenciales",
      credentials: {
        email:      { label: "Correo",     type: "email" },
        contrasena: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.contrasena) return null;

        const usuario = await prisma.usuario.findUnique({
          where: { email: credentials.email },
        });

        if (!usuario || !usuario.activo) return null;

        const contrasenaValida = await bcrypt.compare(
          credentials.contrasena,
          usuario.contrasena
        );

        if (!contrasenaValida) return null;

        return {
          id:     String(usuario.id),
          name:   usuario.nombre,
          email:  usuario.email,
          role:   usuario.rol,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.role = (user as any).role;
      return token;
    },
    async session({ session, token }) {
      if (session.user) (session.user as any).role = token.role;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
});

export { handler as GET, handler as POST };
