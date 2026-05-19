var parametroCnpj = getParam("CNPJ") || "";
var cnpj = parametroCnpj.replaceAll("[^0-9]", "");
var url = new java.net.URL("https://api.cnpja.com/office/" + cnpj + "?simples=true&registrations=ORIGIN&geocoding=true");
var tokenDaApi = "---"; // Substitua pelo seu token da API
var conexao = url.openConnection();
conexao.setRequestMethod("GET");
conexao.setRequestProperty("Authorization", tokenDaApi);
conexao.setRequestProperty("Accept", "application/json");

// Define um tempo limite (timeout) para não travar o banco de dados
conexao.setConnectTimeout(5000); 
conexao.setReadTimeout(5000);

var codigoResposta = conexao.getResponseCode();

if (codigoResposta === 200) {
    var inputStream = conexao.getInputStream();
    var reader = new java.io.BufferedReader(new java.io.InputStreamReader(inputStream, "UTF-8"));
    var resposta = new java.lang.StringBuilder();
    var linha;

    while ((linha = reader.readLine()) !== null) {
        resposta.append(linha);
    }
    reader.close();

    // Transforma a String recebida em um Objeto JavaScript
    var jsonString = resposta.toString();
    var dadosCnpj = JSON.parse(jsonString);

    // ==========================================
    // VALIDAÇÕES DE DADOS OBRIGATÓRIOS
    // ==========================================
    if (!dadosCnpj.company) {
        mensagem = "Erro: Empresa não encontrada na API";
    } else if (!dadosCnpj.address) {
        mensagem = "Erro: Endereço não encontrado na API para o CNPJ: " + cnpj;
    } else if (!dadosCnpj.registrations || dadosCnpj.registrations.length === 0) {
        mensagem = "Erro: Inscrição estadual não encontrada na API";
    } else {
        /* Pegando os dados do CNPJ */
        var razaoSocial = dadosCnpj.company.name;
        var inscricaoEstadual = dadosCnpj.registrations[0].number;   
        var ieAtiva = dadosCnpj.registrations[0].enabled;           
        var tipeIe = dadosCnpj.registrations[0].type.text; 
        var cep = dadosCnpj.address.zip;
        var numero = dadosCnpj.address.number;
        var logradouro = dadosCnpj.address.street;
        var city = dadosCnpj.address.city;
        var state = dadosCnpj.address.state;
        var latitude = dadosCnpj.address.latitude;
        var longitude = dadosCnpj.address.longitude;
        var areaPhone = (dadosCnpj.phones && dadosCnpj.phones.length > 0) ? dadosCnpj.phones[0].area : null;       
        var phoneNumber = (dadosCnpj.phones && dadosCnpj.phones.length > 0) ? dadosCnpj.phones[0].number : null;    
        var emails = (dadosCnpj.emails && dadosCnpj.emails.length > 0) ? dadosCnpj.emails[0].address : null;
        
        // Extrai dados de regime tributário da API
        var isMei = dadosCnpj.company.simei ? dadosCnpj.company.simei.optant : false;
        var optante = dadosCnpj.company.simples ? dadosCnpj.company.simples.optant : false;

        // Consulta na tabela TSICEP usando getQuery()
        var query = getQuery();
        query.setParam("CEP", cep);
        query.nativeSelect("SELECT CODCID, CODBAI, CODEND, CEP FROM TSICEP WHERE CEP = {CEP}");

        // Verifica se encontrou o registro
        if (query.next()) {
            var codcid = query.getInt("CODCID");
            var codbai = query.getInt("CODBAI");
            var codend = query.getInt("CODEND");
            
            // Consulta na tabela TSIUFS para pegar o código da UF
            var queryUF = getQuery();
            queryUF.setParam("STATE", state);
            queryUF.nativeSelect("SELECT CODUF FROM TSIUFS WHERE UF = {STATE}");
            
            var coduf = null;
            if (queryUF.next()) {
                coduf = queryUF.getInt("CODUF");
            }
            
            // ==========================================
            // 🧠 REGRAS DE NEGÓCIO FISCAIS
            // ==========================================
            var classificMs = "C"; // Padrão para ISENTO
            if (inscricaoEstadual === null || inscricaoEstadual.trim() === "") {
                inscricaoEstadual = "ISENTO";
                classificMs = "C";
            } else {
                classificMs = "R"; // Contribuinte
            }

            var grupoIcms = 2; // Padrão

            if (isMei === true) {
                grupoIcms = 6;
            } else if (optante === true) {
                grupoIcms = 6;
            }
            
            // Cria o novo parceiro com TODOS os dados
            var novoParceiro = novaLinha("TGFPAR");
            
            // ==========================================
            // PREENCHIMENTO CONDICIONAL - APENAS SE HOUVER DADOS
            // ==========================================
            if (razaoSocial) novoParceiro.setCampo("NOMEPARC", razaoSocial);
            if (razaoSocial) novoParceiro.setCampo("RAZAOSOCIAL", razaoSocial);
            novoParceiro.setCampo("TIPPESSOA", "J");                    // J = Jurídica
            if (cnpj) novoParceiro.setCampo("CGC_CPF", cnpj);
            if (areaPhone && phoneNumber) novoParceiro.setCampo("FAX", 55 + areaPhone + phoneNumber);
            if (emails) novoParceiro.setCampo("EMAIL", emails);
            if (latitude) novoParceiro.setCampo("LATITUDE", latitude.toString());
            if (longitude) novoParceiro.setCampo("LONGITUDE", longitude.toString());
            if (numero) novoParceiro.setCampo("NUMEND", numero);
            novoParceiro.setCampo("CODCTACTB", 12201);                  // Valor padrão
            novoParceiro.setCampo("CODCTACTB2", 21201);                 // Valor padrão
            novoParceiro.setCampo("CLIENTE", "S");
            novoParceiro.setCampo("FORNECEDOR", "S");
            novoParceiro.setCampo("EMAILDANFE", "S");
            if (inscricaoEstadual) novoParceiro.setCampo("IDENTINSCESTAD", inscricaoEstadual);
            if (classificMs) novoParceiro.setCampo("CLASSIFICMS", classificMs);
            
            // Define SIMPLES e MEIRJ conforme regime tributário
            if (isMei === true) {
                novoParceiro.setCampo("MEIRJ", "S");
                novoParceiro.setCampo("SIMPLES", "N");
            } else if (optante === true) {
                novoParceiro.setCampo("SIMPLES", "S");
                novoParceiro.setCampo("MEIRJ", "N");
            } else {
                novoParceiro.setCampo("SIMPLES", "N");
                novoParceiro.setCampo("MEIRJ", "N");
            }
            
            if (cep) novoParceiro.setCampo("CEP", cep);
            novoParceiro.setCampo("CODCID", codcid);
            novoParceiro.setCampo("CODBAI", codbai);
            novoParceiro.setCampo("CODEND", codend);
            if (coduf !== null) {
                novoParceiro.setCampo("AD_TSIUFS", coduf);
            }
            
            novoParceiro.save();
            
            // Obtém o código do parceiro gerado
            var codParcGerado = novoParceiro.getCampo("CODPARC");
            
            // Insere o GRUPO ICMS na tabela TGFPAEM
            var addIcms = novaLinha("TGFPAEM");
            addIcms.setCampo("CODPARC", codParcGerado);
            addIcms.setCampo("CODEMP", 2);
            addIcms.setCampo("GRUPOICMS", grupoIcms);
            addIcms.save();
            
            mensagem = "Parceiro cadastrado com sucesso!\nCódigo: " + codParcGerado;
            
        } else {
            mensagem = "CEP não encontrado na tabela de endereços do Sankhya. CEP: " + cep;
        }
    }
} else {
    var errorStream = conexao.getErrorStream();
    var jsonErro = "";
    if (errorStream !== null) {
        var errorReader = new java.io.BufferedReader(new java.io.InputStreamReader(errorStream, "UTF-8"));
        var respostaErro = new java.lang.StringBuilder();
        var linhaErro;

        while ((linhaErro = errorReader.readLine()) !== null) {
            respostaErro.append(linhaErro);
        }
        errorReader.close();
        jsonErro = respostaErro.toString();
    }
    mensagem = "Erro ao consultar CNPJ. Código: " + codigoResposta + " - Detalhe: " + jsonErro;
}

conexao.disconnect();