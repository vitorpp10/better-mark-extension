/**
 * blindagem de blocos protegidos pra camada de IA.
 *
 * porque existe:
 * teste real com a River AI mostrou que o modelo destroi estrutura mesmo com o
 * prompt mandando preservar. um bloco ```` ```ts ```` virou `# ts`, uma tabela
 * perdeu os pipes e duas linhas de paragrafo viraram uma. prompt nao basta:
 * modelo desobedece.
 *
 * solucao: o modelo nunca ve oq e fragil.
 *
 *   1. EXTRAI os blocos protegidos (codigo, tabela, front matter, citacao)
 *      e troca cada um por um sentinela: `<!-- BM-PROTECTED 0 | CODE | ... -->`
 *   2. a IA formata so o texto que sobra (prosa de verdade)
 *   3. DEVOLVE os blocos originais no lugar dos sentinelas
 *   4. se algum sentinela sumiu, a resposta e rejeitada — nada e escrito
 *
 * o pior caso vira "a IA nao fez nada" em vez de "a IA estragou o README do
 * user". essa e a diferenca que importa.
 */

import { scanProtected } from '../core/scanner';
import { splitLines } from '../core/text';

/**
 * marcador de posicao. usa comentario HTML porque:
 *  - passa intacto pela maioria dos formatadores de markdown;
 *  - e reconhecivel sem ambiguidade;
 *  - fica em linha propria, oq facilita a recolocacao.
 *
 * descoberta importante: quando dois ou mais marcadores caem em linhas
 * consecutivas (blocos protegidos colados), o modelo tende a "limpar" oq
 * parece redundante e apaga alguns. por isso o marcador agora:
 *  - traz o TIPO do bloco (`CODE`, `TABLE`, `META`, `QUOTE`), oq da
 *    significado a cada linha em vez de parecer duplicata;
 *  - traz um ID explicito que o modelo consegue citar;
 *  - termina com uma instrucao visivel, nao e so um comentario vazio.
 */
const SENTINEL_PREFIX = '<!-- BM-PROTECTED';
const SENTINEL_RE = /^[ \t]*<!-- BM-PROTECTED (\d+) \| ([A-Z]+) \|[^>]*-->[ \t]*$/;

/** rotulo legivel por tipo de bloco protegido. */
const KIND_LABEL: Record<string, string> = {
	fence: 'CODE',
	table: 'TABLE',
	frontMatter: 'META',
	html: 'HTML',
	blockquote: 'QUOTE',
};

/** monta a linha-sentinela de um bloco. */
function sentinelFor(index: number, kind: string): string {
	const label = KIND_LABEL[kind] ?? 'BLOCK';
	return `${SENTINEL_PREFIX} ${index} | ${label} | nao altere esta linha -->`;
}

export interface ExtractedBlock {
	/** indice do bloco, na ordem em que aparece. */
	index: number;
	/** linhas originais, exatamente como estavam. */
	lines: string[];
	/** rotulo legivel pra diagnostico. */
	kind: string;
}

export interface ShieldedText {
	/** texto com os blocos trocados por sentinelas. vai pra IA. */
	text: string;
	/** blocos guardados, pra recolocar depois. */
	blocks: ExtractedBlock[];
	/** terminador de linha detectado. */
	eol: string;
}

/**
 * separa o texto em "prosa" (oq a IA pode formatar) e "blocos frageis"
 * (oq ela nunca ve).
 */
export function shieldProtectedBlocks(text: string): ShieldedText {
	const doc = splitLines(text);
	const scan = scanProtected(text);

	const proseLines: string[] = [];
	const blocks: ExtractedBlock[] = [];

	let current: { kind: string; lines: string[] } | null = null;

	const flush = (): void => {
		if (!current) {
			return;
		}
		const index = blocks.length;
		blocks.push({ index, lines: current.lines, kind: current.kind });
		proseLines.push(sentinelFor(index, current.kind));
		current = null;
	};

	for (let i = 0; i < doc.lines.length; i++) {
		const kind = scan.protectedKind[i];

		if (kind === null) {
			flush();
			proseLines.push(doc.lines[i]);
			continue;
		}

		// agrupa linhas consecutivas do mesmo tipo num bloco so, pra o
		// sentinela ocupar uma linha em vez de uma tabela inteira.
		if (current && current.kind === kind) {
			current.lines.push(doc.lines[i]);
			continue;
		}

		flush();
		current = { kind, lines: [doc.lines[i]] };
	}
	flush();

	return { text: proseLines.join(doc.eol), blocks, eol: doc.eol };
}

export interface RestoreResult {
	ok: boolean;
	/** texto com os blocos recolocados (so vale se `ok`). */
	text: string;
	/** blocos que o modelo apagou ou alterou. */
	missing: number[];
	/** blocos que o modelo duplicou. */
	duplicated: number[];
	/** sinal de que o modelo reescreveu o sentinela de forma irreconhecivel. */
	mangled: boolean;
}

