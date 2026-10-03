import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

export const sendValidationCode = async (telefono: string, codigo: string) => {
  try {
    const message = await client.messages.create({
      contentSid: "HX25161c213d71bb75e073ead06f38fbbd",
      contentVariables: JSON.stringify({ "1": codigo }),
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      to: `whatsapp:${telefono}`
    });
    return message;
  } catch (error) {
    console.error('Error enviando WhatsApp:', error);
    throw new Error('Error al enviar el código de verificación');
  }
};
