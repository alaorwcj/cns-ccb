docker run --rm -v $(pwd):/app -w /app node:20-bullseye bash -lc "npx tsc --noEmit"
# RESPONSIVE_REPORT

Data: 2025-10-18
Autor: relatório gerado automaticamente (revisar e assinar)

Visão geral
-----------
Este documento contém uma auditoria manual de responsividade (mobile-first) para as rotas principais do frontend em `/frontend/app/src/routes`.
Escopo inicial: `products` (Produtos), `users` (Usuários), `stock/movements` (Movimentos de estoque), `orders` (Pedidos) e `dash` (Dashboard).

Metodologia
-----------
- Leitura e inspeção do código-fonte JSX/TSX para identificar padrões que causam overflow ou quebra de layout em telas pequenas.
- Verificação de uso de classes Tailwind mobile-first (ex.: `px-4 sm:px-6`), wrappers para tabelas e componentes com `min-w-0`/`overflow-x-auto`.
- Checagem de build/typings executada dentro de um container Node (`npx tsc --noEmit`) para garantir integridade dos arquivos editados.

Resumo Executivo
----------------
- Arquivos reparados: `ProductsList.tsx` (corrigido) e `Movements.tsx` (versão limpa aplicada).
- Tipagem/build: adicionado `@types/node` e `npx tsc --noEmit` executado com sucesso dentro de container Node.
- Estado atual: a maioria das rotas inspecionadas segue padrões mobile-first; há pontos de atenção menores descritos por rota abaixo.

Achados e recomendações por rota
--------------------------------

## 1) Produtos — `ProductsList.tsx`

Achados
- Uso correto de pattern mobile-first: container com `px-4 sm:px-6 lg:px-8` e `max-w-screen-xl mx-auto`.
- Tabela desktop está envolta por `ResponsiveTableWrapper` (bom). Existe versão de cartão para `md:hidden` — boa prática.

Pontos de atenção
- Certificar que `ResponsiveTableWrapper` define `overflow-x-auto` e `min-w-0` nas células que usam truncamento; sem `min-w-0` colunas podem forçar overflow.
- Botões com `px-3 py-1.5` estão aceitáveis; em telas muito pequenas recomenda-se aumentar a área tocável (`py-2` ou `px-3` + `py-2`).

Recomendações (snippets)
- A wrapper deve ser algo assim (confirme em `src/components/ResponsiveTableWrapper.tsx`):

```tsx
// garantia: wrapper com overflow e padding mobile-first
export default function ResponsiveTableWrapper({ children }: any) {
	return (
		<div className="overflow-x-auto -mx-4 sm:mx-0">
			<div className="min-w-full px-4 sm:px-0">{children}</div>
		</div>
	)
}
```

- Em células que contêm texto longo use `min-w-0` no container e `truncate` onde apropriado:

```html
<td className="px-4 py-3 text-sm min-w-0">
	<div className="truncate">{p.name}</div>
</td>
```

## 2) Usuários — `UsersList.tsx`

Achados
- Implementação já segue um padrão responsivo: cartões mobile (`block sm:hidden`) e tabela desktop (`hidden sm:block`).
- Tabela é colocada dentro de `overflow-x-auto` (bom).

Pontos de atenção
- As badges usam `text-xs` e `px-2 py-1` — ok. Em dispositivos muito pequenos, ações `px-3 py-1` podem ficar apertadas.
- Conferir se as colunas com listas/igrejas têm `min-w-0` para evitar wrap inesperado.

Recomendações
- Para garantir que colunas com conteúdo flexível não forcem overflow:

```html
<td className="p-3 min-w-0">
	<div className="truncate">{u.churches?.map(c => c.name).join(', ')}</div>
</td>
```

## 3) Movimentos (Estoque) — `Movements.tsx`

Achados
- Componente simples e mobile-first: usa listas verticais com cartões (boa experiência mobile).
- Não há tabela pesada aqui — excelente para mobile.

Pontos de atenção
- Se a lista crescer muito (itens longos), considerar adicionar `max-h` + `overflow-auto` no container para evitar scroll da página inteira.

Recomendações
- Para listas longas:

```html
<div className="space-y-3 max-h-[60vh] overflow-auto">
	{items.map(...)}
</div>
```

