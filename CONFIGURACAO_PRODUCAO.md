# ⚙️ Configuração para Produção

Este guia explica como configurar o frontend para fazer requisições ao backend em produção.

## 🔧 Configuração da URL da API

A URL da API é configurada em `src/config.ts` e pode ser sobrescrita usando variáveis de ambiente.

### Comportamento Automático

O sistema detecta automaticamente o ambiente:

- **Desenvolvimento** (`npm run dev`): Usa `http://localhost:3001`
- **Produção** (build): Usa `https://playground-backend-ijgt.onrender.com`

### Configuração Manual via Variável de Ambiente

Para sobrescrever o comportamento padrão, crie um arquivo `.env` na raiz do projeto:

```env
# Para desenvolvimento local (backend em localhost)
VITE_API_BASE_URL=http://localhost:3001

# Para produção (backend no Render)
VITE_API_BASE_URL=https://seu-backend.onrender.com
```

**Importante:** 
- Variáveis de ambiente no Vite devem começar com `VITE_`
- O arquivo `.env` não deve ser commitado (já está no `.gitignore`)
- Após alterar o `.env`, reinicie o servidor de desenvolvimento

## 🚀 Deploy na Vercel

### Configuração de Variáveis de Ambiente

1. Acesse o painel da Vercel
2. Vá em **Settings** → **Environment Variables**
3. Adicione a variável:

```
VITE_API_BASE_URL=https://seu-backend.onrender.com
```

4. Selecione os ambientes (Production, Preview, Development)
5. Faça um novo deploy

### Build Automático

O `vercel.json` já está configurado para usar o script `build:vercel` que otimiza o build para produção.

## 🔍 Verificação

Após configurar, verifique se está funcionando:

1. **No console do navegador** (F12 → Network):
   - As requisições devem ir para a URL configurada
   - Não devem aparecer erros de CORS

2. **Teste de conexão:**
   ```javascript
   // No console do navegador
   fetch('https://seu-backend.onrender.com/health')
     .then(r => r.json())
     .then(console.log)
   ```

## 📝 Checklist de Deploy

- [ ] Backend rodando no Render com URL acessível
- [ ] Variável `VITE_API_BASE_URL` configurada na Vercel (se necessário)
- [ ] CORS configurado no backend para permitir origem do frontend
- [ ] Teste de login funcionando
- [ ] Teste de requisições de dados funcionando

## 🐛 Troubleshooting

### Erro: "Network Error" ou "CORS"

**Causa:** O backend não está permitindo requisições do frontend.

**Solução:** Configure `CORS_ORIGIN` no backend (Render) com a URL do frontend:
```
CORS_ORIGIN=https://seu-frontend.vercel.app
```

### Erro: "Failed to fetch"

**Causa:** URL do backend incorreta ou backend offline.

**Solução:** 
1. Verifique se a URL está correta
2. Teste a URL diretamente no navegador: `https://seu-backend.onrender.com/health`
3. Verifique os logs do backend no Render

### Requisições indo para localhost em produção

**Causa:** Variável de ambiente não configurada ou build antigo.

**Solução:**
1. Configure `VITE_API_BASE_URL` na Vercel
2. Faça um novo build/deploy
3. Limpe o cache do navegador

## 📚 Referências

- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
