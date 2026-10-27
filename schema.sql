-- Esboço inicial do banco de dados Minha Escola (MySQL 8+)
-- Revise permissões, política de retenção e regras de acesso antes de produção.
CREATE DATABASE IF NOT EXISTS minha_escola
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE minha_escola;

CREATE TABLE usuarios (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  senha_hash VARCHAR(255) NOT NULL,
  perfil ENUM('aluno','professor','direcao','psicologo','admin') NOT NULL DEFAULT 'aluno',
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE relatos_infraestrutura (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id BIGINT UNSIGNED NOT NULL,
  titulo VARCHAR(150) NOT NULL,
  categoria VARCHAR(80) NOT NULL,
  local_escola VARCHAR(180) NOT NULL,
  descricao TEXT NOT NULL,
  status ENUM('recebido','em_analise','em_atendimento','resolvido') NOT NULL DEFAULT 'recebido',
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_relato_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

CREATE TABLE arquivos_relato (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  relato_id BIGINT UNSIGNED NOT NULL,
  nome_original VARCHAR(255) NOT NULL,
  caminho_privado VARCHAR(500) NOT NULL,
  tipo_mime VARCHAR(120) NOT NULL,
  tamanho_bytes BIGINT UNSIGNED NOT NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_arquivo_relato FOREIGN KEY (relato_id) REFERENCES relatos_infraestrutura(id) ON DELETE CASCADE
);

CREATE TABLE interesses_profissionais (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id BIGINT UNSIGNED NOT NULL,
  area VARCHAR(100) NOT NULL,
  objetivo VARCHAR(180),
  estilo_aprendizagem VARCHAR(80),
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_interesse_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

CREATE TABLE planos_estudo (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  interesse_id BIGINT UNSIGNED NOT NULL,
  disciplina VARCHAR(120) NOT NULL,
  metodologia TEXT NOT NULL,
  meta TEXT,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_plano_interesse FOREIGN KEY (interesse_id) REFERENCES interesses_profissionais(id) ON DELETE CASCADE
);

CREATE TABLE agendamentos (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  solicitante_id BIGINT UNSIGNED NOT NULL,
  profissional_id BIGINT UNSIGNED NULL,
  tipo_profissional ENUM('direcao','psicologo','coordenacao','orientacao') NOT NULL,
  assunto_geral VARCHAR(100) NOT NULL,
  data_preferida DATE NOT NULL,
  periodo_preferido ENUM('manha','tarde','qualquer') NOT NULL,
  observacao TEXT,
  status ENUM('solicitado','confirmado','reagendar','concluido','cancelado') NOT NULL DEFAULT 'solicitado',
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_agendamento_solicitante FOREIGN KEY (solicitante_id) REFERENCES usuarios(id),
  CONSTRAINT fk_agendamento_profissional FOREIGN KEY (profissional_id) REFERENCES usuarios(id)
);

CREATE TABLE projetos (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  criador_id BIGINT UNSIGNED NOT NULL,
  titulo VARCHAR(160) NOT NULL,
  area VARCHAR(100) NOT NULL,
  descricao TEXT NOT NULL,
  integrantes TEXT,
  status ENUM('ideia','em_desenvolvimento','apresentado','concluido') NOT NULL DEFAULT 'ideia',
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_projeto_criador FOREIGN KEY (criador_id) REFERENCES usuarios(id)
);

CREATE TABLE eventos (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  titulo VARCHAR(180) NOT NULL,
  descricao TEXT,
  organizador VARCHAR(180),
  local_evento VARCHAR(220),
  inicio DATETIME,
  fim DATETIME,
  link_inscricao VARCHAR(500),
  verificado BOOLEAN NOT NULL DEFAULT FALSE,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE conteudos_professores (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  autor_id BIGINT UNSIGNED NOT NULL,
  titulo VARCHAR(180) NOT NULL,
  disciplina VARCHAR(120),
  descricao TEXT,
  caminho_arquivo VARCHAR(500),
  turma VARCHAR(100),
  publicado BOOLEAN NOT NULL DEFAULT FALSE,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_conteudo_autor FOREIGN KEY (autor_id) REFERENCES usuarios(id)
);

-- IMPORTANTE:
-- * Não armazene senhas em texto puro; use password_hash/password_verify no PHP.
-- * Adicione autorização por função e por registro em todas as rotas.
-- * Armazene arquivos fora da pasta pública e valide MIME, tamanho e extensão.
-- * Dados psicológicos devem ter acesso ainda mais restrito, com minimização e retenção definida.
-- * Use HTTPS, proteção CSRF, consultas preparadas, logs seguros e backups protegidos.
