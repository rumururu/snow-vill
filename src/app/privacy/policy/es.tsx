import { CONTACT, EFFECTIVE_DATE, Ext, Mail, OFFICER, Section } from "./shared";

/** Spanish (Latin American) translation of ko.tsx. */
export default function PolicyEs() {
  return (
    <>
      <h1 className="mt-4 text-2xl font-extrabold text-night">Política de privacidad</h1>
      <p className="mt-2 text-sm text-night/70">
        Operador: mkideabox · Contacto: <Mail /> · Fecha de entrada en vigor: {EFFECTIVE_DATE}
      </p>

      <Section n={1} title="Resumen">
        <p>
          Snow Village (en adelante, el &quot;Servicio&quot;) no requiere registro y no solicita nombre, correo electrónico ni número
          de teléfono. Tratamos el nombre del pueblo, el apodo y el mensaje que tú escribes, y una foto que decidas subir, para
          mostrarlos en el pueblo. Las fotos se guardan en un almacenamiento privado, no público, y solo se muestran mediante una
          dirección válida por poco tiempo cuando alguien toca la casa en el pueblo. No usamos herramientas de publicidad ni de
          analítica.
        </p>
      </Section>

      <Section n={2} title="Información que tratamos y para qué">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <b>Nombre del pueblo</b> (obligatorio): para crear y mostrar el pueblo.
          </li>
          <li>
            <b>Apodo y estilo de casa</b> (obligatorios), <b>mensaje</b> (opcional, hasta 60 caracteres): para mostrar tu casa en el
            pueblo.
          </li>
          <li>
            <b>Foto</b> (opcional, 1): para mostrarla en el marco de fotos de tu casa. Al subirla se recorta en cuadrado y se reduce a
            512 px, y los metadatos de la foto (EXIF), como la ubicación de la toma (GPS), se eliminan tanto en el dispositivo como en
            el servidor.
          </li>
          <li>
            <b>ID de instalación aleatorio</b>: un número aleatorio que crea el navegador la primera vez. Se usa para que el mismo
            navegador no construya dos casas en un pueblo y para evitar que se envíen demasiadas solicitudes en poco tiempo. No es un
            ID publicitario ni un ID del dispositivo.
          </li>
          <li>
            <b>Registro de solicitudes</b> (ID de instalación, tipo de solicitud y hora): sirve para prevenir abusos y se elimina
            automáticamente después de un día.
          </li>
          <li>
            <b>Registro de compras dentro de la app</b> (al comprar una ampliación del pueblo en la app Snow Village): ID de
            instalación (usado como cuenta de compra), número de transacción, producto, importe y moneda del pago, tienda (App Store /
            Google Play), hora de compra y de reembolso, y el pueblo en el que se usó el pase. Se usa para verificar la compra,
            aplicarla al pueblo y gestionar reembolsos. Los datos del medio de pago, como el número de tarjeta, los trata Apple o
            Google; el Servicio no los recibe.
          </li>
          <li>
            <b>Contenido de las denuncias</b>: si denuncias una casa inapropiada, guardamos la casa denunciada, la hora de la denuncia
            y el ID de instalación de quien denuncia para revisarla y tomar medidas.
          </li>
          <li>
            <b>Registros de acceso</b>: al abrir el sitio web, la dirección IP, la información del navegador y datos similares pueden
            ser tratados en los sistemas del proveedor de alojamiento (Cloudflare) y del proveedor de servidores (Supabase) para
            prestar el Servicio y por seguridad. El operador no los recopila ni los guarda por separado.
          </li>
        </ul>
      </Section>

      <Section n={3} title="Quién puede verla">
        <p>
          Cualquier persona que tenga el enlace de un pueblo puede ver el nombre del pueblo y el apodo, el mensaje y la fecha de
          llegada de cada casa; al tocar una casa puede ver la foto, y puede mudarse a una casa vacía. Envía el enlace solo a personas
          de confianza. La imagen de la tarjeta para compartir el pueblo no incluye fotos, apodos ni mensajes. El Servicio está
          configurado para no aparecer en los buscadores.
        </p>
      </Section>

      <Section n={4} title="Información guardada en el navegador">
        <p>
          El Servicio no crea cookies propias. Sin embargo, Cloudflare, que está delante del servidor (Supabase), puede establecer una
          cookie de seguridad (__cf_bm, 30 minutos) para frenar ataques automatizados. En el almacenamiento local del navegador
          (localStorage) guardamos el ID de instalación y un valor secreto que te permite administrar los pueblos que creaste y tu
          casa. El servidor no guarda ese valor secreto, sino solo un valor transformado de forma irreversible (hash). Si borras los
          datos del sitio en el navegador, ese valor secreto también se pierde y desde ese navegador ya no podrás vaciar tu casa ni
          eliminar el pueblo. En ese caso, pídelo por correo a la dirección que aparece abajo. Lo que hagas en el pueblo de muestra
          queda solo en el almacenamiento temporal de esa pestaña (sessionStorage) y no se envía al servidor.
        </p>
        <p>
          Puedes bloquear la cookie de seguridad en la configuración del navegador, pero si lo haces es posible que el acceso no
          funcione bien. El almacenamiento local se puede borrar eliminando los datos del sitio en el navegador; al hacerlo también se
          pierden los permisos de administración mencionados arriba.
        </p>
      </Section>

      <Section n={5} title="Plazo de conservación y eliminación">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            Si tocas tu casa y eliges <b>&apos;Vaciar mi casa&apos;</b>, el apodo, el mensaje y la foto de esa casa se eliminan de
            inmediato.
          </li>
          <li>
            Quien creó el pueblo puede borrar de una vez el pueblo, todas las casas, las fotos y las denuncias relacionadas con
            <b> &apos;Eliminar pueblo&apos;</b>. Quien creó el pueblo también puede vaciar las demás casas del pueblo.
          </li>
          <li>
            La información que no se elimine se conserva hasta que la persona usuaria la borre o hasta que el Servicio termine; al
            terminar el Servicio, se elimina toda.
          </li>
          <li>Los registros de solicitudes se eliminan automáticamente después de un día.</li>
          <li>
            Los registros de compras dentro de la app se conservan durante 5 años como registros de pago y de suministro de bienes,
            conforme a la Ley de Protección al Consumidor en el Comercio Electrónico de Corea, y luego se destruyen.
          </li>
          <li>
            Si no puedes eliminarla por tu cuenta porque borraste los datos del navegador, envía el enlace del pueblo y tu apodo a <Mail />.
            La eliminaremos tras verificarlo.
          </li>
        </ul>
      </Section>

      <Section n={6} title="Procedimiento y método de destrucción">
        <p>
          La información para la que recibamos una solicitud de eliminación o cuyo plazo de conservación haya terminado se destruye sin
          demora. Como solo se guarda en formato de archivo electrónico, se borra de la base de datos y del almacenamiento de fotos de
          forma que no pueda recuperarse, y no se imprime ni se guarda en papel.
        </p>
      </Section>

      <Section n={7} title="Empresas encargadas del tratamiento y transferencias internacionales">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <b>Supabase, Inc.</b> (EE. UU.) — Tarea encargada: almacenamiento de la base de datos y de las fotos, y funciones del
            servidor. Datos tratados: información del pueblo y de las casas indicada en la sección 2, fotos, ID de instalación,
            registros de solicitudes y contenido de las denuncias. Ubicación del almacenamiento: región de Seúl (ap-northeast-2).
            Momento y forma de la transferencia: se envían por internet cada vez que se usa el Servicio. Plazo de conservación: igual
            que en la sección 5. Contacto: <Ext href="https://supabase.com/contact">supabase.com/contact</Ext> ·{" "}
            <Ext href="https://supabase.com/privacy">Política de privacidad</Ext>
          </li>
          <li>
            <b>RevenueCat, Inc.</b> (EE. UU.) — Tarea encargada: verificación de compras dentro de la app y transmisión de los
            registros de compra. Datos tratados: ID de instalación, número de transacción, producto, precio y tienda. Momento y forma
            de la transferencia: se envían por internet al comprar en la app. Plazo de conservación: según la política de RevenueCat.
            Contacto: <Ext href="https://www.revenuecat.com/privacy">revenuecat.com/privacy</Ext>
          </li>
          <li>
            <b>Apple Inc. / Google LLC</b> — Procesamiento de los pagos de compras dentro de la app (según los términos y la política de
            privacidad de cada tienda).
          </li>
          <li>
            <b>Cloudflare, Inc.</b> (EE. UU., red global) — Tarea encargada: entrega y seguridad del sitio web (incluida la capa
            delante del servidor de Supabase). Datos tratados: información de acceso, como la dirección IP y la información del
            navegador. Momento y forma de la transferencia: se envían por internet cada vez que se accede al sitio web. Plazo de
            conservación: según la política de Cloudflare. Contacto: privacyquestions@cloudflare.com ·{" "}
            <Ext href="https://www.cloudflare.com/privacypolicy/">Política de privacidad</Ext>
          </li>
        </ul>
        <p>
          Esta información es imprescindible para prestar el Servicio; si no deseas la transferencia internacional, puedes no usar el
          Servicio o eliminar tu información con los métodos de la sección 5. Salvo en los casos previstos por la ley, no
          proporcionamos la información a otros terceros, ni la vendemos ni la usamos con fines publicitarios.
        </p>
      </Section>

      <Section n={8} title="Cómo la protegemos">
        <p>
          Todas las comunicaciones se cifran con HTTPS. Las fotos se guardan en un almacenamiento privado sin dirección pública y se
          muestran mediante una dirección válida solo durante 2 minutos. La base de datos está bloqueada para que solo se pueda acceder
          a través de las funciones del Servicio, y los valores secretos de administración se guardan solo como hash. El servidor
          vuelve a comprobar la longitud de los textos y el formato y tamaño de las fotos, y limita la cantidad de solicitudes.
        </p>
      </Section>

      <Section n={9} title="Información personal de menores">
        <p>
          El Servicio no está dirigido a menores de 14 años y no trata a sabiendas información de menores de 14 años. Si sabes que se
          subió información de un menor de 14 años, avísanos a <Mail />. La eliminaremos tras verificarlo.
        </p>
      </Section>

      <Section n={10} title="Derechos de las personas usuarias">
        <p>
          Puedes pedir ver, corregir o eliminar tu información, y pedir que se detenga su tratamiento. Si nos escribes al correo
          indicado arriba, lo atenderemos sin demora y te informaremos del resultado.
        </p>
      </Section>

      <Section n={11} title="Vías de reclamación">
        <p>
          Si necesitas asesoría o resolver un conflicto por una vulneración de tus datos personales, puedes acudir a los siguientes
          organismos (de Corea).
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Comité de Mediación de Conflictos sobre Información Personal: 1833-6972 (www.kopico.go.kr)</li>
          <li>Centro de Denuncias por Vulneración de la Privacidad: 118 (privacy.kisa.or.kr)</li>
          <li>Fiscalía Suprema: 1301 (www.spo.go.kr)</li>
          <li>Agencia Nacional de Policía: 182 (ecrm.police.go.kr)</li>
        </ul>
      </Section>

      <Section n={12} title="Responsable de protección de datos y cambios">
        <p>
          Responsable de protección de datos: {OFFICER.name} · Correo: <Mail to={OFFICER.email} /> · Teléfono: {OFFICER.phone}
        </p>
        <p>
          Consultas sobre el Servicio y solicitudes de eliminación: <Mail to={CONTACT} />
        </p>
        <p>Si esta política cambia, publicaremos la nueva versión en esta página con su nueva fecha de entrada en vigor.</p>
      </Section>
    </>
  );
}
