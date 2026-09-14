import { Link } from 'react-router-dom';
import { Icone } from '../componentes/Icone.tsx';
import { useTitulo } from '../hooks/useTitulo.ts';

export function NaoEncontrado() {
  useTitulo('Página não encontrada');
  return (
    <div className="pagina">
      <div className="cartao nao-encontrado">
        <span className="circulo circulo--amarelo">
          <Icone nome="busca" />
        </span>
        <h1 className="titulo-pagina">Essa página não existe.</h1>
        <p className="subtitulo-pagina">
          Pode ser um link antigo ou um conteúdo que mudou de nome. Nenhum SELECT encontrou nada por aqui.
        </p>
        <Link to="/" className="btn btn--amarelo">
          <Icone nome="inicio" />
          Voltar para o início
        </Link>
      </div>
    </div>
  );
}
