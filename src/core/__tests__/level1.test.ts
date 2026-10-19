import { describe, expect, it } from 'vitest';
import { formatMarkdown } from '../formatter';

describe('Nível 1 — títulos', () => {
	const cases: Array<[string, string, string]> = [
		['linha curta isolada', 'Health check\n', '# Health check\n'],
		['linha curta no fim do texto', 'Health check', '# Health check'],
		['título com palavra composta', 'Database health check\n', '# Database health check\n'],
		['linha já é título', '# Health check\n', '# Health check\n'],
		['título nível 2 existente', '## Health check\n', '## Health check\n'],
	];

	it.each(cases)('%s', (_name, input, expected) => {
		expect(formatMarkdown(input).text).toBe(expected);
	});

	it('infere o nível a partir do documento', () => {
		expect(formatMarkdown('## Seção\n\nHealth check\n').text).toBe('## Seção\n\n## Health check\n');
	});

	it('respeita headingLevel explícito', () => {
		expect(formatMarkdown('Health check\n', { headingLevel: 3 }).text).toBe('### Health check\n');
	});

	describe('o que NÃO deve mudar', () => {
		const mustNotChange = [
			'Este é um parâmetro normal e comprido que explica porque o serviço falhou.',
			'A documentação do projeto precisa ser revisada antes do próximo release e isso é apenas uma frase.',
			'Health check failed because the database is unavailable',
			'Primeira linha do parágrafo\nsegunda linha do mesmo parágrafo',
			'# já é título\n',
			'- item de lista curto\n',
			'',
			'   ',
		];

		it.each(mustNotChange)('não altera: %j', (input) => {
			expect(formatMarkdown(input).text).toBe(input);
		});

		it('continuação de parágrafo (sem linha em branco) não vira título', () => {
			// Caso real de "quebra de linha acidental": a segunda linha
			// pertence ao MESMO parágrafo, então nada deve mudar.
			const input = 'Processo\nSim, e eu começaria bem menor do que a descrição.';
			expect(formatMarkdown(input).text).toBe(input);
		});

		it('linha curta isolada DEPOIS de linha em branco vira título', () => {
			// Comportamento intencional: `Processo` sozinho, cercado por
			// linhas em branco, é um cabeçalho de seção.
			const input = 'Processo\n\nSim. E eu começaria bem menor do que a descrição inteira.';
			const expected = '# Processo\n\nSim. E eu começaria bem menor do que a descrição inteira.';
			expect(formatMarkdown(input).text).toBe(expected);
		});
	});
});

describe('Nível 1 — listas', () => {
	const cases: Array<[string, string, string]> = [
		['asterisco vira hífen', '* primeiro', '- primeiro'],
		['mais vira hífen', '+ segundo', '- segundo'],
		['parêntese vira ponto', '1) primeiro', '1. primeiro'],
		['hífen numerado vira ponto', '1- primeiro', '1. primeiro'],
		['lista canônica não muda', '- primeiro', '- primeiro'],
		['numerada canônica não muda', '1. primeiro', '1. primeiro'],
		['preserva indentação', '  * aninhado', '  - aninhado'],
		['preserva tabulação', '\t* aninhado', '\t- aninhado'],
		['normaliza espaçamento duplo', '-   item', '- item'],
	];

	it.each(cases)('%s', (_name, input, expected) => {
		expect(formatMarkdown(input).text).toBe(expected);
	});

	it('transforma bloco de lista misto', () => {
		const input = ['- primeiro', '* segundo', '+ terceiro', '1) quarto', '2- quinto'].join('\n');
		const expected = ['- primeiro', '- segundo', '- terceiro', '1. quarto', '2. quinto'].join('\n');
		expect(formatMarkdown(input).text).toBe(expected);
	});
});

describe('Nível 1 — proteção de blocos', () => {
	it('não toca em blocos de código', () => {
		const input = ['```ts', 'const x = 1;', '+ nao sou lista', '```', ''].join('\n');
		expect(formatMarkdown(input).text).toBe(input);
	});

	it('não toca em tabelas', () => {
		const input = ['| a | b |', '| --- | --- |', '| 1 | 2 |', ''].join('\n');
		expect(formatMarkdown(input).text).toBe(input);
	});

	it('não toca em front matter', () => {
		const input = ['---', 'title: projeto', 'tags: [a, b]', '---', ''].join('\n');
		expect(formatMarkdown(input).text).toBe(input);
	});

	it('não toca em citações', () => {
		const input = '> Health check\n';
		expect(formatMarkdown(input).text).toBe(input);
	});

	it('formata fora do bloco mas preserva dentro', () => {
		const input = ['```ts', '+ nao sou lista', '```', '* sou lista'].join('\n');
		const expected = ['```ts', '+ nao sou lista', '```', '- sou lista'].join('\n');
		expect(formatMarkdown(input).text).toBe(expected);
	});
});

