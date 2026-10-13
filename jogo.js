"use strict";
const convite = document.createElement("dialog");
const jogadores = document.createElement("div");
jogadores.id = "jogadores";
const tabuleiro = document.createElement("div");
tabuleiro.id = "tab";
const tabZerada = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0]
];
let socket;
let apelido = "";
let vez = "";
function desenharTabuleiro(valores, vez) {
    tabuleiro.innerHTML = "";
    valores.forEach((linha, l) => {
        linha.forEach((coluna, c) => {
            const b = document.createElement("button");
            b.disabled = true;
            if (coluna == 1) {
                b.textContent = 'x';
            }
            else if (coluna == 2) {
                b.textContent = 'o';
            }
            else if (vez == apelido) {
                b.textContent = '';
                b.addEventListener('click', () => {
                    socket.send(JSON.stringify({ tipo: "passe", x: l, y: c }));
                });
                b.disabled = false;
            }
            tabuleiro.appendChild(b);
        });
    });
}
function atualizar(lista) {
    jogadores.innerHTML = "";
    for (const j of lista) {
        const nome = document.createElement("h3");
        nome.className = "nome";
        nome.innerText = j.apelido + (j.livre ? "" : " (em partida)");
        const jogador = document.createElement("div");
        jogador.className = "jogador";
        jogador.appendChild(nome);
        if (j.livre && j.apelido != apelido) {
            const convidar = document.createElement("button");
            convidar.textContent = "Convidar";
            convidar.addEventListener("click", () => {
                socket.send(JSON.stringify({ tipo: "convidar", texto: j.apelido }));
            });
            jogador.appendChild(convidar);
        }
        jogadores.appendChild(jogador);
    }
}
function lar() {
    const body = document.body;
    body.innerHTML = "";
    body.append(convite);
    body.appendChild(jogadores);
    body.appendChild(tabuleiro);
    desenharTabuleiro(tabZerada, "");
}
function login() {
    // Página de registro.
    const rótulo = document.createElement("h1");
    rótulo.id = "rótulo";
    rótulo.textContent = "Jogo da Véia";
    const campo = document.createElement("input");
    campo.id = "campo";
    campo.type = "text";
    campo.placeholder = "Digite seu apelido";
    const enviar = document.createElement("button");
    enviar.id = "enviar";
    enviar.type = "submit";
    enviar.textContent = "Enviar";
    const erro = document.createElement("p");
    erro.id = "erro";
    const caixa = document.createElement("form");
    caixa.id = "registro";
    caixa.addEventListener("submit", (event) => {
        event.preventDefault();
        erro.textContent = "";
        if (campo.value.length < 3) {
            erro.textContent = "Deve ter no mínimo 3 caracteres.";
            return;
        }
        const norma = /^[a-z]+$/;
        if (!norma.test(campo.value)) {
            erro.textContent =
                "Sem caracteres especiais," +
                    " sem números," +
                    " sem sublinhados," +
                    " sem espaços," +
                    " sem tudo!" +
                    " Use caracteres de a-z, minúsculo!" +
                    " (é proposital)";
            campo.focus();
            return;
        }
        apelido = campo.value;
        socket.send(JSON.stringify({ tipo: "login", texto: apelido }));
        lar();
    });
    caixa.appendChild(rótulo);
    caixa.appendChild(campo);
    caixa.appendChild(enviar);
    caixa.appendChild(erro);
    // Mostrar.
    const body = document.body;
    body.innerHTML = "";
    body.append(convite);
    body.appendChild(caixa);
    campo.focus();
}
const textoDeConvite = document.createElement("h1");
const aceitar = document.createElement("button");
aceitar.textContent = "Aceitar";
const negar = document.createElement("button");
negar.textContent = "Negar";
convite.appendChild(textoDeConvite);
convite.appendChild(aceitar);
convite.appendChild(negar);
const protocolo = window.location.protocol == "https:" ? "wss://" : "ws://";
const wsUrl = protocolo + window.location.host + "/ws";
socket = new WebSocket(wsUrl);
socket.onmessage = (evento) => {
    const msg = JSON.parse(evento.data);
    console.log(evento.data);
    switch (msg.tipo) {
        case "atualizar":
            atualizar(msg.jogadores);
            break;
        case "existe":
            alert(`${apelido} já existe.`);
            login();
            break;
        case "convite":
            textoDeConvite.textContent = `${msg.texto} te convida.`;
            aceitar.addEventListener("click", () => {
                convite.close();
                socket.send(JSON.stringify({ tipo: "aceitar", texto: msg.texto }));
            });
            negar.addEventListener("click", () => {
                convite.close();
                socket.send(JSON.stringify({ tipo: "negar", texto: msg.texto }));
            });
            convite.showModal();
            setTimeout(() => convite.close(), 15000);
            break;
        case "tabuleiro":
            desenharTabuleiro(msg.tab, msg.vez);
            break;
        case "fim":
            alert(msg.texto);
            desenharTabuleiro(tabZerada, "");
            break;
    }
};
socket.onopen = () => {
    login();
};
login();
