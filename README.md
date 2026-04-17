# Sistema de Gestión de Colegio

Aplicación web para la administración escolar, desarrollada con Next.js. Este proyecto tiene como objetivo facilitar la gestión de información académica y administrativa de una institución educativa.

Esta plataforma web está diseñada para ser fácil de navegar, cada usuario podrá consultar y utilizar herramientas adaptadas a su función específica. Esto facilitará tareas como la evaluación de calificaciones, el control de asistencia, la administración de pagos al personal, la difusión de actividades escolares y el seguimiento del progreso académico de los estudiantes. La implementación de este sistema busca simplificar los procesos administrativos, reducir la posibilidad de errores y potenciar la calidad de la experiencia educativa.

## 🛠️ Tecnologías utilizadas

| Tecnología | ¿Para qué sirve? |
|------------|------------------|
| **Next.js** | Organiza las páginas y APIs del proyecto. Corre sobre Node.js. |
| **React** | Crea los componentes visuales (botones, tablas, formularios) que ve el usuario. |
| **TypeScript** | Añade reglas al código para evitar errores. Todo está escrito en `.ts` y `.tsx`. |
| **Node.js** | Es el entorno donde se ejecuta la aplicación en el servidor. |
| **Prisma** | Traduce el código TypeScript a consultas SQL y se conecta con MySQL. |
| **MySQL** | Base de datos donde se almacena toda la información (estudiantes, notas, etc.). |
| **API** | Mensajero interno que comunica el frontend con la base de datos. |
| **JSON** | Formato en el que viajan los datos entre la API y la interfaz. |
| **NextAuth.js** | Autenticación y manejo de sesiones |
| **bcryptjs** | Encriptación de contraseñas |

## 📁 Estructura del proyecto
📁 docs → Documentación del proyecto
📁 prisma/ → Modelos de la base de datos y credenciales del admin<br>
📁 public/ → Archivos estáticos (imágenes, iconos)<br>
📁 src/app/ → Código fuente principal<br>
            api/ → Endpoints del backend<br>
            dashboard/ → Panel principal<br>
            login/ → Página de inicio de sesión<br>
            portal/ → Página pública del colegio<br>
📁 src/lib → Utilidades compartidas<br>
📄 .gitignore
📄 eslint.config.mjs<br>
📄 next-env.d.ts<br>
📄 next.config.ts<br>
📄 package-lock.json → Versiones de los paquetes del proyecto<br>
📄 package.json → Dependencias y scripts<br>
📄 postcss.config.mjs<br>
📄 README.md
📄 tsconfig.json → Configuración de TypeScript



### 📌 Convención de rutas (App Router)

| Carpeta/Archivo | Ruta en el navegador | Descripción |
|-----------------|---------------------|-------------|
| `app/page.tsx` | `/` | Página de inicio |
| `app/estudiantes/page.tsx` | `/estudiantes` | Listado de estudiantes |
| `app/estudiantes/[id]/page.tsx` | `/estudiantes/1` | Detalle de estudiante con ID 1 |
| `app/api/estudiantes/route.ts` | `/api/estudiantes` | API para gestionar estudiantes |

El proyecto utiliza **Next.js App Router**, donde cada subcarpeta dentro de `src/app` representa una ruta del navegador. Las rutas dinámicas usan corchetes `[id]`. Las APIs están en `src/app/api` y siguen el mismo principio de organización.

## 🚀 Instalación y uso

### 1. Clonar el repositorio

```bash
git clone https://github.com/nayelipl/sistema-gestion-colegio.git
cd sistema-gestion-colegio
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar variables de entorno
Crea un archivo .env en la raíz del proyecto y configura la conexión a la base de datos:
```env
DATABASE_URL="mysql://usuario:contraseña@localhost:3306/nombre_bd"
```
Crea un archivo .env.local en la raíz del proyecto:
```env
NEXTAUTH_SECRET="tu-secreto-aqui"
NEXTAUTH_URL="http://localhost:3000"

DATABASE_URL="mysql://root:contraseña@localhost:3306/BD-sistema-gestion-colegio"
```

### 4. Ejecutar migraciones de base de datos
```bash
npx prisma migrate dev
```

### 5. Ejecutar en modo desarrollo
```bash
npm run dev
```

La aplicación estará disponible en [http://localhost:3000](http://localhost:3000)
