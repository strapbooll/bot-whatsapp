const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');

// Se modificar esses escopos, exclua token.json.
const SCOPES = ['https://www.googleapis.com/auth/contacts.readonly'];
// O arquivo token.json armazena os tokens de acesso e atualização do usuário e é
// criado automaticamente quando o fluxo de autorização é concluído para o primeiro
// Tempo.
const TOKEN_PATH = 'token.json';

var contacts = [];

/**
 * Crie um cliente OAuth2 com as credenciais fornecidas e execute o
 * função de callback fornecida.
 * @param {Object} credentials As credenciais do cliente de autorização.
 * @param {function} callback O callback para chamar com o cliente autorizado.
 */
function authorize(credentials, callback) {
  const {client_secret, client_id, redirect_uris} = credentials.web;
  const oAuth2Client = new google.auth.OAuth2(
      client_id, client_secret, redirect_uris[0]);

  // Verifique se já armazenamos um token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getNewToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}

/**
 * Obtenha e armazene o novo token após solicitar a autorização do usuário e, em seguida,
 * execute o retorno de chamada fornecido com o cliente OAuth2 autorizado.
 * @param {google.auth.OAuth2} oAuth2Client O cliente OAuth2 para o qual obter o token.
 * @param {getEventsCallback} callback O callback para o cliente autorizado.
 */
function getNewToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('[google-people bot] Autorize este aplicativo visitando este url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Insira o código dessa página aqui: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('[google-people bot] Erro ao recuperar token de acesso', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('[google-people bot] Token armazenado em', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

async function listConnectionNames(auth) {
  const service = await google.people({version: 'v1', auth});
  service.people.connections.list({
    resourceName: 'people/me',
    pageSize: 2000,
    personFields: 'names,phoneNumbers',
  }, (err, res) => {
    if (err) return console.error('[google-people bot] A API retornou um erro: ' + err);
    const connections = res.data.connections;
    if (connections) {      
      connections.forEach((person) => {
        try{
          //console.log(person.names[0].displayName);
          var { canonicalForm } = person.phoneNumbers[0]

          if (canonicalForm){              
            contacts.push(canonicalForm.replace('+', ''))
          }
          else{
            console.log(`[google-people bot] Número do(a) ${person.names[0].displayName} nulo`);
          }
        }catch(e){
          console.log(`[google-people bot] Número do(a) ${person.names[0].displayName} nulo`);
        }
      });
    } else {
      console.log('[google-people bot] Nenhuma conexão encontrada.');
    } 

    var content = {
      "number": contacts,
      "total": contacts.length
    }
    fs.writeFile('contacts.json', JSON.stringify(content), function(erro) {

      if(erro) {
          throw erro;
      }
  
      console.log('[google-people bot] Arquivo salvo');
    }); 
  });  
}

module.exports = ()=>{
  // Carrega os segredos do cliente de um arquivo local.
  fs.readFile('credentials.json', (err, content) => {
    if (err) return console.log('[google-people bot] Erro ao carregar o arquivo secreto do cliente:', err);
    // Autorize um cliente com credenciais e chame a API Google Tasks.
    authorize(JSON.parse(content), listConnectionNames);
  });
}