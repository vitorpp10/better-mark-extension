import { describe, expect, it } from 'vitest';
import { formatMarkdown } from '../formatter';

const L2 = { inlineCodeTerms: true, inlineCodeMentions: true };

describe('Nível 2A — rótulos de definição', () => {
	// so rotulo que "parece codigo" ganha crase. `Conceito:` era aceito
	// numa versao antiga e virou falso positivo em texto real (o `desc.md`
	// do proprio projeto tem "Baixar:" e "Executar:") — por isso hoje e
	// rejeitado, junto com as outras palavras de prosa.
	const cases: Array<[string, string, string]> = [
		['snake_case', 'timeout_ms:\n', '`timeout_ms`:\n'],
		['SCREAMING_CASE', 'MAX_RETRIES:\n', '`MAX_RETRIES`:\n'],
		['camelCase', 'parseConfig:\n', '`parseConfig`:\n'],
		['método + rota', 'GET /users:\n', '`GET /users`:\n'],
		['post com versão', 'POST /v1/items:\n', '`POST /v1/items`:\n'],
		['arquivo', 'index.ts:\n', '`index.ts`:\n'],
		['caminho', 'src/core:\n', '`src/core`:\n'],
		['comando com argumento', 'npm run build:\n', '`npm run build`:\n'],
	];

	it.each(cases)('%s', (_name, input, expected) => {
		expect(formatMarkdown(input, L2).text).toBe(expected);
	});

	it('formata o rótulo de um título existente', () => {
		expect(formatMarkdown('## timeout_ms:\n', L2).text).toBe('## `timeout_ms`:\n');
	});

	describe('rótulos de prosa recebem negrito', () => {
		// mudanca de comportamento: antes esses rotulos ficavam intactos.
		// agora viram negrito, que e o padrao visual de README e oq o motor
		// offline nao fazia. o valor depois dos dois-pontos nao e tocado.
		const proseLabels: Array<[string, string]> = [
			['Entrada: o texto selecionado', '**Entrada:** o texto selecionado'],
			['Resultado: markdown formatado', '**Resultado:** markdown formatado'],
			['Conceito: ideia geral', '**Conceito:** ideia geral'],
			['Ideia: aplicar semântica', '**Ideia:** aplicar semântica'],
			['Estrutura: pastas do projeto', '**Estrutura:** pastas do projeto'],
			['Stack: typescript, node', '**Stack:** typescript, node'],
			['Nota: nada a fazer', '**Nota:** nada a fazer'],
			['Atenção: revise antes de salvar', '**Atenção:** revise antes de salvar'],
		];

		it.each(proseLabels)('%j', (_input, expected) => {
			expect(formatMarkdown(_input, L2).text).toBe(expected);
		});

		it('rótulo de COMANDO continua virando crase, não negrito', () => {
			expect(formatMarkdown('Baixar: npm install\n', L2).text).toBe(
				'**Baixar:** `npm install`\n',
			);
		});
	});

	describe('frases com dois-pontos nao viram negrito', () => {
		const frases = [
			'O importante aqui: isto e uma frase comum.',
			'nota: isto comeca minusculo.',
			'Como isso funciona: depende do contexto.',
			'Por que usar: nao e rotulo.',
		];

		it.each(frases)('nao altera: %j', (input) => {
			expect(formatMarkdown(input, L2).text).toBe(input);
		});
	});
});

describe('Nivel 2A — oq NAO deve mudar', () => {
	const mustNotChange = [
		'Este é um parágrafo normal, com vírgulas, e que termina em ponto.',
		'https://exemplo.com: a url não deve ganhar crase.',
		'Já tem `crase`: não mexer.',
		'Veja o exemplo abaixo:\n',
		'# Título normal\n',
		'- `já em crase`\n',
	];

	it.each(mustNotChange)('nao altera: %j', (input) => {
		expect(formatMarkdown(input, L2).text).toBe(input);
	});

	it('sem a opção ligada, nada acontece', () => {
		expect(formatMarkdown('timeout_ms:\n').text).toBe('timeout_ms:\n');
	});

	it('não mexe em bloco de código', () => {
		const input = ['```yaml', 'timeout_ms: 30', '```', ''].join('\n');
		expect(formatMarkdown(input, L2).text).toBe(input);
	});
});

