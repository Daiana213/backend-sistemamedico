import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

export async function seedUsuarios(prisma: PrismaClient) {
  console.log('Creando usuarios (Administrativos, Profesionales y Pacientes)...');

  const rolAdmin = await prisma.rol.findUnique({ where: { nombre: 'ADMINISTRATIVO' } });
  const rolProf = await prisma.rol.findUnique({ where: { nombre: 'PROFESIONAL' } });
  const rolPac = await prisma.rol.findUnique({ where: { nombre: 'PACIENTE' } });

  if (!rolAdmin || !rolProf || !rolPac) {
    throw new Error('Roles base no encontrados.');
  }

  const hashAdmin = await bcrypt.hash('Admin123', 10);
  const hashProf = await bcrypt.hash('Test12345', 10);
  const hashPac = await bcrypt.hash('Test1234', 10);

  // 1. Administrativos
  const administrativos = [
    {
      dni: '12345678',
      nombre: 'Administrador',
      apellido: 'Sistema',
      telefono: '+5491145670001',
      email: 'admin@sistemamedico.com',
      puesto: 'Dirección Administrativa General',
      permisoGestionUsuarios: true,
    },
    {
      dni: '28901234',
      nombre: 'Lucía',
      apellido: 'Fernández',
      telefono: '+5491145670002',
      email: 'recepcion@sistemamedico.com',
      puesto: 'Admisión y Gestión de Pacientes',
      permisoGestionUsuarios: true,
    },
  ];

  for (const adm of administrativos) {
    await prisma.usuario.create({
      data: {
        dni: adm.dni,
        nombre: adm.nombre,
        apellido: adm.apellido,
        telefono: adm.telefono,
        email: adm.email,
        passwordHash: hashAdmin,
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
            puesto: adm.puesto,
            permisoGestionUsuarios: adm.permisoGestionUsuarios,
            estado: 'ACTIVO' as any,
          },
        },
      },
    });
  }

  // 2. Profesionales
  const profesionales = [
    {
      dni: '10000001',
      nombre: 'Martín Alejandro',
      apellido: 'Quiroga',
      telefono: '+5491155001001',
      email: 'mquiroga@sistemamedico.com',
      matricula: 'MP100001',
      puedeCargarEstudios: true,
    },
    {
      dni: '10000002',
      nombre: 'Valeria Soledad',
      apellido: 'Méndez',
      telefono: '+5491155001002',
      email: 'vmendez@sistemamedico.com',
      matricula: 'MP100002',
      puedeCargarEstudios: true,
    },
    {
      dni: '10000003',
      nombre: 'Santiago Nicolás',
      apellido: 'Pereyra',
      telefono: '+5491155001003',
      email: 'spereyra@sistemamedico.com',
      matricula: 'MP100003',
      puedeCargarEstudios: true,
    },
    {
      dni: '10000004',
      nombre: 'Carolina Inés',
      apellido: 'Villalba',
      telefono: '+5491155001004',
      email: 'cvillalba@sistemamedico.com',
      matricula: 'MP100004',
      puedeCargarEstudios: true,
    },
    {
      dni: '10000005',
      nombre: 'Federico Andrés',
      apellido: 'Morales',
      telefono: '+5491155001005',
      email: 'fmorales@sistemamedico.com',
      matricula: 'MP100005',
      puedeCargarEstudios: true,
    },
    {
      dni: '10000006',
      nombre: 'Julieta Belén',
      apellido: 'Ríos',
      telefono: '+5491155001006',
      email: 'jrios@sistemamedico.com',
      matricula: 'MP100006',
      puedeCargarEstudios: true,
    },
    {
      dni: '10000007',
      nombre: 'Gonzalo Ezequiel',
      apellido: 'Benítez',
      telefono: '+5491155001007',
      email: 'gbenitez@sistemamedico.com',
      matricula: 'MP100007',
      puedeCargarEstudios: true,
    },
    {
      dni: '10000008',
      nombre: 'Mariana Laura',
      apellido: 'Acosta',
      telefono: '+5491155001008',
      email: 'macosta@sistemamedico.com',
      matricula: 'MP100008',
      puedeCargarEstudios: true,
    },
    {
      dni: '10000009',
      nombre: 'Camila Victoria',
      apellido: 'Herrera',
      telefono: '+5491155001009',
      email: 'cherrera@sistemamedico.com',
      matricula: 'MP100009',
      puedeCargarEstudios: false,
    },
    {
      dni: '10000010',
      nombre: 'Rodrigo Sebastián',
      apellido: 'Molina',
      telefono: '+5491155001010',
      email: 'rmolina@sistemamedico.com',
      matricula: 'MP100010',
      puedeCargarEstudios: true,
    },
    {
      dni: '10000011',
      nombre: 'Lucas Gabriel',
      apellido: 'Navarro',
      telefono: '+5491155001011',
      email: 'lnavarro@sistemamedico.com',
      matricula: 'MP100011',
      puedeCargarEstudios: true,
    },
  ];

  for (const prof of profesionales) {
    await prisma.usuario.create({
      data: {
        dni: prof.dni,
        nombre: prof.nombre,
        apellido: prof.apellido,
        telefono: prof.telefono,
        email: prof.email,
        passwordHash: hashProf,
        estado: 'ACTIVO' as any,
        fechaAlta: new Date(),
        primerLogin: false,
        roles: {
          create: {
            idRol: rolProf.idRol,
            estado: 'ACTIVO' as any,
            fechaAsignacion: new Date(),
          },
        },
        profesional: {
          create: {
            matricula: prof.matricula,
            puedeCargarEstudios: prof.puedeCargarEstudios,
            estado: 'ACTIVO' as any,
            fechaAlta: new Date(),
          },
        },
      },
    });
  }

  // 3. Pacientes titulares
  const planOsde210 = await prisma.plan.findFirst({
    where: { nombre: '210', obraSocial: { nombre: 'OSDE' } },
  });
  const planOsde310 = await prisma.plan.findFirst({
    where: { nombre: '310', obraSocial: { nombre: 'OSDE' } },
  });
  const planSwiss = await prisma.plan.findFirst({
    where: { nombre: 'SMG20', obraSocial: { nombre: 'Swiss Medical' } },
  });
  const planGaleno = await prisma.plan.findFirst({
    where: { nombre: 'Oro', obraSocial: { nombre: 'Galeno' } },
  });

  const pacientesData = [
    {
      dni: '00000001',
      nombre: 'Juan Ignacio',
      apellido: 'Gómez',
      telefono: '+5491161000001',
      email: 'juangomez@gmail.com',
      fechaNacimiento: new Date('1990-03-14'),
      sexo: 'MASCULINO',
      idPlan: planOsde210?.idPlan,
      numeroAfiliado: '6140293801',
      subfijoAdherente: '01',
      vencimientoCredencial: new Date('2028-12-31'),
    },
    {
      dni: '00000002',
      nombre: 'María Florencia',
      apellido: 'Pérez',
      telefono: '+5491161000002',
      email: 'mariaperez@gmail.com',
      fechaNacimiento: new Date('1985-05-15'),
      sexo: 'FEMENINO',
      idPlan: planSwiss?.idPlan,
      numeroAfiliado: '8029184702',
      subfijoAdherente: '00',
      vencimientoCredencial: new Date('2028-06-30'),
    },
    {
      dni: '32456789',
      nombre: 'Carlos Alberto',
      apellido: 'Rodríguez',
      telefono: '+5491161000003',
      email: 'crodriguez@gmail.com',
      fechaNacimiento: new Date('1978-11-22'),
      sexo: 'MASCULINO',
      idPlan: planOsde310?.idPlan,
      numeroAfiliado: '6199203101',
      subfijoAdherente: '01',
      vencimientoCredencial: new Date('2027-12-31'),
    },
    {
      dni: '40123456',
      nombre: 'Sofía Camila',
      apellido: 'López',
      telefono: '+5491161000004',
      email: 'sofialopez@gmail.com',
      fechaNacimiento: new Date('1998-07-08'),
      sexo: 'FEMENINO',
      idPlan: planGaleno?.idPlan,
      numeroAfiliado: '4401928301',
      subfijoAdherente: '01',
      vencimientoCredencial: new Date('2028-09-30'),
    },
  ];

  for (const pac of pacientesData) {
    await prisma.usuario.create({
      data: {
        dni: pac.dni,
        nombre: pac.nombre,
        apellido: pac.apellido,
        telefono: pac.telefono,
        email: pac.email,
        passwordHash: hashPac,
        estado: 'ACTIVO' as any,
        fechaAlta: new Date(),
        primerLogin: false,
        roles: {
          create: {
            idRol: rolPac.idRol,
            estado: 'ACTIVO' as any,
            fechaAsignacion: new Date(),
          },
        },
        paciente: {
          create: {
            fechaNacimiento: pac.fechaNacimiento,
            sexo: pac.sexo as any,
            idPlan: pac.idPlan,
            numeroAfiliado: pac.numeroAfiliado,
            subfijoAdherente: pac.subfijoAdherente,
            vencimientoCredencial: pac.vencimientoCredencial,
            estado: 'ACTIVO' as any,
            fechaRegistro: new Date(),
          },
        },
      },
    });
  }

  // 4. Paciente menor a cargo de Juan Ignacio Gómez (DNI 00000001)
  const titularJuan = await prisma.usuario.findUnique({
    where: { dni: '00000001' },
    include: { paciente: true },
  });

  if (titularJuan?.paciente) {
    const menorUsuario = await prisma.usuario.create({
      data: {
        dni: '55123456',
        nombre: 'Mateo',
        apellido: 'Gómez',
        telefono: '+5491161000001',
        passwordHash: hashPac,
        estado: 'ACTIVO' as any,
        fechaAlta: new Date(),
        primerLogin: false,
        roles: {
          create: {
            idRol: rolPac.idRol,
            estado: 'ACTIVO' as any,
            fechaAsignacion: new Date(),
          },
        },
        paciente: {
          create: {
            fechaNacimiento: new Date('2018-04-10'),
            sexo: 'MASCULINO' as any,
            idPlan: planOsde210?.idPlan,
            numeroAfiliado: '6140293802',
            subfijoAdherente: '02',
            vencimientoCredencial: new Date('2028-12-31'),
            estado: 'ACTIVO' as any,
            fechaRegistro: new Date(),
          },
        },
      },
      include: { paciente: true },
    });

    if (menorUsuario.paciente) {
      await prisma.pacienteResponsable.create({
        data: {
          idPaciente: menorUsuario.paciente.idPaciente,
          idResponsable: titularJuan.paciente.idPaciente,
          parentesco: 'PADRE',
          fechaInicio: new Date(),
          estado: 'ACTIVO' as any,
          documentos: {
            create: {
              tipoDocumento: 'PARTIDA_NACIMIENTO',
              nombreArchivo: 'partida_nacimiento_mateo_gomez.pdf',
              rutaArchivo: 'https://res.cloudinary.com/demo/image/upload/sample.pdf',
              fechaCarga: new Date(),
              estadoValidacion: 'APROBADO' as any,
              observaciones: 'Documentación filiatoria verificada por administración.',
            },
          },
        },
      });
    }
  }

  console.log('Usuarios creados con exito.');
}
