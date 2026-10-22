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
			// caso real de quebra de linha acidental: a segunda linha
			// pertence ao MESMO paragrafo, entao nada muda.
			const input = 'Processo\nSim, e eu começaria bem menor do que a descrição.';
			expect(formatMarkdown(input).text).toBe(input);
		});

		it('linha curta isolada DEPOIS de linha em branco vira título', () => {
			// comportamento intencional: `Processo` sozinho, cercado por
			// linha em branco, e cabecalho de secao.
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
	// achado em teste real: `3] item` e `4} item` nao eram reconhecidos
	// como lista e viravam titulo.
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
	// bug corrigido na v0.3.0: `stripInlineFormatting` rodava antes da
	// decisao, entao "Vamos usar o **negrito** aqui" virava
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
	// caso real: texto copiado de PDF vem com recuo uniforme de 4 espacos,
	// que em Markdown significa bloco de codigo. a regra de recuo devolve
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
		// a linha nao vira item de lista (nao tem bloco), mas "texto" sozinho
		// e legitimamente um titulo — oq importa e o recuo sobreviver.
		const input = 'texto\n\n    so uma linha aqui\n\ntexto';
		const result = formatMarkdown(input).text;
		expect(result).toContain('    so uma linha aqui');
		expect(result).not.toContain('- so uma linha aqui');
	});

	it('linha indentada nunca vira título', () => {
		// bug corrigido: a regra de titulos fazia `trim()` antes de decidir,
		// entao "    so uma linha aqui" virava "# so uma linha aqui".
		const result = formatMarkdown('texto\n\n    so uma linha aqui\n\ntexto').text;
		expect(result).not.toContain('# so uma linha aqui');
		expect(result).toContain('    so uma linha aqui');
	});
});

// bugs achados na bateria de 22/10 (12 textos de tipos diferentes).
// os 4 primeiros vinham da mesma causa: EXISTING_HEADING_RE exigia espaco
// depois do "#", entao o markdown colado caia no caminho de "linha que
// parece titulo" e saia com o jogo da velha dobrado.
describe('Nível 1 — bugs da bateria de 22/10', () => {
	const fmt = (texto: string) => formatMarkdown(texto).text;

	it('hash colado ganha espaço em vez de dobrar', () => {
		expect(fmt('#titulo sem espaco\n')).toBe('# titulo sem espaco\n');
	});

	it('hash colado em vários níveis mantém o nível', () => {
		expect(fmt('##Segunda secao\n')).toBe('## Segunda secao\n');
		expect(fmt('###Terceira\n')).toBe('### Terceira\n');
	});

	it('comando de terminal não vira título', () => {
		expect(fmt('npm install express cors dotenv\n')).toBe('npm install express cors dotenv\n');
		expect(fmt('node server.js\n')).toBe('node server.js\n');
		expect(fmt('sudo apt install libsfml-dev\n')).toBe('sudo apt install libsfml-dev\n');
		expect(fmt('git commit -m "fix"\n')).toBe('git commit -m "fix"\n');
	});

	it('menção com @ não vira título', () => {
		expect(fmt('Agradecimentos especiais ao @barreto e ao time\n')).toBe(
			'Agradecimentos especiais ao @barreto e ao time\n',
		);
	});

	it('título de verdade com verbo comum continua virando título', () => {
		// "Como usar" e "Instalação" não são comandos
		expect(fmt('Como usar\n')).toBe('# Como usar\n');
		expect(fmt('Instalacao\n')).toBe('# Instalacao\n');
	});

	it('título com 3 níveis não perde os "#" extras', () => {
		expect(fmt('### Stack: ferramentas\n')).toBe('### Stack: ferramentas\n');
	});
});

// bateria 2 (22/10): casos de borda. O que importa aqui e que o motor NAO
// estrague o que ja esta certo — tabela, codigo cercado, front matter,
// citacao e HTML tem que sair intactos.
describe('Nível 1 — bateria 2: proteção do que já está certo', () => {
	const fmt = (texto: string) => formatMarkdown(texto).text;

	it('tabela formatada fica intacta', () => {
		const t = '# Relatorio\n\n| Nome | Valor |\n| --- | --- |\n| A | 1 |\n\nFim.\n';
		expect(fmt(t)).toBe(t);
	});

	it('bloco de código cercado fica intacto', () => {
		const t = '# Exemplo\n\n```python\ndef soma(a, b):\n    return a + b\n```\n\nFim.\n';
		expect(fmt(t)).toBe(t);
	});

	it('front matter fica intacto', () => {
		const t = '---\ntitle: Meu Post\ndate: 2026-10-22\n---\n\n# Conteudo\n\nTexto.\n';
		expect(fmt(t)).toBe(t);
	});

	it('citação fica intacta', () => {
		const t = '# Analise\n\n> A simplicidade e o ultimo grau.\n\nConcordo.\n';
		expect(fmt(t)).toBe(t);
	});

	it('HTML fica intacto', () => {
		const t = '# Pagina\n\n<div class="aviso">\n  <p>Cuidado!</p>\n</div>\n\nTexto.\n';
		expect(fmt(t)).toBe(t);
	});

	it('lista aninhada fica intacta', () => {
		const t = '# Estrutura\n\n- Frontend\n  - React\n  - Vue\n- Backend\n  - Node\n';
		expect(fmt(t)).toBe(t);
	});

	it('markdown já perfeito não muda nada', () => {
		const t = '# Titulo\n\nParagrafo.\n\n## Secao\n\n- um\n- dois\n\n`codigo` e **negrito**.\n';
		expect(fmt(t)).toBe(t);
	});

	it('sigla sozinha não vira título', () => {
		// `MIT` sozinho virava `# MIT`
		expect(fmt('MIT\n')).toBe('MIT\n');
		expect(fmt('TODO\n')).toBe('TODO\n');
	});

	it('título de verdade com uma palavra continua virando título', () => {
		expect(fmt('Instalacao\n')).toBe('# Instalacao\n');
		expect(fmt('Como usar\n')).toBe('# Como usar\n');
	});
});
