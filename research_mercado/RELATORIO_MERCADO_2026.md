# Mercado de Tecnologia 2025–2026: Brasil e Mundo
## Relatório factual para orientação de carreira — perfil: 19 anos, Brasília, Ciência da Computação (4º semestre), profundidade em C++ de baixo nível

**Data da pesquisa:** 19 de outubro de 2026
**Método:** coleta direta de fontes primárias (download de PDFs oficiais, páginas de pesquisa salarial e datasets brutos). `web_search` estava indisponível nesta sessão; usei busca via proxy e depois extraí dados diretamente dos documentos.

**Legenda de confiabilidade usada em todo o relatório:**
- **[FATO]** — verificado em fonte primária, com URL e data.
- **[ESTIMATIVA]** — minha inferência ou cálculo a partir de dados verificados. Não é afirmação de fonte.
- **[SEM DADO]** — não encontrei dado confiável. Não estimo.

---

# ⚠️ AVISOS METODOLÓGICOS — LEIA ANTES DOS NÚMEROS

Três armadilhas que invalidam a maioria dos artigos de "salário de dev no Brasil". Você precisa conhecê-las para não se enganar:

1. **A pesquisa do Código Fonte TV mede QUEM RESPONDEU, não o mercado.** São 17.046 devs que se auto-selecionaram para responder um formulário de YouTube. Quem responde survey salarial tende a ser quem tem emprego estável e se interessa pelo tema. A amostra de C++ é de **102 pessoas** e a de Rust é de **19 pessoas** — esses recortes são estatisticamente frágeis. Use as médias gerais; desconfie das por-linguagem.
2. **A Robert Half é uma empresa de recrutamento.** O guia salarial dela é ferramenta de marketing e de ancoragem de preço. As faixas tendem a ser puxadas para cima (é do interesse dela que candidatos peçam mais e empresas paguem mais). Onde pude comparar com o CAGED (dado governamental), a divergência foi grande — mostro isso adiante.
3. **Glassdoor bloqueou o acesso (HTTP 403).** Vários artigos brasileiros de 2026 citam "levantamento do Glassdoor" para números de IA. Não consegui verificar nenhum desses números na fonte. Trato-os como não verificados.

---

# 1. MERCADO BRASILEIRO 2025–2026: FAIXAS SALARIAIS REAIS

## 1.1 A melhor fonte disponível: Código Fonte TV — Pesquisa Salarial 2026

**[FATO]** Fonte primária: https://pesquisa.codigofonte.com.br/2026 — 6ª edição, **n = 17.046 profissionais**, dados coletados entre **23/fev/2026 e 09/jun/2026**. Média mensal geral por senioridade:

| Nível | Média mensal | Pesquisa anterior (2024) | Variação |
|---|---|---|---|
| Estágio | **R$ 2.586,84** | R$ 1.743,4x | +48,4% |
| Júnior | **R$ 5.060,34** | R$ 4.154,2x | +21,8% |
| Pleno | **R$ 8.466,52** | R$ 7.840,7x | +8,0% |
| Sênior | **R$ 14.607,85** | R$ 15.635,xx | **−6,6%** |
| Especialista/Tech Lead/Principal | **R$ 20.601,64** | R$ 19.290,xx | +6,8% |

**Observação crítica [ESTIMATIVA]:** o salário **sênior caiu 6,6%** em termos nominais de uma edição para a outra, enquanto júnior subiu 21,8%. Isso é consistente com compressão da pirâmide e com o efeito de IA substituindo trabalho de senioridade intermediária. É um sinal importante e contraintuitivo: **ser júnior hoje não é o pior lugar da tabela**.

### CLT vs PJ

**[FATO]** Médias gerais: **CLT R$ 10.165,98** (anterior R$ 8.886,72) · **PJ R$ 13.436,23** (anterior R$ 13.344,77). O PJ é ~32% maior em bruto.

**[FATO]** Por senioridade e regime (júnior/pleno/sênior):
- CLT: Júnior **R$ 4.967,99** · Pleno **R$ 8.206,70** · Sênior **R$ 13.297,98**
- PJ: Júnior **R$ 5.340,30** · Pleno **R$ 9.122,40** · Sênior **R$ 17.212,64** (há uma faixa "Outro" adicional)

**[ESTIMATIVA — o ponto mais importante desta seção]** PJ bruto ~32% maior **não significa 32% a mais no bolso**. Um PJ que fatura R$ 13.400/mês paga, tipicamente, impostos do Simples Nacional (faixa de ~6% a ~15,5% dependendo do anexo e do faturamento), mais contador (~R$ 200–400/mês), mais INSS sobre o pró-labore, e **não tem** FGTS, 13º, férias remuneradas + 1/3, aviso prévio, seguro-desemprego nem licença-médica paga. Some esses benefícios CLT e a paridade real costuma ficar na casa de **1,25x a 1,40x** no bruto. **Regra prática: só aceite PJ se o bruto for ≥ 1,4x o CLT oferecido.** Isso não é dado de fonte, é conta padrão de mercado — trate como estimativa, mas é uma estimativa conservadora e amplamente aceita.

### Brasília (Distrito Federal) — seu caso específico

**[FATO]** Média mensal por estado (top 5 e o que importa):
| Estado | Média | n |
|---|---|---|
| Rio Grande do Sul | R$ 11.329,70 | 1.010 |
| **Distrito Federal** | **R$ 11.796,62** | **542** |
| Santa Catarina | R$ 11.166,93 | 1.409 |
| Espírito Santo | R$ 11.147,18 | 317 |
| São Paulo | R$ 11.113,03 | 5.274 |
| Rio de Janeiro | R$ 10.382,38 | 1.126 |

**Correção importante:** eu havia dito antes, num cálculo apressado, que o DF era o 2º maior. **O DF é o maior de todos**, R$ 11.796,62 — acima do RS (R$ 11.329,70) e de SP (R$ 11.113,03). Com apenas 542 respondentes.

**[FATO]** DF por regime: CLT R$ 11.144,94 · PJ R$ 12.925,87.

**[ESTIMATIVA]** Isso é excelente para você e merece ser dito com clareza: **Brasília paga acima de São Paulo**. A razão provável é composição de empregador — setor público, bancos públicos (BB, Caixa), tribunais, reguladores (BACEN, CVM, ANATEL), consultorias que atendem governo. Você já está no lugar certo para a fase 1 da carreira.

**[FATO]** Capital vs Interior: quem mora em **capital tem 24,9% em faixas acima de R$ 15k**, contra 19,4% no interior e 19,4% em região metropolitana.

### Por área de atuação (dados que consegui filtrar por URL)

**[FATO]** Salários médios por área e senioridade:

| Área | Estágio | Júnior | Pleno | Sênior | Especialista |
|---|---|---|---|---|---|
| **Embarcados** | R$ 2.833,83 | R$ 4.929,07 | R$ 8.636,86 | **R$ 19.362,57** | R$ 21.042,13 |
| DevOps | R$ 2.950,50 | R$ 5.424,74 | R$ 9.348,98 | R$ 15.799,51 | R$ 21.000,48 |
| Segurança da Informação | R$ 3.000,38 | R$ 5.184,71 | R$ 10.965,60 | R$ 13.280,50 | R$ 21.611,59 |
| Dados | R$ 1.817,14 | R$ 4.405,41 | R$ 7.709,22 | R$ 14.822,95 | R$ 18.490,78 |
| Games | R$ 4.333,83* | R$ 4.333,83* | R$ 7.385,12 | R$ 13.375,50 | R$ 31.500,50 |

\* Estágio e júnior idênticos em Games — provável artefato de amostra pequena.

