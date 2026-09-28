# Solda Certa

Aplicação web para Aldemir, prestador autônomo de serviços de solda.

## Estado atual
- Supabase/PostgreSQL real
- Auth por e-mail e senha
- RLS por usuário e papel administrativo
- Catálogo real de 14 serviços
- Orçamentos reais com protocolo
- Upload privado de imagens/PDF
- Agenda com disponibilidade calculada no servidor
- Hold de 15 minutos e trava transacional contra dupla reserva
- Área do cliente
- Dashboard administrativa
- Pix real propositalmente desativado; tabela de pagamentos preparada para etapa futura

## Arquivos
Aplicação estática: `index.html`, `styles.css`, `app.js` e `_redirects`.

## Administração inicial
A primeira conta administrativa é ativada pelo fluxo `/admin` usando o código bootstrap entregue ao proprietário. O código é de uso único.

## Deploy
O projeto é compatível com Netlify e qualquer hospedagem estática. O arquivo `_redirects` garante fallback SPA no Netlify.
