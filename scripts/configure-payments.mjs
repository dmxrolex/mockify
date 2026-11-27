// Uses the bot token already held by the deployed worker; no bot token is read,
// printed or stored locally. Refuses to replace another service's webhook.
import {randomBytes} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const origin='https://styleit-miniapp.smokikj.workers.dev',key=randomBytes(32).toString('hex');
try{
  execFileSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','secret','put','PAYMENTS_SETUP_KEY'],{input:key+'\n',encoding:'utf8',windowsHide:true,stdio:['pipe','pipe','pipe']});
  const response=await fetch(origin+'/api/payments/setup',{method:'POST',headers:{'X-Payments-Setup-Key':key},signal:AbortSignal.timeout(30000)}),data=await response.json();
  if(!response.ok)throw new Error(data.error||'Payment setup failed.');
  console.log('Stars webhook configured for Pixova. Existing queued updates were preserved.');
}catch(error){console.error(error.message);process.exitCode=1;}
