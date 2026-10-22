/**
 * nivel 1 — titulos.
 *
 * a pergunta central nao e "como fazer regex?", e:
 * **quais linhas realmente sao um titulo?**
 *
 * regras (todas precisam passar — a lista do "nao deve mudar" vale tanto
 * quanto a do "deve mudar"):
 *
 *  DEVE virar titulo:
 *   - linha curta (<= 80 colunas), sem pontuacao final de frase
 *   - primeira linha de uma secao, seguida por linha em branco ou por conteudo
 *
 *  NAO DEVE mudar:
 *   - paragrafo longo ou com pontuacao final (. ! ? , ; :)
 *   - linha que ja e titulo (`#`, `##`...)
 *   - item de lista, citacao, tabela, codigo
 *   - linha de continuacao de um paragrafo anterior
 *   - a maioria das linhas de um bloco (so a primeira vira titulo)
 */

import type { FormatContext, FormatOptions } from '../types';
import { isBlank, stripInlineFormatting } from '../text';
import { isListItem } from '../scanner';

/**
 * ja e titulo? aceita com espaco (`# x`) e tambem colado (`#x`).
 *
 * o colado e markdown invalido, mas acontece muito de copiar de site. antes
 * a gente exigia espaco aqui, entao o `#titulo` caia no caminho de "linha
 * que parece titulo" e saia como `# #titulo` — dobrando o jogo da velha.
 * bug real, achado na bateria de 22/10.
 *
 * o `#` e greedy e o `(?!\#)` garante que a contagem pare no fim da sequencia:
 * sem ele, `### Stack` casaria como um `#` so e o resto viraria conteudo.
 */
const EXISTING_HEADING_RE = /^ {0,3}(#{1,6})(?!\#)(?=\s|$|\S)/;
/** colado sem espaco: `#titulo` — precisa de conserto, mas ja e titulo. */
const GLUED_HEADING_RE = /^ {0,3}(#{1,6})(?!\#)(\S)/;
const MAX_HEADING_LENGTH = 80;
/**
 * a partir desse tamanho a linha "ja e uma frase": 80 e o limite duro do
 * markdown, mas frase real comeca bem antes. sem isso, subtitulo descritivo
 * como "Health check failed because the database is unavailable" viraria
 * `#` — exatamente o falso positivo que a gente quer evitar.
 */
const PROSE_LENGTH = 60;

/**
 * conectivo que praticamente so aparece em frase, nunca em titulo.
 * "and"/"but"/"because" em ingles e os equivalentes em portugues.
 */
const PROSE_CONNECTIVES =
	/\b(because|and|but|however|although|therefore|que|porque|pois|quando|enquanto|embora|portanto|porém)\b/i;

/**
 * numero de palavras acima do qual a linha e prosa, nao titulo.
 * titulo de verdade e curto; 10 palavra ja e generoso.
 */
const MAX_HEADING_WORDS = 10;
/** marcador de item de lista em qualquer nivel. */
const ORDERED_OR_BULLET_RE = /^([ \t]*)([-*+]|\d{1,9}[.)\]\-}])[ \t]+/;

/**
 * true quando a linha tem enfase inline (`**negrito**`, `__negrito__`,
 * `*italico*`, `_italico_`, `~~tachado~~`).
 *
 * usado como VETO de titulo: titulo raramente tem enfase, mas frase de prosa
 * frequentemente tem. sem esse veto, "Vamos usar o **negrito** aqui" virava
 * "# Vamos usar o negrito aqui".
 *
 * cuidado com `*` de lista: um item `* comprado` NAO e italico. por isso o
 * par de asterisco precisa ta dentro da linha, com conteudo entre eles.
 */
export function hasInlineEmphasis(text: string): boolean {
	const body = text.replace(/^[ \t]*([-*+]|\d{1,9}[.)\]\-}])[ \t]+/, '');
	return (
		/\*\*[^*\n]+\*\*/.test(body) ||
		/__[^_\n]+__/.test(body) ||
		/~~[^~\n]+~~/.test(body) ||
		/(?<![*\w])\*[^*\s][^*\n]*\*(?![*\w])/.test(body) ||
		/(?<![_\w])_[^_\s][^_\n]*_(?![_\w])/.test(body)
	);
}

