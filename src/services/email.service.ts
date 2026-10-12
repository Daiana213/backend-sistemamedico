import nodemailer, { Transporter } from 'nodemailer';

let transporter: Transporter | null = null;

function getMailCredentials() {
  const user = (process.env.GMAIL_USER || process.env.EMAIL_USER || '').trim();
  const pass = (process.env.GMAIL_APP_PASSWORD || process.env.EMAIL_PASS || '').trim();
  return { user, pass };
}

function getTransporter(): Transporter | null {
  const { user, pass } = getMailCredentials();
  if (!user || !pass) {
    return null;
  }

  if (!transporter) {
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 465;
    const secure = process.env.SMTP_SECURE
      ? process.env.SMTP_SECURE === 'true'
      : port === 465;

    transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });
  }

  return transporter;
}

function construirPlantillaBase(titulo: string, contenidoHtml: string): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${titulo}</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111827;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f3f4f6;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:560px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 16px rgba(17,24,39,0.08);">
          <tr>
            <td style="background-color:#166534;padding:24px 32px;color:#ffffff;">
              <div style="font-size:20px;font-weight:700;letter-spacing:0.2px;">+ Sanatorio Antonia</div>
              <div style="font-size:13px;opacity:0.85;margin-top:4px;">Sistema de Gestión de Turnos y Pacientes</div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 16px;font-size:20px;color:#111827;">${titulo}</h1>
              ${contenidoHtml}
            </td>
          </tr>
          <tr>
            <td style="background-color:#f9fafb;padding:18px 32px;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280;text-align:center;">
              Este es un mensaje automático enviado por Sanatorio Antonia. Por favor, no respondas a este correo.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export function formatearFechaHoraTurno(fecha: Date): string {
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'America/Argentina/Buenos_Aires',
  }).format(fecha);
}

export async function enviarEmail(opciones: {
  para: string;
  asunto: string;
  html: string;
  texto?: string;
}) {
  const { user } = getMailCredentials();
  const mailTransporter = getTransporter();

  if (!mailTransporter || !user) {
    console.warn(
      `[EMAIL SIMULADO - Falta configurar GMAIL_USER / GMAIL_APP_PASSWORD] Para: ${opciones.para} | Asunto: ${opciones.asunto}`
    );
    return { simulated: true };
  }

  const remitente = process.env.EMAIL_FROM || `"Sanatorio Antonia" <${user}>`;

  const info = await mailTransporter.sendMail({
    from: remitente,
    to: opciones.para,
    subject: opciones.asunto,
    text: opciones.texto,
    html: opciones.html,
  });

  return info;
}

/**
 * 1. Envío de código de 6 dígitos para validar correo electrónico
 */
export async function enviarCodigoVerificacionEmail(email: string, codigo: string) {
  const titulo = 'Verificá tu correo electrónico';
  const contenido = `
    <p style="margin:0 0 16px;line-height:1.6;color:#374151;">
      Ingresá el siguiente código de 6 dígitos para validar tu dirección de correo electrónico en <strong>Sanatorio Antonia</strong>:
    </p>
    <div style="margin:24px 0;padding:18px;background-color:#f0fdf4;border:1.5px dashed #22a55c;border-radius:12px;text-align:center;">
      <span style="font-size:32px;font-weight:800;letter-spacing:8px;color:#166534;">${codigo}</span>
    </div>
    <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.5;">
      Este código expira en <strong>10 minutos</strong>. Si no solicitaste esta verificación, podés ignorar este mensaje.
    </p>
  `;

  return enviarEmail({
    para: email,
    asunto: `${codigo} es tu código de verificación - Sanatorio Antonia`,
    texto: `Tu código de verificación para Sanatorio Antonia es: ${codigo}. Expira en 10 minutos.`,
    html: construirPlantillaBase(titulo, contenido),
  });
}

/**
 * 2. Recuperación de contraseña (HU2 Escenario 2.2)
 */
