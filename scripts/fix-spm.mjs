// fix-spm.mjs — postinstall.
//
// Algunos plugins de la comunidad fijan `capacitor-swift-pm` a 7.x en su
// Package.swift (`from: "7.0.0"`), y este proyecto va con Capacitor 8
// (CapApp-SPM pide `exact: "8.3.0"`). SPM no puede resolver las dos a la vez y
// el `xcodebuild archive` de la Mac muere con:
//   'apple-sign-in' depends on 'capacitor-swift-pm' 7.0.0..<8.0.0 and
//   'CapApp-SPM' depends on 'capacitor-swift-pm' 8.3.0
// Aquí se relaja ese limite a [7.0.0 ..< 9.0.0] para que resuelva a 8.x.
// Solo afecta a iOS; Android no usa SPM. Quitar la entrada de un plugin en
// cuanto publique una version compatible con Capacitor 8.
//
// Es el mismo patron que `scripts/fix-bg-geo-spm.mjs` de pido-panel-socio.
import { readFileSync, writeFileSync } from 'node:fs'

const PKGS = [
  'node_modules/@capacitor-community/apple-sign-in/Package.swift',
]

for (const PKG of PKGS) {
  try {
    let s = readFileSync(PKG, 'utf8')
    if (s.includes('from: "7.0.0"')) {
      s = s.replace('from: "7.0.0"', '"7.0.0" ..< "9.0.0"')
      writeFileSync(PKG, s)
      console.log(`[fix-spm] ${PKG} ajustado a capacitor-swift-pm 7..<9 (Capacitor 8 OK)`)
    }
  } catch (_) {
    // El plugin aun no esta instalado o ya estaba parcheado: no hacer nada.
  }
}
