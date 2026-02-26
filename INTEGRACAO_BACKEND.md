# Integração com Backend

Este documento descreve a integração do frontend com o backend em produção.

## Configuração

A URL base da API está configurada em `src/config.ts` e pode ser sobrescrita usando a variável de ambiente `VITE_API_BASE_URL`.

Por padrão, a aplicação usa: `https://playground-backend-ijgt.onrender.com`

### Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto (baseado no `.env.example`) para configurar:

```env
VITE_API_BASE_URL=https://playground-backend-ijgt.onrender.com
```

## Estrutura da Integração

### Serviços Criados

1. **`src/services/api.ts`** - Cliente HTTP base com gerenciamento de tokens
2. **`src/services/apiEndpoints.ts`** - Mapeamento de todos os endpoints da API
3. **`src/services/authService.ts`** - Serviço de autenticação
4. **`src/services/entitiesService.ts`** - Serviços para todas as entidades (caixas, lançamentos, clientes, etc)
5. **`src/services/utils.ts`** - Funções utilitárias compartilhadas (ex: calcularValor)

### Componentes Atualizados

- ✅ `src/auth/AuthContext.tsx` - Autenticação com backend real
- ✅ `src/hooks/useCaixa.ts` - Hook atualizado para usar API
- ✅ `src/screens/Lancamento.tsx` - Criar lançamentos via API
- ✅ `src/screens/Acompanhamento.tsx` - Listar lançamentos via API
- ✅ `src/screens/caixa/Abertura.tsx` - Abrir caixa via API
- ✅ `src/screens/Clientes.tsx` - CRUD de clientes via API (lista, cadastro, edição, exclusão)

### Autenticação

O sistema usa autenticação baseada em tokens JWT:

1. Login: `POST /api/auth/login` com `{ username, password }`
2. Token armazenado no localStorage e enviado em todas as requisições via header `Authorization: Bearer <token>`
3. Logout: Limpa o token e chama `POST /api/auth/logout`

### Endpoints Esperados

O backend deve implementar os seguintes endpoints (conforme `src/services/apiEndpoints.ts`):

#### Autenticação
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Obter usuário atual

#### Caixas
- `GET /api/caixas` - Listar caixas
- `GET /api/caixas/:id` - Obter caixa
- `POST /api/caixas` - Criar caixa
- `PUT /api/caixas/:id` - Atualizar caixa
- `DELETE /api/caixas/:id` - Deletar caixa
- `POST /api/caixas/:id/abrir` - Abrir caixa
- `POST /api/caixas/:id/fechar` - Fechar caixa
- `POST /api/caixas/:id/sangria` - Sangria
- `POST /api/caixas/:id/suprimento` - Suprimento
- `GET /api/caixas/:id/movimentos` - Listar movimentos

#### Lançamentos
- `GET /api/lancamentos` - Listar lançamentos
- `GET /api/lancamentos/:id` - Obter lançamento
- `POST /api/lancamentos` - Criar lançamento
- `PUT /api/lancamentos/:id` - Atualizar lançamento
- `DELETE /api/lancamentos/:id` - Deletar lançamento
- `POST /api/lancamentos/:id/pagar` - Pagar lançamento
- `POST /api/lancamentos/:id/cancelar` - Cancelar lançamento

#### Clientes
- `GET /api/clientes` - Listar clientes
- `GET /api/clientes/:id` - Obter cliente
- `POST /api/clientes` - Criar cliente
- `PUT /api/clientes/:id` - Atualizar cliente
- `DELETE /api/clientes/:id` - Deletar cliente
- `GET /api/clientes/search?q=...` - Buscar clientes

#### Brinquedos
- `GET /api/brinquedos` - Listar brinquedos
- `GET /api/brinquedos/:id` - Obter brinquedo
- `POST /api/brinquedos` - Criar brinquedo
- `PUT /api/brinquedos/:id` - Atualizar brinquedo
- `DELETE /api/brinquedos/:id` - Deletar brinquedo

#### Formas de Pagamento
- `GET /api/formas-pagamento` - Listar formas de pagamento
- `GET /api/formas-pagamento/:id` - Obter forma de pagamento
- `POST /api/formas-pagamento` - Criar forma de pagamento
- `PUT /api/formas-pagamento/:id` - Atualizar forma de pagamento
- `DELETE /api/formas-pagamento/:id` - Deletar forma de pagamento

#### Parâmetros
- `GET /api/parametros` - Obter parâmetros
- `PUT /api/parametros` - Atualizar parâmetros

#### Usuários
- `GET /api/usuarios` - Listar usuários
- `GET /api/usuarios/:id` - Obter usuário
- `POST /api/usuarios` - Criar usuário
- `PUT /api/usuarios/:id` - Atualizar usuário
- `DELETE /api/usuarios/:id` - Deletar usuário

#### Estacionamentos
- `GET /api/estacionamentos` - Listar estacionamentos
- `GET /api/estacionamentos/:id` - Obter estacionamento
- `POST /api/estacionamentos` - Criar estacionamento
- `PUT /api/estacionamentos/:id` - Atualizar estacionamento
- `DELETE /api/estacionamentos/:id` - Deletar estacionamento

#### Lançamentos de Estacionamento
- `GET /api/lancamentos-estacionamento` - Listar lançamentos
- `GET /api/lancamentos-estacionamento/:id` - Obter lançamento
- `POST /api/lancamentos-estacionamento` - Criar lançamento
- `PUT /api/lancamentos-estacionamento/:id` - Atualizar lançamento
- `DELETE /api/lancamentos-estacionamento/:id` - Deletar lançamento
- `POST /api/lancamentos-estacionamento/:id/pagar` - Pagar lançamento
- `POST /api/lancamentos-estacionamento/:id/cancelar` - Cancelar lançamento

## Migração de MockDB para API

Alguns componentes ainda podem estar usando o `mockDb` diretamente. Para migrar:

1. Substituir imports de `mockDb` pelos serviços correspondentes em `entitiesService`
2. Substituir chamadas síncronas (`db.get()`, `db.update()`) por chamadas assíncronas aos serviços
3. Adicionar estados de loading e error handling
4. Usar hooks atualizados (ex: `useCaixa`) ao invés de acessar `db` diretamente

## Tratamento de Erros

O serviço de API (`src/services/api.ts`) lança erros do tipo `ApiError` com:
- `message`: Mensagem de erro
- `status`: Código HTTP (se disponível)

Os componentes devem tratar esses erros adequadamente, mostrando mensagens ao usuário quando necessário.

## Próximos Passos

1. Atualizar os demais componentes que ainda usam `mockDb` diretamente
2. Implementar refresh automático de dados onde necessário
3. Adicionar tratamento de erros mais robusto
4. Implementar retry automático para requisições que falharem
5. Adicionar indicadores de loading em todos os componentes

