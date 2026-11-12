import { CONTACT, EFFECTIVE_DATE, Ext, Mail, OFFICER, Section } from "./shared";

/** Indonesian translation of ko.tsx (same meaning and structure). */
export default function PolicyId() {
  return (
    <>
      <h1 className="mt-4 text-2xl font-extrabold text-night">Kebijakan Privasi</h1>
      <p className="mt-2 text-sm text-night/70">
        Pengelola: mkideabox · Kontak: <Mail /> · Berlaku sejak: {EFFECTIVE_DATE}
      </p>

      <Section n={1} title="Ringkasan">
        <p>
          Snow Village (selanjutnya &quot;Layanan&quot;) tidak memerlukan pendaftaran dan tidak meminta nama, email, atau nomor telepon.
          Kami memproses nama desa, nama panggilan, dan pesan singkat yang Anda ketik sendiri, serta satu foto yang Anda pilih untuk
          diunggah, agar dapat ditampilkan di desa. Foto disimpan di penyimpanan privat, bukan penyimpanan publik, dan hanya ditampilkan
          melalui alamat yang berlaku sebentar ketika seseorang mengetuk rumah di desa. Kami tidak menggunakan alat iklan maupun
          analitik.
        </p>
      </Section>

      <Section n={2} title="Informasi yang diproses dan tujuannya">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <b>Nama desa</b> (wajib): untuk membuat dan menampilkan desa.
          </li>
          <li>
            <b>Nama panggilan dan gaya rumah</b> (wajib), <b>pesan singkat</b> (opsional, maksimal 60 karakter): untuk menampilkan
            rumah Anda di desa.
          </li>
          <li>
            <b>Foto</b> (opsional, 1 foto): untuk ditampilkan di bingkai foto rumah Anda. Saat diunggah, foto dipotong menjadi persegi
            dan diperkecil menjadi 512px, dan metadata foto (EXIF) seperti lokasi pengambilan (GPS) dihapus baik di perangkat maupun di
            server.
          </li>
          <li>
            <b>ID instalasi acak</b>: nomor acak yang dibuat browser pertama kali. Digunakan agar browser yang sama tidak membangun dua
            rumah di satu desa dan untuk mencegah pengiriman terlalu banyak permintaan dalam waktu singkat. Ini bukan ID iklan maupun ID
            perangkat.
          </li>
          <li>
            <b>Catatan permintaan</b> (ID instalasi, jenis permintaan, waktu): untuk mencegah penyalahgunaan dan dihapus otomatis setelah
            satu hari.
          </li>
          <li>
            <b>Catatan pembelian dalam aplikasi</b> (saat Anda membeli perluasan desa di aplikasi Snow Village): ID instalasi
            (digunakan sebagai akun pembelian), nomor transaksi, produk, jumlah dan mata uang pembayaran, toko (App Store / Google
            Play), waktu pembelian dan pengembalian dana, serta desa tempat tiket perluasan tersebut digunakan. Digunakan untuk memverifikasi
            pembelian, menerapkannya ke desa, dan memproses pengembalian dana. Informasi alat pembayaran seperti nomor kartu diproses oleh
            Apple dan Google; Layanan tidak menerimanya.
          </li>
          <li>
            <b>Isi laporan</b>: jika Anda melaporkan rumah yang tidak pantas, kami menyimpan rumah yang dilaporkan, waktu laporan, dan ID
            instalasi pelapor untuk pemeriksaan dan tindak lanjut.
          </li>
          <li>
            <b>Catatan akses</b>: saat situs dibuka, alamat IP, informasi browser, dan sejenisnya dapat diproses di sistem penyedia
            hosting (Cloudflare) dan penyedia server (Supabase) untuk menyediakan Layanan dan menjaga keamanan. Pengelola tidak
            mengumpulkan atau menyimpan data ini secara terpisah.
          </li>
        </ul>
      </Section>

      <Section n={3} title="Siapa yang dapat melihat">
        <p>
          Siapa pun yang memiliki tautan desa dapat melihat nama desa serta nama panggilan, pesan singkat, dan tanggal pindah setiap
          rumah, melihat foto dengan mengetuk rumah, dan pindah ke rumah yang kosong. Kirim tautan hanya kepada orang yang Anda percaya.
          Gambar kartu berbagi desa tidak memuat foto, nama panggilan, maupun pesan singkat. Layanan diatur agar tidak muncul di mesin
          pencari.
        </p>
      </Section>

      <Section n={4} title="Informasi yang disimpan di browser">
        <p>
          Layanan tidak membuat cookie sendiri. Namun, Cloudflare yang berada di depan server (Supabase) dapat memasang cookie keamanan
          (__cf_bm, 30 menit) untuk mencegah serangan otomatis. Di penyimpanan lokal browser (localStorage), kami menyimpan ID instalasi
          dan nilai rahasia yang memungkinkan Anda mengelola desa yang Anda buat dan rumah Anda. Server tidak menyimpan nilai rahasia
          itu sendiri, melainkan hanya nilai yang telah diubah secara tidak dapat dikembalikan (hash). Jika Anda menghapus data situs di
          browser, nilai rahasia ini juga hilang dan Anda tidak dapat lagi mengosongkan rumah atau menghapus desa dari browser tersebut.
          Dalam hal ini, silakan ajukan permintaan melalui email di bawah. Apa yang Anda coba di desa contoh hanya tersimpan di
          penyimpanan sementara tab tersebut (sessionStorage) dan tidak dikirim ke server.
        </p>
        <p>
          Cookie keamanan dapat diblokir di pengaturan browser, tetapi jika diblokir, akses mungkin tidak berjalan lancar. Penyimpanan
          lokal dapat dihapus dengan menghapus data situs di browser; jika dihapus, hak pengelolaan yang disebutkan di atas juga hilang.
        </p>
      </Section>

      <Section n={5} title="Masa penyimpanan dan penghapusan">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            Jika Anda mengetuk rumah Anda dan memilih <b>&apos;Kosongkan rumahku&apos;</b>, nama panggilan, pesan singkat, dan foto rumah
            itu langsung dihapus.
          </li>
          <li>
            Pembuat desa dapat menghapus desa beserta semua rumah, foto, dan laporan terkait sekaligus dengan <b>&apos;Hapus
            desa&apos;</b>. Pembuat desa juga dapat mengosongkan rumah lain di dalam desa.
          </li>
          <li>
            Informasi yang tidak dihapus disimpan sampai pengguna menghapusnya atau sampai Layanan dihentikan; jika Layanan dihentikan,
            semuanya dihapus.
          </li>
          <li>Catatan permintaan dihapus otomatis setelah satu hari.</li>
          <li>
            Catatan pembelian dalam aplikasi disimpan selama 5 tahun sebagai catatan pembayaran dan penyediaan barang sesuai dengan
            Undang-Undang Perlindungan Konsumen dalam Perdagangan Elektronik Korea, lalu dimusnahkan.
          </li>
          <li>
            Jika Anda tidak dapat menghapusnya sendiri karena telah menghapus data browser, kirimkan tautan desa dan nama panggilan Anda
            ke <Mail />. Kami akan menghapusnya setelah diverifikasi.
          </li>
        </ul>
      </Section>

      <Section n={6} title="Prosedur dan cara pemusnahan">
        <p>
          Informasi yang diminta untuk dihapus atau yang masa penyimpanannya telah berakhir dimusnahkan tanpa penundaan. Karena kami
          hanya menyimpannya dalam bentuk file elektronik, informasi tersebut dihapus dari basis data dan penyimpanan foto dengan cara
          yang tidak dapat dipulihkan, dan kami tidak mencetak atau menyimpannya dalam bentuk dokumen kertas.
        </p>
      </Section>

      <Section n={7} title="Perusahaan yang diberi tugas pemrosesan dan transfer ke luar negeri">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <b>Supabase, Inc.</b> (Amerika Serikat) — Tugas: basis data, penyimpanan foto, dan fungsi server. Data yang diproses:
            informasi desa dan rumah pada butir 2, foto, ID instalasi, catatan permintaan, isi laporan. Lokasi penyimpanan: region Seoul
            (ap-northeast-2). Waktu dan cara transfer: dikirim melalui internet setiap kali Layanan digunakan. Masa penyimpanan: sama
            dengan butir 5. Kontak: <Ext href="https://supabase.com/contact">supabase.com/contact</Ext> ·{" "}
            <Ext href="https://supabase.com/privacy">Kebijakan Privasi</Ext>
          </li>
          <li>
            <b>RevenueCat, Inc.</b> (Amerika Serikat) — Tugas: verifikasi pembelian dalam aplikasi dan penerusan catatan pembelian. Data
            yang diproses: ID instalasi, nomor transaksi, produk, harga, toko. Waktu dan cara transfer: dikirim melalui internet saat
            pembelian di aplikasi. Masa penyimpanan: sesuai kebijakan RevenueCat. Kontak:{" "}
            <Ext href="https://www.revenuecat.com/privacy">revenuecat.com/privacy</Ext>
          </li>
          <li>
            <b>Apple Inc. / Google LLC</b> — Pemrosesan pembayaran pembelian dalam aplikasi (sesuai ketentuan dan kebijakan privasi
            masing-masing toko).
          </li>
          <li>
            <b>Cloudflare, Inc.</b> (Amerika Serikat, jaringan global) — Tugas: pengiriman dan keamanan situs (termasuk di depan server
            Supabase). Data yang diproses: informasi akses seperti alamat IP dan informasi browser. Waktu dan cara transfer: dikirim
            melalui internet setiap kali situs diakses. Masa penyimpanan: sesuai kebijakan Cloudflare. Kontak:
            privacyquestions@cloudflare.com · <Ext href="https://www.cloudflare.com/privacypolicy/">Kebijakan Privasi</Ext>
          </li>
        </ul>
        <p>
          Informasi ini mutlak diperlukan untuk menyediakan Layanan, sehingga jika Anda tidak menginginkan transfer ke luar negeri, Anda
          dapat memilih untuk tidak menggunakan Layanan atau menghapus informasi dengan cara pada butir 5. Kecuali jika diwajibkan oleh hukum, kami
          tidak memberikan informasi kepada pihak ketiga lainnya, tidak menjualnya, dan tidak menggunakannya untuk tujuan iklan.
        </p>
      </Section>

      <Section n={8} title="Cara kami melindungi informasi">
        <p>
          Semua komunikasi dienkripsi dengan HTTPS. Foto disimpan di penyimpanan privat tanpa alamat publik dan ditampilkan melalui
          alamat yang hanya berlaku selama 2 menit. Basis data hanya dapat diakses melalui fungsi Layanan, dan nilai rahasia pengelolaan
          hanya disimpan sebagai hash. Server memeriksa ulang panjang masukan serta format dan ukuran foto, dan membatasi jumlah
          permintaan.
        </p>
      </Section>

      <Section n={9} title="Informasi pribadi anak">
        <p>
          Layanan tidak ditujukan untuk anak di bawah 14 tahun, dan kami tidak dengan sengaja memproses informasi anak di bawah 14
          tahun. Jika Anda mengetahui ada informasi anak di bawah 14 tahun yang diunggah, beri tahu kami di <Mail />. Kami akan
          menghapusnya setelah diverifikasi.
        </p>
      </Section>

      <Section n={10} title="Hak pengguna">
        <p>
          Anda dapat meminta untuk melihat, memperbaiki, atau menghapus informasi Anda, serta meminta agar pemrosesannya dihentikan.
          Hubungi kami melalui email di atas; kami akan menanganinya tanpa penundaan dan memberi tahu hasilnya.
        </p>
      </Section>

      <Section n={11} title="Cara mendapatkan pemulihan hak">
        <p>
          Jika Anda memerlukan konsultasi atau penyelesaian sengketa terkait pelanggaran informasi pribadi, Anda dapat menghubungi
          lembaga berikut (di Korea Selatan).
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Komite Mediasi Sengketa Informasi Pribadi: 1833-6972 (www.kopico.go.kr)</li>
          <li>Pusat Pelaporan Pelanggaran Privasi (KISA): 118 (privacy.kisa.or.kr)</li>
          <li>Kejaksaan Agung: 1301 (www.spo.go.kr)</li>
          <li>Badan Kepolisian Nasional: 182 (ecrm.police.go.kr)</li>
        </ul>
      </Section>

      <Section n={12} title="Penanggung jawab perlindungan informasi pribadi dan perubahan">
        <p>
          Penanggung jawab perlindungan informasi pribadi: {OFFICER.name} · Email: <Mail to={OFFICER.email} /> · Telepon:{" "}
          {OFFICER.phone}
        </p>
        <p>
          Pertanyaan Layanan dan permintaan penghapusan: <Mail to={CONTACT} />
        </p>
        <p>Jika kebijakan ini berubah, kami akan memublikasikannya di halaman ini beserta tanggal berlaku yang baru.</p>
      </Section>
    </>
  );
}
