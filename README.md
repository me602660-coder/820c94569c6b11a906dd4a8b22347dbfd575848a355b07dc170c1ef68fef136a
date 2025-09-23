# Sistema de Mapeamento Secretaria de Serviços Urbanos - Alagoinha PE

## Descrição
Sistema web para mapeamento e gestão de problemas urbanos na cidade de Alagoinha, PE. Permite que cidadãos reportem problemas como entulho, metralha, mato verde e mato seco, e que funcionários e administradores gerenciem essas ocorrências.

## Funcionalidades Implementadas

### Para Cidadãos
- Visualização do mapa interativo com marcadores de problemas
- Busca de localização por endereço
- Geolocalização automática
- Visualização de relatórios recentes

### Para Funcionários
- Login com credenciais (usuário: `funcionario`, senha: `123`)
- Visualização de funcionários online
- Acesso a todas as funcionalidades de cidadão

### Para Administradores
- Login com credenciais (usuário: `adm`, senha: `12345`)
- Adição de novos marcadores no mapa
- Visualização detalhada de marcadores
- Remoção de marcadores
- Atualização de status dos marcadores (pendente, em progresso, concluído)
- Upload de fotos para os relatórios

## Integração com Supabase

### Configuração
- **URL**: `https://chevxjgosoaoqtzmuoyy.supabase.co`
- **Chave Anônima**: Configurada no arquivo `supabase-client.js`

### Funcionalidades Implementadas
1. **Armazenamento de Marcadores**: Todos os marcadores são salvos na tabela `markers`
2. **Upload de Fotos**: Imagens são armazenadas no bucket `photos`
3. **Sincronização em Tempo Real**: Mudanças são sincronizadas automaticamente entre usuários
4. **Persistência de Dados**: Marcadores são carregados automaticamente do banco

### Estrutura da Tabela `markers`
```sql
- id (bigint, primary key)
- lat (double precision)
- lng (double precision)
- type (text) - tipo do problema (metralha, entulho, mato-verde, mato-seco)
- description (text)
- photo (text) - URL da foto
- location (text)
- priority (text)
- estimated_size (text)
- additional_notes (text)
- status (text) - pending, progress, completed
- timestamp (timestamp)
- created_at (timestamp)
- updated_at (timestamp)
```

## Arquivos do Projeto

### Principais
- `script.html` - Interface principal do sistema
- `script.js` - Lógica JavaScript e integração com Supabase
- `supabase-client.js` - Configuração do cliente Supabase

### Dependências
- Leaflet.js - Para mapas interativos
- Supabase JS - Para backend e banco de dados
- OpenStreetMap - Tiles de mapa
- Esri World Imagery - Imagens de satélite

## Como Usar

### Instalação
1. Extrair os arquivos do projeto
2. Servir os arquivos através de um servidor HTTP
3. Acessar `script.html` no navegador

### Servidor Local
```bash
python3 -m http.server 8080
```
Depois acessar: `http://localhost:8080/script.html`

### Credenciais de Teste
- **Admin**: usuário `adm`, senha `12345`
- **Funcionário**: usuário `funcionario`, senha `123`

## Melhorias Implementadas

### Integração com Supabase
- ✅ Configuração correta do cliente Supabase
- ✅ Carregamento automático de marcadores existentes
- ✅ Salvamento de novos marcadores no banco
- ✅ Upload de fotos para o storage
- ✅ Remoção de marcadores do banco
- ✅ Atualização de status no banco
- ✅ Sincronização em tempo real

### Interface e Usabilidade
- ✅ Sistema de login/logout funcional
- ✅ Modais para detalhes de marcadores
- ✅ Notificações de feedback para usuário
- ✅ Persistência de login (lembrar usuário)
- ✅ Interface responsiva

### Funcionalidades Técnicas
- ✅ Geolocalização do usuário
- ✅ Busca de endereços via Nominatim
- ✅ Mapas com camadas (satélite e ruas)
- ✅ Marcadores coloridos por tipo de problema
- ✅ Upload e exibição de fotos

## Observações Técnicas

### Limitações Conhecidas
- O sistema usa autenticação simples (não Supabase Auth)
- Algumas funcionalidades requerem configuração adicional no Supabase
- O bucket `photos` precisa ser criado no Supabase Storage

### Próximos Passos Sugeridos
1. Implementar Supabase Auth para autenticação real
2. Adicionar políticas de segurança (RLS) no Supabase
3. Implementar notificações push
4. Adicionar relatórios e estatísticas
5. Melhorar a interface mobile

## Suporte
Para dúvidas ou problemas, consulte a documentação do Supabase ou entre em contato com a equipe de desenvolvimento.

