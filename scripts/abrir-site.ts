// Deixa o site no ar para acessar pelo navegador, neste computador ou em outro aparelho da rede interna.
// É o que o arquivo "Abrir Querylab.bat" chama, mas também roda com `npm run abrir`.
//
// 1. Se o site já estiver no ar, só abre o navegador.
// 2. Monta o site em dist/ quando algo mudou em src/ ou content/ (senão reaproveita a última montagem).
// 3. Serve a pasta dist/ na porta 4173 e mostra os endereços.
import { exec } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createSocket } from 'node:dgram';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { networkInterfaces } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { styleText } from 'node:util';
import { build, preview } from 'vite';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const PORTA = 4173;
const PASTA_SITE = join(RAIZ, 'dist');
const ARQUIVO_ASSINATURA = join(RAIZ, 'node_modules', '.cache', 'querylab', 'assinatura-build.txt');
const ENTRADAS_DO_BUILD = ['src', 'content', 'public', 'index.html', 'package.json', 'package-lock.json', 'vite.config.ts'];

const destaque = (texto: string) => styleText(['bold', 'yellow'], texto);
const suave = (texto: string) => styleText('gray', texto);
const esperar = (ms: number) => new Promise((resolver) => setTimeout(resolver, ms));

process.chdir(RAIZ);

if (await querylabRespondeEm(PORTA)) {
  const endereco = `http://localhost:${PORTA}`;
  console.log(`\n  O querylab já está no ar em ${destaque(endereco)}. Abrindo o navegador...`);
  console.log(suave('  Mudou algum conteúdo? Feche a outra janela do querylab e abra este arquivo de novo.\n'));
  abrirNavegador(endereco);
  await esperar(4000);
  process.exit(0);
}

console.log(`\n  ${styleText('bold', 'querylab')}\n`);

const assinatura = assinaturaDosArquivos();
const montagemAtual =
  existsSync(join(PASTA_SITE, 'index.html')) &&
  existsSync(ARQUIVO_ASSINATURA) &&
  readFileSync(ARQUIVO_ASSINATURA, 'utf8') === assinatura;

if (montagemAtual) {
  console.log(suave('  Nada mudou desde a última vez: usando o site já montado.'));
} else {
  console.log('  Montando o site com o conteúdo mais recente...');
  const inicio = Date.now();
  try {
    await build({ root: RAIZ, logLevel: 'error' });
  } catch (erro) {
    console.error(styleText('red', '\n  Não consegui montar o site.'));
    console.error(`  ${erro instanceof Error ? erro.message : String(erro)}`);
    console.error('\n  Se você acabou de mexer em algum arquivo de content/, rode "npm run validar" para achar o problema.\n');
    process.exit(1);
  }
  mkdirSync(dirname(ARQUIVO_ASSINATURA), { recursive: true });
  writeFileSync(ARQUIVO_ASSINATURA, assinatura);
  const segundos = ((Date.now() - inicio) / 1000).toFixed(1).replace('.', ',');
  console.log(suave(`  Pronto em ${segundos} s.`));
}

let servidor;
try {
  servidor = await preview({
    root: RAIZ,
    logLevel: 'silent',
    preview: { host: true, port: PORTA, strictPort: false, open: false },
  });
} catch (erro) {
  console.error(styleText('red', '\n  Não consegui colocar o site no ar.'));
  console.error(`  ${erro instanceof Error ? erro.message : String(erro)}\n`);
  process.exit(1);
}

const porta = (servidor.httpServer.address() as AddressInfo).port;
const local = `http://localhost:${porta}`;
const enderecosRede = await enderecosDaRede();

