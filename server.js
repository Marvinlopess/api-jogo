const express = require("express");

const app = express();
// Permite que o simulador HTML aberto como arquivo local (origem "null")
// envie requisições para esta API durante os testes no navegador.
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});
app.use(express.json());

let jogos = [];
let proximoId = 1;

function responderErro(res, status, mensagem) {
  return res.status(status).json({ mensagem });
}

function validarTexto(valor, nomeCampo) {
  if (typeof valor !== "string" || valor.trim() === "") {
    return `${nomeCampo} é obrigatório e não pode ficar vazio`;
  }
  return null;
}

function validarPreco(valor) {
  if (typeof valor !== "number" || !Number.isFinite(valor) || valor <= 0) {
    return "O preço deve ser um número maior que zero";
  }
  return null;
}

function validarId(valor) {
  const id = Number(valor);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function corpoEhObjeto(res, body) {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    responderErro(res, 400, "O corpo da requisição deve ser um objeto JSON");
    return false;
  }
  return true;
}

// Rota extra: resumo do catálogo (antes de /jogos/:id para evitar conflito).
app.get("/jogos/resumo", (req, res) => {
  const quantidadeFinalizados = jogos.filter((jogo) => jogo.finalizado).length;
  const valorTotal = jogos.reduce((total, jogo) => total + jogo.preco, 0);

  res.status(200).json({
    quantidadeTotal: jogos.length,
    quantidadeFinalizados,
    quantidadeNaoFinalizados: jogos.length - quantidadeFinalizados,
    valorTotal: Number(valorTotal.toFixed(2)),
    precoMedio: jogos.length ? Number((valorTotal / jogos.length).toFixed(2)) : 0,
  });
});

// GET /jogos — lista e filtros por query.
app.get("/jogos", (req, res) => {
  const { plataforma, finalizado, genero, precoMinimo, precoMaximo, ordenar, ordem } = req.query;
  let resultado = [...jogos];

  if (plataforma !== undefined) {
    resultado = resultado.filter(
      (jogo) => jogo.plataforma.toLowerCase() === plataforma.trim().toLowerCase(),
    );
  }

  if (genero !== undefined) {
    resultado = resultado.filter(
      (jogo) => jogo.genero.toLowerCase() === genero.trim().toLowerCase(),
    );
  }

  if (finalizado !== undefined) {
    if (finalizado !== "true" && finalizado !== "false") {
      return responderErro(res, 400, "O filtro finalizado deve ser true ou false");
    }
    resultado = resultado.filter((jogo) => jogo.finalizado === (finalizado === "true"));
  }

  let minimo;
  let maximo;
  if (precoMinimo !== undefined) {
    minimo = Number(precoMinimo);
    if (!Number.isFinite(minimo) || minimo < 0) {
      return responderErro(res, 400, "precoMinimo deve ser um número maior ou igual a zero");
    }
    resultado = resultado.filter((jogo) => jogo.preco >= minimo);
  }
  if (precoMaximo !== undefined) {
    maximo = Number(precoMaximo);
    if (!Number.isFinite(maximo) || maximo < 0) {
      return responderErro(res, 400, "precoMaximo deve ser um número maior ou igual a zero");
    }
    resultado = resultado.filter((jogo) => jogo.preco <= maximo);
  }
  if (minimo !== undefined && maximo !== undefined && minimo > maximo) {
    return responderErro(res, 400, "precoMinimo não pode ser maior que precoMaximo");
  }

  if (ordenar !== undefined) {
    if (!["titulo", "preco"].includes(ordenar)) {
      return responderErro(res, 400, "O campo ordenar deve ser titulo ou preco");
    }
    if (ordem !== undefined && !["asc", "desc"].includes(ordem)) {
      return responderErro(res, 400, "O campo ordem deve ser asc ou desc");
    }
    const direcao = ordem === "desc" ? -1 : 1;
    resultado.sort((a, b) => {
      const comparacao = ordenar === "preco"
        ? a.preco - b.preco
        : a.titulo.localeCompare(b.titulo, "pt-BR", { sensitivity: "base" });
      return comparacao * direcao;
    });
  }

  return res.status(200).json(resultado);
});

// POST /jogos — cadastra um jogo; ID e situação inicial são definidos pela API.
app.post("/jogos", (req, res) => {
  if (!corpoEhObjeto(res, req.body)) return;
  const { titulo, genero, plataforma, preco } = req.body;

  for (const [valor, nome] of [
    [titulo, "O título"],
    [genero, "O gênero"],
    [plataforma, "A plataforma"],
  ]) {
    const erro = validarTexto(valor, nome);
    if (erro) return responderErro(res, 400, erro);
  }
  const erroPreco = validarPreco(preco);
  if (erroPreco) return responderErro(res, 400, erroPreco);

  if (Object.hasOwn(req.body, "id")) {
    return responderErro(res, 400, "O ID é gerado automaticamente e não deve ser enviado");
  }

  const tituloNormalizado = titulo.trim().toLocaleLowerCase("pt-BR");
  if (jogos.some((jogo) => jogo.titulo.trim().toLocaleLowerCase("pt-BR") === tituloNormalizado)) {
    return responderErro(res, 400, "Já existe um jogo cadastrado com esse título");
  }

  const novoJogo = {
    id: proximoId++,
    titulo: titulo.trim(),
    genero: genero.trim(),
    plataforma: plataforma.trim(),
    preco,
    finalizado: false,
  };
  jogos.push(novoJogo);
  return res.status(201).json(novoJogo);
});

