import { Application, Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';

export const swaggerSpec = {
  openapi: '3.0.3',
  info: {
    title: 'API Sistema Médico',
    version: '1.0.0',
    description:
      'Documentación interactiva de la API del Sistema Médico para gestión de pacientes, profesionales, administrativos, obras sociales y autenticación.',
  },
  servers: [
    {
      url: '/api/v1',
      description: 'API v1 (Recomendado)',
    },
    {
      url: '/',
      description: 'Raíz del Servidor (Retrocompatibilidad)',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Ingrese su token JWT de autenticación.',
      },
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'error' },
          message: { type: 'string', example: 'Descripción del error.' },
          detalles: {
            type: 'array',
            items: { type: 'object' },
            description: 'Detalles adicionales o errores de validación de Zod.',
          },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['dni', 'password'],
        properties: {
          dni: { type: 'string', example: '12345678' },
          password: { type: 'string', example: 'Password123!' },
        },
      },
      SeleccionarRolRequest: {
        type: 'object',
        required: ['preSessionToken', 'rol'],
        properties: {
          preSessionToken: { type: 'string', example: 'eyJhbGciOiJIUzI1Ni...' },
          rol: { type: 'string', example: 'ADMINISTRATIVO' },
        },
      },
      RefreshRequest: {
        type: 'object',
        required: ['refreshToken'],
        properties: {
          refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1Ni...' },
        },
      },
      LogoutRequest: {
        type: 'object',
        required: ['refreshToken'],
        properties: {
          refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1Ni...' },
        },
      },
      SolicitarRecuperacionRequest: {
        type: 'object',
        required: ['email'],
        properties: {
          email: { type: 'string', format: 'email', example: 'usuario@ejemplo.com' },
        },
      },
      RestablecerPasswordRequest: {
        type: 'object',
        required: ['token', 'nuevoPassword'],
        properties: {
          token: { type: 'string', example: 'abc123token' },
          nuevoPassword: { type: 'string', example: 'NuevaClave123!' },
        },
      },
      CambiarPasswordRequest: {
        type: 'object',
        required: ['passwordActual', 'nuevoPassword'],
        properties: {
          passwordActual: { type: 'string', example: 'ClaveVieja123!' },
          nuevoPassword: { type: 'string', example: 'ClaveNueva123!' },
        },
      },
      RegistroAdministrativoRequest: {
        type: 'object',
        required: ['dni', 'nombre', 'apellido', 'email', 'telefono', 'puesto'],
        properties: {
          dni: { type: 'string', example: '20123456' },
          nombre: { type: 'string', example: 'María' },
          apellido: { type: 'string', example: 'González' },
          email: { type: 'string', format: 'email', example: 'maria.gonzalez@hospital.com' },
          telefono: { type: 'string', example: '+5491122334455' },
          puesto: { type: 'string', example: 'Recepcionista' },
          permisoGestionUsuarios: { type: 'boolean', default: false },
          telefonoAlternativo: { type: 'string', example: '+5491166778899' },
          emailAlternativo: { type: 'string', format: 'email', example: 'maria.alt@hospital.com' },
        },
      },
      RegistroProfesionalRequest: {
        type: 'object',
        required: ['dni', 'nombre', 'apellido', 'email', 'telefono', 'matricula', 'especialidadesIds'],
        properties: {
          dni: { type: 'string', example: '30123456' },
          nombre: { type: 'string', example: 'Carlos' },
          apellido: { type: 'string', example: 'Pérez' },
          email: { type: 'string', format: 'email', example: 'dr.carlos@hospital.com' },
          telefono: { type: 'string', example: '+5491144332211' },
          matricula: { type: 'string', example: 'MN-12345' },
          especialidadesIds: {
            type: 'array',
            items: { type: 'integer' },
            example: [1, 2],
          },
          telefonoAlternativo: { type: 'string', example: '+5491188990011' },
          emailAlternativo: { type: 'string', format: 'email', example: 'dr.carlos.alt@hospital.com' },
        },
      },
      RechazoMenorRequest: {
        type: 'object',
        required: ['motivo'],
        properties: {
          motivo: { type: 'string', example: 'La partida de nacimiento no es legible.' },
        },
      },
      ActualizarPerfilPacienteRequest: {
        type: 'object',
        description: 'Datos a actualizar del paciente. Debe enviarse al menos un campo.',
        properties: {
          email: { type: 'string', format: 'email', example: 'paciente.actualizado@ejemplo.com' },
          sexo: { type: 'string', enum: ['MASCULINO', 'FEMENINO', 'OTRO'], example: 'MASCULINO' },
          idObraSocial: { type: 'integer', example: 1 },
          idPlan: { type: 'integer', example: 2 },
          telefono: { type: 'string', example: '+5491122334455' },
          telefonoAlternativo: { type: 'string', example: '+5491199887766' },
          emailAlternativo: { type: 'string', format: 'email', example: 'paciente.alt@ejemplo.com' },
        },
      },
      CrearTurnoRequest: {
        type: 'object',
        required: ['idProfesional', 'fechaHora'],
        properties: {
          idProfesional: { type: 'integer', example: 1 },
          fechaHora: { type: 'string', format: 'date-time', example: '2026-10-15T14:30:00.000Z' },
          idPaciente: {
            type: 'integer',
            example: 5,
            description: 'Obligatorio solo si el turno es registrado por un administrativo.',
          },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        summary: 'Verificar estado del servicio (Health Check)',
        tags: ['Sistema'],
        responses: {
          200: {
            description: 'Servicio operativo.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/auth/login': {
      post: {
        summary: 'Iniciar sesión con DNI y contraseña',
        tags: ['Autenticación'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Login exitoso o requerimiento de selección de rol.',
          },
          400: { description: 'Datos inválidos o incompletos.' },
          401: { description: 'Credenciales inválidas.' },
        },
      },
    },
    '/auth/seleccionar-rol': {
      post: {
        summary: 'Seleccionar rol tras login con múltiples roles',
        tags: ['Autenticación'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SeleccionarRolRequest' },
            },
          },
        },
        responses: {
          200: { description: 'Sesión iniciada con el rol elegido.' },
          400: { description: 'Rol inválido o token expirado.' },
        },
      },
    },
    '/auth/refresh': {
      post: {
        summary: 'Renovar access token expirado',
        tags: ['Autenticación'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RefreshRequest' },
            },
          },
        },
        responses: {
          200: { description: 'Tokens renovados exitosamente.' },
          401: { description: 'Refresh token inválido o revocado.' },
        },
      },
    },
    '/auth/logout': {
      post: {
        summary: 'Cerrar sesión y revocar refresh token',
        tags: ['Autenticación'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LogoutRequest' },
            },
          },
        },
        responses: {
          200: { description: 'Sesión cerrada con éxito.' },
        },
      },
    },
    '/auth/solicitar-recuperacion': {
      post: {
        summary: 'Solicitar reseteo de contraseña',
        tags: ['Autenticación'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SolicitarRecuperacionRequest' },
            },
          },
        },
        responses: {
          200: { description: 'Correo enviado con instrucciones si el email existe.' },
        },
      },
    },
    '/auth/restablecer-password': {
      post: {
        summary: 'Restablecer contraseña usando token recibido',
        tags: ['Autenticación'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RestablecerPasswordRequest' },
            },
          },
        },
        responses: {
          200: { description: 'Contraseña restablecida exitosamente.' },
        },
      },
    },
    '/auth/cambiar-password': {
      post: {
        summary: 'Cambiar contraseña de usuario autenticado',
        tags: ['Autenticación'],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CambiarPasswordRequest' },
            },
          },
        },
        responses: {
          200: { description: 'Contraseña actualizada exitosamente.' },
          401: { description: 'No autorizado o clave actual incorrecta.' },
        },
      },
    },
    '/pacientes/registro': {
      post: {
        summary: 'Registrar un nuevo paciente (adulto o menor)',
        tags: ['Pacientes'],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  dni: { type: 'string' },
                  nombre: { type: 'string' },
                  apellido: { type: 'string' },
                  email: { type: 'string' },
                  telefono: { type: 'string' },
                  fechaNacimiento: { type: 'string', format: 'date' },
                  sexo: { type: 'string', enum: ['MASCULINO', 'FEMENINO', 'OTRO'] },
                  idPlan: { type: 'integer' },
                  idResponsable: { type: 'integer', description: 'Obligatorio si el paciente es menor' },
                  parentesco: { type: 'string', description: 'Obligatorio si es menor' },
                  tipoDocumento: { type: 'string' },
                  documento: { type: 'string', format: 'binary', description: 'Partida de nacimiento / poder (PDF o imagen)' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Paciente registrado exitosamente.' },
          400: { description: 'Error en los datos suministrados.' },
        },
      },
    },
    '/pacientes/menores/{id}/reenviar-documentacion': {
      patch: {
        summary: 'Reenviar documentación de un menor observado o rechazado',
        tags: ['Pacientes'],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
            description: 'ID del paciente menor.',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['documento', 'tipoDocumento'],
                properties: {
                  tipoDocumento: { type: 'string', example: 'Partida de Nacimiento' },
                  documento: { type: 'string', format: 'binary' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Documento subido correctamente para revisión.' },
        },
      },
    },
    '/administrativos/registro': {
      post: {
        summary: 'Registrar un nuevo administrativo',
        tags: ['Administrativos'],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RegistroAdministrativoRequest' },
            },
          },
        },
        responses: {
          201: { description: 'Administrativo registrado exitosamente.' },
          403: { description: 'No posee permiso de gestión de usuarios.' },
        },
      },
    },
    '/administrativos/menores-pendientes': {
      get: {
        summary: 'Listar pacientes menores pendientes de validación',
        tags: ['Administrativos'],
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Listado de menores pendientes.' },
          403: { description: 'Requiere rol de administrativo activo.' },
        },
      },
    },
    '/administrativos/menores/{id}/aprobar': {
      patch: {
        summary: 'Aprobar registro de paciente menor',
        tags: ['Administrativos'],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
          },
        ],
        responses: {
          200: { description: 'Paciente menor aprobado correctamente.' },
        },
      },
    },
    '/administrativos/menores/{id}/rechazar': {
      patch: {
        summary: 'Rechazar registro de paciente menor indicando motivo',
        tags: ['Administrativos'],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RechazoMenorRequest' },
            },
          },
        },
        responses: {
          200: { description: 'Registro de menor rechazado.' },
        },
      },
    },
    '/profesionales/registro': {
      post: {
        summary: 'Registrar un nuevo profesional de la salud',
        tags: ['Profesionales'],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RegistroProfesionalRequest' },
            },
          },
        },
        responses: {
          201: { description: 'Profesional registrado exitosamente.' },
          403: { description: 'No posee permiso de gestión de usuarios.' },
        },
      },
    },
    '/especialidades': {
      get: {
        summary: 'Listar especialidades médicas activas',
        tags: ['Especialidades'],
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Listado de especialidades.' },
        },
      },
    },
    '/obras-sociales': {
      get: {
        summary: 'Listar obras sociales disponibles',
        tags: ['Obras Sociales'],
        responses: {
          200: { description: 'Listado de obras sociales.' },
        },
      },
    },
    '/obras-sociales/{idObraSocial}/planes': {
      get: {
        summary: 'Listar planes de una obra social específica',
        tags: ['Obras Sociales'],
        parameters: [
          {
            name: 'idObraSocial',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
          },
        ],
        responses: {
          200: { description: 'Planes asociados a la obra social.' },
        },
      },
    },
    '/documentos/{idDocumento}': {
      get: {
        summary: 'Obtener información o URL de un documento subido',
        tags: ['Documentos'],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'idDocumento',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
          },
        ],
        responses: {
          200: { description: 'Documento recuperado correctamente.' },
          403: { description: 'Requiere rol de administrativo activo.' },
        },
      },
    },
    '/pacientes/perfil': {
      get: {
        summary: 'Obtener datos del perfil del paciente autenticado',
        tags: ['Pacientes'],
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Datos del perfil recuperados con éxito.' },
          401: { description: 'No autenticado.' },
          404: { description: 'Perfil de paciente no encontrado.' },
        },
      },
      put: {
        summary: 'Actualizar datos faltantes del perfil del paciente (email, sexo, obra social/plan)',
        tags: ['Pacientes'],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ActualizarPerfilPacienteRequest' },
            },
          },
        },
        responses: {
          200: { description: 'Perfil actualizado exitosamente.' },
          400: { description: 'Datos inválidos o plan inexistente.' },
          401: { description: 'No autenticado.' },
          409: { description: 'El correo electrónico ya está en uso.' },
        },
      },
    },
    '/turnos': {
      get: {
        summary: 'Listar turnos del usuario autenticado',
        tags: ['Turnos'],
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Listado de turnos.' },
          401: { description: 'No autenticado.' },
        },
      },
      post: {
        summary: 'Crear / Solicitar turno médico (Valida perfil completo del paciente)',
        description:
          'Verifica si el paciente tiene email, sexo y obra social/plan cargados. Si falta alguno, devuelve 403 pidiendo completar el perfil.',
        tags: ['Turnos'],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CrearTurnoRequest' },
            },
          },
        },
        responses: {
          201: { description: 'Turno solicitado exitosamente.' },
          400: { description: 'Datos inválidos.' },
          401: { description: 'No autenticado.' },
          403: {
            description:
              'Perfil incompleto. Debe completar email, sexo y obra social/plan en /api/pacientes/perfil antes de solicitar turno.',
          },
          404: { description: 'Profesional o paciente no encontrado.' },
          409: { description: 'El profesional ya tiene un turno reservado para esa fecha y hora.' },
        },
      },
    },
  },
};

/**
 * Configura los endpoints de Swagger UI y la especificación OpenAPI en la aplicación Express.
 */
export const setupSwagger = (app: Application): void => {
  // Servir especificación en formato JSON crudo
  app.get('/api-docs.json', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  // Servir especificación en formato YAML
  app.get('/api-docs.yaml', (req: Request, res: Response) => {
    const path = require('path');
    const fs = require('fs');
    const yamlPath = path.join(process.cwd(), 'docs', 'openapi.yaml');
    if (fs.existsSync(yamlPath)) {
      res.setHeader('Content-Type', 'text/yaml');
      res.sendFile(yamlPath);
    } else {
      res.status(404).json({ error: 'Archivo YAML de documentación no encontrado' });
    }
  });

  // Servir interfaz visual Swagger UI
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
};

