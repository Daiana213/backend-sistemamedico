import twilio from 'twilio';

let client: twilio.Twilio | null = null;

const getTwilioClient = () => {
  if (!client) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (!accountSid || !authToken) {
      throw new Error('TWILIO_ACCOUNT_SID o TWILIO_AUTH_TOKEN no están configurados en las variables de entorno.');
    }
    client = twilio(accountSid, authToken);
  }
  return client;
};

export const sendValidationCode = async (telefono: string, codigo: string) => {
  try {
    const twilioClient = getTwilioClient();

    const fromRaw = process.env.TWILIO_WHATSAPP_NUMBER || '';
    const formattedFrom = fromRaw.startsWith('whatsapp:')
      ? fromRaw
      : `whatsapp:${fromRaw}`;

    const cleanPhone = telefono.trim().replace(/^whatsapp:/, '');
    const formattedTo = `whatsapp:${cleanPhone.startsWith('+') ? cleanPhone : `+${cleanPhone}`}`;

    const contentSid = process.env.TWILIO_CONTENT_SID || 'HX25161c213d71bb75e073ead06f38fbbd';

    console.log(`[WhatsApp Service] Enviando mensaje a ${formattedTo} usando plantilla ${contentSid}...`);

    const message = await twilioClient.messages.create({
      contentSid,
      contentVariables: JSON.stringify({ "1": codigo, "code": codigo }),
      from: formattedFrom,
      to: formattedTo,
    });

    console.log(`[WhatsApp Service] Mensaje enviado correctamente. SID: ${message.sid}`);
    return message;
  } catch (error: any) {
    console.error('Error enviando WhatsApp:', error);
    throw new Error(`Error al enviar el código de verificación por WhatsApp: ${error?.message || error}`);
  }
};