describe('Nível 2A — menções a código', () => {
	// nota: uma linha curta e isolada VIRA titulo (regra do nivel 1). pra
	// testar so a crase, a gente usa frase de paragrafo (longa o bastante
	// pra nao ser titulo) — que e exatamente o caso real de uso.
	it('coloca crase em nome de arquivo citado', () => {
		const input = 'Se der erro, edite o extension.ts e salve novamente o arquivo.\n';
		expect(formatMarkdown(input, L2).text).toBe(
			'Se der erro, edite o `extension.ts` e salve novamente o arquivo.\n',
		);
	});

	it('coloca crase em caminho', () => {
		const input = 'A lógica principal fica em src/core/formatter.ts e é pura.\n';
		expect(formatMarkdown(input, L2).text).toBe(
			'A lógica principal fica em `src/core/formatter.ts` e é pura.\n',
		);
	});

	it('coloca crase em comando citado', () => {
		const input = 'Antes de rodar o projeto você precisa executar npm install.\n';
		expect(formatMarkdown(input, L2).text).toBe(
			'Antes de rodar o projeto você precisa executar `npm install`.\n',
		);
	});

	it('menção dentro de linha curta isolada vira título com crase', () => {
		expect(formatMarkdown('rode npm install\n', L2).text).toBe('# rode `npm install`\n');
	});
});

describe('Nível 2A — idempotência', () => {
	it('crase não duplica', () => {
		const once = formatMarkdown('timeout_ms:\n', L2).text;
		const twice = formatMarkdown(once, L2).text;
		expect(twice).toBe(once);
		expect(twice).toBe('`timeout_ms`:\n');
	});
});

describe('Nível 2A — menções técnicas no meio da prosa', () => {
	// as frases abaixo sao longas de proposito: frase curta seria
	// promovida a titulo pela regra de titulos, e o teste mediria outra
	// coisa.
	it('marca caminhos de arquivo C/C++ (extensões que faltavam)', () => {
		expect(formatMarkdown('Você precisa editar o arquivo app/jogo.cpp com atenção.', L2).text).toBe(
			'Você precisa editar o arquivo `app/jogo.cpp` com atenção.',
		);
		expect(formatMarkdown('A declaração fica no arquivo app/menu.hpp do projeto.', L2).text).toBe(
			'A declaração fica no arquivo `app/menu.hpp` do projeto.',
		);
	});

	it('marca caminhos relativos', () => {
		expect(formatMarkdown('O binário usa caminhos relativos ../assets/ para carregar.', L2).text).toBe(
			'O binário usa caminhos relativos `../assets/` para carregar.',
		);
	});

	it('marca caminhos de diretório', () => {
		expect(formatMarkdown('A pasta assets/ contém os recursos usados pelo jogo.', L2).text).toBe(
			'A pasta `assets/` contém os recursos usados pelo jogo.',
		);
	});

	it('marca constantes e identificadores', () => {
		expect(formatMarkdown('A constante TAM_CELULA define o tamanho de cada célula.', L2).text).toBe(
			'A constante `TAM_CELULA` define o tamanho de cada célula.',
		);
		expect(formatMarkdown('Você deve alterar o timeout_ms para 30000 no código.', L2).text).toBe(
			'Você deve alterar o `timeout_ms` para 30000 no código.',
		);
	});

	it('marca chamadas de função', () => {
		expect(
			formatMarkdown('O tabuleiro é gerado por preencher_tabuleiro() em app/jogo.cpp.', L2).text,
		).toBe('O tabuleiro é gerado por `preencher_tabuleiro()` em `app/jogo.cpp`.');
	});

	it('marca comandos com sudo', () => {
		expect(
			formatMarkdown('Instale via gerenciador de pacotes (por exemplo, sudo apt install libsfml-dev).', L2)
				.text,
		).toBe(
			'Instale via gerenciador de pacotes (por exemplo, `sudo apt install` libsfml-dev).',
		);
	});

	it('marca extensão de arquivo sozinha', () => {
		expect(formatMarkdown('Compile todos os arquivos .cpp que estão na pasta indicada.', L2).text).toBe(
			'Compile todos os arquivos `.cpp` que estão na pasta indicada.',
		);
	});

	it('marca assets (fontes, sons, imagens)', () => {
		expect(
			formatMarkdown('A fonte principal está em assets/PressStart2P-Regular.ttf do projeto.', L2)
				.text,
		).toBe('A fonte principal está em `assets/PressStart2P-Regular.ttf` do projeto.');
	});

	it('NAO marca prosa comum', () => {
		const prosa = [
			'O projeto tem boas praticas e notas importantes.',
			'A saída do programa é rápida.',
			'Isso é Independente de tudo.',
			'A versao 1.0 e boa. Custa 2.5 reais.',
		];
		for (const linha of prosa) {
			expect(formatMarkdown(linha, L2).text).toBe(linha);
		}
	});
});

