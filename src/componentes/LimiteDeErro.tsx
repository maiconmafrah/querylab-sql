import { Component, type ReactNode } from 'react';
import { Icone } from './Icone.tsx';

interface Props {
  /** Quando muda (ex.: o endereço da página), o erro anterior é esquecido. */
  chave: string;
  children: ReactNode;
}

/** Em vez de a tela inteira ficar em branco quando uma página quebra, mostra um aviso com saída. */
export class LimiteDeErro extends Component<Props, { erro: boolean }> {
  state = { erro: false };

  static getDerivedStateFromError() {
    return { erro: true };
  }

  componentDidCatch(erro: unknown) {
    console.error('Erro ao exibir a página:', erro);
  }

  componentDidUpdate(anteriores: Props) {
    if (this.state.erro && anteriores.chave !== this.props.chave) this.setState({ erro: false });
  }

  render() {
    if (!this.state.erro) return this.props.children;
    return (
      <div className="pagina">
        <div className="vazio">
          <strong>Algo deu errado ao abrir esta página.</strong>
          <span>Pode ser uma versão nova do site que acabou de sair. Recarregar costuma resolver — seu progresso continua salvo.</span>
          <button type="button" className="btn btn--sm btn--amarelo" onClick={() => window.location.reload()}>
            <Icone nome="restaurar" tamanho={15} />
            Recarregar a página
          </button>
        </div>
      </div>
    );
  }
}
