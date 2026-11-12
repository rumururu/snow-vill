// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Indonesian (`id`).
class AppLocalizationsId extends AppLocalizations {
  AppLocalizationsId([String locale = 'id']) : super(locale);

  @override
  String get appTitle => 'Snow Village';

  @override
  String get tagline => 'Desa musim dingin\nyang kamu bangun bersama teman';

  @override
  String get taglineBody =>
      'Satu teman, satu rumah. Buka lorong di sekitar alun-alun katedral hingga 60 rumah — tiap lorong punya fasilitas seperti arena es dan rumah Sinterklas. Foto hanya muncul saat rumah diketuk.';

  @override
  String get createVillage => 'Buat desa';

  @override
  String get openByLink => 'Buka tautan undangan';

  @override
  String get myVillages => 'Desaku';

  @override
  String get noVillages =>
      'Belum ada desa. Buat satu atau buka tautan undangan dari teman.';

  @override
  String get privacyPolicy => 'Kebijakan privasi';

  @override
  String get createHeading => 'Beri nama desamu';

  @override
  String get villageNameHint => 'mis. Desa Kepingan Salju';

  @override
  String get createCapacity =>
      'Hingga 6 teman bisa menempati rumah gratis; buka lorong lain untuk memperluas desa hingga 60 rumah.';

  @override
  String get createButton => 'Buat desa';

  @override
  String get creating => 'Membuat…';

  @override
  String occupancy(int count, int capacity) {
    return '$count/$capacity';
  }

  @override
  String freeHouses(int count) {
    return '$count rumah lagi bisa ditempati';
  }

  @override
  String get villageComplete => 'Desa sudah lengkap';

  @override
  String get tapHint =>
      'Ketuk rumah yang menyala untuk bingkai fotonya, atau rumah kosong untuk pindah.';

  @override
  String get makeMyHouse => 'Bangun rumahku';

  @override
  String get myHouse => 'Rumahku';

  @override
  String get invite => 'Undang teman';

  @override
  String get deleteVillage => 'Hapus desa';

  @override
  String get deleteConfirmTitle => 'Hapus desa ini?';

  @override
  String deleteConfirmBody(int count) {
    return 'Semua $count rumah, foto, dan pesan akan dihapus permanen.';
  }

  @override
  String get deleteButton => 'Hapus desa dan semua rumah';

  @override
  String get loadFailed => 'Gagal memuat desa';

  @override
  String get retry => 'Coba lagi';

  @override
  String get notFoundTitle => 'Desa tidak ditemukan';

  @override
  String get notFoundBody => 'Tautannya mungkin salah atau desa sudah dihapus.';

  @override
  String claimTitle(int slot) {
    return 'Bangun di kavling $slot';
  }

  @override
  String get firstHouseIntro => 'Desamu sudah siap! Bangun rumah pertama?';

  @override
  String get nickname => 'Nama panggilan';

  @override
  String get nicknameHint => 'Nama yang dikenali temanmu';

  @override
  String get houseStyle => 'Jenis rumah';

  @override
  String get styleWood => 'Kayu';

  @override
  String get styleSage => 'Sage';

  @override
  String get styleIndigo => 'Nila';

  @override
  String get photo => 'Foto';

  @override
  String get optional => '(opsional)';

  @override
  String get choosePhoto => 'Pilih foto';

  @override
  String get changePhoto => 'Ganti foto';

  @override
  String get addPhoto => 'Tambah foto';

  @override
  String get removePhoto => 'Hapus foto';

  @override
  String get photoHint =>
      'Foto opsional. Foto dipotong persegi dan data lokasi (EXIF) dihapus.';

  @override
  String get message => 'Pesan';

  @override
  String get messageHint => 'Sepatah kata untuk tetangga desa';

  @override
  String get visibilityNote =>
      'Nama panggilan, pesan, dan fotomu terlihat oleh siapa pun yang punya tautan desa ini.';

  @override
  String get submitHouse => 'Selesaikan rumahku';

  @override
  String get submitting => 'Membangun…';

