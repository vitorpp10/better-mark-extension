import { describe, expect, it } from 'vitest';
import {
	compareProtectedStructure,
	restoreProtectedBlocks,
	shieldProtectedBlocks,
} from '../shield';

const SENTINEL = (n: number, kind = 'CODE') => `<!-- BM-PROTECTED ${n} | ${kind} | nao altere esta linha -->`;

describe('shieldProtectedBlocks — o que a IA pode ver', () => {
	it('troca bloco de código por sentinela', () => {
		const input = ['# Título', '', '```ts', 'const x = 1;', '```', '', 'Fim'].join('\n');
		const shielded = shieldProtectedBlocks(input);

		expect(shielded.text).toContain(SENTINEL(0));
		expect(shielded.text).not.toContain('const x = 1');
		expect(shielded.blocks).toHaveLength(1);
		expect(shielded.blocks[0].kind).toBe('fence');
		expect(shielded.blocks[0].lines).toEqual(['```ts', 'const x = 1;', '```']);
	});

	it('protege tabela inteira como um bloco só', () => {
		const input = ['| a | b |', '| --- | --- |', '| 1 | 2 |'].join('\n');
		const shielded = shieldProtectedBlocks(input);

		expect(shielded.blocks).toHaveLength(1);
		expect(shielded.blocks[0].kind).toBe('table');
		expect(shielded.blocks[0].lines).toHaveLength(3);
	});

	it('protege front matter', () => {
		const input = ['---', 'title: x', '---', '', 'Texto'].join('\n');
		const shielded = shieldProtectedBlocks(input);

		expect(shielded.blocks[0].kind).toBe('frontMatter');
		expect(shielded.text).toContain(SENTINEL(0, 'META'));
	});

	it('protege citação', () => {
		const shielded = shieldProtectedBlocks('> citação aqui');
		expect(shielded.blocks[0].kind).toBe('blockquote');
	});

	it('não cria sentinela quando não há bloco frágil', () => {
		const shielded = shieldProtectedBlocks('# Título\n\nParágrafo normal.');
		expect(shielded.blocks).toHaveLength(0);
		expect(shielded.text).not.toContain('BM-PROTECTED');
	});

	it('preserva CRLF', () => {
		const input = '# T\r\n```ts\r\nx\r\n```\r\n';
		expect(shieldProtectedBlocks(input).eol).toBe('\r\n');
	});
});

describe('restoreProtectedBlocks — recolocação', () => {
	it('devolve os blocos intactos', () => {
		const original = ['Antes', '', '```ts', 'const x = 1;', '```', '', 'Depois'].join('\n');
		const shielded = shieldProtectedBlocks(original);
		const restored = restoreProtectedBlocks(shielded, shielded.text);

		expect(restored.ok).toBe(true);
		expect(restored.text).toBe(original);
	});

	it('detecta sentinela APAGADO pelo modelo', () => {
		const original = ['Antes', '', '```ts', 'x', '```', '', 'Depois'].join('\n');
		const shielded = shieldProtectedBlocks(original);

		// modelo "comeu" o bloco de codigo.
		const sabotado = 'Antes\n\nDepois';
		const restored = restoreProtectedBlocks(shielded, sabotado);

		expect(restored.ok).toBe(false);
		expect(restored.missing).toEqual([0]);
	});

	it('detecta sentinela DUPLICADO pelo modelo', () => {
		const original = ['```ts', 'x', '```'].join('\n');
		const shielded = shieldProtectedBlocks(original);
		const sabotado = `${SENTINEL(0)}\n${SENTINEL(0)}`;
		const restored = restoreProtectedBlocks(shielded, sabotado);

		expect(restored.ok).toBe(false);
		expect(restored.duplicated).toEqual([0]);
	});

	it('detecta sentinela CORROMPIDO pelo modelo', () => {
		const original = ['```ts', 'x', '```'].join('\n');
		const shielded = shieldProtectedBlocks(original);
		// modelo "embelezou" o marcador: virou titulo.
		const sabotado = '## <!-- BM PROTECTED 0 -->';
		const restored = restoreProtectedBlocks(shielded, sabotado);

		expect(restored.ok).toBe(false);
		expect(restored.mangled).toBe(true);
	});

	it('detecta sentinela envolvido em crase', () => {
		const original = ['```ts', 'x', '```'].join('\n');
		const shielded = shieldProtectedBlocks(original);
		const restored = restoreProtectedBlocks(shielded, `\`${SENTINEL(0)}\``);
		expect(restored.ok).toBe(false);
	});

	it('aceita quando o modelo só reestrutura a prosa ao redor', () => {
		const original = ['titulo', '', '```ts', 'x', '```'].join('\n');
		const shielded = shieldProtectedBlocks(original);
		const reestruturado = `# titulo\n\n${SENTINEL(0)}`;
		const restored = restoreProtectedBlocks(shielded, reestruturado);

		expect(restored.ok).toBe(true);
		expect(restored.text).toBe(['# titulo', '', '```ts', 'x', '```'].join('\n'));
	});
});

