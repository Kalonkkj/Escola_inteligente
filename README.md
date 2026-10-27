# Minha Escola — protótipo funcional

Este pacote contém uma primeira versão navegável do portal escolar.

## Como abrir
1. Extraia o arquivo ZIP para uma pasta.
2. Abra `index.html` em um navegador atualizado (Chrome, Edge ou Firefox).
3. Navegue pelo menu e teste os formulários.

Não precisa instalar nada para testar a interface.

## O que funciona nesta versão
- Navegação entre páginas e menu adaptado para celular.
- Registro local de relatos de infraestrutura.
- Seleção de arquivos para demonstrar o formulário de mídia.
- Geração de sugestões de aprendizagem por área profissional.
- Solicitações de atendimento e cadastro de projetos.
- Perfil de demonstração e busca nos itens da página.
- Os registros são guardados no `localStorage` do navegador.

## Limitações importantes
Esta versão é um protótipo front-end. Os dados ficam somente no navegador utilizado e não são compartilhados com a escola nem com outros usuários. Fotos e vídeos não são enviados para lugar nenhum; apenas os nomes dos arquivos selecionados podem ser registrados. Os agendamentos não notificam profissionais e os eventos são ilustrativos. O seletor de perfil não é autenticação nem controle de acesso.

Não utilize dados pessoais reais ou informações sensíveis neste protótipo.

## Próxima etapa para colocar no ar
Para uso real por uma escola, será necessário implementar um backend (por exemplo, PHP), banco de dados MySQL, autenticação segura, permissões por função, armazenamento privado de mídia, notificações e políticas de retenção e acesso. Agendamentos psicológicos exigem proteção reforçada e acesso estritamente autorizado. A instituição também deve definir procedimentos de moderação, consentimento e atendimento a menores, em conformidade com a LGPD.

`schema.sql` inclui um esboço inicial do modelo de dados; não é uma aplicação backend completa.