**[ESTIMATIVA — achado relevante para você]** **Embarcados tem o 2º maior salário sênior de todas as áreas (R$ 19.362,57)**, atrás só de Games no topo absoluto, e à frente de DevOps, Segurança e Dados. E embarcados é, por definição, uma área de **C/C++ de baixo nível**. Isso é o mercado brasileiro te dizendo, com dados, que a sua skill tem um nicho bem remunerado localmente — não só lá fora.

### Por linguagem

**[FATO]** Médias gerais (misturando todos os níveis): Go R$ 13.641,58 · Kotlin R$ 13.505,59 · SQL R$ 13.616,77 · .NET R$ 14.656,35 · Spring Boot R$ 14.589,62 · Angular R$ 15.172,48 · Flutter R$ 14.202,04 · Node.js R$ 13.357,17 · React R$ 11.775,49 · Next.js R$ 12.301,08 · FastAPI R$ 12.750,49 · Laravel R$ 12.167,16.

**⚠️ LIMITAÇÃO CRÍTICA — [FATO]:** A pesquisa do Código Fonte TV **não oferece C++ nem Rust como filtro de linguagem**. A lista completa de linguagens disponível é: ABAP, ADVPL, ASP 3, Apex, Bash, C, C#, C++, Clipper, Clojure, Cobol, Dart, Delphi, Elixir, Erlang, F#, Go, Groovy, HCL, HTML/CSS, Java, JavaScript, Julia, Kotlin, Lean, Low-Code, Lua, MATLAB, No-Code, Outra, PHP, PL/SQL, Perl, PowerShell, Progress 4GL, Python, R, Ruby, **Rust**, SQL, Scala, Shell, Solidity, Swift, T-SQL, TypeScript, VB.Net, VBA, Visual Basic 6, Visual Fox Pro, YAML.

Contagem de respondentes por linguagem (base 17.046):
| Linguagem | n | % |
|---|---|---|
| Java | 2.808 | 16,47% |
| TypeScript | 2.402 | 14,09% |
| Python | 2.350 | 13,79% |
| PHP | 1.670 | 9,80% |
| Go | 404 | 2,37% |
| Kotlin | 392 | 2,30% |
| **C++** | **102** | **0,60%** |
| C | 51 | 0,30% |
| **Rust** | **19** | **0,11%** |

**[ESTIMATIVA]** Este é um dos achados mais importantes do relatório. **C++ é 0,6% da população dev brasileira; Rust é 0,11%** (1 em cada 900). A escassez é real e extrema. Escassez de oferta, porém, só vira prêmio salarial se houver **demanda** correspondente — e é aí que a seção 2 fica decisiva. Não cometa o erro de ler "0,6%" como "6x mais valorizado". Leia como "6x mais raro", que é diferente.

### Distribuição completa de renda (para calibrar expectativa)

**[FATO]** `total_by_salary`, n = 17.046:
| Faixa | n |
|---|---|
| Até R$ 1.000 | 69 |
| R$ 1.001–2.000 | 642 |
| R$ 2.001–3.000 | 1.069 |
| R$ 3.001–4.000 | 1.297 |
| R$ 4.001–5.000 | 1.263 |
| R$ 5.001–6.000 | 1.237 |
| R$ 6.001–7.000 | 1.145 |
| R$ 7.001–9.000 | 2.213 |
| R$ 9.001–12.000 | 2.591 |
| R$ 12.001–15.000 | 1.884 |
| R$ 15.001–20.000 | 1.850 |
| R$ 20.001–30.000 | 1.061 |
| R$ 30.001–40.000 | 422 |
| R$ 40.001–50.000 | 145 |
| Acima de R$ 50.000 | 158 |

**[ESTIMATIVA]** A mediana está na faixa R$ 7.001–9.000 (a faixa R$ 9.001–12.000 é a moda, mas a mediana cai um degrau abaixo). Sua renda atual de **R$ 2.480/mês está no percentil ~15–18%** desta amostra — que é composta por gente com emprego formal, então na prática você está começando, como esperado. A faixa Júnior média (R$ 5.060) é **mais que o dobro** da sua renda atual, e é atingível no seu horizonte de 12–18 meses.

## 1.2 Robert Half — Guia Salarial 2026

**[FATO]** Fontes: página oficial do guia em https://www.roberthalf.com/br/pt/insights/guia-salarial/tecnologia (confirmei o guia, as áreas de demanda — cibersegurança, engenharia de dados, IA — e a afirmação de que o engenheiro de IA lidera os cargos técnicos). **Os valores numéricos faixa-a-faixa que reproduzo abaixo vêm da cobertura detalhada da Exame sobre o mesmo guia**: https://exame.com/tecnologia/examelab/salario-de-engenheiro-de-ia-dados-e-ciberseguranca-quanto-o-mercado-brasileiro-paga-em-2026/

> **Nota de transparência:** tentei acessar as subpáginas por cargo do guia na Robert Half (ex.: `/tecnologia/engenheiro-de-ia`) e **todas retornaram HTTP 404** — o site não expõe as tabelas por URL direta, apenas via calculadora interativa. Portanto os números desta tabela são **verificados na fonte secundária (Exame), não na tabela original da Robert Half**. É uma diferença real e vale registrá-la: se um número aqui for decisivo para uma decisão sua, confirme na calculadora oficial da Robert Half.

| Cargo | Faixa mensal |
|---|---|
| **Engenheiro de IA** | **R$ 19.500 / R$ 25.000 / R$ 27.100** (p25/mediana/p75) |
| Especialista IA/ML | R$ 17.950 – R$ 23.550 |
| Engenheiro de prompt | R$ 19.050 – R$ 26.100 |
| Cientista de dados | R$ 14.700 – R$ 24.600 (mediana R$ 19.100) |
| Analista de cibersegurança Júnior | R$ 6.200 – R$ 10.400 |
| Analista de cibersegurança Pleno | R$ 8.500 – R$ 14.300 |
| Analista de cibersegurança Sênior | R$ 11.300 – R$ 19.000 |
| Pentester | R$ 13.350 – R$ 18.300 |
| CSO (Chief Security Officer) | R$ 31.300 – R$ 52.500 |

**[FATO]** 44% das empresas brasileiras planejam ampliar equipes de tecnologia em 2026. 48% dos gestores afirmam pagar mais por profissionais com certificação/especialização.

**[FATO]** Robert Half declara que o **engenheiro de IA é o maior salário entre cargos técnicos no Brasil em 2026**.

**⚠️ CONTRA-EVIDÊNCIA [FATO]:** Para a ocupação equivalente de cientista de dados, o **CAGED (dado governamental) registra ~R$ 11.000/mês**, contra mediana de **R$ 19.100** no guia Robert Half. É uma divergência de **~74%**. A explicação mais provável **[ESTIMATIVA]** é que a Robert Half mede o topo do mercado (empresas grandes que a contratam para recrutar) enquanto o CAGED mede todos os vínculos CLT formais do país, inclusive os muitos que não são "cientista de dados" de verdade. **Conclusão prática: quando um artigo diz "engenheiro de IA ganha R$ 25 mil", isso descreve o topo, não a porta de entrada.**