describe('Nível 2A — rótulos dentro de itens de lista', () => {
	it('aplica negrito em item de lista', () => {
		expect(formatMarkdown('- Sistema operacional: Linux.\n', L2).text).toBe(
			'- **Sistema operacional:** Linux.\n',
		);
	});

	it('aplica negrito em item numerado', () => {
		expect(formatMarkdown('1. Projeto: Sudoku.\n', L2).text).toBe('1. **Projeto:** Sudoku.\n');
	});

	it('aplica negrito em item aninhado', () => {
		expect(formatMarkdown('    - Execução: rode o binário.\n', L2).text).toBe(
			'    - **Execução:** rode o binário.\n',
		);
	});
});

describe('Nível 2A — títulos não recebem negrito', () => {
	// bug corrigido na v0.5.0: "# Feature 1: Criar botao" virava
	// "# **Feature 1:** Criar botao". titulo ja e destaque; negrito
	// dentro dele e redundante.
	const titulos = [
		'# Feature 1: Criar e visualizar botão',
		'## Instalação: primeiros passos',
		'# Ideia:',
		'### Stack: ferramentas',
	];

	it.each(titulos)('nao altera: %j', (input) => {
		expect(formatMarkdown(`${input}\n`, L2).text).toBe(`${input}\n`);
	});

	it('mas código inline continua valendo dentro do título', () => {
		expect(formatMarkdown('## Como usar `npm install`\n', L2).text).toBe(
			'## Como usar `npm install`\n',
		);
	});
});

describe('Nível 1 — diagrama indentado não vira lista', () => {
	// o recuo de 4 espacos num diagrama de arvore e INTENCIONAL. converter
	// em lista destroi o alinhamento das colunas, que e o ponto do diagrama.
	it('preserva diagrama alinhado por espaços', () => {
		const input = [
			'A separação atual:',
			'',
			'    src/core/    motor puro',
			'    src/ai/      provedores',
			'    src/vscode/  cola com o editor',
		].join('\n');
		expect(formatMarkdown(input).text).toBe(input);
	});

	it('mas converte texto de PDF sem alinhamento interno', () => {
		const input = [
			'Requisitos',
			'',
			'    Sistema operacional: Linux (testado).',
			'    Dependencias: SFML (graphics, window).',
		].join('\n');
		const result = formatMarkdown(input).text;
		expect(result).toContain('- Sistema operacional: Linux (testado).');
		expect(result).not.toContain('    Sistema operacional');
	});
});
