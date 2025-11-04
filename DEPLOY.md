# 🚀 Guia de Deploy na Vercel

## Checklist Pré-Deploy

- [x] Build funciona localmente (`npm run build`)
- [x] `vercel.json` configurado
- [x] `dist/` não está no `.gitignore` (mas será gerado automaticamente)
- [x] Todas as rotas testadas localmente

## Deploy Rápido (5 minutos)

### Opção 1: Via Interface Web (Mais Fácil)

1. **Acesse [vercel.com](https://vercel.com)** e faça login
2. **Clique em "Add New Project"**
3. **Importe seu repositório** do GitHub
4. **A Vercel detectará automaticamente:**
   - Framework: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. **Clique em "Deploy"**
6. **Pronto!** Seu site estará online em ~2 minutos

### Opção 2: Via CLI

```bash
# 1. Instalar CLI da Vercel
npm i -g vercel

# 2. Fazer login
vercel login

# 3. Deploy (desenvolvimento)
vercel

# 4. Deploy (produção)
vercel --prod
```

## Configurações Importantes

### ✅ Arquivo `vercel.json` já configurado

O arquivo `vercel.json` já está criado com:
- Rewrites para SPA (todas as rotas redirecionam para `/index.html`)
- Cache otimizado para assets estáticos
- Configurações de build automáticas

### 📦 Build

O build é executado automaticamente pela Vercel:
```bash
npm run build
```

Isso gera os arquivos em `dist/` que serão servidos.

## 🔍 Verificação Pós-Deploy

Após o deploy, verifique:

1. ✅ Homepage carrega corretamente
2. ✅ Rotas funcionam (ex: `/acompanhamento`, `/caixa`)
3. ✅ Sidebar funciona em mobile
4. ✅ Todas as funcionalidades estão operacionais

## 🔄 Atualizações Futuras

Qualquer push para a branch `main` (ou `master`) atualizará automaticamente o deploy na Vercel.

## 🌐 Domínio Personalizado

Para adicionar um domínio personalizado:

1. Vá em **Project Settings** → **Domains**
2. Adicione seu domínio
3. Siga as instruções de DNS

## 📊 Monitoramento

A Vercel fornece:
- Analytics de performance
- Logs de erro
- Métricas de uso
- Deploy previews para PRs

## 🆘 Problemas Comuns

### Build falha

- Verifique os logs no dashboard da Vercel
- Teste o build localmente: `npm run build`
- Verifique se todas as dependências estão no `package.json`

### Rotas não funcionam

- Confirme que o `vercel.json` está no repositório
- Verifique se os rewrites estão configurados corretamente

### Assets não carregam

- Verifique se os caminhos dos assets estão corretos
- Confirme que o `base` no `vite.config.ts` está correto (deve ser `/`)

## 📝 Notas

- O sistema usa `localStorage` - dados são armazenados localmente no navegador
- Não há variáveis de ambiente necessárias
- Build otimizado com code splitting automático

---

**Pronto para deploy! 🎉**

