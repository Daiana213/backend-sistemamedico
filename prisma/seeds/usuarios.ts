import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

export async function seedUsuarios(prisma: PrismaClient) {
  console.log('Creando usuario administrador...');
  const adminEmail = 'admin@sistemamedico.com';
  let admin = await prisma.usuario.findUnique({
    where: { email: adminEmail },
  });

  if (!admin) {
    const passwordHash = await bcrypt.hash('Admin123', 10);
    const rolAdmin = await prisma.rol.findUnique({ where: { nombre: 'ADMINISTRATIVO' } });

    if (rolAdmin) {
      admin = await prisma.usuario.create({
        data: {
          dni: '12345678',
          nombre: 'Administrador',
          apellido: 'Sistema',
          telefono: '1112223334',
          email: adminEmail,
          passwordHash,
          estado: 'ACTIVO' as any,
          fechaAlta: new Date(),
          primerLogin: false,
          roles: {
            create: {
              idRol: rolAdmin.idRol,
              estado: 'ACTIVO' as any,
              fechaAsignacion: new Date(),
            },
          },
          administrativo: {
            create: {
              puesto: 'Administrador General',
              permisoGestionUsuarios: true,
              estado: 'ACTIVO' as any,
            },
          },
        },
      });
      console.log('Admin creado. Email: admin@sistemamedico.com | Contraseña: Admin123');
    }
  } else {
    console.log('El usuario admin ya existe.');
  }

  // Paciente uno
  console.log('Creando paciente uno...');
  let paciente1 = await prisma.usuario.findUnique({ where: { dni: '00000001' } });
  if (!paciente1) {
    const pHash = await bcrypt.hash('Test1234', 10);
    const rolPac = await prisma.rol.findUnique({ where: { nombre: 'PACIENTE' } });
    if (rolPac) {
      await prisma.usuario.create({
        data: {
          dni: '00000001',
          nombre: 'Paciente',
          apellido: 'Uno',
          telefono: '1112223334',
          passwordHash: pHash,
          estado: 'ACTIVO' as any,
          fechaAlta: new Date(),
          roles: {
            create: { idRol: rolPac.idRol, estado: 'ACTIVO' as any, fechaAsignacion: new Date() }
          },
          paciente: {
            create: {
              fechaNacimiento: new Date('1990-01-01'),
              estado: 'ACTIVO' as any,
              fechaRegistro: new Date()
            }
          }
        }
      });
      console.log('Paciente uno creado.');
    }
  }

  // Paciente dos
  console.log('Creando paciente dos...');
  let paciente2 = await prisma.usuario.findUnique({ where: { dni: '00000002' } });
  if (!paciente2) {
    const pHash = await bcrypt.hash('Test1234', 10);
    const rolPac = await prisma.rol.findUnique({ where: { nombre: 'PACIENTE' } });
    if (rolPac) {
      await prisma.usuario.create({
        data: {
          dni: '00000002',
          nombre: 'Paciente',
          apellido: 'Dos',
          telefono: '1112223334',
          passwordHash: pHash,
          estado: 'ACTIVO' as any,
          fechaAlta: new Date(),
          roles: {
            create: { idRol: rolPac.idRol, estado: 'ACTIVO' as any, fechaAsignacion: new Date() }
          },
          paciente: {
            create: {
              fechaNacimiento: new Date('1990-01-01'),
              estado: 'ACTIVO' as any,
              fechaRegistro: new Date()
            }
          }
        }
      });
      console.log('Paciente dos creado.');
    }
  }

  // Profesional uno
  console.log('Creando profesional uno...');
  let prof1 = await prisma.usuario.findUnique({ where: { dni: '10000001' } });
  if (!prof1) {
    const pHash = await bcrypt.hash('Test12345', 10);
    const rolProf = await prisma.rol.findUnique({ where: { nombre: 'PROFESIONAL' } });
    if (rolProf) {
      await prisma.usuario.create({
        data: {
          dni: '10000001',
          nombre: 'Profesional',
          apellido: 'Uno',
          telefono: '1112223334',
          passwordHash: pHash,
          estado: 'ACTIVO' as any,
          fechaAlta: new Date(),
          roles: {
            create: { idRol: rolProf.idRol, estado: 'ACTIVO' as any, fechaAsignacion: new Date() }
          },
          profesional: {
            create: {
              matricula: 'MP10000001',
              estado: 'ACTIVO' as any,
              fechaAlta: new Date()
            }
          }
        }
      });
      console.log('Profesional uno creado.');
    }
  }
}
