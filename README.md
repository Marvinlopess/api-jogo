# API de Catálogo de Jogos

API REST local em Node.js e Express para cadastrar, consultar, filtrar, atualizar e remover jogos. O projeto contém somente a API; **o arquivo `SimuladorRequest.html` é seu e fica fora da pasta do projeto**. A API permite chamadas CORS para que o navegador aceite requisições enviadas pelo simulador aberto localmente (`file://`).

Os jogos ficam em um array na memória enquanto o servidor estiver executando. Ao reiniciá-lo, o catálogo volta a ficar vazio.

## Executar a API no VS Code

1. Abra a pasta `api-catalogo-jogos` no VS Code.
2. Abra **Terminal → Novo Terminal**.
3. Instale as dependências e inicie o servidor:

```bash
npm install
npm start
```

Mantenha esse terminal aberto. A API estará disponível na URL base:

```text
http://localhost:3000
```

## Testar usando seu `SimuladorRequest.html`

1. Com a API em execução, abra **o arquivo `SimuladorRequest.html` que você já possui** no navegador.
2. No campo **URL base**, informe `http://localhost:3000`.
3. No campo **Endpoint**, informe uma rota da API, por exemplo `/jogos` ou `/jogos/1`.
4. Escolha o método HTTP. Para `POST` e `PATCH`, informe o corpo JSON; o simulador define o cabeçalho `Content-Type: application/json` quando necessário.
5. Clique em **Enviar requisição** e confira o status HTTP e o JSON retornado.

O servidor inclui os cabeçalhos CORS e responde às requisições `OPTIONS` de preflight. Isso permite que o simulador enviado como arquivo local (`file://`, origem `null`) acesse a API. Não é necessário copiar o HTML para dentro do projeto nem instalar extensão no navegador.

### Roteiro sugerido para evidências dos testes

Use o mesmo arquivo simulador para fazer estes testes e capture as respostas/status que o professor solicitar:

1. **Listar:** método `GET`, endpoint `/jogos`. Esperado: `200` e `[]` no início.
2. **Cadastrar:** método `POST`, endpoint `/jogos`, corpo:

   ```json
   {
     "titulo": "Hades",
     "genero": "Roguelike",
     "plataforma": "PC",
     "preco": 73.99
   }
   ```

   Esperado: `201`; o retorno contém ID gerado pela API e `finalizado: false`.

3. **Buscar:** método `GET`, endpoint `/jogos/1` (ou o ID recebido no cadastro). Esperado: `200`.
4. **Filtrar:** método `GET`, endpoint `/jogos?plataforma=pc&finalizado=false`. Esperado: `200` e o jogo criado.
5. **Atualizar:** método `PATCH`, endpoint `/jogos/1`, corpo `{ "finalizado": true }`. Esperado: `200`; os demais campos permanecem.
6. **Validar:** método `POST`, endpoint `/jogos`, envie um título vazio ou apenas com espaços. Esperado: `400` com uma mensagem explicativa.
7. **ID inexistente:** método `GET`, endpoint `/jogos/9999`. Esperado: `404`.
8. **Excluir:** método `DELETE`, endpoint `/jogos/1`. Esperado: `200`; se consultar o mesmo ID outra vez, esperado `404`.

## Formato de um jogo

```json
{
  "id": 1,
  "titulo": "Minecraft",
  "genero": "Sobrevivência",
  "plataforma": "PC",
  "preco": 89.9,
  "finalizado": false
}
```

O ID é gerado automaticamente. A situação inicial é sempre `finalizado: false`.

## Rotas obrigatórias

| Método | Caminho | Descrição | Respostas principais |
|---|---|---|---|
| GET | `/jogos` | Lista jogos e aceita filtros | 200, 400 |
| GET | `/jogos/:id` | Busca pelo ID | 200, 404 |
| POST | `/jogos` | Cadastra um jogo | 201, 400 |
| PATCH | `/jogos/:id` | Atualiza somente os campos enviados | 200, 400, 404 |
| DELETE | `/jogos/:id` | Remove um jogo | 200, 404 |

## Filtros e desafios extras

- Plataforma e gênero: comparação sem diferença entre maiúsculas/minúsculas.
- Situação: `?finalizado=true` ou `?finalizado=false`.
- Faixa de preço: `?precoMinimo=20&precoMaximo=100`.
- Ordenação: `?ordenar=titulo&ordem=asc` ou `?ordenar=preco&ordem=desc`.
- Títulos repetidos são recusados, ignorando maiúsculas/minúsculas e espaços nas extremidades.
- `PATCH /jogos/:id/finalizado` marca um jogo como finalizado.
- `GET /jogos/resumo` retorna quantidades, valor total e preço médio.
- Rotas inexistentes e JSON malformado retornam mensagens em JSON.

## Estrutura do projeto

```text
api-catalogo-jogos/
├── package.json
├── package-lock.json
├── server.js
└── README.md
```

## Entrega

Preencha sua identificação conforme solicitado pelo professor. Crie um repositório Git e envie o código, o README, o histórico de commits e as evidências dos testes feitos no seu simulador. Exemplo inicial:

```bash
git init
git add .
git commit -m "configura projeto express"
```

Depois, crie o repositório no GitHub e siga as instruções do GitHub para conectar e enviar (`git remote add origin ...` e `git push -u origin main`). Não coloque senha ou token no repositório.