export async function enviarRecuperacionPasswordEmail(
  email: string,
  nombreCompleto: string,
  enlaceRecuperacion: string
) {
  const titulo = 'Restablecimiento de contraseña';
  const contenido = `
    <p style="margin:0 0 16px;line-height:1.6;color:#374151;">
      Hola <strong>${nombreCompleto}</strong>,
    </p>
    <p style="margin:0 0 20px;line-height:1.6;color:#374151;">
      Recibimos una solicitud para restablecer la contraseña de tu cuenta en <strong>Sanatorio Antonia</strong>. Hacé clic en el siguiente botón para definir una nueva contraseña:
    </p>
    <div style="text-align:center;margin:28px 0;">
      <a href="${enlaceRecuperacion}" style="display:inline-block;padding:13px 28px;background-color:#22a55c;color:#ffffff;text-decoration:none;font-weight:700;border-radius:999px;font-size:15px;">
        Restablecer mi contraseña
      </a>
    </div>
    <p style="margin:0 0 12px;font-size:13px;color:#6b7280;line-height:1.5;">
      Si el botón no funciona, copiá y pegá este enlace en tu navegador:<br/>
      <a href="${enlaceRecuperacion}" style="color:#166534;word-break:break-all;">${enlaceRecuperacion}</a>
    </p>
    <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.5;">
      Este enlace es válido por <strong>1 hora</strong>. Si no solicitaste este cambio, ignorá este correo.
    </p>
  `;

  return enviarEmail({
    para: email,
    asunto: 'Recuperación de contraseña - Sanatorio Antonia',
    texto: `Hola ${nombreCompleto}, para restablecer tu contraseña ingresá a: ${enlaceRecuperacion} (válido por 1 hora).`,
    html: construirPlantillaBase(titulo, contenido),
  });
}

/**
 * 3. Notificación de aprobación de registro de menor (HU13 Escenario 2)
 */
export async function enviarNotificacionMenorAprobado(datos: {
  emailResponsable: string;
  nombreResponsable: string;
  nombreMenor: string;
}) {
  const titulo = 'Cuenta de menor aprobada y activada';
  const contenido = `
    <p style="margin:0 0 16px;line-height:1.6;color:#374151;">
      Hola <strong>${datos.nombreResponsable}</strong>,
    </p>
    <p style="margin:0 0 16px;line-height:1.6;color:#374151;">
      Te informamos que la documentación presentada para <strong>${datos.nombreMenor}</strong> fue validada correctamente por administración.
    </p>
    <div style="margin:20px 0;padding:16px;background-color:#f0fdf4;border-left:4px solid #22a55c;border-radius:8px;color:#166534;font-weight:600;">
      La cuenta ya se encuentra ACTIVA y habilitada para operar en el sistema.
    </div>
  `;

  return enviarEmail({
    para: datos.emailResponsable,
    asunto: `Cuenta activada para ${datos.nombreMenor} - Sanatorio Antonia`,
    texto: `Hola ${datos.nombreResponsable}, la documentación de ${datos.nombreMenor} fue aprobada y su cuenta ya se encuentra activa.`,
    html: construirPlantillaBase(titulo, contenido),
  });
}

/**
 * 4. Notificación de rechazo de registro de menor (HU13 Escenario 3)
 */
export async function enviarNotificacionMenorRechazado(datos: {
  emailResponsable: string;
  nombreResponsable: string;
  nombreMenor: string;
  motivo: string;
}) {
  const titulo = 'Observación en el registro de menor';
  const contenido = `
    <p style="margin:0 0 16px;line-height:1.6;color:#374151;">
      Hola <strong>${datos.nombreResponsable}</strong>,
    </p>
    <p style="margin:0 0 16px;line-height:1.6;color:#374151;">
      Te informamos que la solicitud de registro para <strong>${datos.nombreMenor}</strong> fue observada por el equipo administrativo por el siguiente motivo:
    </p>
    <div style="margin:20px 0;padding:16px;background-color:#fef2f2;border-left:4px solid #dc2626;border-radius:8px;color:#991b1b;">
      <strong>Motivo del rechazo:</strong><br/>
      ${datos.motivo}
    </div>
    <p style="margin:0;line-height:1.6;color:#374151;">
      Podés volver a enviar la documentación corregida ingresando al sistema con tus datos.
    </p>
  `;

  return enviarEmail({
    para: datos.emailResponsable,
    asunto: `Observación en documentación de ${datos.nombreMenor} - Sanatorio Antonia`,
    texto: `Hola ${datos.nombreResponsable}, el registro de ${datos.nombreMenor} fue rechazado. Motivo: ${datos.motivo}. Podés reenviar la documentación corregida desde el sistema.`,
    html: construirPlantillaBase(titulo, contenido),
  });
}

/**
 * 5. Notificación de turno reservado (HU3 / HU9 / HU12)
 */
