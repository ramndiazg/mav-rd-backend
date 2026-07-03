# Arquitectura del Backend — `mav-rd-backend`

**Stack:** Node.js + Express + Mongoose (MongoDB Atlas) + JWT + Cloudinary + pdf-lib/Puppeteer

## Estructura de carpetas

```
mav-rd-backend/
├── src/
│   ├── config/
│   │   ├── db.js              # conexión a MongoDB Atlas
│   │   └── cloudinary.js      # configuración de Cloudinary
│   ├── models/
│   │   ├── User.js
│   │   ├── Inscripcion.js
│   │   ├── Configuracion.js
│   │   ├── Sesion.js
│   │   ├── Examen.js
│   │   ├── IntentoExamen.js
│   │   ├── ProgresoEstudiante.js
│   │   ├── Diploma.js
│   │   ├── Noticia.js
│   │   ├── Testimonio.js
│   │   ├── FAQ.js
│   │   ├── MovimientoContable.js
│   │   └── BalanceMensual.js
│   ├── controllers/           # lógica de negocio por recurso
│   ├── routes/                # definición de endpoints por recurso
│   ├── middleware/
│   │   ├── auth.js            # verifica JWT
│   │   ├── roleCheck.js       # verifica rol (estudiante/coordinadora/admin)
│   │   └── errorHandler.js
│   ├── utils/
│   │   ├── pdfGenerator.js    # genera diplomas y balances en PDF
│   │   ├── verificationCode.js
│   │   └── examScorer.js      # calcula calificación de examen
│   ├── app.js                 # configuración de Express (middlewares, rutas)
│   └── server.js              # arranque del servidor
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## Variables de entorno (`.env.example`)

```
PORT=4000
MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/mav_rd
JWT_SECRET=cambiar_por_un_secreto_largo_y_random
JWT_EXPIRES_IN=7d
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
FRONTEND_URL=http://localhost:3000
```

## Endpoints principales (v1)

### Auth

- `POST /api/auth/registro` — crea cuenta de estudiante (gratis)
- `POST /api/auth/login`
- `GET /api/auth/perfil` — requiere JWT

### Inscripciones (coordinadora/admin)

- `POST /api/inscripciones` — crear inscripción para una estudiante (elige plan)
- `PATCH /api/inscripciones/:id/confirmar-pago` — coordinadora marca como pagado
- `GET /api/inscripciones` — listar (filtrable por estado)

### Configuración (admin)

- `GET /api/configuracion`
- `PATCH /api/configuracion/:clave` — editar precio de planes, etc.

### Aula Virtual — Sesiones y exámenes

- `GET /api/sesiones/:numero` — teoría + videos (requiere pago confirmado)
- `GET /api/examenes/sesion/:sesionId` — coordinadora ve versiones disponibles
- `POST /api/examenes/:examenId/desbloquear` — coordinadora asigna examen a estudiante
- `POST /api/intentos-examen/:id/iniciar` — estudiante inicia intento (arranca timer)
- `POST /api/intentos-examen/:id/entregar` — envía respuestas, calcula nota
- `GET /api/progreso/:userId` — estado consolidado de avance

### Diplomas

- `GET /api/diplomas/elegibles` — coordinadora ve quiénes completaron el curso
- `POST /api/diplomas/:userId/generar` — genera PDF + código de verificación
- `GET /api/diplomas/verificar/:codigo` — endpoint público, sin login

### Noticias

- `GET /api/noticias` — público
- `POST /api/noticias` — coordinadora/admin
- `PATCH /api/noticias/:id` / `DELETE /api/noticias/:id`
- `POST /api/noticias/:id/like` — requiere login
- `POST /api/noticias/:id/comentarios` — requiere login
- `DELETE /api/noticias/:id/comentarios/:comentarioId` — coordinadora/admin

### Testimonios y FAQ

- CRUD estándar en `/api/testimonios` y `/api/faqs` (lectura pública, escritura
  restringida a coordinadora/admin)

### Contabilidad (admin)

- `GET /api/contabilidad/movimientos`
- `POST /api/contabilidad/movimientos`
- `GET /api/contabilidad/balances` — historial
- `POST /api/contabilidad/balances/generar` — genera balance del mes + PDF
- `GET /api/contabilidad/balances/:id/pdf`

## Convenciones

- Respuestas JSON consistentes: `{ success: boolean, data, error }`.
- Todas las rutas privadas pasan por `middleware/auth.js` y, si aplica,
  `middleware/roleCheck.js`.
- Validación de entrada con una librería ligera (ej. `express-validator` o `zod`),
  gratuita y sin dependencias de pago.

## Testing antes de cada commit importante

- Levantar servidor local y probar endpoints críticos con Postman/Thunder Client
  o `curl` (login, registro, confirmación de pago, examen, generación de diploma).
- Verificar que las variables de entorno sensibles nunca se suban al repo
  (`.env` debe estar en `.gitignore`, solo se sube `.env.example`).