export const headingsRule = {
	id: 'headings',

	apply(line: string, index: number, doc: string[], ctx: FormatContext, options: Required<FormatOptions>): string {
		if (isBlank(line)) {
			return line;
		}

		// ja e titulo: registra o nivel pra inferir os proximos e nao mexe.
		// se veio colado (`#titulo`), conserta o espaco em vez de deixar
		// passar — markdown invalido nao deve sair do formatador.
		const existing = line.match(EXISTING_HEADING_RE);
		if (existing) {
			ctx.state.existingLevels.push(existing[1].length);
			ctx.state.headingEmitted = true;

			const glued = line.match(GLUED_HEADING_RE);
			if (glued) {
				const indent = line.slice(0, line.length - line.trimStart().length);
				return `${indent}${glued[1]} ${line.trimStart().slice(glued[1].length)}`;
			}

			return line;
		}

		// nunca transforma item de lista em titulo.
		if (isListItem(line)) {
			return line;
		}

		// so a PRIMEIRA linha de um bloco pode virar titulo. se a linha
		// anterior e texto (nao vazia, nao lista), isso e continuacao.
		if (index > 0 && !isBlank(doc[index - 1])) {
			return line;
		}

		// titulo nunca e seguido direto por texto sem linha em branco:
		// isso e o padrao de um paragrafo sendo "fatiado".
		if (index + 1 < doc.length && !isBlank(doc[index + 1])) {
			return line;
		}

		// a DECISAO usa a linha CRUA, nao a aparada: o recuo e parte da
		// informacao ("  texto" e lista/continuacao, nao titulo). so o
		// conteudo aparado e que vai pro heading emitido.
		if (!isHeadingLike(line)) {
			return line;
		}

		const result = line.trim();
		const indent = '';
		const level = resolveLevel(ctx, options);
		ctx.state.headingEmitted = true;
		return `${indent}${'#'.repeat(level)} ${result}`;
	},
};

/**
 * comecou com verbo de terminal? entao e comando, nao titulo.
 *
 * lista curta de proposito: so o que aparece em doc de dev. se crescer
 * demais vira falso negativo (titulo de verdade barrado), entao mantem
 * enxuto.
 */
const CLI_VERBS = new Set([
	'npm', 'npx', 'yarn', 'pnpm', 'bun',
	'node', 'deno', 'python', 'python3', 'pip', 'pip3', 'poetry',
	'git', 'docker', 'docker-compose', 'kubectl', 'helm', 'terraform',
	'make', 'cmake', 'cargo', 'rustc', 'go', 'dotnet', 'mvn', 'gradle',
	'apt', 'apt-get', 'yum', 'dnf', 'pacman', 'brew', 'snap',
	'sudo', 'ssh', 'scp', 'curl', 'wget', 'chmod', 'chown', 'mkdir',
	'ls', 'cd', 'cp', 'mv', 'rm', 'cat', 'grep', 'find', 'tar', 'unzip',
	'java', 'javac', 'gcc', 'clang', 'bash', 'sh', 'zsh',
	'composer', 'php', 'ruby', 'gem', 'rails', 'flutter', 'adb',
]);

function startsWithCommand(text: string): boolean {
	const primeira = text.trim().split(/\s+/)[0]?.toLowerCase() ?? '';
	const limpa = primeira.replace(/[^a-z0-9._-]/g, '');
	return CLI_VERBS.has(limpa);
}

/**
 * a linha tem "cara de titulo"?
 *
 * caso que passa: `Health check`, `Database health check`, `Como usar`,
 * `Configuracao da API`, `Nivel 1`.
 *
 * caso que NAO passa: paragrafo (longo ou terminado em pontuacao de frase),
 * lista, bloco, linha de rotulo (`Baixar: algo`), comando de terminal
 * (`npm install`, bug da bateria de 22/10) e — bug corrigido na v0.3.0 —
 * frase de prosa que contem formatacao inline.
 */
