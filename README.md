# mav-rd-backend

# Mujeres al Volante RD — Plataforma Web

Plataforma para gestión de inscripciones, curso teórico (Aula Virtual), exámenes,
diplomas, noticias y contabilidad interna de la fundación Mujeres al Volante RD.

## Repositorios

- Backend: `mav-rd-backend` (Node.js + Express + MongoDB Atlas)
- Frontend: `mav-rd-frontend` (Next.js, desplegado en Vercel)

## Documentación

- [`BITACORA.md`](./BITACORA.md) — historial de decisiones y avance del proyecto.
  **Leer siempre antes de empezar una nueva sesión de trabajo.**
- [`DATABASE.md`](./DATABASE.md) — esquema completo de colecciones de MongoDB.
- [`BACKEND.md`](./BACKEND.md) — estructura y endpoints del backend.
- [`FRONTEND.md`](./FRONTEND.md) — estructura de páginas y componentes del frontend.

## Cómo levantar el proyecto en local

### Backend

```bash
cd mav-rd-backend
npm install
cp .env.example .env   # completar con credenciales reales
npm run dev
```

### Frontend

```bash
cd mav-rd-frontend
npm install
cp .env.local.example .env.local
npm run dev
```

## Flujo de trabajo del proyecto

1. Antes de cada sesión: leer `BITACORA.md`.
2. Al terminar un bloque importante (ej. "modelo de usuarias listo"):
   - Correr pruebas básicas (ver sección de testing en `BACKEND.md`/`FRONTEND.md`).
   - Actualizar `BITACORA.md` con lo hecho, lo pendiente y las dudas abiertas.
   - Hacer commit y push a GitHub con un mensaje descriptivo.
3. Nunca subir archivos `.env` con credenciales reales (están en `.gitignore`).
