import nodemailer from 'nodemailer';

async function startLocalSmtpServer() {
  let smtpServerModule: any;
  try {
    smtpServerModule = require('smtp-server');
  } catch {
    console.log('Installing smtp-server...');
    const { execSync } = require('child_process');
    execSync('npm install smtp-server', { cwd: __dirname, stdio: 'inherit' });
    smtpServerModule = require('smtp-server');
  }

  const { SMTPServer } = smtpServerModule;
  const server = new SMTPServer({
    disabledCommands: ['AUTH'],
    onData(stream: any, _session: any, callback: () => void) {
      let emailText = '';
      stream.on('data', (chunk: Buffer) => { emailText += chunk.toString(); });
      stream.on('end', () => {
        console.log('\n=================== INCOMING SMTP MAIL ===================');
        const subjectMatch = emailText.match(/Subject: (.*)/i);
        const toMatch = emailText.match(/To: (.*)/i);
        console.log('To:', toMatch ? toMatch[1] : 'Unknown');
        console.log('Subject:', subjectMatch ? subjectMatch[1] : 'No Subject');
        console.log('=========================================================\n');
        callback();
      });
    },
  });

  server.listen(1025, '0.0.0.0', () => {
    console.log('--------------------------------------------------');
    console.log('Local SMTP Mail Server running on port 1025');
    console.log('All outbound payslips will be captured instantly!');
    console.log('--------------------------------------------------');
  });
}

startLocalSmtpServer().catch(err => console.error('SMTP Server Error:', err));