export async function enviarNotificacionTurnoReservado(datos: {
  emailPaciente: string;
  nombrePaciente: string;
  nombreProfesional: string;
  fechaHora: Date;
}) {
  const fechaFormateada = formatearFechaHoraTurno(datos.fechaHora);
  const titulo = 'Confirmación de reserva de turno';
  const contenido = `
    <p style="margin:0 0 16px;line-height:1.6;color:#374151;">
      Hola <strong>${datos.nombrePaciente}</strong>,
    </p>
    <p style="margin:0 0 16px;line-height:1.6;color:#374151;">
      Tu turno médico ha sido registrado exitosamente con el siguiente detalle:
    </p>
    <div style="margin:20px 0;padding:18px;background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;line-height:1.7;">
      <div><strong>Profesional:</strong> Dr./Dra. ${datos.nombreProfesional}</div>
      <div><strong>Fecha y hora:</strong> ${fechaFormateada}</div>
      <div><strong>Estado:</strong> Reservado</div>
    </div>
    <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.5;">
      Recordá que podés reprogramar o cancelar tu turno desde la plataforma web con al menos 24 horas de anticipación.
    </p>
  `;

  return enviarEmail({
    para: datos.emailPaciente,
    asunto: 'Turno reservado - Sanatorio Antonia',
    texto: `Hola ${datos.nombrePaciente}, tu turno con ${datos.nombreProfesional} fue reservado para el ${fechaFormateada}.`,
    html: construirPlantillaBase(titulo, contenido),
  });
}

/**
 * 6. Notificación de turno reprogramado
 */
export async function enviarNotificacionTurnoReprogramado(datos: {
  emailPaciente: string;
  nombrePaciente: string;
  nombreProfesional: string;
  fechaHoraAnterior: Date;
  nuevaFechaHora: Date;
}) {
  const fechaAnteriorStr = formatearFechaHoraTurno(datos.fechaHoraAnterior);
  const nuevaFechaStr = formatearFechaHoraTurno(datos.nuevaFechaHora);
  const titulo = 'Tu turno fue reprogramado';
  const contenido = `
    <p style="margin:0 0 16px;line-height:1.6;color:#374151;">
      Hola <strong>${datos.nombrePaciente}</strong>,
    </p>
    <p style="margin:0 0 16px;line-height:1.6;color:#374151;">
      Te confirmamos que tu turno médico fue reprogramado exitosamente:
    </p>
    <div style="margin:20px 0;padding:18px;background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;line-height:1.7;">
      <div><strong>Profesional:</strong> Dr./Dra. ${datos.nombreProfesional}</div>
      <div style="color:#6b7280;text-decoration:line-through;"><strong>Horario anterior:</strong> ${fechaAnteriorStr}</div>
      <div style="color:#166534;font-weight:700;"><strong>Nuevo horario:</strong> ${nuevaFechaStr}</div>
    </div>
  `;

  return enviarEmail({
    para: datos.emailPaciente,
    asunto: 'Turno reprogramado - Sanatorio Antonia',
    texto: `Hola ${datos.nombrePaciente}, tu turno con ${datos.nombreProfesional} fue reprogramado para el ${nuevaFechaStr}.`,
    html: construirPlantillaBase(titulo, contenido),
  });
}

/**
 * 7. Notificación de turno cancelado
 */
export async function enviarNotificacionTurnoCancelado(datos: {
  emailPaciente: string;
  nombrePaciente: string;
  nombreProfesional: string;
  fechaHora: Date;
}) {
  const fechaFormateada = formatearFechaHoraTurno(datos.fechaHora);
  const titulo = 'Cancelación de turno médico';
  const contenido = `
    <p style="margin:0 0 16px;line-height:1.6;color:#374151;">
      Hola <strong>${datos.nombrePaciente}</strong>,
    </p>
    <p style="margin:0 0 16px;line-height:1.6;color:#374151;">
      Te informamos que el siguiente turno médico ha sido cancelado:
    </p>
    <div style="margin:20px 0;padding:18px;background-color:#fef2f2;border:1px solid #fecaca;border-radius:12px;line-height:1.7;color:#991b1b;">
      <div><strong>Profesional:</strong> Dr./Dra. ${datos.nombreProfesional}</div>
      <div><strong>Fecha y hora:</strong> ${fechaFormateada}</div>
      <div><strong>Estado:</strong> Cancelado</div>
    </div>
  `;

  return enviarEmail({
    para: datos.emailPaciente,
    asunto: 'Turno cancelado - Sanatorio Antonia',
    texto: `Hola ${datos.nombrePaciente}, tu turno con ${datos.nombreProfesional} del ${fechaFormateada} fue cancelado.`,
    html: construirPlantillaBase(titulo, contenido),
  });
}
