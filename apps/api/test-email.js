const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const path = require('path');

// Cargar variables de entorno
dotenv.config({ path: path.join(__dirname, '.env') });

const transportType = process.env.MAIL_TRANSPORT_TYPE || 'smtp';
console.log('Transport Type:', transportType);

let transporter;
if (transportType === 'smtp') {
  const port = Number(process.env.SMTP_PORT || 2525);
  console.log(`Configuring SMTP with host=${process.env.SMTP_HOST}, port=${port}, user=${process.env.SMTP_USER}`);
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'sandbox.smtp.mailtrap.io',
    port: port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
} else {
  const port = Number(process.env.MAIL_PRO_PORT || 587);
  console.log(`Configuring PRO SMTP with host=${process.env.MAIL_PRO_HOST}, port=${port}, user=${process.env.MAIL_PRO_USER}`);
  transporter = nodemailer.createTransport({
    host: process.env.MAIL_PRO_HOST,
    port: port,
    secure: port === 465,
    auth: {
      user: process.env.MAIL_PRO_USER,
      pass: process.env.MAIL_PRO_PASS,
    },
  });
}

const from = process.env.SMTP_FROM || 'reportes@akit.app';
const to = 'akituvocacion@gmail.com'; // destinatario de prueba

const mailOptions = {
  from: `Orient A.ki <${from}>`,
  to: to,
  subject: '🧪 Test Email desde Script',
  text: 'Este es un email de prueba para verificar la configuración de SMTP/Resend.',
  html: '<b>Este es un email de prueba para verificar la configuración de SMTP/Resend.</b>',
};

console.log('Enviando email...');
transporter.sendMail(mailOptions)
  .then(info => {
    console.log('✅ Email enviado con éxito!');
    console.log('Response:', info.response);
    console.log('Message ID:', info.messageId);
  })
  .catch(err => {
    console.error('❌ Error enviando el email:');
    console.error(err);
  });
