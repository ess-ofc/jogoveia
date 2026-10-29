const diálogoDeConvite = document.createElement("dialog")
diálogoDeConvite.id = "diálogo-de-convite"

const textoDeConvite = document.createElement("h1")
textoDeConvite.id = "texto-de-convite"

const botãoAceitar = document.createElement("button")
botãoAceitar.id = "botão-aceitar"
botãoAceitar.textContent = "Aceitar"

const botãoNegar = document.createElement("button")
botãoNegar.id = "botão-negar"
botãoNegar.textContent = "Negar"

diálogoDeConvite.appendChild(textoDeConvite)
diálogoDeConvite.appendChild(botãoAceitar)
diálogoDeConvite.appendChild(botãoNegar)

const diálogoDeAlerta = document.createElement("dialog")
diálogoDeAlerta.id = "diálogo-de-alerta"

const textoDeAlerta = document.createElement("h2")
textoDeAlerta.id = "texto-de-alerta"

const botãoFecharAlerta = document.createElement("button")
botãoFecharAlerta.id = "botão-fechar-alerta"
botãoFecharAlerta.textContent = "OK"
botãoFecharAlerta.addEventListener("click", () => {
   diálogoDeAlerta.close()
})

diálogoDeAlerta.appendChild(textoDeAlerta)
diálogoDeAlerta.appendChild(botãoFecharAlerta)

const listaDeJogadores = document.createElement("div")
listaDeJogadores.id = "lista-de-jogadores"

const rótuloDoLobby = document.createElement("h2")
rótuloDoLobby.id = "rótulo-principal"
rótuloDoLobby.textContent = "Convide Alguém"

const tabuleiroDoJogo = document.createElement("div")
tabuleiroDoJogo.id = "tabuleiro-do-jogo"

const rótuloDeVez = document.createElement("h2")
rótuloDeVez.id = "rótulo-de-vez"

const botãoDesistir = document.createElement("button")
botãoDesistir.id = "botão-desistir"
botãoDesistir.textContent = "Desistir"
botãoDesistir.addEventListener("click", () => {
   socket.send(JSON.stringify({ tipo: "desistir" }))
})

let socket: WebSocket
let apelido = ""
let emjogo = false

function desenharTabuleiro(valores: number[][], vezAtual: string) {
   tabuleiroDoJogo.innerHTML = ""
   valores.forEach((linha, l) => {
      linha.forEach((coluna, c) => {
         const botão = document.createElement("button")
         botão.disabled = true
         if (coluna == 1) {
            botão.textContent = "x"
         }
         else if (coluna == 2) {
            botão.textContent = "o"
         }
         else if (vezAtual == apelido) {
            botão.textContent = ""
            botão.addEventListener("click", () => {
               socket.send(JSON.stringify({ tipo: "passe", x: l, y: c }))
            })
            botão.disabled = false
         }
         tabuleiroDoJogo.appendChild(botão)
      })
   })
}

function atualizarJogadores(lista: { apelido: string, livre: boolean }[]) {
   listaDeJogadores.innerHTML = ""
   listaDeJogadores.appendChild(rótuloDoLobby)
   for (const j of lista) {
      const nome = document.createElement("h3")
      nome.id = "nome-do-jogador"
      nome.textContent = j.apelido + (j.livre ? "" : " (em partida)")

      const containerJogador = document.createElement("div")
      containerJogador.id = "container-do-jogador"
      containerJogador.appendChild(nome)
      if (j.livre && j.apelido != apelido) {
         const botãoConvidar = document.createElement("button")
         botãoConvidar.id = "botão-convidar"
         botãoConvidar.textContent = "Convidar"
         botãoConvidar.addEventListener("click", () => {
            socket.send(JSON.stringify({ tipo: "convidar", texto: j.apelido }))
         })

         containerJogador.appendChild(botãoConvidar)
      }

      listaDeJogadores.appendChild(containerJogador)
   }
}

function mostrarTelaDeLobby() {
   const corpo = document.body
   corpo.innerHTML = ""
   corpo.appendChild(diálogoDeConvite)
   corpo.appendChild(diálogoDeAlerta)
   corpo.appendChild(listaDeJogadores)
}

