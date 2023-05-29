const express = require("express");
const app = express();
const { WebhookClient } = require("dialogflow-fulfillment");
const functions = require("firebase-functions");
const { Card, Suggestion } = require("dialogflow-fulfillment");
const { Payload } = require("dialogflow-fulfillment");
const axios = require("axios");
const https = require("https");
const fetch = require("node-fetch");
const syncfetch = require("sync-fetch");
const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");
const { NodeSSH } = require("node-ssh");
var Gerencianet = require("gn-api-sdk-node");

const ssh = new NodeSSH();

require("dotenv").config();

const ip_server = "209.14.68.172";
const password = "ma101287";
const valorP1 = "0.01";
const valorP2 = "28.00";
const valorP3 = "42.00";

app.get("/", function (req, res) {
  res.send("Hello World");
});

app.post("/webhook", express.json(), function (req, res) {
  if (!req.body.queryResult.fulfillmentMessages) return;
  req.body.queryResult.fulfillmentMessages =
    req.body.queryResult.fulfillmentMessages.map((m) => {
      if (!m.platform) m.platform = "PLATFORM_UNSPECIFIED";
      return m;
    });
  const agent = new WebhookClient({ request: req, response: res });
  console.log("Dialogflow Request headers: " + JSON.stringify(req.headers));
  console.log("Dialogflow Request body: " + JSON.stringify(req.body));
  const appointment_type = agent.parameters.AppointmentType;

  function PegaTelefone() {
    let anyString = agent.session;
    anyString = anyString.substring(anyString.length - 13);
    anyString = anyString.replace(/\//g, "");
    anyString = anyString.replace(/-/gi, "");
    let numero = anyString.replace(/\+/gi, "");
    return numero;
  }

  function getRandomIntInclusive(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function salvapalavra(arquivo, palavra) {
    var palavraesp = palavra.concat("\n");
    fs.appendFile(arquivo, palavraesp, function (err) {
      if (err) return console.log(err);
    });
  }

  function criaarquivo(arquivo) {
    try {
      const data = fs.writeFileSync(arquivo, "INICIO\n");
    } catch (err) {
      console.error(err);
    }
  }

  function letexto(arquivo, telefone, tuserdate) {
    try {
      const data = fs.readFileSync(arquivo, "utf8");
      const datareg = data.split(/\n/g);
      let ret = datareg.indexOf(telefone);
      if (ret < 0) {
        salvapalavra(arquivo, telefone);
        let usuario = "u" + getRandomIntInclusive(100, 999);
        let senha = "s" + getRandomIntInclusive(100, 999);
        let limite = 1;
        let tempo = 3;
        ssh
          .connect({
            host: `${ip_server}`,
            username: "root",
            password: `${password}`,
          })
          .then(function () {
            ssh
              .execCommand(
                `touch cmds/tt${telefone};
                  echo "useradd -M -N -s /bin/false ${usuario} -e ${tuserdate} > /dev/null 2>&1" > cmds/tt${telefone};
                  echo '(echo "${senha}";echo "${senha}") | passwd ${usuario} > /dev/null 2>&1' >> cmds/tt${telefone};
                  echo 'echo "${senha}" > /etc/SSHPlus/senha/${usuario}' >> cmds/tt${telefone};
                  echo 'echo "${usuario} ${limite}" >> /root/usuarios.db' >> cmds/tt${telefone};
                  echo '#!/bin/bash' > /etc/SSHPlus/userteste/${usuario}.sh;
                  echo 'pkill -f "${usuario}"' >> /etc/SSHPlus/userteste/${usuario}.sh;
                  echo 'userdel --force ${usuario}' >> /etc/SSHPlus/userteste/${usuario}.sh;
                  echo 'grep -v ^${usuario}[[:space:]] /root/usuarios.db > /tmp/ph ; cat /tmp/ph > /root/usuarios.db' >> /etc/SSHPlus/userteste/${usuario}.sh;
                  echo 'rm /etc/SSHPlus/senha/${usuario} > /dev/null 2>&1' >> /etc/SSHPlus/userteste/${usuario}.sh;
                  echo 'rm -rf /etc/SSHPlus/userteste/${usuario}.sh' >> /etc/SSHPlus/userteste/${usuario}.sh;
                  echo 'chmod +x /etc/SSHPlus/userteste/${usuario}.sh' >> cmds/tt${telefone};
                  echo 'at -f /etc/SSHPlus/userteste/${usuario}.sh now + ${tempo} hour > /dev/null 2>&1' >> cmds/tt${telefone};
                  chmod 777 cmds/tt${telefone};
                  ./cmds/tt${telefone}`,
                { cwd: "/root" }
              )
              .then(function (result) {
                console.log("STDOUT: " + result.stdout);
                console.log("STDERR: " + result.stderr);
              });
          });
        agent.add(
          `✅ *Teste Criado com sucesso!* ✅\n\nUSUARIO: _${usuario}_\nSENHA: _${senha}_\n\n⏳ Expira em: ${tempo} Horas`
        );
        /////////////
      } else {
        agent.add("Você já criou *SSH* hoje!");
      }
    } catch (err) {
      console.error(err);
      agent.add("Erro!!! Tente novamente mais tarde!");
    }
  }

  function fallback(agent) {
    agent.add(`Alterar para intent Welcome.`);
    agent.setFollowupEvent("Welcome");
  }

  function op01(agent) {
    var hoje = new Date();
    var datadehoje =
      hoje.getFullYear() +
      ("0" + (hoje.getMonth() + 1)).slice(-2) +
      ("0" + hoje.getDate()).slice(-2);
    var tuserdate =
      hoje.getFullYear() +
      "/" +
      ("0" + (hoje.getMonth() + 1)).slice(-2) +
      "/" +
      ("0" + (hoje.getDate() + 1)).slice(-2);
    var arquivo = `testes/${datadehoje}`;
    let telefone = PegaTelefone();
    if (fs.existsSync(arquivo)) {
      letexto(arquivo, telefone, datadehoje);
    } else {
      criaarquivo(arquivo, telefone);
      letexto(arquivo, telefone, tuserdate);
    }
  }

  function op02_3(agent) {
    let telefone = PegaTelefone();
    let plano = agent.parameters.plano;
    var valorP;
    switch (plano) {
      case "1":
        valorP = valorP1;
        break;
      case "2":
        valorP = valorP2;
        break;
      case "3":
        valorP = valorP3;
        break;
      default:
        console.log(`Desculpe, não temos mais disponível o plano ${plano}.`);
     }
    var options = {
      sandbox: false,
      client_id: "Client_Id_8470541eb931c257b444c4736c2b1229337f1dd2",
      client_secret: "Client_Secret_a91897dbcffb9f94ee6463534d5e940b49930fba",
      pix_cert: "pix/producao-400653-ssh30dias.p12",
    };
    let body = {
      calendario: {
        expiracao: 3600,
      },
      devedor: {
        cpf: "12345678909",
        nome: telefone,
      },
      valor: {
        original: `${valorP}`,
      },
      chave: "4ac2258f-615f-4236-a35f-9357fe333d6d",
    };
    var hoje = new Date();
    var datadehoje =
      hoje.getFullYear() +
      ("0" + (hoje.getMonth() + 1)).slice(-2) +
      ("0" + hoje.getDate()).slice(-2) +
      ("0" + hoje.getHours()).slice(-2) +
      ("0" + hoje.getMinutes()).slice(-2) +
      ("0" + hoje.getSeconds()).slice(-2);
    let randtxid = `${plano}` + `SSH` + telefone + datadehoje + `yhs`;
    let params = {
      txid: randtxid,
    };
    let gerencianet = new Gerencianet(options);
    return gerencianet
      .pixCreateCharge(params, body)
      .then((resposta) => {
        let params2 = {
          id: resposta.loc.id,
        };
        var arquivo = `pagos/${datadehoje}`;
        arquivo = arquivo.slice(0, -6);
        let palavra = telefone + " " + resposta.txid;
        if (fs.existsSync(arquivo)) {
          salvapalavra(arquivo, palavra);
        } else {
          criaarquivo(arquivo);
          salvapalavra(arquivo, palavra);
        }
        let gerencianet2 = new Gerencianet(options);
        return gerencianet2
          .pixGenerateQRCode(params2)
          .then((resposta2) => {
            agent.add(
              `Enviando seu QR-Code\nCopie e Cole em seu app de pagamento\nVálido por 60 minutos\n\nApós o pagamento, utilize a opção *5* do menu inicial para visualizar seu login e senha`
            );
            agent.add(resposta2.qrcode);
          })
          .catch((error) => {
            console.log(error);
          });
      })
      .catch((error) => {
        console.log(error);
      });
  }

  function op03(agent) {
    agent.add(`Clique no link abaixo para baixar seu aplicativo:`);
    agent.add(
      `https://play.google.com/store/apps/details?id=com.vpnlight10.vpn`
    );
  }

  function op04(agent) {
    agent.add(`Clique no link abaixo para suporte:`);
    agent.add(`https://wa.me/5599991599329`);
  }

  function op05(agent) {
    let telefone = PegaTelefone();
    var hoje = new Date();
    var datadehoje =
      hoje.getFullYear() +
      ("0" + (hoje.getMonth() + 1)).slice(-2) +
      ("0" + hoje.getDate()).slice(-2);
    let arquivo = "pagos/" + datadehoje;
    if (fs.existsSync(arquivo)) {
      console.log(arquivo);
      var data = fs.readFileSync(arquivo, "utf8");
      var datareg = data.split(/\n/g);
      var found = datareg.find((element) => element.split(" ")[0] == telefone);
      if (found) {
        var txid = found.split(" ")[1];
      }
    } else {
      criaarquivo(arquivo);
    }
    var options = {
      sandbox: false,
      client_id: "Client_Id_ada8971f55d0e9b46ffb055d9ba22b51e8ce3573",
      client_secret: "Client_Secret_db17f575c78e6e9112d1bb408083d8f971cafd34",
      pix_cert: "pix/producao-400629-topnet.p12",
    };
    var datadehoje2 =
      hoje.getFullYear() +
      "-" +
      ("0" + (hoje.getMonth() + 1)).slice(-2) +
      "-" +
      ("0" + hoje.getDate()).slice(-2);
    let params = {
      inicio: datadehoje2 + "T00:00:00Z",
      fim: datadehoje2 + "T23:59:59Z",
    };
    let gerencianet = new Gerencianet(options);
    return gerencianet
      .pixListCharges(params)
      .then((resposta) => {
        found = resposta.cobs.find((element) => element.txid == txid);
        if (!found) {
          agent.add("Não há registro de pagamento no banco.");
        } else {
          if (found.status == "CONCLUIDA") {
            let arquivolog = "logins/" + datadehoje;
            var fazerlogin = "0";
            if (fs.existsSync(arquivolog)) {
              var datalog = fs.readFileSync(arquivolog, "utf8");
              var datareglog = datalog.split(/\n/g);
              var foundlog = datareglog.find(
                (element) => element.split(" ")[0] == telefone
              );
              console.log("FoundLOG: ", foundlog);
              if (!foundlog) {
                fazerlogin = "1";
                console.log("Não existe foundlog. fazerlogin: ", fazerlogin);
              } else {
                console.log("SIM. Existe foundlog. fazerlogin: ", fazerlogin);
              }
            } else {
              fazerlogin = "1";
              console.log("Não existe arquivo. fazerlogin: ", fazerlogin);
            }
            console.log("fazerlogin: ", fazerlogin);
            if (fazerlogin == "1") {
              let usuario = "u" + getRandomIntInclusive(100, 999);
              let senha = "s" + getRandomIntInclusive(100, 999);
              let limite = found.txid[0];
              let palavra =
                telefone + " " + usuario + " " + senha + " " + limite;
              if (fs.existsSync(arquivolog)) {
                salvapalavra(arquivolog, palavra);
              } else {
                criaarquivo(arquivolog);
                salvapalavra(arquivolog, palavra);
              }
              //FAZENDO SSH
              var tuserdate =
                hoje.getFullYear() +
                "/" +
                ("0" + (hoje.getMonth() + 1)).slice(-2) +
                "/" +
                ("0" + (hoje.getDate() + 30)).slice(-2);
              ssh
                .connect({
                  host: `${ip_server}`,
                  username: "root",
                  password: `${password}`,
                })
                .then(function () {
                  ssh
                    .execCommand(
                      `touch cmds/cc${telefone};
                      echo "useradd -M -N -s /bin/false ${usuario} -e ${tuserdate} > /dev/null 2>&1" > cmds/cc${telefone};
                      echo '(echo "${senha}";echo "${senha}") | passwd ${usuario} > /dev/null 2>&1' >> cmds/cc${telefone};
                      echo 'echo "${senha}" > /etc/SSHPlus/senha/${usuario}' >> cmds/cc${telefone};
                      echo 'echo "${usuario} ${limite}" >> /root/usuarios.db' >> cmds/cc${telefone};
                      chmod 777 cmds/cc${telefone};
                      ./cmds/cc${telefone}`,
                      { cwd: "/root" }
                    )
                    .then(function (result) {
                      console.log("STDOUT: " + result.stdout);
                      console.log("STDERR: " + result.stderr);
                    });
                });
              agent.add(
                `✅ *Compra efetuada com sucesso* ✅\n\nUSUARIO: _${usuario}_\nSENHA: _${senha}_\nLimite: ${limite}\nExpira em: 30 Dias\n\n😄 Agradecemos a Preferência!`
              );
            } else {
              var usuario = foundlog.split(" ")[1];
              var senha = foundlog.split(" ")[2];
              var limite = foundlog.split(" ")[3];
              agent.add(
                `✅ *Compra efetuada com sucesso* ✅\n\nUSUARIO: _${usuario}_\nSENHA: _${senha}_\nLimite: ${limite}\nExpira em: 30 Dias\n\n😄 Agradecemos a Preferência!`
              );
            }
            /////////////
          } else {
            agent.add(
              "Seu pagamento ainda não foi processado. Por favor aguarde 10 minutos. Se ainda estiver com problemas, entre em contato pelo suporte."
            );
          }
        }
      })
      .catch((error) => {
        console.log(error);
      });
  }

  function testevar(agent) {
    agent.add("teste");
    let telefone = PegaTelefone();
    console.log(telefone);
  }

  let intentMap = new Map();
  intentMap.set("Default Welcome Intent - 1", op01);
  intentMap.set("Default Welcome Intent - 2 - 1", op02_3);
  intentMap.set("Default Welcome Intent - 2 - 2", op02_3);
  intentMap.set("Default Welcome Intent - 2 - 3", op02_3);
  intentMap.set("Default Welcome Intent - 3", op03);
  intentMap.set("Default Welcome Intent - 4", op04);
  intentMap.set("Default Welcome Intent - 5", op05);
  intentMap.set("LoginSenha", op05);
  intentMap.set("Default Welcome Intent - fallback", fallback);
  intentMap.set("Default Welcome Intent - 2 - fallback", fallback);
  intentMap.set("Default Fallback Intent", fallback);
  intentMap.set("teste", testevar);

  agent.handleRequest(intentMap);
});

// listen for requests :)
const listener = app.listen(process.env.PORT, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