console.log(`\n  ${styleText(['bold', 'green'], 'O site está no ar!')}\n`);
console.log(`  Neste computador:   ${destaque(local)}`);
if (enderecosRede.length > 0) {
  const [principal, ...outros] = enderecosRede;
  console.log(`  Na rede interna:    ${destaque(`http://${principal}:${porta}`)}`);
  console.log(suave('                      use no celular, notebook ou outro PC conectado na mesma rede'));
  for (const ip of outros) console.log(suave(`                      se não abrir, tente http://${ip}:${porta}`));
} else {
  console.log(suave('  Na rede interna:    não encontrei nenhuma conexão de rede ativa.'));
}
if (porta !== PORTA) {
  console.log(suave(`\n  A porta ${PORTA} estava ocupada por outro programa, então usei a ${porta}.`));
}
console.log(`
  ${suave('Se o Windows perguntar sobre o Firewall, marque "Redes privadas" e clique em Permitir.')}
  ${suave('Sem isso, os outros aparelhos da rede não conseguem abrir o site.')}

  ${styleText('bold', 'Para desligar o site, feche esta janela.')}
`);

abrirNavegador(local);

/** Confere se já existe um querylab respondendo na porta (por exemplo, a janela foi aberta duas vezes). */
async function querylabRespondeEm(porta: number): Promise<boolean> {
  try {
    const resposta = await fetch(`http://localhost:${porta}/`, { signal: AbortSignal.timeout(1500) });
    return resposta.ok && (await resposta.text()).includes('<title>querylab');
  } catch {
    return false;
  }
}

/** Lista caminho, tamanho e data de cada arquivo que entra no build: qualquer arquivo novo, apagado ou editado muda a assinatura. */
function assinaturaDosArquivos(): string {
  const linhas: string[] = [];
  const visitar = (caminho: string) => {
    if (!existsSync(caminho)) return;
    const info = statSync(caminho);
    if (info.isDirectory()) {
      for (const nome of readdirSync(caminho).sort()) visitar(join(caminho, nome));
    } else {
      linhas.push(`${relative(RAIZ, caminho)}|${info.size}|${info.mtimeMs}`);
    }
  };
  for (const entrada of ENTRADAS_DO_BUILD) visitar(join(RAIZ, entrada));
  return createHash('sha1').update(linhas.join('\n')).digest('hex');
}

/**
 * IPs deste computador na rede local, com o mais provável primeiro.
 * Ignora adaptadores virtuais (VirtualBox, Hyper-V, WSL, VPNs), que não são alcançáveis por outros aparelhos.
 */
async function enderecosDaRede(): Promise<string[]> {
  const NOMES_VIRTUAIS = /vEthernet|VirtualBox|VMware|WSL|Hyper-V|Loopback|Bluetooth|WARP|Cloudflare|Tailscale|ZeroTier|Hamachi|Radmin|docker|veth/i;
  const MACS_VIRTUAIS = ['00:00:00', '0a:00:27', '08:00:27', '00:15:5d', '00:50:56', '00:0c:29', '00:1c:14', '00:1c:42'];

  const candidatos: string[] = [];
  for (const [nome, enderecos] of Object.entries(networkInterfaces())) {
    if (NOMES_VIRTUAIS.test(nome)) continue;
    for (const endereco of enderecos ?? []) {
      if (endereco.family !== 'IPv4' || endereco.internal || endereco.address.startsWith('169.254.')) continue;
      if (MACS_VIRTUAIS.some((prefixo) => endereco.mac.toLowerCase().startsWith(prefixo))) continue;
      candidatos.push(endereco.address);
    }
  }

  // O IP que o sistema usa para sair para a internet costuma ser o da rede de verdade.
  const principal = await ipDaRotaPadrao();
  if (principal && candidatos.includes(principal)) {
    return [principal, ...candidatos.filter((ip) => ip !== principal)];
  }
  return candidatos;
}

/** "Conecta" um socket UDP a um IP externo (nenhum pacote é enviado) só para descobrir qual IP local o sistema escolheria. */
function ipDaRotaPadrao(): Promise<string | undefined> {
  return new Promise((resolver) => {
    const socket = createSocket('udp4');
    socket.on('error', () => {
      socket.close();
      resolver(undefined);
    });
    socket.connect(53, '8.8.8.8', () => {
      const { address } = socket.address();
      socket.close();
      resolver(address);
    });
  });
}

function abrirNavegador(endereco: string) {
  const comando =
    process.platform === 'win32' ? `start "" "${endereco}"` : process.platform === 'darwin' ? `open "${endereco}"` : `xdg-open "${endereco}"`;
  exec(comando, () => {
    // Se não der para abrir sozinho, o endereço já está impresso na janela.
  });
}
