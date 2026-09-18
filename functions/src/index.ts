// Todo dia à noite, avisa por e-mail quem tem uma sequência de dias ativa mas ainda não estudou
// hoje. Não manda e-mail direto: só escreve um doc na coleção `mail`, que a extensão oficial
// "Trigger Email from Firestore" (firestore-send-email) escuta e de fato envia — configure essa
// extensão no console do Firebase com as credenciais do seu provedor de e-mail (ex.: SendGrid).
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { setGlobalOptions } from 'firebase-functions/v2';
import { defineString } from 'firebase-functions/params';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { calcularSequencia } from './niveis';

initializeApp();
setGlobalOptions({ region: 'southamerica-east1' });

const FUSO = 'America/Sao_Paulo';

// Ajuste se o site publicado estiver em outro endereço (ex.: domínio próprio).
const URL_SITE = defineString('SITE_URL', { default: 'https://maiconmafrah.github.io/querylab-sql/' });

interface ProgressoParcial {
  dias?: string[];
  lembreteSequencia?: boolean;
}

/** Data de hoje (AAAA-MM-DD) no fuso horário informado, sem depender do fuso do servidor. */
function hojeEm(fuso: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: fuso, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

export const lembrarSequencia = onSchedule({ schedule: 'every day 20:00', timeZone: FUSO }, async () => {
  const db = getFirestore();
  const hoje = hojeEm(FUSO);

  const progressos = await db.collection('progressos').get();
  const emRisco: { uid: string; sequencia: number }[] = [];

  for (const doc of progressos.docs) {
    const dados = doc.data() as ProgressoParcial;
    if (dados.lembreteSequencia === false) continue;
    const dias = dados.dias ?? [];
    if (dias.includes(hoje)) continue; // já estudou hoje, sequência não corre risco

    const sequencia = calcularSequencia(dias, hoje);
    if (sequencia > 0) emRisco.push({ uid: doc.id, sequencia });
  }

  if (emRisco.length === 0) {
    logger.info('Ninguém em risco de perder a sequência hoje.');
    return;
  }

  const auth = getAuth();
  const lote = db.batch();
  const site = URL_SITE.value();
  let enfileirados = 0;

  for (const { uid, sequencia } of emRisco) {
    const email = await auth
      .getUser(uid)
      .then((usuario) => usuario.email)
      .catch((erro: unknown) => {
        logger.warn(`Sem usuário no Auth pra ${uid}`, erro);
        return undefined;
      });
    if (!email) continue;

    const dia = sequencia === 1 ? 'dia' : 'dias';
    const link = `${site.replace(/\/$/, '')}/#/progresso`;
    lote.set(db.collection('mail').doc(), {
      to: [email],
      message: {
        subject: `Sua sequência de ${sequencia} ${dia} no querylab está quase acabando`,
        text:
          `Faltam só algumas horas de hoje e você ainda não estudou. Resolva uma missão ou o ` +
          `desafio do dia no querylab pra manter sua sequência de ${sequencia} ${dia} seguidos.\n\n` +
          `Continuar: ${link}\n\n` +
          `Pra parar de receber este aviso, desative "Lembrete por e-mail" na página de Progresso.`,
        html:
          `<p>Faltam só algumas horas de hoje e você ainda não estudou. Resolva uma missão ou o ` +
          `desafio do dia no querylab pra manter sua sequência de <strong>${sequencia} ${dia} seguidos</strong>.</p>` +
          `<p><a href="${link}">Continuar estudando</a></p>` +
          `<p style="color:#666;font-size:12px">Pra parar de receber este aviso, desative "Lembrete por e-mail" na página de Progresso.</p>`,
      },
    });
    enfileirados++;
  }

  await lote.commit();
  logger.info(`Lembrete enfileirado pra ${enfileirados} de ${emRisco.length} usuários em risco.`);
});
