# Playground - Sistema de Gestão para Parque Infantil

Sistema completo de gestão para parques infantis com controle de caixa, lançamentos, clientes e relatórios.

## 🚀 Deploy na Vercel

### Método 1: Deploy via GitHub (Recomendado)

1. **Faça push do código para o GitHub:**
   ```bash
   git add .
   git commit -m "Preparar para deploy na Vercel"
   git push origin main
   ```

2. **Conecte com a Vercel:**
   - Acesse [vercel.com](https://vercel.com)
   - Faça login com sua conta GitHub
   - Clique em "Add New Project"
   - Importe o repositório do GitHub
   - A Vercel detectará automaticamente as configurações do `vercel.json`

3. **Configurações automáticas:**
   - Framework: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

4. **Deploy:**
   - Clique em "Deploy"
   - Aguarde o build completar
   - Pronto! Seu site estará online

### Método 2: Deploy via CLI da Vercel

1. **Instale a CLI da Vercel:**
   ```bash
   npm i -g vercel
   ```

2. **Faça login:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   vercel
   ```

4. **Para produção:**
   ```bash
   vercel --prod
   ```

## 📦 Configuração

O projeto já está configurado com `vercel.json` que inclui:

- ✅ Rewrites para SPA (Single Page Application)
- ✅ Cache otimizado para assets
- ✅ Configurações de build automáticas

## 🛠️ Desenvolvimento Local

```bash
# Instalar dependências
npm install

# Executar em desenvolvimento
npm run dev

# Build para produção
npm run build

# Preview do build
npm run preview
```

## 📁 Estrutura do Projeto

```
playground-app/
├── src/
│   ├── screens/        # Telas da aplicação
│   ├── services/       # Serviços e banco de dados mock
│   ├── auth/          # Autenticação
│   ├── router.tsx     # Configuração de rotas
│   └── main.tsx       # Entry point
├── dist/              # Build de produção (gerado)
├── vercel.json        # Configuração da Vercel
└── package.json       # Dependências e scripts
```

## 🔧 Tecnologias

- **React 18** - Biblioteca UI
- **TypeScript** - Tipagem estática
- **Vite** - Build tool
- **React Router DOM** - Roteamento
- **LocalStorage** - Persistência de dados

## 📝 Notas Importantes

- O sistema usa `localStorage` para persistência de dados
- Todos os dados são armazenados localmente no navegador
- Para produção, considere migrar para um backend real

## 🌐 Variáveis de Ambiente

Não são necessárias variáveis de ambiente para o funcionamento básico.

## 📞 Suporte

Para problemas ou dúvidas sobre o deploy, consulte a [documentação da Vercel](https://vercel.com/docs).