  @override
  String moveToSlot(int slot) {
    return 'Pindah ke kavling kosong $slot';
  }

  @override
  String frameTitle(String name) {
    return 'Rumah mungil $name';
  }

  @override
  String get noMessage => 'Tidak ada pesan.';

  @override
  String joinedOn(String date) {
    return 'Pindah $date';
  }

  @override
  String get report => 'Laporkan konten tidak pantas';

  @override
  String get reported => 'Laporan diterima. Kami akan memeriksanya.';

  @override
  String get removeMine => 'Kosongkan rumahku';

  @override
  String get removeAsOwner => 'Kosongkan rumah ini (pemilik)';

  @override
  String get removeConfirm =>
      'Kosongkan rumah ini? Foto dan pesannya akan dihapus.';

  @override
  String get cancel => 'Batal';

  @override
  String get removeButton => 'Kosongkan rumah';

  @override
  String get photoLoadFailed => 'Gagal memuat foto.';

  @override
  String get inviteTitle => 'Undang teman';

  @override
  String inviteBody(int count) {
    return 'Undang teman untuk melengkapi desa. Sisa $count rumah.';
  }

  @override
  String get copyLink => 'Salin tautan';

  @override
  String get linkCopied => 'Tautan undangan disalin.';

  @override
  String get shareLink => 'Bagikan';

  @override
  String get inviteNote =>
      'Siapa pun yang punya tautan bisa melihat desa dan pindah ke rumah kosong. Bagikan hanya ke orang yang kamu percaya.';

  @override
  String shareText(String url) {
    return 'Bangun rumah di desa musim dingin kami! $url';
  }

  @override
  String litUp(String name) {
    return 'Rumah $name menyala!';
  }

  @override
  String get photoFailedAfterClaim =>
      'Rumahmu sudah jadi, tapi fotonya gagal diunggah. Ketuk rumahmu untuk mencoba lagi.';

  @override
  String get alreadyHaveHouse =>
      'Kamu sudah punya rumah di sini. Undang teman untuk mengisi sisanya!';

  @override
  String houseRemoved(String name) {
    return 'Rumah $name sudah dikosongkan.';
  }

  @override
  String get openLinkTitle => 'Buka tautan undangan';

  @override
  String get openLinkHint => 'https://snow.mkideabox.com/v/?id=…';

  @override
  String get openButton => 'Buka';

  @override
  String get linkInvalid => 'Periksa tautan undangannya.';

  @override
  String get nameRequired => 'Masukkan nama desa.';

  @override
  String get nameTooLong => 'Maksimal 20 karakter.';

  @override
  String get nicknameRequired => 'Masukkan nama panggilan.';

  @override
  String get nicknameTooLong => 'Maksimal 10 karakter.';

  @override
  String get messageTooLong => 'Maksimal 60 karakter.';

  @override
  String get errRateLimited =>
      'Terlalu banyak permintaan. Coba lagi sebentar lagi.';

  @override
  String get errNetwork =>
      'Kamu sedang offline. Periksa koneksi lalu coba lagi.';

  @override
  String get errForbidden => 'Kamu tidak punya izin untuk itu.';

  @override
  String get errPhotoTooLarge => 'Ukuran foto terlalu besar.';

  @override
  String get errPhotoUnsupported => 'Format foto tidak didukung.';

  @override
  String get errNotFound => 'Tidak ditemukan.';

  @override
  String get errServer => 'Terjadi masalah sementara. Coba lagi sebentar lagi.';

  @override
  String get errSlotTaken =>
      'Seseorang baru saja mengambil kavling ini. Drafmu tetap tersimpan — pilih kavling kosong lain.';

  @override
  String get errVillageFull =>
      'Semua kavling yang terbuka sudah terisi. Perluas desa atau buat desa baru.';

  @override
  String get errAlreadyJoined => 'Perangkat ini sudah punya rumah di desa ini.';

  @override
  String get errNoServer => 'Server belum dikonfigurasi (build pengembangan).';

  @override
  String milestoneHint(int remaining, String reward) {
    return '$remaining teman lagi untuk membuka “$reward” 🎁';
  }

