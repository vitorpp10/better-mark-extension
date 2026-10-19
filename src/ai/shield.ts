/**
 * Blindagem de blocos protegidos para a camada de IA.
 *
 * MOTIVO DE EXISTIR:
 * O teste real com a River AI mostrou que o modelo DESTRÓI estrutura mesmo
 * quando o prompt manda preservar. Um bloco ```` ```ts ```` virou `# ts`, uma
 * tabela perdeu os pipes, e duas linhas de parágrafo foram fundidas em uma.
 * O prompt não é suficiente: modelos desobedecem.
 *
 * SOLUÇÃO: o modelo nunca vê o que é frágil.
 *
 *   1. EXTRAI os blocos protegidos (código, tabela, front matter, citação)
 *      e troca cada um por um sentinela: `<!-- BM-PROTECTED 0 | CODE | ... -->`
 *   2. A IA formata só o texto restante (prosa de verdade)
 *   3. DEVOLVE os blocos originais no lugar dos sentinelas
 *   4. Se algum sentinela sumiu, a resposta é rejeitada — nada é escrito
 *
 * O pior caso passa a ser "a IA não fez nada" em vez de "a IA estragou o
 * README do usuário". Essa é a diferença que importa.
 */

import { scanProtected } from '../core/scanner';
import { splitLines } from '../core/text';

/**
 * Marcador de posição. Usa comentário HTML porque:
 *  - passa intacto pela maioria dos formatadores de markdown;
 *  - é reconhecível sem ambiguidade;
 *  - aparece em uma linha própria, o que facilita a recolocação.
 *
 * DESCOBERTA IMPORTANTE: quando dois ou mais marcadores ficam em linhas
 * consecutivas (blocos protegidos colados), o modelo tende a "limpar" o que
 * parece redundante e apaga alguns. Por isso o marcador agora:
 *  - traz o TIPO do bloco (`CODE`, `TABLE`, `META`, `QUOTE`), o que dá
 *    significado a cada linha em vez de parecer duplicata;
 *  - traz um ID explícito que o modelo consegue citar;
 *  - termina com uma instrução visível, não é só um comentário vazio.
 */
const SENTINEL_PREFIX = '<!-- BM-PROTECTED';
const SENTINEL_RE = /^[ \t]*<!-- BM-PROTECTED (\d+) \| ([A-Z]+) \|[^>]*-->[ \t]*$/;

/** Rótulo legível por tipo de bloco protegido. */
const KIND_LABEL: Record<string, string> = {
	fence: 'CODE',
	table: 'TABLE',
	frontMatter: 'META',
	html: 'HTML',
	blockquote: 'QUOTE',
};

/** Monta a linha-sentinela de um bloco. */
function sentinelFor(index: number, kind: string): string {
	const label = KIND_LABEL[kind] ?? 'BLOCK';
	return `${SENTINEL_PREFIX} ${index} | ${label} | nao altere esta linha -->`;
}

export interface ExtractedBlock {
	/** Índice do bloco, na ordem em que aparece. */
	index: number;
	/** Linhas originais, exatamente como estavam. */
	lines: string[];
	/** Rótulo legível para diagnóstico. */
	kind: string;
}

export interface ShieldedText {
	/** Texto com os blocos trocados por sentinelas. Vai para a IA. */
	text: string;
	/** Blocos guardados, para recolocar depois. */
	blocks: ExtractedBlock[];
	/** Terminador de linha detectado. */
	eol: string;
}

/**
 * Separa o texto em "prosa" (que a IA pode formatar) e "blocos frágeis"
 * (que ela nunca vê).
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

		// Agrupa linhas consecutivas do mesmo tipo em um único bloco, para que
		// o sentinela ocupe uma linha só no lugar de uma tabela inteira.
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
	/** Texto com os blocos recolocados (válido apenas se `ok`). */
	text: string;
	/** Blocos que o modelo apagou ou alterou. */
	missing: number[];
	/** Blocos que o modelo duplicou. */
	duplicated: number[];
	/** Sinal de que o modelo reescreveu o sentinela de forma irreconhecível. */
	mangled: boolean;
}

/**
 * Recoloca os blocos originais no lugar dos sentinelas.
 *
 * Se o modelo apagou, duplicou ou corrompeu um sentinela, `ok` vem `false` e
 * a resposta inteira deve ser descartada. Não tentamos "consertar": um
 * conserto adivinhatório pode apagar o código do usuário.
 */
export function restoreProtectedBlocks(shielded: ShieldedText, modelOutput: string): RestoreResult {
	const outputLines = splitLines(modelOutput).lines;
	const seen = new Map<number, number>();
	const result: string[] = [];
	let mangled = false;

	for (const line of outputLines) {
		const match = line.match(SENTINEL_RE);
		if (!match) {
			// Detecta sentinela deformado (`BM-PROTECTED` sem o formato exato):
			// é sinal de que o modelo mexeu no que não devia.
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
 * Compara a estrutura protegida antes e depois.
 *
 * Verificação independente da recolocação: confere que a quantidade e o
 * conteúdo dos blocos frágeis sobreviveram. Serve como segunda barreira caso
 * o modelo devolva os sentinelas mas mexa no conteúdo ao redor deles.
 */
export function compareProtectedStructure(before: string, after: string): { ok: boolean; reason?: string } {
	const a = shieldProtectedBlocks(before);
	const b = shieldProtectedBlocks(after);

	if (a.blocks.length !== b.blocks.length) {
		return {
			ok: false,
			reason: `protected block count changed (${a.blocks.length} → ${b.blocks.length})`,
		};
	}

	for (let i = 0; i < a.blocks.length; i++) {
		if (a.blocks[i].lines.join('\n') !== b.blocks[i].lines.join('\n')) {
			return { ok: false, reason: `protected block #${i} (${a.blocks[i].kind}) was modified` };
		}
	}

	return { ok: true };
}

/** True quando o texto contém apenas um sentinela (e nada de prosa). */
export function isOnlySentinel(text: string): boolean {
	const trimmed = text.trim();
	return trimmed.length > 0 && SENTINEL_RE.test(trimmed);
}
