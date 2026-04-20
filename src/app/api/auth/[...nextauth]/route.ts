import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
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

        if (usuario && usuario.activo) {
          const contrasenaValida = await bcrypt.compare(
            credentials.contrasena,
            usuario.contrasena
          );
          if (contrasenaValida) {
            return {
              id:     String(usuario.id),
              name:   usuario.nombre,
              email:  usuario.email,
              role:   usuario.rol,
            };
          }
        }

        return null;

      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user){
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