/**
 * recoloca os blocos originais no lugar dos sentinelas.
 *
 * se o modelo apagou, duplicou ou corrompeu um sentinela, `ok` vem `false` e a
 * resposta inteira tem que ser descartada. nao tentamos "consertar": um
 * conserto chutado pode apagar o codigo do user.
 */
export function restoreProtectedBlocks(shielded: ShieldedText, modelOutput: string): RestoreResult {
	const outputLines = splitLines(modelOutput).lines;
	const seen = new Map<number, number>();
	const result: string[] = [];
	let mangled = false;

	for (const line of outputLines) {
		const match = line.match(SENTINEL_RE);
		if (!match) {
			// detecta sentinela deformado (`BM-PROTECTED` sem o formato exato):
			// e sinal de que o modelo mexeu no q nao devia.
			if (/BM[-_ ]?PROTECTED/i.test(line)) {
				mangled = true;
			}
			result.push(line);
			continue;
		}

		const index = Number(match[1]);
		seen.set(index, (seen.get(index) ?? 0) + 1);

		const block = shielded.blocks[index];
		if (!block) {
			mangled = true;
			result.push(line);
			continue;
		}
		result.push(...block.lines);
	}

	const missing: number[] = [];
	for (const block of shielded.blocks) {
		if (!seen.has(block.index)) {
			missing.push(block.index);
		}
	}

	const duplicated = [...seen.entries()]
		.filter(([, count]) => count > 1)
		.map(([index]) => index)
		.sort((a, b) => a - b);

	if (mangled || missing.length > 0 || duplicated.length > 0) {
		return { ok: false, text: '', missing, duplicated, mangled };
	}

	return { ok: true, text: result.join(shielded.eol), missing, duplicated, mangled };
}

/**
 * compara a estrutura protegida antes e depois.
 *
 * verificacao independente da recolocacao: confere que a quantidade e o
 * conteudo dos blocos frageis sobreviveram. serve de segunda barreira caso o
 * modelo devolva os sentinelas mas mexa no conteudo em volta.
 *
 * `allowNewBlocks` existe por causa do bug do texto recuado (achado em 22/10):
 * texto colado de PDF vem TODO com 4 espacos no inicio. o markdown le isso
 * como bloco de codigo, mas sem cerca o scanner nao ve bloco nenhum — entao a
 * contagem antes e 0. quando a ia faz o trabalho certo e CERCA o codigo que
 * estava solto, a contagem vira 1 e a barreira reprovava uma resposta
 * correta. no modo `restructure` criar estrutura E o trabalho da ia, entao
 * bloco NOVO e permitido. bloco original sumir ou mudar continua sendo erro.
 *
 * no modo `preserve` a comparacao segue estrita: la a ia nao deve mexer na
 * estrutura, so nos marcadores.
 */
export function compareProtectedStructure(
	before: string,
	after: string,
	options: { allowNewBlocks?: boolean } = {},
): { ok: boolean; reason?: string } {
	const a = shieldProtectedBlocks(before);
	const b = shieldProtectedBlocks(after);

	const novos = b.blocks.length - a.blocks.length;
	if (novos > 0 && !options.allowNewBlocks) {
		return {
			ok: false,
			reason: `protected block count changed (${a.blocks.length} → ${b.blocks.length})`,
		};
	}
	if (novos < 0) {
		return {
			ok: false,
			reason: `protected block count changed (${a.blocks.length} → ${b.blocks.length})`,
		};
	}
	if (novos > 0) {
		// bloco novo so e aceitavel se os ORIGINAIS continuam intactos, na
		// mesma ordem. sem isso a ia poderia "criar" bloco e sumir com um
		// original no meio.
		return originaisIntactos(a, b);
	}
	
	for (let i = 0; i < a.blocks.length; i++) {
		if (a.blocks[i].lines.join('\n') !== b.blocks[i].lines.join('\n')) {
			return { ok: false, reason: `protected block #${i} (${a.blocks[i].kind}) was modified` };
		}
	}

	return { ok: true };
}

/**
 * com blocos NOVOS no fim, confere que cada bloco original ainda existe —
 * na mesma ordem e com o mesmo conteudo. procura como subsequencia, porque os
 * novos podem aparecer entre os originais.
 */
function originaisIntactos(a: ShieldedText, b: ShieldedText): { ok: boolean; reason?: string } {
	let cursor = 0;
	for (let i = 0; i < a.blocks.length; i++) {
		const alvo = a.blocks[i].lines.join('\n');
		let achou = -1;
		for (let j = cursor; j < b.blocks.length; j++) {
			if (b.blocks[j].lines.join('\n') === alvo) {
				achou = j;
				break;
			}
		}
		if (achou === -1) {
			return {
				ok: false,
				reason: `protected block #${i} (${a.blocks[i].kind}) was removed or modified`,
			};
		}
		cursor = achou + 1;
	}
	return { ok: true };
}

/** true quando o texto so tem um sentinela (e nada de prosa). */
export function isOnlySentinel(text: string): boolean {
	const trimmed = text.trim();
	return trimmed.length > 0 && SENTINEL_RE.test(trimmed);
}
