export async function startLocalSmtpServer(): Promise<void> {
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
  const port = Number(process.env.SMTP_PORT ?? 1025);

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

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`[SMTP Server] Port ${port} is already bound (e.g. Mailpit running).`);
    } else {
      console.error('[SMTP Server Error]:', err.message || err);
    }
  });

  return new Promise((resolve) => {
    server.listen(port, '0.0.0.0', () => {
      console.log('--------------------------------------------------');
      console.log(`Local SMTP Server running on port ${port}`);
      console.log('Outbound payslips captured instantly.');
      console.log('--------------------------------------------------');
      resolve();
    });
  });
}

if (require.main === module) {
  startLocalSmtpServer().catch(err => console.error('SMTP Server Error:', err));
}