## 4) Pedidos — `OrdersList.tsx`

Achados
- Implementa versão mobile com cartões (`block sm:hidden`) e tabela desktop (`hidden sm:block`).
- Usa `overflow-x-auto` e `min-w-full` no table — OK.
- Em células de itens (`o.items`) já há um `min-w-0` e truncamento condicional — boa prática.

Pontos de atenção
- Botões de ação podem acumular; em telas pequenas a área de ações aparece como flex row e pode ficar apertada.

Recomendações
- Para ações em mobile, agrupar em um menu overflow (três pontos) pode melhorar usabilidade:

```tsx
<div className="sm:hidden">
	<button className="px-3 py-2 rounded">...menu</button>
	{/* abrir menu com ações: Ver, Editar, Aprovar, etc. */}
</div>
```

## 5) Dashboard — `Dashboard.tsx`

Achados
- Componentes de cards estão usando `grid` com `grid-cols-1 sm:grid-cols-3` (bom).
- Gráfico `react-chartjs-2` configurado com `maintainAspectRatio: false` e containers com `h-44 md:h-56` — bom para responsividade.

Pontos de atenção
- Certificar que o chart atualiza corretamente após mudança de tamanho (já existe listener).

Recomendações
- Garantir que caixas de texto longas tenham `truncate` e `min-w-0` quando dentro de células flexíveis.

Problemas transversais encontrados (aplicar em todo o projeto)
-------------------------------------------------------
- Tabelas: sempre envolver em wrapper com `overflow-x-auto` e aplicar `min-w-0` nas células que contêm textos truncáveis.
- Truncamento: prefira `max-w-full truncate` nas colunas que podem ter textos longos.
- Botões/Touch targets: garantir área mínima de clique (44x44) ajustando `py`/`px` em breakpoints menores.
- Safe area (iOS): usar `env(safe-area-inset-*)` no container principal, ex.:

```css
.app-root { padding-top: env(safe-area-inset-top); padding-bottom: env(safe-area-inset-bottom); }
```

Checagem manual e comandos úteis
--------------------------------
1) Rodar checagem de tipos (via container Node):

```bash
cd /root/app/cns-ccb/frontend/app
# instala deps (atualiza lockfile se necessário)
docker run --rm -v $(pwd):/app -w /app node:20-bullseye bash -lc "npm install"
# rodar TypeScript checker
docker run --rm -v $(pwd):/app -w /app node:20-bullseye bash -lc "npx tsc --noEmit"
```

2) Rodar app em dev (local com npm):

```bash
cd /root/app/cns-ccb/frontend/app
# se tiver npm local:
npm run dev
# ou, se preferir via container:
docker run --rm -it -p 5173:5173 -v $(pwd):/app -w /app node:20-bullseye bash -lc "npm install && npm run dev -- --host"
```

3) Verificação visual rápida usando DevTools:
- Abra Device Toolbar (Ctrl+Shift+M) e teste os tamanhos: mobile pequeno (360x800), tablet (768x1024), desktop (1366x768).
- Verifique overflow horizontal, textos truncados e botões tocáveis.

Prioridade de correções (curto prazo)
-----------------------------------
1. Garantir `ResponsiveTableWrapper` em todas as tabelas críticas (Produtos, Usuários, Pedidos).
2. Aplicar `min-w-0` e `truncate` onde necessário em células de texto.
3. Ajustar tamanhos de botões em breakpoints pequenos para respeitar toque mínimo.
4. Adicionar `max-h` + `overflow-auto` para listas muito longas (Movements, Orders view lists).

Próximos passos que posso executar para você
------------------------------------------
- Aplicar automaticamente as correções de baixo risco (ex.: envolver tabelas com `ResponsiveTableWrapper`, adicionar `min-w-0` em células selecionadas) e rodar `npx tsc --noEmit` após cada alteração. (Posso fazer isso agora em pequenas batches.)
- Gerar um anexo com comandos e exemplos de CSS para `safe-area` se desejar suporte iOS específico.

Notas finais
-----------
Removi qualquer etapa de Playwright conforme solicitado. Se quiser que eu aplique correções automáticas agora, diga "aplicar correções" e eu começo alterando os arquivos mais simples (tabelas e células) em lotes pequenos, rodando `tsc` entre alterações.

