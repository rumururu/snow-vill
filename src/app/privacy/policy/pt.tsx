import { CONTACT, EFFECTIVE_DATE, Ext, Mail, OFFICER, Section } from "./shared";

/** Brazilian Portuguese translation of ko.tsx (same meaning and structure). */
export default function PolicyPt() {
  return (
    <>
      <h1 className="mt-4 text-2xl font-extrabold text-night">Política de Privacidade</h1>
      <p className="mt-2 text-sm text-night/70">
        Responsável: mkideabox · Contato: <Mail /> · Vigência: {EFFECTIVE_DATE}
      </p>

      <Section n={1} title="Resumo">
        <p>
          O Snow Village (o &quot;Serviço&quot;) não tem cadastro e não coleta nome, e-mail nem telefone. Tratamos o nome da vila, o
          apelido e o recado que você mesmo digita, além de uma foto que você escolhe enviar, para exibi-los na vila. As fotos
          ficam em um armazenamento privado, não público, e só aparecem por meio de um endereço válido por pouco tempo quando alguém
          toca na casa dentro da vila. Não usamos ferramentas de publicidade nem de análise.
        </p>
      </Section>

      <Section n={2} title="Informações tratadas e finalidades">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <b>Nome da vila</b> (obrigatório): para criar e exibir a vila.
          </li>
          <li>
            <b>Apelido e estilo da casa</b> (obrigatórios), <b>recado</b> (opcional, até 60 caracteres): para exibir a sua casa
            na vila.
          </li>
          <li>
            <b>Foto</b> (opcional, 1): para exibir no porta-retrato da sua casa. No envio, ela é recortada em formato quadrado e
            reduzida para 512px, e os metadados da foto (EXIF), como o local da captura (GPS), são apagados tanto no aparelho quanto no
            servidor.
          </li>
          <li>
            <b>ID de instalação aleatório</b>: um número aleatório criado pelo navegador na primeira vez. Serve para impedir que o mesmo
            navegador construa duas casas na mesma vila e para evitar o envio de solicitações demais em pouco tempo. Não é um ID de
            publicidade nem um ID do aparelho.
          </li>
          <li>
            <b>Registros de solicitações</b> (ID de instalação, tipo e horário da solicitação): usados para prevenir abusos e apagados
            automaticamente após um dia.
          </li>
          <li>
            <b>Registros de compras no app</b> (quando você compra a ampliação da vila no app Snow Village): ID de instalação (usado
            como conta de compra), número da transação, produto, valor e moeda pagos, loja (App Store / Google Play), horário da compra
            e do reembolso, e a vila em que o passe foi usado. Usados para confirmar a compra, aplicá-la à vila e processar
            reembolsos. Dados de pagamento, como o número do cartão, são tratados pela Apple e pelo Google; o Serviço não os recebe.
          </li>
          <li>
            <b>Denúncias</b>: quando você denuncia uma casa inadequada, guardamos a casa denunciada, o horário da denúncia e o ID de
            instalação de quem denunciou, para verificação e providências.
          </li>
          <li>
            <b>Registros de acesso</b>: ao abrir o site, o endereço IP, informações do navegador e dados semelhantes podem ser tratados
            nos sistemas do provedor de hospedagem (Cloudflare) e do provedor de servidor (Supabase) para prestar o Serviço e garantir
            a segurança. O responsável não coleta nem armazena esses dados separadamente.
          </li>
        </ul>
      </Section>

      <Section n={3} title="Quem pode ver">
        <p>
          Qualquer pessoa com o link da vila pode ver o nome da vila e o apelido, o recado e a data de mudança de cada casa,
          ver a foto ao tocar em uma casa e se mudar para uma casa vazia. Envie o link apenas para pessoas de confiança. A imagem do
          cartão de compartilhamento da vila não inclui fotos, apelidos nem recados. O Serviço está configurado para não aparecer em
          mecanismos de busca.
        </p>
      </Section>

      <Section n={4} title="Informações guardadas no navegador">
        <p>
          O Serviço não cria cookies por conta própria. No entanto, a Cloudflare, que fica na frente do servidor (Supabase), pode
          definir um cookie de segurança (__cf_bm, 30 minutos) para bloquear ataques automatizados. No armazenamento local do navegador
          (localStorage), guardamos o ID de instalação e valores secretos que permitem gerenciar as vilas que você criou e a sua casa.
          O servidor não guarda esses valores secretos em si, apenas um valor convertido de forma irreversível (hash). Se você apagar os
          dados do site no navegador, esses valores secretos também somem, e você não poderá mais desocupar a sua casa nem excluir a
          vila por esse navegador. Nesse caso, faça o pedido pelo e-mail abaixo. O que você fizer na vila de exemplo fica apenas no
          armazenamento temporário daquela aba (sessionStorage) e não é enviado ao servidor.
        </p>
        <p>
          Você pode bloquear o cookie de segurança nas configurações do navegador, mas, se fizer isso, o acesso pode não funcionar
          bem. O armazenamento local pode ser apagado excluindo os dados do site no navegador; ao apagá-lo, as permissões de
          gerenciamento mencionadas acima também são perdidas.
        </p>
      </Section>

      <Section n={5} title="Prazo de guarda e exclusão">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            Se você tocar na sua casa e escolher <b>&apos;Desocupar minha casa&apos;</b>, o apelido, o recado e a foto dessa casa são
            apagados na hora.
          </li>
          <li>
            Quem criou a vila pode apagar de uma vez a vila e todas as casas, fotos e denúncias relacionadas com <b>&apos;Excluir
            vila&apos;</b>. Quem criou a vila também pode desocupar outras casas dentro dela.
          </li>
          <li>
            As informações não apagadas são guardadas até que o usuário as apague ou até o encerramento do Serviço; se o Serviço for
            encerrado, todas serão apagadas.
          </li>
          <li>Os registros de solicitações são apagados automaticamente após um dia.</li>
          <li>
            Os registros de compras no app são guardados por 5 anos como registros de pagamento e fornecimento de bens, conforme a Lei
            de Proteção ao Consumidor no Comércio Eletrônico da Coreia, e depois destruídos.
          </li>
          <li>
            Se você não puder apagar por conta própria porque limpou os dados do navegador, envie o link da vila e o apelido para{" "}
            <Mail />. Apagaremos após a verificação.
          </li>
        </ul>
      </Section>

      <Section n={6} title="Procedimento e forma de destruição">
        <p>
          As informações cujo pedido de exclusão recebemos ou cujo prazo de guarda terminou são destruídas sem demora. Como só as
          guardamos em formato de arquivo eletrônico, elas são apagadas do banco de dados e do armazenamento de fotos de forma que não
          possam ser recuperadas, e não as imprimimos nem guardamos em papel.
        </p>
      </Section>

      <Section n={7} title="Empresas contratadas para o tratamento e transferência internacional">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <b>Supabase, Inc.</b> (EUA) — Serviço contratado: banco de dados, armazenamento de fotos e funções de servidor. Dados
            tratados: informações da vila e das casas do item 2, fotos, ID de instalação, registros de solicitações e denúncias. Local
            de armazenamento: região de Seul (ap-northeast-2). Momento e forma da transferência: enviados pela internet sempre que o
            Serviço é usado. Prazo de guarda: o mesmo do item 5. Contato: <Ext href="https://supabase.com/contact">supabase.com/contact</Ext>{" "}
            · <Ext href="https://supabase.com/privacy">Política de Privacidade</Ext>
          </li>
          <li>
            <b>RevenueCat, Inc.</b> (EUA) — Serviço contratado: confirmação de compras no app e repasse dos registros de compra. Dados
            tratados: ID de instalação, número da transação, produto, preço e loja. Momento e forma da transferência: enviados pela
            internet quando há uma compra no app. Prazo de guarda: conforme a política da RevenueCat. Contato:{" "}
            <Ext href="https://www.revenuecat.com/privacy">revenuecat.com/privacy</Ext>
          </li>
          <li>
            <b>Apple Inc. / Google LLC</b> — Processamento de pagamentos de compras no app (conforme os termos e a política de
            privacidade de cada loja).
          </li>
          <li>
            <b>Cloudflare, Inc.</b> (EUA, rede global) — Serviço contratado: entrega e segurança do site (inclusive na frente do
            servidor Supabase). Dados tratados: dados de acesso, como endereço IP e informações do navegador. Momento e forma da
            transferência: enviados pela internet a cada acesso ao site. Prazo de guarda: conforme a política da Cloudflare. Contato:
            privacyquestions@cloudflare.com ·{" "}
            <Ext href="https://www.cloudflare.com/privacypolicy/">Política de Privacidade</Ext>
          </li>
        </ul>
        <p>
          Essas informações são indispensáveis para prestar o Serviço; por isso, se você não quiser a transferência internacional,
          pode deixar de usar o Serviço ou apagar as informações pelos meios do item 5. Exceto quando exigido por lei, não fornecemos as
          informações a outros terceiros, não as vendemos e não as usamos para fins de publicidade.
        </p>
      </Section>

      <Section n={8} title="Como protegemos as informações">
        <p>
          Toda a comunicação é criptografada com HTTPS. As fotos ficam em um armazenamento privado sem endereço público e são exibidas
          por um endereço válido por apenas 2 minutos. O banco de dados só pode ser acessado pelas funções do Serviço, e os valores
          secretos de gerenciamento são guardados apenas como hash. O servidor verifica novamente o tamanho das entradas e o formato e
          tamanho das fotos, e limita o número de solicitações.
        </p>
      </Section>

      <Section n={9} title="Informações de crianças">
        <p>
          O Serviço não é destinado a crianças menores de 14 anos e não trata intencionalmente informações de crianças menores de 14
          anos. Se você souber que foram enviadas informações de uma criança menor de 14 anos, avise-nos em <Mail />. Apagaremos após a
          verificação.
        </p>
      </Section>

      <Section n={10} title="Direitos dos usuários">
        <p>
          Você pode pedir para ver, corrigir ou apagar as suas informações e pedir que o tratamento seja interrompido. Entre em
          contato pelo e-mail acima; atenderemos sem demora e informaremos o resultado.
        </p>
      </Section>

      <Section n={11} title="Como buscar reparação">
        <p>
          Se precisar de orientação ou de solução de conflitos sobre violação de dados pessoais, você pode recorrer aos órgãos abaixo
          (na Coreia do Sul).
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Comitê de Mediação de Disputas sobre Informações Pessoais: 1833-6972 (www.kopico.go.kr)</li>
          <li>Central de Denúncias de Violação de Privacidade (KISA): 118 (privacy.kisa.or.kr)</li>
          <li>Supremo Ministério Público: 1301 (www.spo.go.kr)</li>
          <li>Agência Nacional de Polícia: 182 (ecrm.police.go.kr)</li>
        </ul>
      </Section>

      <Section n={12} title="Encarregado de proteção de dados e alterações">
        <p>
          Encarregado de proteção de dados: {OFFICER.name} · E-mail: <Mail to={OFFICER.email} /> · Telefone: {OFFICER.phone}
        </p>
        <p>
          Dúvidas sobre o Serviço e pedidos de exclusão: <Mail to={CONTACT} />
        </p>
        <p>Se esta política mudar, publicaremos a nova versão nesta página com a nova data de vigência.</p>
      </Section>
    </>
  );
}