  @override
  String get decorSled => 'Kereta salju hadiah';

  @override
  String get decorSnowFamily => 'Keluarga manusia salju';

  @override
  String get decorAurora => 'Langit aurora';

  @override
  String get growBig => 'Perluas desa';

  @override
  String upgradePointLots(int count) {
    return '$count kavling terkunci akan terbuka.';
  }

  @override
  String upgradePointAurora(int big) {
    return 'Saat semua $big rumah terisi, aurora muncul di langit.';
  }

  @override
  String get upgradePointGift =>
      'Siapa pun bisa memperluas desa, bukan hanya pemiliknya; berlaku untuk semua di web dan aplikasi.';

  @override
  String get useCredit => 'Pakai tiket yang kamu punya';

  @override
  String get upgradeWaiting => 'Mengonfirmasi pembelian…';

  @override
  String get restorePurchases => 'Pulihkan pembelian';

  @override
  String get restored => 'Pembelian dipulihkan.';

  @override
  String get purchasesUnavailable => 'Pembelian segera hadir';

  @override
  String get errNoCredit => 'Tidak ada tiket yang bisa dipakai.';

  @override
  String get errAlreadyBig => 'Desa ini sudah berukuran maksimal (60 rumah).';

  @override
  String get errPurchaseFailed => 'Pembelian tidak selesai. Silakan coba lagi.';

  @override
  String get errPurchasePending =>
      'Sudah dibayar, tapi konfirmasinya tertunda. Buka lagi nanti, pembelian akan diterapkan otomatis.';

  @override
  String get tapHintFull =>
      'Ketuk rumah untuk membuka bingkai foto teman-temanmu.';

  @override
  String get doorDirection => 'Arah pintu';

  @override
  String get dirFrontLeft => 'Depan kiri';

  @override
  String get dirFrontRight => 'Depan kanan';

  @override
  String get dirBackRight => 'Belakang kanan';

  @override
  String get dirBackLeft => 'Belakang kiri';

  @override
  String get dirTowardCentre => 'Ke arah tengah';

  @override
  String districtOpened(String name) {
    return '3 kavling baru terbuka di $name!';
  }

  @override
  String lockedDistrict(String name) {
    return '$name (belum terbuka) · buka dengan memperluas desa';
  }

  @override
  String expandBody(int capacity, int step) {
    return 'Desa ini kini memuat $capacity rumah. Pilih lorong untuk membuka $step kavling lagi (satu lorong berisi 6, dibuka dua tahap).';
  }

  @override
  String get pickDistrict => 'Lorong yang dibuka';

  @override
  String get districtNew => 'Lorong baru · 3 kavling';

  @override
  String get districtHalf => 'Setengah terbuka · 3 terakhir';

  @override
  String buyDistrict(String price) {
    return 'Perluas seharga $price';
  }

  @override
  String priceLadder(String p1, String p2, String p3, String p4, int max) {
    return 'Gratis 6 → 9 seharga $p1 → 12 seharga $p2 → 15 seharga $p3 → lalu $p4 per 3 (maks. $max)';
  }

  @override
  String maxVillage(int max) {
    return 'Sudah desa terbesar ($max)';
  }

  @override
  String get editLook => '🎨 Hias';

  @override
  String get editLookMenu => 'Hias desa (jalan & dekorasi)';

  @override
  String get pathStyleTitle => 'Jalan';

  @override
  String get pathDirt => 'Tanah';

  @override
  String get pathStones => 'Batu pijakan';

  @override
  String get pathBrick => 'Bata';

  @override
  String get pathSnow => 'Salju';

  @override
  String get lookHint =>
      'Seret lingkaran di bawah dekorasi untuk memindahkannya. Tidak bisa di atas rumah, jalan, atau landmark, atau di luar desa.';

  @override
  String get resetDecor => 'Atur ulang dekorasi';

  @override
  String get saveLook => 'Simpan';

  @override
  String get savingLook => 'Menyimpan…';

  @override
  String get lookSaved => 'Dekorasi desa disimpan.';
}
