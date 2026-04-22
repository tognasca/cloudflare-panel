# Cloudflare DNS Panel - TODO

## Schema & Backend
- [x] Schema: tabela `cf_settings` para armazenar token e zone_id do Cloudflare por usuário
- [x] Schema: tabela `command_history` para histórico do terminal
- [x] Migration SQL aplicada via drizzle-kit migrate
- [x] DB helpers: getCfSettings, saveCfSettings, saveCommandHistory, getCommandHistory
- [x] tRPC router: cloudflare.getSettings, cloudflare.saveSettings
- [x] tRPC router: cloudflare.listZones
- [x] tRPC router: cloudflare.getZoneDetails
- [x] tRPC router: cloudflare.pauseZone / cloudflare.unpauseZone
- [x] tRPC router: cloudflare.listDnsRecords
- [x] tRPC router: cloudflare.createDnsRecord
- [x] tRPC router: cloudflare.updateDnsRecord
- [x] tRPC router: cloudflare.deleteDnsRecord
- [x] tRPC router: terminal.executeCommand (cloudflare.executeCommand)
- [x] tRPC router: terminal.getHistory (cloudflare.getHistory)

## Frontend
- [x] Design system: CSS variables blueprint/CAD (azul royal, grade, linhas brancas)
- [x] DashboardLayout customizado com sidebar técnica (PanelLayout)
- [x] Página: Dashboard (visão geral das zonas)
- [x] Página: DNS Records (listagem, criar, editar, deletar)
- [x] Página: Serviços (subir/parar zonas)
- [x] Página: Terminal (console integrado com histórico)
- [x] Página: Configurações (token API Cloudflare editável)
- [x] Componente: DNSRecordForm (formulário dinâmico A, CNAME, MX, TXT, etc.)
- [x] Componente: StatusBadge (sucesso, erro, carregando - inline)
- [x] Componente: ZoneCard (card de zona com status)
- [x] Componente: TerminalConsole (input + output em tempo real)
- [x] Feedback em tempo real (toast + inline status)

## Testes
- [x] Teste: cloudflare.saveSettings valida token obrigatório
- [x] Teste: cloudflare.hasToken retorna false/true corretamente
- [x] Teste: cloudflare.getSettings mascara token
- [x] Teste: cloudflare.listZones lança erro sem token
- [x] Teste: cloudflare.__KEEP__ preserva token existente

## Entrega
- [x] Checkpoint salvo
- [x] Painel entregue ao usuário

## Feature: Seletor de Zona no Terminal
- [x] Backend: atualizar executeCommand para aceitar defaultZoneId opcional
- [x] Backend: adaptar comandos dns list/create/delete para usar zona padrão
- [x] Frontend: adicionar seletor de zona no Terminal
- [x] Frontend: exibir zona selecionada no prompt do terminal
- [x] Frontend: atualizar help text com sintaxe simplificada
- [x] Testes: validar executeCommand com zona padrão (13 testes passando)
- [x] Checkpoint: salvar versão com seletor de zona


## Feature: Sistema de Deployment Automático
- [x] Schema: tabela `sites_config` para armazenar sites do YAML
- [x] Schema: tabela `deployments` para histórico de deployments
- [x] Schema: tabela `deployment_logs` para logs em tempo real
- [x] DB helpers: getSitesConfig, saveSitesConfig, getDeployments, saveDeploymentLog
- [x] YAML Parser: ler arquivo YAML com estrutura (name, type, port, docker, domain)
- [x] Cloudflare Tunnel: criar/gerenciar tunnels para expor containers locais
- [x] Cloudflare Pages: upload de sites estáticos e builds
- [x] tRPC router: deployment.uploadYaml, deployment.listSites, deployment.startSite
- [x] tRPC router: deployment.stopSite, deployment.deployToTunnel, deployment.deployToPages
- [x] Frontend: página Deploy com upload YAML e dashboard de status
- [x] Frontend: cards de site com status, logs, botões start/stop
- [x] Testes: YAML parser, deployment flow (7 testes passando)
- [x] Sidebar: adicionado item DEPLOY
- [x] Checkpoint: salvar versão com deployment automático


## Feature: Visualizador de Logs em Tempo Real
- [x] Frontend: componente LogViewer para exibir logs de deployment
- [x] Frontend: modal/drawer para abrir logs de um site específico
- [x] Frontend: auto-scroll para novos logs
- [x] Frontend: filtro por nível (info, warn, error, success)
- [x] Frontend: botão "Ver Logs" em cada card de site
- [x] Backend: melhorar saveDeploymentLog para registrar logs de inicialização
- [x] Backend: adicionar deploymentId nas respostas dos mutations
- [x] Frontend: integração com Deploy page para abrir logs após ações
- [x] Testes: 23 testes passando (sem regressão)
- [x] Checkpoint: salvar versão com visualizador de logs