// PATCH /jogos/:id — altera somente os campos enviados.
app.patch("/jogos/:id", (req, res) => {
  if (!corpoEhObjeto(res, req.body)) return;
  const id = validarId(req.params.id);
  const indice = id === null ? -1 : jogos.findIndex((jogo) => jogo.id === id);
  if (indice === -1) return responderErro(res, 404, "Jogo não encontrado");

  const camposPermitidos = ["titulo", "genero", "plataforma", "preco", "finalizado"];
  const camposRecebidos = Object.keys(req.body);
  if (camposRecebidos.length === 0) {
    return responderErro(res, 400, "Envie pelo menos um campo para atualizar");
  }
  if (Object.hasOwn(req.body, "id")) {
    return responderErro(res, 400, "O ID não pode ser alterado");
  }
  const campoDesconhecido = camposRecebidos.find((campo) => !camposPermitidos.includes(campo));
  if (campoDesconhecido) {
    return responderErro(res, 400, `O campo '${campoDesconhecido}' não pode ser atualizado`);
  }

  for (const campo of ["titulo", "genero", "plataforma"]) {
    if (Object.hasOwn(req.body, campo)) {
      const nomes = { titulo: "O título", genero: "O gênero", plataforma: "A plataforma" };
      const erro = validarTexto(req.body[campo], nomes[campo]);
      if (erro) return responderErro(res, 400, erro);
    }
  }
  if (Object.hasOwn(req.body, "preco")) {
    const erro = validarPreco(req.body.preco);
    if (erro) return responderErro(res, 400, erro);
  }
  if (Object.hasOwn(req.body, "finalizado") && typeof req.body.finalizado !== "boolean") {
    return responderErro(res, 400, "O campo finalizado deve ser true ou false");
  }

  const jogoAtualizado = {
    ...jogos[indice],
    ...req.body,
    titulo: req.body.titulo?.trim() ?? jogos[indice].titulo,
    genero: req.body.genero?.trim() ?? jogos[indice].genero,
    plataforma: req.body.plataforma?.trim() ?? jogos[indice].plataforma,
  };

  if (Object.hasOwn(req.body, "titulo")) {
    const tituloNormalizado = jogoAtualizado.titulo.toLocaleLowerCase("pt-BR");
    if (jogos.some((jogo) => jogo.id !== id && jogo.titulo.toLocaleLowerCase("pt-BR") === tituloNormalizado)) {
      return responderErro(res, 400, "Já existe um jogo cadastrado com esse título");
    }
  }

  jogos[indice] = jogoAtualizado;
  return res.status(200).json(jogoAtualizado);
});

// Rota extra: marca como finalizado sem enviar outros campos.
app.patch("/jogos/:id/finalizado", (req, res) => {
  const id = validarId(req.params.id);
  const jogo = id === null ? undefined : jogos.find((item) => item.id === id);
  if (!jogo) return responderErro(res, 404, "Jogo não encontrado");
  jogo.finalizado = true;
  return res.status(200).json(jogo);
});

// GET /jogos/:id — busca pelo ID.
app.get("/jogos/:id", (req, res) => {
  const id = validarId(req.params.id);
  const jogo = id === null ? undefined : jogos.find((item) => item.id === id);
  if (!jogo) return responderErro(res, 404, "Jogo não encontrado");
  return res.status(200).json(jogo);
});

// DELETE /jogos/:id — exclui pelo ID.
app.delete("/jogos/:id", (req, res) => {
  const id = validarId(req.params.id);
  const indice = id === null ? -1 : jogos.findIndex((jogo) => jogo.id === id);
  if (indice === -1) return responderErro(res, 404, "Jogo não encontrado");
  jogos.splice(indice, 1);
  return res.status(200).json({ mensagem: "Jogo removido com sucesso" });
});

// Respostas JSON para rotas não encontradas e erros de JSON inválido.
app.use((req, res) => responderErro(res, 404, "Rota não encontrada"));
app.use((erro, req, res, next) => {
  if (erro instanceof SyntaxError && erro.status === 400 && "body" in erro) {
    return responderErro(res, 400, "O JSON enviado está malformado");
  }
  console.error(erro);
  return responderErro(res, 500, "Erro interno do servidor");
});

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
  });
}

module.exports = app;
