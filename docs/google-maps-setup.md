# Google Maps: configuração (passo a passo)

Faça **fora da rede do trabalho** (no celular com dados móveis ou no PC de casa): a rede do trabalho bloqueia a etapa do cartão (`payments.google.com` → "Não foi possível carregar a próxima página").

Conta: `luisg16fernandes@gmail.com`.

## 1. Projeto e teste grátis
1. Em **console.cloud.google.com**, clique em **Selecione um projeto** → **Novo projeto** → nome **Bubs2Do** → **Criar**. Depois selecione o Bubs2Do nesse mesmo botão.
2. **Comece gratuitamente** (canto superior direito) → Etapa 1 (país Brasil, concordar) → Etapa 2 (cartão).
   - São US$ 300 por 90 dias, sem cobrança durante o teste.
   - **Em 90 dias:** clique em **Ativar conta completa**. Sem isso, o Google para de responder e o app volta sozinho ao OpenStreetMap.
   - Com os tetos do passo 5 não há cobrança: o Google Maps tem cota grátis mensal para sempre (mapa: 10 mil aberturas; dados do lugar: 10 mil; nota: mil; fotos: mil).

## 2. Ligar as APIs
Menu ☰ → **APIs e serviços** → **Biblioteca**, e ative:
- **Maps JavaScript API**
- **Places API (New)** (o nome tem "New"; não é a "Places API" antiga)

## 3. Chave de API (com travas)
1. **APIs e serviços** → **Credenciais** → **Criar credenciais** → **Chave de API**.
2. Abra a chave criada:
   - **Restrições de aplicativos** → **Sites** → adicione:
     - `https://bubs2do.vercel.app/*`
     - `http://localhost:5173/*`
   - **Restrições de API** → **Restringir chave** → marque **Maps JavaScript API** e **Places API (New)**.
   - **Salvar**.
3. A chave fica visível no app, mas só funciona nesses endereços e nessas duas APIs. É assim que o Google recomenda para mapas em sites.

## 4. Map ID (para os alfinetes)
Menu ☰ → **Google Maps Platform** → **Gerenciamento de mapas** → **Criar ID do mapa**:
- nome `bubs2do`
- tipo **JavaScript**, **Vetor**
- **Salvar** e copie o ID

## 5. Tetos de uso (garantem que não há cobrança)
- **Google Maps Platform** → **Cotas**: nas duas APIs, reduza os limites **por dia** para algo como **300 por dia**. Se o teto for atingido, o Google só para de responder naquele dia e o app cai no OpenStreetMap.
- **Faturamento** → **Orçamentos e alertas** → **Criar orçamento** de **R$ 10**, com alertas em 50%, 90% e 100%. O orçamento só avisa, não bloqueia; quem bloqueia é o teto acima.

## 6. Colocar no app
- **Vercel:** projeto → **Settings** → **Environment Variables**, marcando **Production** e **Preview**:
  - `VITE_GOOGLE_MAPS_KEY` = a chave
  - `VITE_GOOGLE_MAP_ID` = o Map ID

  A Vercel só usa as variáveis no próximo deploy (o próximo push).
- **PC (`.env.local`)**, as mesmas duas linhas:
  ```
  VITE_GOOGLE_MAPS_KEY=...
  VITE_GOOGLE_MAP_ID=...
  ```
Não cole a chave no chat.
