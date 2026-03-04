# Investigação: Melhorias Perdidas

**Data:** 04/03/2025  
**Objetivo:** Verificar se houve perda de código/melhorias após o commit "new rule for tax cicles"

**Referência:** [Commit f75a922 "adjusts"](https://github.com/marcusnog/playground-app-prd/commit/f75a922f80c61b2ac2fe5c0c908e3d8f096557b8) — 29 arquivos, +2086 -535 linhas

---

## Resultado da Análise

### Melhorias do f75a922 — PRESENTES no código atual

As melhorias do commit f75a922 **estão presentes** no repositório atual. A comparação mostra que os únicos arquivos que diferem entre f75a922 e HEAD são:

| Arquivo | Motivo da diferença |
|---------|---------------------|
| `.github/workflows/static.yml` | Adicionado no merge 2572b41 |
| `package-lock.json` | Ajustes de dependências |
| `src/services/mockDb.ts` | Regra de cobrança 30min+3min |
| `src/services/utils.ts` | Regra de cobrança 30min+3min |

**Arquivos do f75a922 que permanecem idênticos (confirmado):**
- `ClienteAutocomplete.tsx`, `Clientes.tsx` (CRUD via API)
- `Relatorios.tsx`, `Parametros.tsx`, `Lancamento.tsx`, `Pagamento.tsx`
- `Abertura.tsx`, `Fechamento.tsx`, `Sangria.tsx`, `Suprimento.tsx`
- `Estacionamentos.tsx`, `FormasPagamento.tsx`, `Dashboard.tsx`, `Caixa.tsx`
- Dependências: jspdf, jspdf-autotable, xlsx (já no package.json)

### Backend

A comparação entre **c8dc1e3** ("adjusts") e **b33d0b5** ("new rule for tax cicle") mostra alterações apenas em:
- `parametros.controller.ts` — defaults de valorCicloMinutos
- `seed.ts` — valorCicloMinutos no seed

---

## Conclusão

O histórico do Git **não registra remoção de outras melhorias**. O commit de regra de cobrança alterou somente a lógica de cálculo e os valores padrão, conforme planejado.

### Possíveis Cenários

1. **Mudanças nunca commitadas** — melhorias feitas em sessões anteriores e descartadas (ex.: `git restore`, arquivo fechado sem salvar)
2. **Repositório clonado em estado diferente** — o `git reflog` mostra clone → commit; o clone pode ter vindo de um estado sem as melhorias
3. **Branch ou máquina diferente** — as melhorias podem estar em outro branch ou em outro ambiente
4. **Problema de funcionamento, não de código** — ex.: banco em produção ainda com valorCicloMinutos antigo; cache do navegador; etc.

---

## Se o app ainda parecer "quebrado" ou sem as melhorias

1. **Deploy no GitHub Pages** — rodar `npm run deploy` para publicar a versão atual.
2. **Cache do navegador** — testar em aba anônima ou limpar cache.
3. **Build local** — rodar `npm run build` para garantir que compila.
4. **Backend** — o CRUD de clientes e outras features do f75a922 dependem da API; conferir se o backend em produção está atualizado e acessível.

---

## Comandos de Verificação (para referência)

```bash
# Frontend: ver alterações desde "adjusts"
cd playground-app-prd
git diff f75a922..HEAD -- src/

# Backend: ver alterações desde "adjusts"
cd playground-backend
git diff c8dc1e3..HEAD -- backend/
```