describe('Nível 1 — idempotência e finais de linha', () => {
	it('rodar duas vezes dá o mesmo resultado', () => {
		const input = ['Health check', '', '* a', '+ b', '1) c'].join('\n');
		const once = formatMarkdown(input).text;
		const twice = formatMarkdown(once).text;
		expect(twice).toBe(once);
	});

	it('preserva CRLF', () => {
		const input = '* a\r\n+ b\r\n';
		expect(formatMarkdown(input).text).toBe('- a\r\n- b\r\n');
	});

	it('texto vazio continua vazio', () => {
		expect(formatMarkdown('').text).toBe('');
	});

	it('relata quais regras aplicaram', () => {
		const result = formatMarkdown('* a');
		expect(result.appliedRules).toContain('lists');
		expect(result.changedLines).toBe(1);
	});
});

describe('Nível 1 — marcadores de lista alternativos', () => {
	// Encontrado em teste real: `3] item` e `4} item` não eram reconhecidos
	// como lista e acabavam virando título.
	const cases: Array<[string, string, string]> = [
		['parêntese', '5) item', '5. item'],
		['colchete', '3] item', '3. item'],
		['chave', '4} item', '4. item'],
		['hífen', '2- item', '2. item'],
		['ponto', '7. item', '7. item'],
	];

	it.each(cases)('%s', (_name, input, expected) => {
		expect(formatMarkdown(input).text).toBe(expected);
	});
});

describe('Nível 1 — proporção e horário não são título', () => {
	it.each(['16:9 proporcao', '3:2 tela', '10:30 reuniao'])('não altera: %j', (input) => {
		expect(formatMarkdown(input).text).toBe(input);
	});
});

describe('Nível 1 — prosa com formatação inline nunca vira título', () => {
	// BUG CORRIGIDO na v0.3.0: `stripInlineFormatting` era aplicado antes da
	// decisão, então "Vamos usar o **negrito** aqui" virava
	// "# Vamos usar o negrito aqui".
	const mustNotChange = [
		'Vamos usar o **negrito** aqui',
		'O arquivo tem `crase` e _italico_ tambem',
		'Isso foi ~~removido~~ do projeto',
		'Use __isso__ com cuidado',
		'Texto com *enfase* no meio',
	];

	it.each(mustNotChange)('não altera: %j', (input) => {
		expect(formatMarkdown(input).text).toBe(input);
	});

	it('item de lista com asterisco continua sendo lista, não itálico', () => {
		expect(formatMarkdown('* item comprado').text).toBe('- item comprado');
	});
});

describe('Nível 1 — texto colado de PDF/site (recuo de 4 espaços)', () => {
	// Caso real: texto copiado de um PDF vem com recuo uniforme de 4 espaços,
	// que em Markdown significa "bloco de código". A regra de recuo devolve
	// isso como lista, respeitando a hierarquia.
	it('converte bloco indentado em lista', () => {
		const input = [
			'Pre-requisitos',
			'',
			'    Sistema operacional: Linux.',
			'    Dependencias: SFML.',
			'    Fonts: a pasta assets/.',
		].join('\n');
		const expected = [
			'# Pre-requisitos',
			'',
			'- Sistema operacional: Linux.',
			'- Dependencias: SFML.',
			'- Fonts: a pasta assets/.',
		].join('\n');
		expect(formatMarkdown(input).text).toBe(expected);
	});

	it('preserva a hierarquia de sub-itens (8 espaços)', () => {
		const input = [
			'Como compilar',
			'',
			'    Compilacao: ajustar conforme seu Makefile.',
			'        Instale SFML.',
			'        Compile os arquivos.',
		].join('\n');
		const expected = [
			'# Como compilar',
			'',
			'- Compilacao: ajustar conforme seu Makefile.',
			'    - Instale SFML.',
			'    - Compile os arquivos.',
		].join('\n');
		expect(formatMarkdown(input).text).toBe(expected);
	});

	it('NÃO toca em código dentro de bloco fence', () => {
		const input = '```python\n    def x():\n        return 1\n    def y():\n        return 2\n```';
		expect(formatMarkdown(input).text).toBe(input);
	});

	it('NÃO toca em recuo de 2 ou 3 espaços (pode ser intencional)', () => {
		const input = '  um\n  dois\n  tres';
		expect(formatMarkdown(input).text).toBe(input);
	});

	it('NÃO converte linha indentada isolada em lista', () => {
		// A linha não vira item de lista (não há bloco), mas "texto" sozinho
		// é legitimamente um título — o que importa é o recuo sobreviver.
		const input = 'texto\n\n    so uma linha aqui\n\ntexto';
		const result = formatMarkdown(input).text;
		expect(result).toContain('    so uma linha aqui');
		expect(result).not.toContain('- so uma linha aqui');
	});

	it('linha indentada nunca vira título', () => {
		// BUG CORRIGIDO: a regra de títulos fazia `trim()` antes de decidir,
		// então "    so uma linha aqui" virava "# so uma linha aqui".
		const result = formatMarkdown('texto\n\n    so uma linha aqui\n\ntexto').text;
		expect(result).not.toContain('# so uma linha aqui');
		expect(result).toContain('    so uma linha aqui');
	});
});