describe('compareProtectedStructure — segunda barreira', () => {
	it('aprova quando os blocos são idênticos', () => {
		const before = '# T\n\n```ts\nconst x = 1;\n```\n';
		const after = '# Título\n\n```ts\nconst x = 1;\n```\n';
		expect(compareProtectedStructure(before, after).ok).toBe(true);
	});

	it('reprova quando o código foi alterado', () => {
		const before = '```ts\nconst x = 1;\n```\n';
		const after = '```ts\nconst x = 999;\n```\n';
		const result = compareProtectedStructure(before, after);

		expect(result.ok).toBe(false);
		expect(result.reason).toContain('modified');
	});

	it('reprova quando o bloco desapareceu', () => {
		const before = '# T\n\n```ts\nx\n```\n';
		const after = '# T\n';
		const result = compareProtectedStructure(before, after);

		expect(result.ok).toBe(false);
		expect(result.reason).toContain('count changed');
	});

	it('reprova quando a tabela perdeu os pipes', () => {
		const before = '| a | b |\n| --- | --- |\n| 1 | 2 |\n';
		const after = 'a\tb\n1\t2\n';
		expect(compareProtectedStructure(before, after).ok).toBe(false);
	});
});

describe('blindagem — cenário exato do bug em produção', () => {
	// esse e o texto que a IA destruiu antes da blindagem existir.
	const real = [
		'Código de exemplo',
		'',
		'```ts',
		'+ isso nao e lista',
		'timeout_ms: 1000',
		'```',
		'',
		'Tabela',
		'',
		'| Coluna | Valor |',
		'| --- | --- |',
		'| timeout_ms | 30000 |',
		'',
		'Fim',
	].join('\n');

	it('a IA não recebe o conteúdo do código nem da tabela', () => {
		const shielded = shieldProtectedBlocks(real);

		expect(shielded.text).not.toContain('isso nao e lista');
		expect(shielded.text).not.toContain('| Coluna |');
		expect(shielded.text).not.toContain('timeout_ms');
		expect(shielded.blocks).toHaveLength(2);
	});

	it('mesmo com resposta sabotada, a estrutura volta intacta ou é rejeitada', () => {
		const shielded = shieldProtectedBlocks(real);

		// modelo devolve lixo em volta, mas mantem os sentinelas.
		const resposta = `${SENTINEL(0)}\n\n${SENTINEL(1)}`;
		const restored = restoreProtectedBlocks(shielded, resposta);

		expect(restored.ok).toBe(true);
		expect(restored.text).toContain('+ isso nao e lista');
		expect(restored.text).toContain('| Coluna | Valor |');
		expect(compareProtectedStructure(real, restored.text).ok).toBe(true);
	});
});
