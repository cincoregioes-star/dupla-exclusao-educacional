# Dupla Exclusão — Entre a cor e a condição

**Entre a cor e a condição: A realidade dos estudantes negros com deficiência na escola**

Aplicativo educacional da E.M.E.F. Pedro de Queiroz Ferreira, preparado para Web/PWA e Android com Capacitor.

## Créditos
- Idealização e orientação pedagógica: **Prof. Cleilson Paiva** — Professor de História e Gestor Escolar
- Projeto digital e desenvolvimento: **Prof. Carlos André Tavares de Lima** — Professor de Geografia, Administração Escolar e Criador de Projetos Digitais Educativos
- Alunos do projeto: **Antônio Anselmo e Gabrielly Rodrigues — 8º ano**
- Escola: **E.M.E.F. Pedro de Queiroz Ferreira**

## O que está incluído
- 36 figurinhas originais recuperadas do repositório GitHub.
- 6 páginas temáticas do álbum.
- 10 simulados sempre liberados para estudo e repetição.
- Banco de 150 questões.
- 10 questões sorteadas por tentativa.
- 10 questões sorteadas entre 15 de cada módulo e alternativas embaralhadas automaticamente.
- Diagnóstico inicial e avaliação final.
- Registro de tentativas, acertos, erros e habilidades.
- Área **Meu progresso**.
- Acesso institucional com avaliação solicitada por turma ou aluno e resultados confidenciais.
- Sincronização opcional via Supabase.
- Game original integrado.
- PWA com preparação de conteúdo para uso offline.
- Estrutura Capacitor para Android/APK.

## Testar no computador
1. Instale Node.js LTS.
2. Abra um terminal nesta pasta.
3. Execute `npm install`.
4. Execute `npm run serve`.
5. Abra `http://localhost:8080`.

Não abra o `index.html` diretamente pelo Explorador de Arquivos para testar PWA/service worker; use um servidor local.

## Gerar Android/APK
1. Instale Node.js LTS e Android Studio.
2. Nesta pasta execute `npm install`.
3. Execute `npm run cap:add:android` apenas na primeira vez.
4. Execute `npm run cap:sync` sempre que atualizar a pasta `www`.
5. Execute `npm run cap:open`.
6. No Android Studio, aguarde o Gradle concluir e gere o APK de teste.

O APK empacota a pasta `www`, portanto álbum, figurinhas, questões e game ficam disponíveis sem internet. A internet só é necessária para sincronização com o servidor, se o Supabase for ativado.

## PWA / GitHub Pages
Publique o conteúdo da pasta `www/` na raiz do site/repositório que servirá a aplicação. O service worker usa caminhos relativos, permitindo GitHub Pages em subpastas.

Na primeira utilização online, toque em **Preparar uso offline** para armazenar também todas as 36 figurinhas e o game no cache do navegador.

## Supabase
O arquivo `supabase/SCHEMA.sql` contém a estrutura inicial do banco. Preencha `www/config.js` somente depois de criar o projeto Supabase e configurar corretamente autenticação e RLS.

## Privacidade
O projeto foi desenhado para coletar apenas dados mínimos de acompanhamento. Em uso real com estudantes, especialmente menores de idade, a escola deve definir perfis de acesso, finalidade, retenção e proteção dos dados antes da implantação em produção.

## Versão institucional v12

A área **Professor** foi transformada em **ACESSO INSTITUCIONAL** e permanece bloqueada até autenticação válida no Supabase. Perfis previstos:

- Administrador do Sistema — acesso técnico/institucional completo.
- Gestor Escolar — visão geral da escola.
- Coordenação Pedagógica — acompanhamento pedagógico e intervenções.
- Professor — acesso somente às turmas vinculadas no banco.

O dashboard inclui filtros por turma/aluno/simulado, barras verticais e horizontais, pizza/rosca, mapa de calor, evolução diagnóstico→final, níveis de acompanhamento, plano de intervenção, relatório automático, análise das pesquisas e exportações CSV.

A sincronização dos simulados e das pesquisas ocorre quando houver internet. O conteúdo educativo e o progresso continuam disponíveis localmente no aparelho.


### Regras pedagógicas da v12
- A primeira conclusão de cada simulado define a única premiação daquele simulado: 0–1 acerto = 0; 2–3 = 1; 4–5 = 2; 6–7 = 3; 8–9 = 4; 10 = 5 figurinhas.
- O aluno pode refazer qualquer simulado quantas vezes precisar, mas não recebe novas figurinhas naquele simulado.
- Professor, Gestor Escolar e Administrador podem solicitar uma avaliação usando qualquer um dos 10 simulados para turma ou aluno específico.
- Avaliações solicitadas não exibem nota, gabarito ou correção ao estudante.
- A Pesquisa Inicial fica liberada desde o começo; a Pesquisa Final depende de liberação institucional.
- As duas pesquisas usam os mesmos 10 indicadores para medir mudança de percepção antes × depois.
