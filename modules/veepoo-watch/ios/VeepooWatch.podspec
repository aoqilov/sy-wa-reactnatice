# Veepoo (H Band) soat moduli, iOS qismi. SDK: github.com/HBandSDK/iOS_Ble_SDK, 2.2.113.15 (docs/ios-mapping.md).
#
# Freymvorklar faqat iPhone (arm64) uchun: simulyator qismi yo'q, shuning uchun loyiha faqat qurilma uchun
# yig'iladi (xcodebuild -sdk iphoneos). Qaysi freymvork nima uchun kerakligi SDK binaridagi tashqi sinflardan
# aniqlangan (VeepooBleSDK quyidagilarga murojaat qiladi):
#   FMDatabaseQueue -> FMDB (pod), mj_* kategoriyalari -> MJExtension (pod),
#   JL_Assist, JL_Tools, BitmapTool -> JL_BLEKit;  DialManager, FatfsObject -> JLDialUnit;
#   ZZArchive -> ZipZap;  GRDFUTool -> GRDFUSDK;  ParTool -> ABParTool.
#   DFUnits: SDK integratsiya qo'llanmasi talab qiladi (Jieli kutubxonalari uchun).
# Nordic (iOSMcuManagerLibrary) va SDKResours.bundle (SDK'ning tayyor ekranlari) kerak emas.

Pod::Spec.new do |s|
  s.name           = 'VeepooWatch'
  s.version        = '0.1.0'
  s.summary        = 'Veepoo (H Band) watch: BLE connection and measurements'
  s.description    = 'Expo local module wrapping VeepooBleSDK for the E500 / S105 watch'
  s.license        = { :type => 'Proprietary' }
  s.author         = 'synapse-watch'
  s.homepage       = 'https://github.com/HBandSDK/iOS_Ble_SDK'
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.dependency 'FMDB'
  s.dependency 'MJExtension'

  s.source_files = '*.{h,m,swift}'
  s.vendored_frameworks = 'Frameworks/*.framework'
  s.frameworks = 'CoreBluetooth'
  s.libraries = 'z', 'c++', 'sqlite3'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule',
  }
  # SDK statik kutubxonasidagi ObjC kategoriyalari yuklanishi uchun.
  s.user_target_xcconfig = { 'OTHER_LDFLAGS' => '$(inherited) -ObjC' }
end
