import { useState, type FormEvent } from 'react';
import { definirApelido } from '../estado/progresso.ts';
import { Icone } from './Icone.tsx';
import { Modal } from './Modal.tsx';

/** Campo de texto + botão para definir (ou trocar) o apelido público do ranking. */
export function CampoApelido({ atual, aoSalvar }: { atual?: string; aoSalvar?: () => void }) {
  const [valor, setValor] = useState(atual ?? '');
  const [erro, setErro] = useState<string | null>(null);

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (definirApelido(valor)) {
      setErro(null);
      aoSalvar?.();
    } else {
      setErro('Use entre 2 e 24 caracteres.');
    }
  }

  return (
    <form className="campo-apelido" onSubmit={enviar}>
      <input
        type="text"
        className="campo"
        value={valor}
        onChange={(evento) => setValor(evento.target.value)}
        placeholder="Como você quer aparecer no ranking?"
        maxLength={24}
        data-foco-inicial
      />
      <button type="submit" className="btn btn--sm btn--amarelo">
        <Icone nome="check" tamanho={15} />
        Salvar apelido
      </button>
      {erro && <p className="campo-apelido__erro">{erro}</p>}
    </form>
  );
}

/** Pedido de apelido logo após o primeiro login com Google. Pode ser adiado. */
export function ModalApelido({ aberto, aoFechar }: { aberto: boolean; aoFechar: () => void }) {
  return (
    <Modal aberto={aberto} aoFechar={aoFechar} titulo="Como você quer aparecer no ranking?">
      <p>
        Escolha um apelido público. Ele (e seu XP) aparece pra outros alunos no <strong>ranking</strong> — seu nome e email do
        Google continuam privados.
      </p>
      <CampoApelido aoSalvar={aoFechar} />
      <button type="button" className="link-forte campo-apelido__depois" onClick={aoFechar}>
        Definir depois, na página de Progresso
      </button>
    </Modal>
  );
}