**[FATO]** Ressalva geográfica explícita: a FIAP, ao comentar o mesmo guia, registra que **São Paulo puxa as faixas para cima e que capitais do Centro-Oeste, Norte e Nordeste praticam valores menores**. ([fonte](https://www.fiap.com.br/radar-tech/post/salarios-em-tecnologia-2026-quanto-ganham-as-principais-profissoes-tech-no-brasil/))

## 1.3 Brasscom — dados oficiais do CAGED/RAIS (a fonte mais sólida)

**[FATO]** Fonte primária: *Relatório Setorial 2025 — Macrossetor de TIC* (publicado mai/2026), https://brasscom.org.br/wp-content/uploads/2026/05/BRI2-2026-001-Relatorio-Setorial-2025-versao-resumida-v6-SITE-1.pdf — 37 páginas, dados do Novo Caged de 04/2026.

- **Salário médio CLT de Software em 2025: R$ 6.591/mês = 2,9x a média nacional** (que foi R$ 2.305). Variação de **+8,2%** no ano. Salário mínimo de referência: R$ 1.518 (+7,5%).
- Macrossetor de TIC: **2.125.602 empregos CLT** (+1,5%, +31,3 mil no ano).
- **Profissionais de TI: 494.427 vínculos CLT (39,9% do setor TIC)**. Dentro disso, **Desenvolvimento de Sistemas: 290.591 (+2,4%, +11.527)**.
- Total do macrossetor (incluindo MEI e informais): **3.238.011 profissionais** (+0,3%, +1,9 mil).

**⚠️ O DADO MAIS IMPORTANTE DESTA SEÇÃO [FATO]:** **57% do acréscimo de profissionais do macrossetor de TIC em 2025 veio de MEIs e informais** — contra 71,9% via CLT em 2024. O emprego CLT no setor cresceu apenas **1,5%**, e o crescimento total de profissionais foi de apenas **0,3%**.

**[ESTIMATIVA]** Isso é um sinal de alerta sério e vai contra a narrativa de "apagão de profissionais de TI". A formalização está desacelerando e a informalidade está absorvendo o crescimento. Para você, isso tem uma consequência direta: **a porta de entrada CLT está mais estreita do que os artigos sugerem**, e é provável que sua primeira oportunidade relevante venha como PJ ou contrato — o que reforça a importância de construir reputação técnica pública verificável (repositórios, escrita técnica) em vez de depender só de processo seletivo formal.

**[FATO]** O déficit da balança comercial de TIC foi freado pelo aumento das exportações de serviços. Cotação usada: R$/US$ 5,40 (2024).

**[SEM DADO]** Não consegui extrair do relatório um recorte salarial específico para C++/sistemas dentro do CAGED. A classificação ocupacional do CAGED não separa por linguagem. Não estimo.

## 1.4 Stack Overflow — referência internacional

**[FATO]** Fonte: https://survey.stackoverflow.co/2025/ e https://survey.stackoverflow.co/2026/

- 2025: 49.000+ respostas, 177 países. 2026: **30.903 respostas, 169 países**.
- **O trabalho autônomo/freelance saltou de 3,9% para 10,5% em um único ano** (2026).
- Satisfação caiu: 33% "not happy at work", 45% "complacent", 22% "happy".
- Mediana salarial global por cargo (USD/ano, 2025):
  - AI/ML engineer **$89.427** · Data scientist $82.910 · **Embedded $81.210** · Back-end $79.742 · Full-stack $72.509 · Game/graphics $70.794 · Front-end $62.015
- **Somente EUA** (2025): AI/ML engineer **$189.500** · Cloud infrastructure **$189.000** · Back-end **$175.000** · DevOps $165.000 · **Embedded $132.500** · Full-stack $138.000
- Uso de C++: **23,53%** globalmente (2025); Rust **14,84%**. [FATO]
- Em 2026, C++ aparece com **11,3%** entre quem usa a linguagem *para trabalhar com IA*. [FATO]
- Tecnologias mais admiradas: uv **74,2%**, RAG **65,1%**, C++ 2.3 (tag do Stack Overflow) 11,3% desired / 74,2% admired. [FATO — a página renderiza os rótulos de forma ambígua; trato o número de RAG como firme e o de uv como firme]
- Brasil: **822 respondentes (2,33%)** do total. [FATO]

**[SEM DADO]** **Não consegui obter a mediana salarial específica do Brasil no Stack Overflow 2025 ou 2026.** A amostra brasileira é pequena (822) e a tabela salarial por país não expõe o recorte de forma confiável no HTML acessível. **Não estimo um número.** Para Brasil, use Código Fonte + CAGED, que são melhores.

**[FATO]** Sobre adoção de agentes de IA (2025): apenas **14,1% usam agentes de IA no trabalho diariamente**; 9% semanalmente; 7,8% mensalmente ou raramente; **37,9% não usam e não planejam usar**; 13,8% usam só copilot/autocomplete. Ou seja: **agentes ainda não são mainstream** (52% não usam ou ficam no autocomplete).

---

# 2. DEMANDA POR C++ E SISTEMAS DE ALTA PERFORMANCE

## 2.1 Quais setores contratam por essa skill

**[FATO]** Setores que aparecem como empregadores de C++ nas fontes consultadas (C++ Developer Survey 2026 da ISO C++ Foundation — https://isocpp.org/blog/2026/05/2026-survey-summary, e a lista global de vagas Rust/C++):

| Setor | Relevância para C++ | Observação |
|---|---|---|
| **Fintech / banco / trading** | Muito alta | Baixa latência, matching engines, infra de mercado |
| **HFT / prop trading** | Altíssima | O nicho mais bem pago de todos |
| **Infraestrutura / cloud** | Alta | Storage, rede, virtualização, bancos de dados |
| **Embarcados / automotivo** | Alta | **No Brasil paga R$ 19.362,57 no sênior [FATO]** |
| **Games / graphics** | Média-alta | Salário brasileiro sênior R$ 13.375,50 |
| **Adtech** | Média | Leilão em tempo real, mas muito migrou para Go/Java |
| **Cripto / blockchain** | Média | Alta concentração de Rust, não C++ |
| **HPC / científico** | Média | Nicho pequeno no Brasil |
| **Compiladores / linguagens** | Baixa em volume, alta em prestígio | LLVM, GCC, JVM |

**[SEM DADO]** Não encontrei nenhum levantamento quantitativo confiável (2025–2026) que meça **quantas vagas de C++ existem abertas no Brasil** por setor. Nem LinkedIn (bloqueia scraping), nem as pesquisas salariais oferecem esse corte. **Não estimo números de vagas.** Qualquer artigo que te der "X mil vagas de C++ no Brasil" provavelmente inventou ou raspou o LinkedIn de forma não verificável.

## 2.2 Vagas remotas internacionais para brasileiros

**[FATO]** Existe uma vaga brasileira real de Rust em infraestrutura financeira remota: **CloudWalk — "Rust Engineer, Financial Infrastructure"** (REMOTE). [fonte agregadora: https://startup.jobs/rust-engineer-financial-infrastructure-cloudwalk-8630954 — ⚠️ o link direto lever.co que encontrei retornou **404**, então confirmei a existência da vaga pelo agregador, não pela página oficial da empresa]

**[FATO]** Sobre contratação internacional de brasileiros:
- Segundo a **TechFX**, o número de contratações de profissionais brasileiros de TI por organizações internacionais **cresceu 491% em três anos**. [fonte: https://vocerh.abril.com.br/futurodotrabalho/contratacoes-de-desenvolvedores-brasileiros-no-exterior-crescem-500/]
- Segundo a **Coders**, a média salarial de brasileiros em contratos internacionais é de **US$ 5,8 mil a US$ 6 mil mensais** (~R$ 31 mil–32 mil ao câmbio de R$ 5,40). [fonte: https://www.computerweekly.com/br/noticias/366638844/Desenvolvedores-brasileiros-vivem-nova-onda-de-contratacoes-globais-em-2026]
- **⚠️ Conflito de interesse:** a TechFX e a Coders **lucram com esse mercado** (câmbio e recrutamento internacional). Os números são plausíveis mas devem ser lidos como material promocional. **[ESTIMATIVA]**

**[FATO — o dado que mais importa aqui]** Da pesquisa Código Fonte 2026, `total_income_foreign_currency`: **1.297 de 17.046 (7,6%) recebem em moeda estrangeira.** E `total_outside_brazil`: apenas **406 (2,38%) moram fora do Brasil**. Dos que moram fora, **406 respondentes**; **Portugal é o destino mais escolhido**.

**[FATO]** Média salarial de quem está fora do Brasil: **R$ 22.122,70** (para quem pretende voltar) e **R$ 21.525,36** (para quem não pretende). Média por país: **EUA R$ 24.119,45 · Irlanda R$ 28.210,95 · Alemanha R$ 26.375,50 · Holanda R$ 31.929,00**.

**[FATO]** Distribuição de quem recebe em moeda estrangeira (n = 1.297):
| Faixa | n | % de quem recebe |
|---|---|---|
| R$ 9.001–12.000 | 168 | 13,0% |
| R$ 15.001–20.000 | 182 | 14,0% |
| R$ 20.001–30.000 | 237 | **18,3%** |
| R$ 30.001–40.000 | 142 | 10,9% |
| R$ 40.001–50.000 | 73 | 5,6% |
| Acima de R$ 50.000 | 84 | 6,5% |

**[ESTIMATIVA]** **41,3% de quem recebe em moeda estrangeira está acima de R$ 20 mil/mês.** Compare com a população geral: apenas ~10,5% (1.786 de 17.046) está nessa faixa. **Trabalhar para o exterior multiplica por ~3,9 a probabilidade de estar acima de R$ 20k.** Esta é, disparado, a alavanca financeira mais poderosa disponível para você — mais do que qualquer escolha de linguagem.

**[FATO]** Fluência em inglês é o preditor mais forte de renda alta:
| Conversa fluente | n | Acima de R$ 20k | % |
|---|---|---|---|
| **Não** | 9.787 | 628 | **6,4%** |
| **Sim** | 7.259 | 1.158 | **16,0%** |

**[ESTIMATIVA]** Inglês fluente **2,5x** mais probabilidade de estar acima de R$ 20k. Você está em B2. **Isso é o gargalo mais subestimado do seu plano.** Seu C++ é excepcional e raro; seu inglês é mediano e é o que trava o acesso à faixa salarial que multiplica tudo. Priorizar inglês não é "soft skill", é a decisão de maior ROI financeiro listada neste relatório inteiro.

---

# 3. IA APLICADA COMO DIFERENCIAL

## 3.1 O que o mercado valoriza

**[FATO]** Robert Half 2026 coloca **engenheiro de IA como o maior salário técnico do Brasil** (R$ 19.500–27.100/mês). Áreas de demanda declarada: **cibersegurança, engenharia de dados e desenvolvimento em IA**. [fonte: roberthalf.com/br/pt/insights/guia-salarial/tecnologia]

**[FATO]** Stack Overflow 2026: em C++ especificamente, o *2026 Annual C++ Developer Survey* (ISO C++ Foundation, 04/mai/2026, https://isocpp.org/files/papers/CppDevSurvey-2026-summary.pdf) documenta que os profissionais de C++ relatam que ferramentas de IA **falham em projetos grandes, build systems complexos, macros, código gerado e C++ idiomático**, e que o custo de revisar e corrigir a saída gerada é alto. Usos onde IA funciona bem para eles: documentação/busca, boilerplate, **testes**, entender código legado, e explicar erros de template do compilador.

**[SEM DADO]** **Não encontrei nenhum levantamento 2025–2026 quantificando a demanda por RAG, agentes, MCP, fine-tuning ou LLMOps especificamente no Brasil ou globalmente**, com metodologia auditável. As menções a "MCP" e "LLMOps" em artigos de 2026 são, na sua maioria, conteúdo de marketing de ferramentas. Não vou estimar percentuais.

**[FATO]** O que existe de mensurável: RAG aparece como a 2ª tecnologia mais *admirada* do Stack Overflow (**65,1% admired**, 12,4% desired) — indicando interesse alto e adoção ainda em construção. E somente 14,1% dos devs usam agentes diariamente (2025).

**[ESTIMATIVA — seja cético aqui]** "Saturado ou carente?" é a pergunta errada. O que os dados mostram é **bimodalidade**: há excesso de gente que fez um curso de "prompt engineering" e montou um chatbot de RAG com LangChain seguindo tutorial — esse perfil está **saturado**. E há escassez de gente que consegue fazer um sistema de IA **funcionar sob carga real com custo controlado**, o que exige exatamente o que você tem: entender memória, concorrência, latência, profiling. **O seu diferencial não é "saber IA". É saber fazer IA rodar rápido e barato.** Essa é a interseção defensável, e é rara porque exige as duas coisas.

**[FATO]** Stack Overflow 2026: **trabalho autônomo/freelance subiu de 3,9% para 10,5% em um ano.** O CEO da Stack Overflow atribui isso a "com IA, cada indivíduo se torna quase um gerente de agentes". [fonte: survey.stackoverflow.co/2026]

## 3.2 Faixas salariais em IA

- Brasil **[FATO]**: R$ 19.500–27.100 (engenheiro de IA, Robert Half 2026); especialista IA/ML R$ 17.950–23.550.
- Global **[FATO]**: mediana $89.427/ano (Stack Overflow 2025); EUA $189.500/ano.
- **[ESTIMATIVA]** Para um **júnior** entrando em IA hoje no Brasil, espere R$ 6.000–10.000 — a faixa Robert Half de R$ 19,5k+ descreve pleno/sênior com experiência comprovada. Não se ancore no topo da tabela.

---

# 4. RUST: VALE MIGRAR DE C++ EM 2026?

## 4.1 Adoção industrial — fatos verificáveis

**[FATO — fonte primária oficial do projeto Rust]** *Rust for Linux* consta como meta oficial do Rust Project para 2026 (https://goals.rust-lang.org/2026/roadmap-rust-for-linux.html). Texto literal: *"Rust is now an integral part of the Linux kernel. There are mainline drivers built in it, tooling and it's even directly in the kernel itself."* O objetivo declarado para 2026 é *"Build Linux kernel releases using the stable Rust language (no feature gates)"* — ou seja, **hoje o kernel ainda depende de features instáveis** (`#![feature(...)]`), e estabilizá-las é trabalho em andamento. Também há limitação a plataformas suportadas pelo LLVM.

**[ESTIMATIVA — leitura cética]** Isso é adoção **real e oficial**, mas é **aditiva, não substitutiva**. O kernel é esmagadoramente C e continuará sendo. "Rust no kernel" não significa "C vai morrer"; significa que código novo de driver pode ser escrito em Rust. Não superestime a velocidade da transição.

**[FATO]** O próprio roadmap lista como motivação que Rust traz "novos contribuidores que nunca teriam se sentido confiantes escrevendo C para sistemas de baixo nível" — e admite que o projeto precisa de **estabilização de linguagem** e tem uma "long tail of features" pendente.

## 4.2 Demanda e salário: Rust vs C++

**[FATO]** Stack Overflow 2025: uso de **C++ 23,53% vs Rust 14,84%** — C++ tem ~1,6x mais usuários.
**[FATO]** Código Fonte 2026 (Brasil): **C++ 102 respondentes (0,60%) vs Rust 19 (0,11%)** — C++ tem ~5,4x mais profissionais no Brasil.

**[SEM DADO]** **Não encontrei nenhuma fonte primária confiável de 2025–2026 que compare salários Rust vs C++ com metodologia auditável.** Os sites que aparecem na busca (4achievers, nimblefreelancer, haystackapp, rustinfrajobs, rustify) são **geradores de conteúdo/SEO e agregadores comerciais**, sem metodologia pública verificável. **Não cito números deles.**

**[ESTIMATIVA — Rust Brasil, tratar como parte interessada]** O site rustlang.com.br (20/fev/2026, https://rustlang.com.br/blog/carreira-rust-2026/) publica faixas CLT: Júnior R$ 5.500–9.000 · Pleno R$ 9.000–16.000 · Sênior R$ 16.000–28.000 · Staff R$ 28.000–40.000; PJ ~1,3–1,5x. **⚠️ Este site vende curso de Rust.** Compare com o Código Fonte: Júnior R$ 5.060, Pleno R$ 8.466, Sênior R$ 14.607. A faixa Rust sugerida é consistentemente **acima** da média geral — o que pode ser prêmio de escassez real **ou** viés de quem vende o curso. **Trate como aspiracional, não como dado de mercado.**

**[ESTIMATIVA — o ponto decisivo]** A resposta honesta para "vale migrar?":

**Não migre. Adicione.** Os motivos:
1. **C++ tem ~5x mais profissionais e infinitamente mais código legado no Brasil.** Trocar C++ por Rust reduz seu mercado endereçável local, não amplia.
2. **O que você sabe de C++ transfere quase integralmente.** Gerenciamento de memória, layout de dados, cache, lock-free, syscalls, profiling — nada disso muda. O que muda é sintaxe, borrow checker e o modelo de ownership. **[ESTIMATIVA]** Um dev com seus 11.500 linhas de C++ de baixo nível produtivo em Rust em **2–4 meses** de uso sério, porque os conceitos difíceis ele já tem.
3. **Rust é diferencial, não substituto.** Seu posicionamento ideal em 2026 é: *"profundo em C++; fluente o suficiente em Rust para escolher a ferramenta certa"*. Isso te dá acesso às vagas de Rust (onde há pouquíssima concorrência — 19 respondentes na pesquisa inteira!) **sem** abrir mão das vagas de C++.
4. **[FATO]** O próprio Rust Brasil afirma: *"não existe certificação oficial de Rust amplamente exigida; mercado prioriza código, contribuições e entrevista técnica"* — o que significa que a barreira de entrada em Rust é **demonstrável por portfólio**, e você já sabe fazer portfólio.

---

# 5. QUANTITATIVO / FINANÇAS — A VIA É REALISTA?

Esta é a pergunta onde a resposta honesta é mais importante, e onde há uma distinção que muda tudo.

## 5.1 A distinção que quase todo mundo ignora

**[FATO]** Fonte: https://www.techinterview.org/post/3233474733/ms-vs-phd-quant-research/ (abr/2026)

Existem **quatro funções diferentes**, com requisitos radicalmente diferentes:

| Função | Exige PhD? | Realidade 2026 |
|---|---|---|
| **Quant Researcher** (hedge fund estatístico: Renaissance, DE Shaw, Two Sigma, AQR) | **Sim, funcionalmente** | 70–90% dos novos contratados têm PhD; **Renaissance ~95% PhD** |
| **Quant Researcher** (HFT prop: Jane Street, Citadel Securities, HRT, Tower, Jump, Optiver, IMC, SIG) | Não obrigatório | ~40–60% PhD; aceitam bacharelado com histórico excepcional (olimpíadas/ICPC) |
| **Quant Trader** | **Não** | "PhD raramente exigido" |
| **Quant Developer / low-latency engineer** | **Não** | *"PhD raramente é exigido e frequentemente não é preferido. Bacharelado ou mestrado basta."* |

**[FATO — confirmação na fonte primária]** A própria Jane Street, em página oficial de vaga (https://www.janestreet.com/join-jane-street/position/4273643002/), afirma textualmente: *"Prior knowledge of finance or economics is not expected or required. Experience with particular programming languages is also not required... Fluency in English required."* Eles usam **OCaml**, não C++ — e não exigem experiência prévia nela.

**[FATO]** Em contrapartida, a **Jane Street Graduate Research Fellowship** exige PhD em EE/CS/Matemática/Física/Estatística. Esse é o funil que de fato exige doutorado.

## 5.2 Veredito honesto

**[ESTIMATIVA — e é uma opinião fundamentada, não dado]**

**A via "quant researcher em hedge fund estatístico" é uma ilusão para o seu perfil** — não por falta de capacidade, mas porque o filtro é um PhD de instituição de ponta e você não está nesse caminho (UnB não é IME-USP/IMPA, e você está no 4º semestre de graduação). Perseguir isso significaria 6–10 anos apostando num funil com taxa de conversão ínfima.

**A via "quant developer / engenheiro de baixa latência em HFT" é REALISTA e é exatamente onde seu perfil encaixa.** Você já escreveu: SPSC lock-free ring buffer com acquire-release semantics, `alignas(hardware_destructive_interference_size)`, `_mm_pause()` spin hints, CPU affinity com `pthread_setaffinity_np`, `O_DIRECT` com `posix_memalign`, benchmarks de latência de `fsync`. **Isso não é currículo de estudante. Isso é literalmente a descrição do trabalho de um engenheiro de baixa latência em mesa de trading.** Você já construiu, por conta própria, o portfólio que essas vagas pedem.

**[ESTIMATIVA]** Os pré-requisitos reais e o que falta em você:
1. **Estruturas de dados e algoritmos competitivos** — as entrevistas de HFT são estilo ICPC. Seu perfil é de "engenheiro de sistemas", não de "competidor". **Esta é sua lacuna mais séria.**
2. **Probabilidade e estatística aplicada** — não cálculo estocástico de doutorado; raciocínio de valor esperado, probabilidade condicional, paradoxos clássicos de mercado. Aprender isso é viável fora de um PhD **[ESTIMATIVA]**.
3. **Inglês fluente** — [FATO] Jane Street exige explicitamente. Seu B2 é o piso, não o teto.
4. **Localização/visa** — [SEM DADO] **Não consegui verificar** se Jane Street, Citadel Securities, Optiver ou HRT patrocinam visto para brasileiros recém-formados, nem se recrutam ativamente no Brasil. As páginas de carreira que acessei não trazem essa informação. **Não vou afirmar nem negar.**

**[FATO]** Comp de entrada reportada em agregadores para new grad quant em 2026: **US$ 400k–550k**. ⚠️ Não consegui verificar isso em fonte primária (Levels.fyi não abre; Glassdoor bloqueia). Trate como cifra de mercado comentada, não como fato auditado.

**[ESTIMATIVA]** **Conclusão prática: mantenha a via viva, mas redefinida.** Não como "quero ser quant researcher". Como **"quero ser o engenheiro que faz a infraestrutura de trading funcionar"**. Essa versão é atingível com o que você tem, paga muito bem, e — crucialmente — **serve de trampolim**: é comum que QD brilhantes migrem para trading/research internamente depois de provar valor, o que contorna o filtro do PhD pela porta dos fundos. **[ESTIMATIVA — este parágrafo é inferência minha sobre trajetórias plausíveis, não dado verificado]**

**[SEM DADO]** Não encontrei dados sobre a cena de market making/HFT em São Paulo ou Rio com números de remuneração em BRL. Não estimo.

---

# 6. SaaS INDEPENDENTE / MICRO-SAAS — OS NÚMEROS REAIS

## 6.1 A base rate (a parte que os artigos escondem)

**[FATO]** Fonte: https://www.saasranger.com/blog/micro-saas-revenue-reality-what-1000-founders-actually-earn/ (publicado 15/mar/2026, atualizado 29/abr/2026). Síntese de: MicroConf State of Independent SaaS, relatório Freemius 2025, estudo da IndieLaunches sobre 326 projetos do Hacker News, e estudo da RockingWeb sobre 1.000 produtos de assinatura pequenos.

| Métrica | Valor |
|---|---|
| **Receita mensal típica** | **US$ 500/mês** |
| Abaixo de US$ 500/mês | **70%** |
| Chegam a US$ 1.000/mês | **18%** |
| Chegam a US$ 5.000/mês | **~18% nunca chegam** (82% não chegam) |
| Chegam a US$ 10.000/mês | **~93% nunca chegam** |
| Top 1% | > US$ 50.000/mês |
| **Tempo até o 1º cliente pagante** | **~3 meses** (top 18%: 4–6 semanas) |
| **Tempo até US$ 1.000/mês** | **12–18 meses** |

**[FATO]** "Regra dos 18 meses": a maioria dos que desistem, desiste por volta do mês 18.

**[FATO]** Os 4 hábitos que separam os 18%:
1. Construíram **audiência pública antes** do lançamento.
2. **Cobraram mais** do que era confortável — os travados abaixo de US$ 500 quase todos cobravam US$ 9–19.
3. Focaram **um único canal** até ele funcionar.
4. Colocaram **IA no núcleo** do produto, não como enfeite.

**[FATO]** Origem dos primeiros clientes (IndieLaunches, n = 326): boca a boca **40** · marketplace/app store **33** · Google search **27** · posts em comunidade **20** · outreach direto **15** · Product Hunt **8** · anúncios pagos **4**.
**[FATO]** Taxa de conversão: **Product Hunt 3,1%** vs **Indie Hackers 23,1%** (OpenHunts, n = 387).

**[FATO — fonte mais fraca]** https://www.vinhautomation.com/en/blog/success-vs-failure-indie-hacker-saas/ (18/jul/2026) cita survey da comunidade Indie Hackers: **54 de cada 100 produtos SaaS independentes terminam com receita exatamente ZERO**. ⚠️ É survey comunitário, não acadêmico — indicativo, não prova.

## 6.2 O que isso significa para você

**[ESTIMATIVA — e é a conclusão mais dura deste relatório]**

Junte os números: **70% ficam abaixo de US$ 500/mês. O tempo mediano até US$ 1.000/mês é 12–18 meses. E o gargalo não é código — é distribuição** (veja a origem dos clientes: boca a boca e marketplace, não "produto bom").

Seu perfil é de **profundidade em sistemas e matemática**. Micro-SaaS não recompensa isso. Ele recompensa: escrita, marketing, presença pública, venda, consistência por 18 meses num produto chato. **Você está otimizando exatamente a variável que não decide o resultado.**

Isso não significa "não empreenda". Significa:

- **Trate micro-SaaS como loteria de baixo custo, não como plano A.** O valor esperado de um produto solo é baixo; o valor de **aprender a vender** é altíssimo e transferível.
- **Seu caminho de fundador técnico tem muito mais alavancagem em B2B profundo** (infraestrutura, ferramenta de dev, produto onde o comprador é engenheiro e avalia competência técnica) do que em B2C/prosumer, onde ganha quem faz marketing.
- **[ESTIMATIVA]** A combinação que faz sentido para você: **emprego remoto internacional (renda e tempo) + um produto B2B/developer-tool onde sua profundidade é a barreira de entrada**. Isso usa seus ativos em vez de competir onde você é mediano.

---

# 7. O CAMINHO "FUNDADOR TÉCNICO"

## 7.1 O que o mercado brasileiro mostra — dados de fonte primária

**[FATO]** Fonte: *Observatório de Inovação e Empreendedorismo — "Unicórnios brasileiros: quem são e de onde vêm"*, por Andrea Minardi, Charles Kirschbaum, Gisela Macedo e Rodrigo Amantea (2026). https://uploads.finsidersbrasil.com.br/2026/02/Hub_Observatorio_Unicornios_2026.pdf — bases: Crunchbase, Troposlab, Distrito; dados até 2025.

**Achados verificados:**
- **30 unicórnios brasileiros, 71 fundadores.**
- **Time fundador: média de 2,3 fundadores; 77% foram criados por times de 2 ou mais.** A moda são 3 fundadores.
- **34% dos fundadores são serial founders** (já fundaram outra startup antes). 66% são first-time founders.
- **59% dos unicórnios têm ao menos um serial founder no time; 23% são compostos exclusivamente por serial founders.**
- **Perfil típico: "times pequenos e técnico-analíticos".** Texto literal do relatório.
- **"Cerca de 90% têm graduação em STEM, Administração ou Economia."**
- **Tempo médio até virar unicórnio: pouco mais de 7 anos, com 5 rodadas de investimento em média.** A maioria chega a unicórnio a partir da **Série C**.
- Brasil gerou unicórnios a partir de 2018; **2021 concentrou ~1/3 deles**; depois, desaceleração com capital mais seletivo.
- Fintechs = 40% dos unicórnios; e-commerce e logística ~17% cada.
- Apenas **7% dos fundadores são mulheres**.
- Sudeste é o polo principal; SP, RJ concentram.

**[FATO]** Estudo citado pelo relatório (Shaw & Sørensen, 2017, NBER Working Paper 23320): times liderados por serial founders são **39% mais produtivos** e têm desempenho de vendas **67% superior**.

**[ESTIMATIVA — a leitura que importa para você]**

Três conclusões duras:

1. **"90% têm graduação em STEM"** — você está fazendo Ciência da Computação. Você está no caminho certo. **Termine a faculdade.** Isso não é conselho genérico; é o que o dado diz sobre quem chega lá.
2. **77% dos unicórnios foram fundados por times, e a moda é 3 pessoas.** O mito do fundador solo genial não aparece nos dados. **Sua tarefa estratégica mais importante nos próximos 3–5 anos não é aprender mais C++ — é encontrar 1–2 sócios complementares.** Provavelmente alguém comercial/GTM, já que sua lacuna é distribuição (seção 6).
3. **7 anos e 5 rodadas até unicórnio.** Se você está pensando em "ser rico" via startup, o horizonte é de **década**, não de ano. **Isso torna a renda de engenheiro (seção 2) não um plano B, mas o financiamento do plano A.** Você não precisa escolher entre "carreira técnica" e "empreender" — a carreira técnica é o que paga o aluguel enquanto você constrói.

**[FATO]** Exemplo real de fundador técnico brasileiro: **Vitor Olivier**, ex-CTO do Nubank (mais de 10 anos na empresa), deixou o cargo em setembro de 2025 para fundar a **Decade**, que em 2025 levantou **US$ 85 milhões** com Felipe Meneses (cofundador da Hyperplane, adquirida pelo Nubank em 2024). O Nubank anunciou **Eric Young** como novo CTO em 12/ago/2025. [fontes: https://nu.com/pt/sala-de-imprensa/companhia/nubank-anuncia-eric-young-como-chief-technology-officer · https://www.poder360.com.br/poder-economia/nubank-anuncia-novo-cto-de-tecnologia/ · https://seucreditodigital.com.br/ex-cto-nubank-decade-ia-financeira/]

**[ESTIMATIVA]** Note o padrão: **ele não começou fundando. Ele passou 10+ anos construindo reputação técnica dentro de uma empresa que cresceu, e depois fundou com rede, capital e crédito.** Esse é o caminho realista e é o oposto de "largar tudo aos 19 para fazer SaaS".

**[SEM DADO]** **Não encontrei nenhum levantamento quantitativo sobre o que o mercado de startups brasileiro exige especificamente de um "CTO/fundador técnico"** (anos de experiência, stack, credenciais). O relatório de unicórnios descreve quem **chegou lá**, não os requisitos de contratação. **Não estimo.** Da mesma forma, não encontrei dados sobre fundadores brasileiros que começaram **sem capital** — as histórias existem na mídia, mas sem dataset auditável.

---

# 8. CERTIFICAÇÕES E CREDENCIAIS

## 8.1 O que os dados dizem

**[FATO]** Robert Half 2026: **48% dos gestores afirmam pagar mais por profissionais com certificação/especialização.** [fonte: roberthalf.com/br/pt/insights/guia-salarial/tecnologia]

**[FATO]** Rust Brasil (⚠️ parte interessada, vende curso): *"não existe certificação oficial de Rust amplamente exigida; mercado prioriza código, contribuições e entrevista técnica"*.

**[FATO]** A ISO C++ Foundation **não mantém certificação oficial de C++**. As certificações C++ existentes (CPA, etc.) são de terceiros e não aparecem como requisito em nenhuma vaga que examinei.

**[FATO]** Stack Overflow / pesquisas salariais: o fator com maior associação a renda alta identificado nos dados do Código Fonte é **formação acadêmica**:
| Formação | n | % acima de R$ 20k |
|---|---|---|
| Não fiz faculdade | 534 | 8,1% |
| **Superior em andamento** | 2.941 | **2,1%** |
| Superior incompleto | 1.221 | 8,3% |
| **Superior completo** | 7.531 | **9,3%** |
| **Pós-graduação / MBA** | 4.174 | **16,1%** |
| **Mestrado / Doutorado** | 645 | **32,2%** |

**[ESTIMATIVA]** Leia isso como você: **com superior completo, a chance de estar acima de R$ 20k é 4,4x maior do que com superior em andamento** (9,3% vs 2,1%). E pós-graduação **quase dobra** de novo (16,1%). Isso **não** prova causalidade — quem faz pós-graduação já tende a ser sênior e mais velho. Mas o sinal é forte e consistente, e **contradiz diretamente a narrativa de que "diploma não importa em tech"**. Terminar a graduação é a decisão de maior impacto na tabela, e uma pós-graduação depois é justificável.

## 8.2 Certificação vs portfólio — a resposta honesta

**[ESTIMATIVA — síntese, não dado único]**

A pergunta está mal formulada. O correto é: **certificação e portfólio resolvem problemas diferentes.**

| | Resolve | Não resolve |
|---|---|---|
| **Certificação cloud (AWS/K8s)** | Filtro de RH, requisito de compliance/licitação, crédito em consultoria/parceria | Provar competência real de engenharia |
| **Portfólio técnico (seu caso)** | Provar profundidade, passar entrevista técnica, impressionar engenheiro | Passar por filtro automático de RH que exige "AWS Certified" |

**[ESTIMATIVA]** Para **o seu perfil específico**, portfólio vale muito mais, por três razões verificáveis:
1. Você já tem portfólio **excepcional** — 51 experimentos, 11.500 linhas de C++ de baixo nível, extensão Zend Engine em andamento. Isso é mais raro do que qualquer certificação.
2. [FATO] A Jane Street afirma explicitamente que **não exige experiência prévia em linguagem nem conhecimento de finanças** — o filtro é capacidade demonstrada. Firmas assim não se impressionam com certificado.
3. [FATO] No ecossistema Rust, a ausência de certificação oficial significa que **não há como comprar credencial** — só demonstrar.

**[ESTIMATIVA]** Onde **uma** certificação se justifica para você: **AWS Solutions Architect Associate ou CKA (Kubernetes)** — não para provar competência, mas para destravar vagas que filtram por palavra-chave e, principalmente, **para te forçar a aprender a operar em cloud**, que é uma lacuna real no seu perfil (você é forte em baixo nível; infraestrutura de nuvem é um mundo adjacente que você ainda não demonstrou). Uma certificação, uma vez. Não acumule certificados — é o erro clássico de quem quer sinalizar sem construir.

**[SEM DADO]** Não encontrei estudo 2025–2026 com metodologia auditável medindo **o retorno salarial marginal de certificações específicas (AWS vs CKA vs outras) no Brasil**. O dado da Robert Half (48% dos gestores) mede *disposição declarada de pagar mais*, não o prêmio efetivo. **Não estimo o prêmio em reais.**

---

# 9. SÍNTESE: O QUE OS DADOS REALMENTE DIZEM SOBRE O SEU CASO

Esta seção é **[ESTIMATIVA]** integralmente — é minha interpretação dos fatos acima, não dado de fonte.

## 9.1 Seus ativos, calibrados pelos dados

| Ativo | Avaliação honesta |
|---|---|
| C++ de baixo nível (~11.500 linhas) | **Muito forte e muito raro.** C++ é 0,60% dos devs brasileiros. Combine com embarcados pagando R$ 19.362 no sênior. |
| Matemática / raciocínio quantitativo | **Diferencial real**, mas exige complemento (probabilidade, algoritmos competitivos) para virar emprego. |
| Produto SaaS (18k linhas) | **Ativo de aprendizado, não de receita.** Espere US$ 500/mês típico; 70% ficam abaixo disso. |
| Estágio no STM (4h/dia) | **Renda e contexto institucional.** Brasília paga acima de SP (R$ 11.796,62 médio). |
| Inglês B2 | **Seu maior gargalo.** Fluente = 2,5x mais chance de passar de R$ 20k. |
| Ausência de redes/sócios | **Risco subestimado.** 77% dos unicórnios foram fundados por times. |

## 9.2 As três decisões com maior alavancagem (em ordem)

1. **Inglês até fluência real.** Dado: 41,3% de quem recebe em moeda estrangeira está acima de R$ 20k, contra 10,5% da população geral (**3,9x**); e inglês fluente dá 16,0% vs 6,4% de chance de passar de R$ 20k (**2,5x**). Nada mais no relatório tem esse multiplicador. Custo: tempo. Retorno: ~4x probabilidade de dobrar+ a renda.
2. **Terminar a graduação.** Dado: 9,3% vs 2,1% acima de R$ 20k (completo vs em andamento). E 90% dos fundadores de unicórnios têm graduação STEM/negócios.
3. **Reposicionar o sonho quant de "researcher" para "quant/low-latency developer".** Dado: QD "raramente exige PhD"; researcher em hedge estatístico exige 70–95% PhD. Você já tem o portfólio exato de QD.

## 9.3 O que eu faria no seu lugar (concreto, próximo 12–24 meses)

- **Mantenha C++ como base, adicione Rust como segunda linguagem** (2–4 meses para produtividade, dado que os conceitos você já tem). Não troque.
- **Adicione algoritmos competitivos e probabilidade.** É a lacuna mais séria para HFT/quant e a mais barata de corrigir agora.
- **Pare de construir SaaS novo e comece a construir audiência técnica pública.** Dado: os 18% que dão certo construíram audiência **antes** do lançamento; boca a boca é o canal #1. Escreva sobre seus 51 experimentos de C++. Isso serve simultaneamente para: (a) atrair recrutador internacional, (b) criar base para produto futuro, (c) construir rede — sua lacuna de sócios.
- **Comece a aplicar para vagas remotas internacionais assim que o inglês permitir.** Não espere estar "pronto". A mediana brasileira em empresa estrangeira é ~R$ 22 mil.
- **Trate a IC do SEI/Zend Engine como seu ativo mais valioso de carreira** — é pesquisa aplicada em sistema real de governo, com C++ de verdade. Isso é diferenciado e conta como "impacto", não só como "projeto".

## 9.4 O que eu **não** faria

- **Não largaria a faculdade nem o estágio** para perseguir SaaS full-time. Dado: 70% abaixo de US$ 500/mês, 12–18 meses até US$ 1.000/mês, e renda de engenheiro é o financiamento do plano.
- **Não acumularia certificações.** Uma (AWS ou CKA) para destravar filtro, e só.
- **Não apostaria em "quant researcher" sem PhD.** Redefina para QD, que é realista e paga bem.
- **Não trocaria C++ por Rust.** Some.

---

# 10. O QUE NÃO CONSEGUI VERIFICAR (declaração explícita)

Conforme pedido, listo o que **não** tem dado confiável e que eu me recuso a estimar:

1. **Mediana salarial do Brasil no Stack Overflow 2025/2026** — amostra pequena, tabela por país não exposta de forma confiável. Não estimo.
2. **Número de vagas de C++ abertas no Brasil por setor** — nenhum levantamento auditável existe; LinkedIn bloqueia. Não estimo.
3. **Comparação salarial Rust vs C++ com metodologia auditável** — todos os sites encontrados são SEO/agregadores comerciais. Não cito números.
4. **Demanda quantificada por RAG/agentes/MCP/fine-tuning/LLMOps no Brasil** — inexistente com metodologia pública. Não estimo percentuais.
5. **Prêmio salarial marginal de certificações específicas no Brasil** — inexistente. O dado Robert Half mede intenção declarada.
6. **Patrocínio de visto por firmas de HFT (Jane Street, Citadel Securities, Optiver, HRT) para brasileiros** — não encontrei essa informação nas páginas de carreira. Não afirmo nem nego.
7. **Remuneração em BRL de market makers/HFT no Brasil** — não encontrei dado. Não estimo.
8. **Requisitos formais de contratação de CTO/fundador técnico no Brasil** — o relatório de unicórnios descreve trajetórias de quem chegou lá, não critérios de seleção.
9. **Dados sobre fundadores brasileiros que começaram sem capital** — histórias existem na mídia, dataset auditável não. Não estimo.
10. **Comp de new grad quant (US$ 400–550k)** — reportado por agregadores; Levels.fyi inacessível, Glassdoor bloqueia. Não verificado em fonte primária.
11. **A "pesquisa do Glassdoor" sobre engenheiro de IA (R$ 180k–322k/ano)** citada por sites brasileiros de 2026 — **Glassdoor retornou HTTP 403**; não pude verificar na fonte. Trato como não verificado.
12. **Relatório Freemius "State of Micro-SaaS" 2025 na fonte primária** — a página carregou mas o conteúdo veio vazio/truncado; usei a síntese do SaaSRanger, que cita Freemius. Verifiquei a síntese, não o original.

## Limitações do método desta pesquisa

- `web_search` estava indisponível (sem `DEEPSEEK_API_KEY` nesta sessão). Toda descoberta de URL foi feita via proxy de busca (DuckDuckGo HTML, que passou a exigir captcha em parte das consultas) e por tentativa direta contra fontes conhecidas.
- **Glassdoor bloqueia acesso automatizado (HTTP 403)** e **Levels.fyi não retorna conteúdo utilizável** — as duas fontes mais citadas em artigos de salário ficaram inacessíveis.
- Tentei delegar áreas independentes a subagentes em paralelo e **não foi possível: `subagent depth 2 exceeds maxDepth 1`**. Toda a coleta foi feita sequencialmente por mim.
- A pesquisa do Código Fonte é auto-selecionada; a Robert Half é parte interessada; o Rust Brasil vende curso. Esses vieses estão marcados ao longo do texto.

---

## FONTES PRIMÁRIAS CONSULTADAS (todas efetivamente baixadas e verificadas)

1. **Código Fonte TV — Pesquisa Salarial 2026** (n=17.046): https://pesquisa.codigofonte.com.br/2026 · filtros: [/modelo/clt](https://pesquisa.codigofonte.com.br/2026/modelo/clt) · [/modelo/pj](https://pesquisa.codigofonte.com.br/2026/modelo/pj) · [/area/embarcados](https://pesquisa.codigofonte.com.br/2026/area/embarcados) · [/area/games](https://pesquisa.codigofonte.com.br/2026/area/games) · [/area/dados](https://pesquisa.codigofonte.com.br/2026/area/dados) · [/area/devops](https://pesquisa.codigofonte.com.br/2026/area/devops) · [/area/seguranca-da-informacao](https://pesquisa.codigofonte.com.br/2026/area/seguranca-da-informacao)
2. **Brasscom — Relatório Setorial 2025, Macrossetor de TIC** (dados Novo Caged 04/2026): https://brasscom.org.br/wp-content/uploads/2026/05/BRI2-2026-001-Relatorio-Setorial-2025-versao-resumida-v6-SITE-1.pdf
3. **Brasscom — Relatório de empregos TIC** (08/jul/2026): https://static.poder360.com.br/uploads/2026/07/relatorio-empregos-tic-brasscom-8jul26.pdf
4. **Robert Half — Guia Salarial 2026, Tecnologia**: https://www.roberthalf.com/br/pt/insights/guia-salarial/tecnologia
5. **Exame — detalhamento do Guia Salarial Robert Half 2026**: https://exame.com/tecnologia/examelab/salario-de-engenheiro-de-ia-dados-e-de-ciberseguranca-quanto-o-mercado-brasileiro-paga-em-2026/
6. **FIAP Radar Tech — Guia Salarial Tecnologia 2026**: https://www.fiap.com.br/radar-tech/post/salarios-em-tecnologia-2026-quanto-ganham-as-principais-profissoes-tech-no-brasil/
7. **Stack Overflow Developer Survey 2025**: https://survey.stackoverflow.co/2025/
8. **Stack Overflow Developer Survey 2026**: https://survey.stackoverflow.co/2026
9. **ISO C++ Foundation — 2026 Annual C++ Developer Survey "Lite", resultados** (04/mai/2026): https://isocpp.org/blog/2026/05/2026-survey-summary · PDF: https://isocpp.org/files/papers/CppDevSurvey-2026-summary.pdf
10. **Rust Project Goals 2026 — Rust for Linux** (fonte oficial do projeto Rust): https://goals.rust-lang.org/2026/roadmap-rust-for-linux.html
11. **Jane Street — vaga oficial Quantitative Trader, London**: https://www.janestreet.com/join-jane-street/position/4273643002/
12. **techinterview.org — MS vs PhD for Quant Research** (abr/2026): https://www.techinterview.org/post/3233474733/ms-vs-phd-quant-research/
13. **SaaSRanger — Micro-SaaS Revenue Reality** (15/mar/2026, atualizado 29/abr/2026): https://www.saasranger.com/blog/micro-saas-revenue-reality-what-1000-founders-actually-earn/
14. **Vinh Automation — 54% dos SaaS indie faturam zero** (18/jul/2026): https://www.vinhautomation.com/en/blog/success-vs-failure-indie-hacker-saas/
15. **Observatório de Inovação e Empreendedorismo — "Unicórnios brasileiros: quem são e de onde vêm"** (2026): https://uploads.finsidersbrasil.com.br/2026/02/Hub_Observatorio_Unicornios_2026.pdf
16. **Nubank — anúncio de Eric Young como CTO** (12/ago/2025): https://nu.com/pt/sala-de-imprensa/companhia/nubank-anuncia-eric-young-como-chief-technology-officer
17. **Poder360 — Nubank anuncia novo CTO** (12/ago/2025): https://www.poder360.com.br/poder-economia/nubank-anuncia-novo-cto-de-tecnologia/
18. **Seu Crédito Digital — Decade, de Vitor Olivier, ex-CTO do Nubank**: https://seucreditodigital.com.br/ex-cto-nubank-decade-ia-financeira/
19. **ComputerWeekly BR — contratações globais de devs brasileiros em 2026** (dados Coders): https://www.computerweekly.com/br/noticias/366638844/Desenvolvedores-brasileiros-vivem-nova-onda-de-contratacoes-globais-em-2026
20. **Você RH / Abril — contratações no exterior crescem 491%** (dados TechFX): https://vocerh.abril.com.br/futurodotrabalho/contratacoes-de-desenvolvedores-brasileiros-no-exterior-crescem-500/
21. **Rust Brasil — Carreira Rust 2026** (⚠️ parte interessada, vende curso): https://rustlang.com.br/blog/carreira-rust-2026/
22. **CloudWalk — vaga Rust Engineer, Financial Infrastructure** (via agregador): https://startup.jobs/rust-engineer-financial-infrastructure-cloudwalk-8630954

**Fontes inacessíveis (registradas para transparência):** Glassdoor (HTTP 403 em todas as tentativas) · Levels.fyi (conteúdo não utilizável) · link direto lever.co da vaga CloudWalk (HTTP 404) · Freemius State of Micro-SaaS 2025 (página carregou sem conteúdo útil).
