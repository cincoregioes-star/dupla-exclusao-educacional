# Changelog — Dupla Exclusão

## v12 — 05/09/2026
- Todos os 10 simulados permanecem liberados para estudo e podem ser refeitos.
- Banco confirmado com 150 questões: 15 por módulo; cada tentativa sorteia 10 questões e embaralha também as alternativas.
- Premiação alterada de pacotes para figurinhas diretas, com máximo de 5 por simulado.
- Regra proporcional: 0–1 acerto = 0; 2–3 = 1; 4–5 = 2; 6–7 = 3; 8–9 = 4; 10 = 5 figurinhas.
- A premiação é definida somente na primeira conclusão de cada simulado; refazer nunca gera novas figurinhas.
- Criado modo **Avaliação Institucional Solicitada** por simulado, destinado a turma ou aluno específico.
- Resultado da avaliação solicitada não é exibido ao estudante; fica restrito ao professor solicitante, Gestor Escolar e Administrador.
- Pesquisa 1 renomeada para **Pesquisa Inicial — Percepções sobre Racismo, Deficiência e Convivência Escolar** e liberada desde o início.
- Pesquisa 2 substituída por **Pesquisa Final — Mudanças de Percepção sobre Racismo, Deficiência e Convivência Escolar**.
- Pesquisa Inicial e Final usam os mesmos 10 indicadores, permitindo comparação antes × depois.
- Pesquisa Final somente é liberada mediante solicitação institucional para turma ou aluno.
- Dashboard passou a calcular mudança de percepção por pergunta entre Pesquisa Inicial e Pesquisa Final.
- Supabase recebeu tabelas e RLS para solicitações institucionais, submissões confidenciais de avaliações e liberação controlada da Pesquisa Final.
- Cache offline atualizado para v12.

## v11 — 04/09/2026
- Supabase institucional ativado para sincronização dos simulados e pesquisas.
- Área **Professor** convertida em **ACESSO INSTITUCIONAL**, bloqueada até autenticação válida.
- Perfis preparados: Administrador do Sistema, Gestor Escolar, Coordenação Pedagógica e Professor.
- Dashboard Institucional para Tomada de Decisão com filtros por turma/aluno/simulado.
- Gráficos de barras verticais, barras horizontais, pizza/rosca, mapa de calor, evolução e faixas de acompanhamento.
- Análise das duas pesquisas institucionais com gráficos e respostas abertas.
- Sincronização automática das pesquisas com o Supabase quando houver internet.
- Correção do travamento causado pelo MutationObserver dos simulados.
- Correção da tela de pesquisas para renderizar as 10 perguntas e o botão Salvar pesquisa.
- Simulados concluídos permanecem bloqueados para impedir obtenção repetida de figurinhas.
- RLS do Supabase endurecido com funções auxiliares movidas para schema privado.
- Cache offline atualizado para v11.
- Testes automatizados de navegação, bloqueio pré-login, login por perfil, dashboard, pesquisas, logout e bundle do APK concluídos sem erros.

## v4 — 04/09/2026
- Nomenclatura institucional do Prof. Cleilson Paiva atualizada para **Professor de História • Gestor Escolar**.
- Créditos mantidos proporcionais entre os idealizadores do projeto.
- Cache PWA atualizado para v4 para garantir a exibição da nova identificação.


## v3 — 04/09/2026
- Nome do responsável pelo projeto digital atualizado para **Prof. Carlos André Tavares de Lima**.
- Criada seção inferior **Idealizadores do projeto**, com dois cartões de mesmo peso visual.
- Prof. Cleilson Paiva identificado como **Professor de História e Gestor Escolar**, com idealização e orientação pedagógica.
- Prof. Carlos André Tavares de Lima identificado como **Professor de Geografia, Administração Escolar e Criador de Projetos Digitais Educativos**, responsável pelo projeto digital e desenvolvimento.
- Crédito do game atualizado para o nome completo.
- Cache PWA atualizado para v3.

## v2 — 04/09/2026
- Recuperadas e integradas as 36 figurinhas originais (`01.webp` a `36.webp`) do repositório GitHub do projeto.
- Recuperado e integrado o brasão da E.M.E.F. Pedro de Queiroz Ferreira.
- Mantido o game original dentro do aplicativo.
- Cache PWA ampliado: botão **Preparar uso offline** agora armazena as 36 figurinhas, game, ícones, QR Codes e arquivos principais.
- Mantidos 10 simulados e banco de 150 questões.
- Mantido o embaralhamento automático das alternativas, eliminando o padrão anterior em que as respostas corretas ficavam sempre na letra A.
- Mantido o painel de progresso do aluno e o painel do professor.
- Mantida a estrutura de sincronização opcional via Supabase.
- Projeto preparado para Web/PWA e empacotamento Android via Capacitor.

## v1 — 03/09/2026
- Primeira reconstrução moderna do projeto com PWA, 10 simulados, painel pedagógico e estrutura Android.
