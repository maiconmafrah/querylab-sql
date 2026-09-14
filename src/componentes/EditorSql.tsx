import { useEffect, useImperativeHandle, useRef, type Ref } from 'react';
import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap } from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { PostgreSQL, sql } from '@codemirror/lang-sql';
import { bracketMatching, HighlightStyle, indentOnInput, syntaxHighlighting } from '@codemirror/language';
import { Compartment, EditorState, Prec } from '@codemirror/state';
import {
  drawSelection,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
  placeholder,
} from '@codemirror/view';
import { tags } from '@lezer/highlight';

const tema = EditorView.theme(
  {
    '&': { backgroundColor: 'var(--codigo-fundo)', color: 'var(--codigo-texto)', fontSize: '14px', height: '100%' },
    '.cm-scroller': { fontFamily: 'var(--mono)', lineHeight: '1.65' },
    '.cm-content': { caretColor: 'var(--amarelo)', padding: '12px 0' },
    '&.cm-focused': { outline: 'none' },
    '&.cm-focused .cm-cursor': { borderLeftColor: 'var(--amarelo)', borderLeftWidth: '2px' },
    '.cm-gutters': { backgroundColor: 'var(--codigo-fundo)', color: '#5d5a52', border: 'none', paddingLeft: '6px' },
    '.cm-activeLineGutter': { backgroundColor: 'transparent', color: 'var(--codigo-texto)' },
    '.cm-activeLine': { backgroundColor: 'rgba(255, 255, 255, 0.04)' },
    '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground': {
      backgroundColor: 'rgba(199, 184, 255, 0.28)',
    },
    '.cm-matchingBracket': { backgroundColor: 'rgba(244, 211, 94, 0.22)', outline: 'none' },
    '.cm-placeholder': { color: 'var(--codigo-mudo)' },
    '.cm-tooltip': {
      border: '2px solid var(--tinta)',
      borderRadius: '10px',
      backgroundColor: 'var(--cartao)',
      color: 'var(--tinta)',
      overflow: 'hidden',
      boxShadow: '3px 3px 0 var(--tinta)',
    },
    '.cm-tooltip-autocomplete > ul': { fontFamily: 'var(--mono)', fontSize: '13px', maxHeight: '220px' },
    '.cm-tooltip-autocomplete > ul > li': { padding: '3px 10px' },
    '.cm-tooltip-autocomplete > ul > li[aria-selected]': { backgroundColor: 'var(--amarelo)', color: 'var(--tinta)' },
    '.cm-completionDetail': { color: 'var(--mudo)', fontStyle: 'normal', marginLeft: '8px' },
  },
  { dark: true },
);

const destaque = HighlightStyle.define([
  { tag: [tags.keyword, tags.operatorKeyword, tags.modifier], color: '#f4d35e' },
  { tag: [tags.standard(tags.name), tags.function(tags.variableName), tags.typeName], color: '#c7b8ff' },
  { tag: [tags.string, tags.special(tags.string)], color: '#a8e6c3' },
  { tag: [tags.number, tags.bool, tags.null], color: '#ffb4a2' },
  { tag: [tags.lineComment, tags.blockComment], color: '#8a8579', fontStyle: 'italic' },
  { tag: tags.punctuation, color: '#bdb8ab' },
]);

function linguagem(esquema?: Record<string, string[]>) {
  return sql({ dialect: PostgreSQL, upperCaseKeywords: true, schema: esquema });
}

export interface EditorSqlHandle {
  /** Texto selecionado, ou null se não houver seleção. */
  selecao: () => string | null;
  focar: () => void;
}

interface Props {
  valor: string;
  aoMudar: (valor: string) => void;
  /** Chamado com Ctrl/Cmd + Enter. Recebe o trecho selecionado, se houver. */
  aoExecutar?: (selecao: string | null) => void;
  esquema?: Record<string, string[]>;
  alturaMinima?: number;
  rotulo?: string;
  textoVazio?: string;
  ref?: Ref<EditorSqlHandle>;
}

export function EditorSql({
  valor,
  aoMudar,
  aoExecutar,
  esquema,
  alturaMinima = 220,
  rotulo = 'Editor de SQL',
  textoVazio = 'Escreva sua consulta aqui…',
  ref,
}: Props) {
  const hospedeiro = useRef<HTMLDivElement>(null);
  const visao = useRef<EditorView | null>(null);
  const compartimentoLinguagem = useRef(new Compartment());
  const aoMudarAtual = useRef(aoMudar);
  const aoExecutarAtual = useRef(aoExecutar);
  aoMudarAtual.current = aoMudar;
  aoExecutarAtual.current = aoExecutar;

  useImperativeHandle(ref, () => ({
    selecao: () => {
      const view = visao.current;
      if (!view) return null;
      const { from, to } = view.state.selection.main;
      return from === to ? null : view.state.sliceDoc(from, to);
    },
    focar: () => visao.current?.focus(),
  }));

  useEffect(() => {
    const executar = (view: EditorView) => {
      const { from, to } = view.state.selection.main;
      aoExecutarAtual.current?.(from === to ? null : view.state.sliceDoc(from, to));
      return true;
    };

    const view = new EditorView({
      parent: hospedeiro.current!,
      state: EditorState.create({
        doc: valor,
        extensions: [
          lineNumbers(),
          highlightActiveLineGutter(),
          highlightActiveLine(),
          history(),
          drawSelection(),
          indentOnInput(),
          bracketMatching(),
          closeBrackets(),
          autocompletion({ activateOnTyping: true }),
          placeholder(textoVazio),
          Prec.highest(
            keymap.of([
              { key: 'Mod-Enter', run: executar },
              { key: 'Shift-Enter', run: executar },
            ]),
          ),
          keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...historyKeymap, ...completionKeymap, indentWithTab]),
          compartimentoLinguagem.current.of(linguagem()),
          tema,
          syntaxHighlighting(destaque),
          EditorState.tabSize.of(2),
          EditorView.lineWrapping,
          EditorView.contentAttributes.of({ 'aria-label': rotulo }),
          EditorView.updateListener.of((atualizacao) => {
            if (atualizacao.docChanged) aoMudarAtual.current(atualizacao.state.doc.toString());
          }),
        ],
      }),
    });
    visao.current = view;
    return () => {
      view.destroy();
      visao.current = null;
    };
    // O editor é criado uma vez; mudanças de valor chegam pelo efeito abaixo.
  }, []);

  useEffect(() => {
    const view = visao.current;
    if (!view) return;
    const atual = view.state.doc.toString();
    if (atual !== valor) {
      view.dispatch({ changes: { from: 0, to: atual.length, insert: valor } });
    }
  }, [valor]);

  useEffect(() => {
    visao.current?.dispatch({ effects: compartimentoLinguagem.current.reconfigure(linguagem(esquema)) });
  }, [esquema]);

  return <div className="editor-sql" ref={hospedeiro} style={{ minHeight: alturaMinima }} />;
}
