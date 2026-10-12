const jogadores = document.createElement("div")
let socket: WebSocket
let apelido = ""

function atualizar(lista: any) {
   jogadores.innerHTML = ""
   for (const j of lista) {
      const nome = document.createElement("h3");
      nome.className = "nome";
      nome.innerText = j.apelido + (j.livre ? " 🟢" : " 🔴");

      const convidar = document.createElement("button");
      convidar.textContent = "Convidar";
      convidar.disabled = !j.livre;
      convidar.addEventListener("click", () => {
         socket.send(JSON.stringify({ tipo: "convidar", texto: j.apelido }));
      });

      const jogador = document.createElement("div");
      jogador.className = "jogador";
      jogador.appendChild(nome);
      jogador.appendChild(convidar);

      jogadores.appendChild(jogador);
   }
}

function lar() {
   const textoDeConvite = document.createElement("h1")
   const aceitar = document.createElement("button")
   aceitar.textContent = "Aceitar"
   const negar = document.createElement("button")
   negar.textContent = "Negar"
   const convite = document.createElement("dialog")
   convite.appendChild(textoDeConvite)
   convite.appendChild(aceitar)
   convite.appendChild(negar)

   const protocolo = window.location.protocol == "https:" ? "wss://" : "ws://"
   const wsUrl = protocolo + window.location.host + "/ws"
   socket = new WebSocket(wsUrl)
   socket.onmessage = (evento) => {
      const msg = JSON.parse(evento.data)
      console.log(evento.data)

      switch (msg.tipo) {
         case "atualizar":
            atualizar(msg.jogadores)
            break
         case "existe":
            alert(`${apelido} já existe.`)
            location.reload()
            break
         case "convite":
            textoDeConvite.textContent = `${msg.texto} te convida.`
            aceitar.addEventListener("click", () => {
               convite.close()
               socket.send(JSON.stringify({ tipo: "aceitar", texto: apelido }))
            })
            negar.addEventListener("click", () => {
               convite.close()
               socket.send(JSON.stringify({ tipo: "negar", text: apelido }))
            })
            convite.showModal()
            setTimeout(() => convite.close(), 15000)
            break
      }
   }

   const body = document.body;
   body.innerHTML = "";
   body.appendChild(convite)
   body.appendChild(jogadores);

   socket.onopen = () => {
      socket.send(JSON.stringify({ tipo: "login", texto: apelido }))
   }
}

function login() {
   // Página de registro.
   const rótulo = document.createElement("h1")
   rótulo.id = "rótulo"
   rótulo.textContent = "Jogo da Véia"

   const campo = document.createElement("input")
   campo.id = "campo"
   campo.type = "text"
   campo.placeholder = "Digite seu apelido"

   const enviar = document.createElement("button")
   enviar.id = "enviar"
   enviar.type = "submit"
   enviar.textContent = "Enviar"

   const erro = document.createElement("p")
   erro.id = "erro"

   const caixa = document.createElement("form")
   caixa.id = "registro"
   caixa.addEventListener("submit", (event) => {
      event.preventDefault()
      erro.textContent = ""

      if (campo.value.length < 3) {
         erro.textContent = "Deve ter no mínimo 3 caracteres."
         return
      }

      const norma = /^[a-z]+$/
      if (!norma.test(campo.value)) {
         erro.textContent =
            "Sem caracteres especiais," +
            " sem números," +
            " sem sublinhados," +
            " sem espaços," +
            " sem tudo!" +
            " Use caracteres de a-z, minúsculo!" +
            " (é proposital)"

         campo.focus()
         return
      }

      apelido = campo.value
      lar()
   });

   caixa.appendChild(rótulo)
   caixa.appendChild(campo)
   caixa.appendChild(enviar)
   caixa.appendChild(erro)

   // Mostrar.
   const body = document.body
   body.innerHTML = ""
   body.appendChild(caixa)
}

login()

