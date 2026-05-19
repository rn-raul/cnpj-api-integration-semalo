# Automação de Cadastro de Clientes/Parceiros via CNPJ

## 📋 Descrição

Script de automação para o ERP **Sankhya** que integra a API CNPJá para automatizar o processo de cadastro de novos clientes e parceiros. O script realiza consultas em tempo real aos dados públicos de CNPJ, validações de dados obrigatórios e insere as informações diretamente nas tabelas do sistema de forma segura e eficiente.

## 🏢 Histórico de Desenvolvimento

Este script foi desenvolvido durante meu período como **Desenvolvedor** na empresa **Semalo Indústria e Comércio de Alimentos**, solucionando a necessidade de agilizar o onboarding de novos parceiros comerciais através da automação inteligente.

---

## 🎯 Funcionalidades

✅ **Integração com API CNPJá** - Consulta dados públicos de CNPJ em tempo real  
✅ **Validação Inteligente** - Verifica dados obrigatórios (empresa, endereço, inscrição estadual)  
✅ **Classificação Fiscal Automática** - Detecta MEI, Simples e demais regimes tributários  
✅ **Geolocalização** - Captura latitude e longitude do endereço  
✅ **Tratamento de Erros Robusto** - Mensagens de erro detalhadas com códigos de resposta  
✅ **Timeout Configurado** - Evita travamentos do banco de dados  

---

## 📦 Requisitos

- **ERP Sankhya** instalado e configurado
- **Token de API CNPJá** válido e ativo
- Acesso à base de dados Sankhya com permissão para:
  - Leitura: `TSICEP`, `TSIUFS`
  - Escrita: `TGFPAR`, `TGFPAEM`
- JavaScript habilitado no ambiente Sankhya

---

## 🔧 Configuração

### 1. Obter Token da API CNPJá

1. Acesse [api.cnpja.com](https://api.cnpja.com)
2. Crie uma conta e gere seu token de autenticação
3. Copie o token gerado

### 2. Configurar o Script

Localize a linha com o token e substitua:

```javascript
var tokenDaApi = "---"; // Substitua pelo seu token da API
```

Por:

```javascript
var tokenDaApi = "seu_token_aqui";
```

---

## 🚀 Como Funciona

### Fluxo de Execução

```
1. Captura CNPJ do parâmetro → Remove caracteres especiais
2. Consulta API CNPJá → Extrai dados públicos do CNPJ
3. Valida campos obrigatórios → Empresa, endereço, inscrição estadual
4. Consulta tabela TSICEP → Obtém código de CEP/endereço
5. Consulta tabela TSIUFS → Obtém código de UF/estado
6. Aplica regras fiscais → Define classificação MS, ICMS, MEI/Simples
7. Insere parceiro em TGFPAR → Cria novo registro de cliente/parceiro
8. Insere grupo ICMS em TGFPAEM → Configura imposto para a empresa
9. Retorna mensagem de sucesso ou erro
```

### Campos Extraídos da API

| Campo | Origem | Descrição |
|-------|--------|-----------|
| `razaoSocial` | company.name | Nome da empresa |
| `inscricaoEstadual` | registrations[0].number | Inscrição estadual |
| `cep` | address.zip | CEP do endereço |
| `logradouro` | address.street | Rua/avenida |
| `numero` | address.number | Número do endereço |
| `city` | address.city | Cidade |
| `state` | address.state | Estado (UF) |
| `latitude` | address.latitude | Coordenada geográfica |
| `longitude` | address.longitude | Coordenada geográfica |
| `emails` | emails[0].address | Email principal |
| `areaPhone` | phones[0].area | DDD telefone |
| `phoneNumber` | phones[0].number | Número telefone |

---

## 📊 Regras de Negócio Fiscal

O script aplica automaticamente as seguintes classificações:

### Classificação MS (ICMS)
- **"C" (ISENTO)** - Quando não há Inscrição Estadual ou está vazia
- **"R" (CONTRIBUINTE)** - Quando possui Inscrição Estadual válida

### Grupo ICMS
- **Grupo 6** - MEI ou Optante por Simples Nacional
- **Grupo 2** - Demais regimes (padrão)

### Campos Fiscais
- **SIMPLES**: "S" se optante, "N" caso contrário
- **MEIRJ**: "S" se MEI, "N" caso contrário

---

## 📝 Exemplo de Uso

O script é acionado via parâmetro:

```
script.js?CNPJ=12345678000195
```

### Respostas Esperadas

**✅ Sucesso:**
```
Parceiro cadastrado com sucesso!
Código: 12345
```

**❌ Erros Possíveis:**
```
Erro: Empresa não encontrada na API
Erro: Endereço não encontrado na API para o CNPJ: 12345678000195
Erro: Inscrição estadual não encontrada na API
CEP não encontrado na tabela de endereços do Sankhya. CEP: 01234567
Erro ao consultar CNPJ. Código: 401 - Detalhe: [detalhes do erro]
```

---

## ⚙️ Configurações Técnicas

### Timeouts
- **Connect Timeout**: 5000ms (5 segundos)
- **Read Timeout**: 5000ms (5 segundos)

*Estes valores previnem travamentos do banco de dados em caso de indisponibilidade da API.*

### Valores Padrão Inseridos
- **CODCTACTB**: 12201 (Conta contábil padrão - débito)
- **CODCTACTB2**: 21201 (Conta contábil padrão - crédito)
- **TIPPESSOA**: "J" (Pessoa jurídica)
- **CLIENTE**: "S" (Cadastra como cliente)
- **FORNECEDOR**: "S" (Cadastra como fornecedor)
- **EMAILDANFE**: "S" (Envia DANFE por email)
- **CODEMP**: 2 (Código da empresa no ICMS - configurável)

---

## 🔐 Segurança

⚠️ **Importante:**
- Nunca commite o token da API em repositórios públicos
- Considere usar variáveis de ambiente ou cofres de senhas
- O token é enviado via header `Authorization` (conexão HTTPS)
- Valide todos os dados antes de usar em produção

---

## 🐛 Troubleshooting

| Problema | Causa Possível | Solução |
|----------|----------------|---------|
| Erro 401 | Token inválido ou expirado | Verifique o token da API CNPJá |
| Erro 404 | CNPJ não encontrado | Verifique o CNPJ informado |
| CEP não encontrado | CEP não está cadastrado em TSICEP | Insira o CEP manualmente em TSICEP |
| Timeout | API indisponível ou lenta | Aguarde e tente novamente |
| Erro de conexão | Problemas de rede | Verifique conectividade com api.cnpja.com |

---

## 📚 Tabelas Sankhya Utilizadas

### Leitura
- **TSICEP** - Tabela de CEPs e endereços cadastrados
- **TSIUFS** - Tabela de estados (UF) e seus códigos

### Escrita
- **TGFPAR** - Parceiros (clientes/fornecedores)
- **TGFPAEM** - Parceiro x Empresa (vinculação)

---

## 📞 Suporte

Para dúvidas ou problemas:
1. Verifique a sintaxe do CNPJ (11 dígitos)
2. Confirme a validade do token da API
3. Consulte os logs do Sankhya para mensagens detalhadas
4. Valide os dados nas tabelas TSICEP e TSIUFS

---

## 📄 Licença

Desenvolvido como solução corporativa para Semalo Indústria e Comércio de Alimentos.

---

**Desenvolvido com ❤️ durante meu período na Semalo**