export function isHeadingLike(text: string): boolean {
	// linha INDENTADA nao e titulo. recuo no inicio significa lista,
	// continuacao de item ou bloco — nunca um heading. sem esse veto,
	// "    so uma linha aqui" (indentada) virava "# so uma linha aqui",
	// promovendo um trecho de texto colado a titulo do documento.
	if (/^[ \t]/.test(text)) {
		return false;
	}

	// BUG CORRIGIDO: antes usava `stripInlineFormatting` e decidia sobre o
	// texto "limpo". assim, "Vamos usar o **negrito** aqui" virava
	// "# Vamos usar o negrito aqui" — frase de prosa promovida a titulo.
	// titulo de verdade quase nunca tem enfase, entao formatacao inline e
	// sinal FORTE de prosa. verifica no texto cru.
	if (hasInlineEmphasis(text)) {
		return false;
	}

	const plain = stripInlineFormatting(text).trim();
	if (plain.length === 0 || plain.length > MAX_HEADING_LENGTH) {
		return false;
	}
	// titulo nao termina em pontuacao de frase nem em virgula/dois-pontos.
	if (/[.!?,;:]$/.test(plain)) {
		return false;
	}
	// linha com `rotulo: valor` e definicao/prosa, nao titulo. titulo
	// verdadeiro com dois-pontos no meio (`API: guia rapido`) tambem cai
	// aqui — perda aceitavel pra nao estragar texto corrido.
	if (/^[^\s:][^:]{0,39}:\s+\S/.test(plain)) {
		return false;
	}
	// proporcao/medida (`16:9 proporcao`, `3:2 tela`) e horario (`10:30
	// reuniao`) tem dois-pontos colado, sem espaco — o teste acima nao pega.
	if (/^\d+:\d+/.test(plain)) {
		return false;
	}
	// comando de terminal nao e titulo. `npm install express` e
	// `node server.js` viravam `# npm install express` na bateria de 22/10.
	// o sinal e: comeca com um verbo de CLI conhecido.
	if (startsWithCommand(plain)) {
		return false;
	}
	// linha que comeca com minuscula E tem cara de continuação de frase:
	// ja coberto abaixo pela regra de comprimento, mas `npm`/`node` sao
	// minusculos e curtos, entao a checagem acima e o que resolve.
	//
	// e-mail, arroba de mencao e URL: linha com `@` ou link solto e prosa
	// ou contato, nunca titulo. `Agradecimentos ao @barreto` virou titulo
	// na bateria.
	if (/[@]/.test(plain) || /^\S+:\/\//.test(plain)) {
		return false;
	}
	// nao pode conter quebra interna.
	if (plain.includes('\n')) {
		return false;
	}
	// precisa ter pelo menos uma letra ou numero.
	if (!/[\p{L}\p{N}]/u.test(plain)) {
		return false;
	}

	// --- daqui pra baixo: heuristica de "isso e prosa, nao titulo" ---
	// nenhuma depende do tamanho: frase curta com conectivo
	// ("Health check failed because the database is gone") tambem e prosa.
	if (PROSE_CONNECTIVES.test(plain)) {
		return false;
	}
	// muita palavra = frase. titulo e curto.
	if (plain.split(/\s+/).length > MAX_HEADING_WORDS) {
		return false;
	}
	// linha comprida comecando com minuscula: quase certamente continuacao
	// de frase ou texto corrido.
	if (plain.length > PROSE_LENGTH && /^[a-zà-öø-ÿ]/.test(plain)) {
		return false;
	}
	// palavra unica toda em maiuscula: e SIGLA ou rotulo solto, nao titulo.
	// `MIT` sozinho virava `# MIT` (bug da bateria 2, 22/10). titulo de
	// verdade com uma palavra maiuscula existe ("README"), mas e raro o
	// bastante pra perder — e o estrago de promover `MIT`/`TODO`/`WIP` a
	// titulo e maior.
	if (/^[A-Z][A-Z0-9._-]{1,9}$/.test(plain)) {
		return false;
	}
	return true;
}

/**
 * decide o nivel do heading.
 *
 * - `options.headingLevel` entre 1 e 6 vence;
 * - `0` (padrao) = infere do documento: usa o menor nivel ja presente;
 * - sem nenhum heading no trecho, usa 1.
 */
function resolveLevel(ctx: FormatContext, options: Required<FormatOptions>): number {
	const explicit = options.headingLevel;
	if (explicit >= 1 && explicit <= 6) {
		return explicit;
	}
	if (ctx.state.existingLevels.length > 0) {
		return Math.min(...ctx.state.existingLevels);
	}
	return 1;
}

/** reexportado pros testes explorarem a regex de item de lista. */
export { ORDERED_OR_BULLET_RE };
