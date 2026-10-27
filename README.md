# EducTech — versão conectada ao Supabase

Esta versão preserva a interface original do projeto e conecta os formulários de relatos, projetos, solicitações de atendimento e nome do perfil ao Supabase.

## Já configurado
- Project URL e publishable key no `config.js`.
- Cliente Supabase carregado no `index.html`.
- Autenticação por e-mail e senha (cadastro/entrada/saída).
- Tabelas PostgreSQL com RLS no projeto Supabase informado.
- Relatos, projetos e solicitações salvam no banco depois do login.
- O perfil de acesso é controlado no banco; o usuário não pode se promover a professor/direção/psicólogo pelo formulário.
- Solicitações de psicologia têm visibilidade limitada por políticas de acesso.

## Como testar
1. Extraia o ZIP.
2. Abra a pasta no VS Code e inicie o Live Server, ou use `python -m http.server 8000`.
3. Abra o endereço local gerado pelo servidor.
4. Entre em **Meu perfil**, crie uma conta com um e-mail que você controla e confirme o e-mail se o Supabase solicitar.
5. Entre com a conta e teste um relato, um projeto e uma solicitação.
6. Confira os registros no Supabase → Table Editor.

## Importante
- O esquema já foi instalado no projeto Supabase configurado. **Não execute `supabase/schema.sql` novamente nesse mesmo projeto**. O arquivo serve para instalação inicial em outro projeto.
- No painel Supabase, configure Authentication → URL Configuration com o endereço do site local e o domínio de publicação.
- Os arquivos selecionados no formulário de relatos ainda não são enviados; apenas os campos de texto são salvos.
- Os eventos e recomendações continuam demonstrativos/locais.
- Os pedidos de atendimento são armazenados, mas não enviam notificações nem confirmam horários automaticamente.
- Não use dados reais sensíveis, especialmente informações pessoais ou psicológicas, para testes. Antes de uso institucional, a escola precisa revisar acesso, retenção, consentimento, procedimentos para menores e conformidade com a LGPD.
- A chave incluída é uma publishable key própria para frontend. Nunca coloque uma `secret` ou `service_role` key no navegador.


## Avisos compartilhados

A área **Professores e conteúdos** agora permite listar avisos compartilhados e exibe o formulário de publicação apenas para perfis autorizados (`teacher`, `staff`, `psychologist`, `director`, `admin`). Os avisos são guardados na tabela `school_announcements` do Supabase e ficam disponíveis para outros usuários autenticados, conforme o público escolhido.

A tabela e as políticas já foram aplicadas ao projeto Supabase conectado. **Não execute novamente o schema inteiro** nesse projeto existente. Para um novo projeto, o arquivo `supabase/schema.sql` contém também a tabela e as políticas de avisos.

Por segurança, novas contas começam com a função `student`. Um administrador deve mudar a função de um professor/equipe diretamente no Supabase, na tabela `profiles`, coluna `role`, após confirmar a identidade dessa pessoa. Não permita que os próprios usuários escolham uma função privilegiada no site.