function mostrarTelaDeJogo(valores: number[][], vezAtual: string) {
   desenharTabuleiro(valores, vezAtual)

   if (vezAtual == apelido) {
      rótuloDeVez.textContent = "Sua vez!"
   } else {
      rótuloDeVez.textContent = `Vez de ${vezAtual}`
   }

   const telaJogo = document.createElement("div")
   telaJogo.id = "tela-de-jogo"
   telaJogo.appendChild(rótuloDeVez)
   telaJogo.appendChild(tabuleiroDoJogo)
   telaJogo.appendChild(botãoDesistir)

   const corpo = document.body
   corpo.innerHTML = ""
   corpo.appendChild(diálogoDeAlerta)
   corpo.appendChild(telaJogo)
}

function mostrarTelaDeLogin() {
   const rótulo = document.createElement("h1")
   rótulo.id = "rótulo-principal"
   rótulo.textContent = "Jogo da Véia"

   const campoApelido = document.createElement("input")
   campoApelido.id = "campo-de-apelido"
   campoApelido.type = "text"
   campoApelido.placeholder = "Digite seu apelido"

   const botãoEnviar = document.createElement("button")
   botãoEnviar.id = "botão-enviar"
   botãoEnviar.type = "submit"
   botãoEnviar.textContent = "Enviar"

   const mensagemErro = document.createElement("p")
   mensagemErro.id = "mensagem-de-erro"

   const formulárioLogin = document.createElement("form")
   formulárioLogin.id = "formulário-de-login"
   formulárioLogin.addEventListener("submit", (evento) => {
      evento.preventDefault()
      mensagemErro.textContent = ""

      apelido = campoApelido.value.trim()
      if (apelido.length < 3) {
         mensagemErro.textContent = "Deve ter no mínimo 3 caracteres."
         campoApelido.focus()
         return
      }

      socket.send(JSON.stringify({ tipo: "login", texto: apelido }))
      mostrarTelaDeLobby()
   })

   formulárioLogin.appendChild(rótulo)
   formulárioLogin.appendChild(campoApelido)
   formulárioLogin.appendChild(botãoEnviar)
   formulárioLogin.appendChild(mensagemErro)

   const corpo = document.body
   corpo.innerHTML = ""
   corpo.appendChild(diálogoDeConvite)
   corpo.appendChild(diálogoDeAlerta)
   corpo.appendChild(formulárioLogin)

   campoApelido.focus()
}

const protocolo = window.location.protocol == "https:" ? "wss://" : "ws://"
const urlWebSocket = protocolo + window.location.host + "/ws"
socket = new WebSocket(urlWebSocket)

socket.onmessage = (evento) => {
   const mensagem = JSON.parse(evento.data)

   switch (mensagem.tipo) {
      case "atualizar":
         atualizarJogadores(mensagem.jogadores)
         break
      case "existe":
         mostrarTelaDeLogin()
         textoDeAlerta.textContent = `${apelido} já existe.`
         diálogoDeAlerta.showModal()
         break
      case "convite":
         textoDeConvite.textContent = `${mensagem.texto} te convida.`
         botãoAceitar.onclick = () => {
            diálogoDeConvite.close()
            socket.send(JSON.stringify({ tipo: "aceitar", texto: mensagem.texto }))
         }
         botãoNegar.onclick = () => {
            diálogoDeConvite.close()
            socket.send(JSON.stringify({ tipo: "negar", texto: mensagem.texto }))
         }
         diálogoDeConvite.showModal()
         setTimeout(() => diálogoDeConvite.close(), 15000)
         break
      case "tabuleiro":
         mostrarTelaDeJogo(mensagem.tab, mensagem.vez)
         break
      case "venceu":
         textoDeAlerta.textContent = "Você venceu!"
         diálogoDeAlerta.onclose = () => {
            mostrarTelaDeLobby()
         }
         diálogoDeAlerta.showModal()
         setTimeout(() => diálogoDeAlerta.close(), 10000)
         break
      case "perdeu":
         textoDeAlerta.textContent = "Você perdeu..."
         diálogoDeAlerta.onclose = () => {
            mostrarTelaDeLobby()
         }
         diálogoDeAlerta.showModal()
         setTimeout(() => diálogoDeAlerta.close(), 10000)
         break
      case "velha":
         textoDeAlerta.textContent = "É véia!"
         diálogoDeAlerta.onclose = () => {
            mostrarTelaDeLobby()
         }
         diálogoDeAlerta.showModal()
         setTimeout(() => diálogoDeAlerta.close(), 10000)
         break
   }
}

socket.onclose = () => {
   window.location.reload()
}

socket.onopen = () => {
   mostrarTelaDeLogin()
}

if ('serviceWorker' in navigator) {
   navigator.serviceWorker.register("./sw.js")
}
